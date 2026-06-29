import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fal, configureFalClient } from "@/lib/fal/client";
import { getApiKey } from "@/lib/services/apiKeyService";
import {
  checkRateLimit,
  getClientIdentifier,
  createRateLimitHeaders,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { requireAuth } from "@/lib/auth-helpers";

const translateSchema = z.object({
  texts: z.object({
    headline: z.string().max(200),
    bodyCopy: z.string().max(500),
    cta: z.string().max(100),
  }),
  language: z.enum(["sv", "no"]),
});

const LANGUAGE_NAMES: Record<string, string> = {
  sv: "Swedish",
  no: "Norwegian",
};

export async function POST(request: NextRequest) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  const clientId = getClientIdentifier(request);
  const rateLimitResult = await checkRateLimit(clientId, RATE_LIMITS.generation);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before translating." },
      { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }

  const body = await request.json();
  const parseResult = translateSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { texts, language } = parseResult.data;
  const langName = LANGUAGE_NAMES[language];

  console.log("[translate-text] language:", language, "texts:", JSON.stringify(texts).slice(0, 200));
  const apiKey = await getApiKey(user!.id);
  if (!apiKey) {
    // No FAL key configured — return originals so compositing still proceeds
    return NextResponse.json({
      headline: texts.headline,
      bodyCopy: texts.bodyCopy,
      cta: texts.cta,
    });
  }
  configureFalClient(apiKey);

  const prompt = `You are a professional marketing translator. Translate ALL of the following banner text items into ${langName}. You MUST translate every item — do not keep any text in its original language, even if it looks similar.

Return ONLY a JSON object with exactly these keys: "headline", "bodyCopy", "cta". No explanation, no markdown, no code blocks, just the raw JSON object.

Headline: ${texts.headline}
Body copy: ${texts.bodyCopy}
CTA: ${texts.cta}`;

  try {
    const result = await (fal.subscribe as unknown as (id: string, opts: unknown) => Promise<{ data?: { output?: string }; output?: string }>)(
      "fal-ai/any-llm",
      {
        input: {
          model: "google/gemini-flash-1-5",
          prompt,
          max_tokens: 300,
        },
      }
    );

    const raw: string = result?.data?.output ?? result?.output ?? "";
    console.log("[translate-text] LLM raw response:", raw.slice(0, 500));
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in LLM response: " + raw.slice(0, 200));
    const translated = JSON.parse(jsonMatch[0]) as Record<string, string>;
    console.log("[translate-text] parsed translation:", JSON.stringify(translated));

    return NextResponse.json({
      headline: translated.headline ?? texts.headline,
      bodyCopy: translated.bodyCopy ?? texts.bodyCopy,
      cta: translated.cta ?? texts.cta,
    });
  } catch (err) {
    console.error("[translate-text] translation failed, returning originals:", err instanceof Error ? err.message : err);
    return NextResponse.json({
      headline: texts.headline,
      bodyCopy: texts.bodyCopy,
      cta: texts.cta,
    });
  }
}

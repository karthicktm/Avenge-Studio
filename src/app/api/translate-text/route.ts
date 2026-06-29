import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fal } from "@fal-ai/client";
import { configureFalClient } from "@/lib/fal/client";
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

  const apiKey = await getApiKey(user!.id);
  if (!apiKey) {
    return NextResponse.json(
      { error: "No API key. Add your fal.ai key in Settings.", code: "NO_API_KEY" },
      { status: 400 }
    );
  }
  configureFalClient(apiKey);

  const prompt = `Translate these three banner text items to ${langName}. Return ONLY a JSON object with exactly these keys: "headline", "bodyCopy", "cta". No explanation, no markdown, just the JSON object.

Headline: ${texts.headline}
Body copy: ${texts.bodyCopy}
CTA: ${texts.cta}`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (fal as any).subscribe("fal-ai/any-llm", {
      input: {
        model: "google/gemini-flash-2-0",
        prompt,
        max_tokens: 300,
      },
    });

    const raw: string = result?.data?.output ?? result?.output ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON in response");
    }
    const translated = JSON.parse(jsonMatch[0]) as Record<string, string>;

    return NextResponse.json({
      headline: translated.headline ?? texts.headline,
      bodyCopy: translated.bodyCopy ?? texts.bodyCopy,
      cta: translated.cta ?? texts.cta,
    });
  } catch {
    // Fallback: return original texts if translation fails
    return NextResponse.json({
      headline: texts.headline,
      bodyCopy: texts.bodyCopy,
      cta: texts.cta,
    });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
  const { error: authError } = await requireAuth();
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

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    // No translation key — return originals rather than failing
    return NextResponse.json({
      headline: texts.headline,
      bodyCopy: texts.bodyCopy,
      cta: texts.cta,
    });
  }

  const userPrompt = `Translate these three banner text items to ${langName}. Return ONLY a JSON object with exactly these keys: "headline", "bodyCopy", "cta". No explanation, no markdown, just the JSON object.

Headline: ${texts.headline}
Body copy: ${texts.bodyCopy}
CTA: ${texts.cta}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>;
    };
    const raw = data.content.find((b) => b.type === "text")?.text ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
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

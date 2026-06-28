import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import {
  checkRateLimit,
  getClientIdentifier,
  createRateLimitHeaders,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { requireAuth } from "@/lib/auth-helpers";
import { logger } from "@/lib/logger";

const generatePromptSchema = z.object({
  productContext: z.string().min(1).max(2000),
  language: z.enum(["sv", "no", "en"]),
  contentType: z.enum(["hero", "square", "story"]),
});

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const clientId = getClientIdentifier(request);
  const rateLimitResult = await checkRateLimit(clientId, RATE_LIMITS.generation);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before generating more prompts." },
      { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }

  try {
    const body = await request.json();
    const parseResult = generatePromptSchema.safeParse(body);

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || "Invalid request body" },
        { status: 400 }
      );
    }

    const { productContext, language, contentType } = parseResult.data;

    const langNames: Record<string, string> = {
      sv: "Swedish",
      no: "Norwegian",
      en: "English",
    };

    const contentTypeDescs: Record<string, string> = {
      hero: "a wide cinematic hero banner (16:9 landscape format, large background scene, product centered or offset)",
      square: "a square social post (1:1 format, clean centered composition, bold focal point)",
      story: "a vertical story/ad (9:16 portrait format, mobile-first layout, product prominent in center)",
    };

    const systemPrompt = `You are a luxury fragrance marketing copywriter creating multilingual perfume banner ad copy.
Given product context, generate compelling marketing copy in ${langNames[language]} for ${contentTypeDescs[contentType]}.

Your response must be valid JSON with this exact structure:
{
  "headline": "The main headline in ${langNames[language]} (4-8 words, evocative and powerful)",
  "bodyCopy": "1-2 sentence product description in ${langNames[language]} (sensory, aspirational)",
  "cta": "Call-to-action button text in ${langNames[language]} (2-4 words)",
  "prompt": "Complete image generation prompt in English that describes the banner visual scene. Must include: the perfume bottle/product as the focal point, luxury background setting matching the brand style, the headline text overlaid on the image in ${langNames[language]}, typography style (sans-serif, bold), brand color accent. The prompt should be 150-300 words and suitable for Nano Banana Pro image model."
}`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Generate perfume banner ad copy based on this product context:\n\n${productContext}`,
        },
      ],
      system: systemPrompt,
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.error("Failed to extract JSON from Claude response", { responseText });
      return NextResponse.json(
        { error: "Failed to generate prompt. Please try again." },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      headline: string;
      bodyCopy: string;
      cta: string;
      prompt: string;
    };

    return NextResponse.json({
      prompt: parsed.prompt,
      headline: parsed.headline,
      bodyCopy: parsed.bodyCopy,
      cta: parsed.cta,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    logger.error("Prompt generation error", { error: errMsg });
    return NextResponse.json(
      { error: "Failed to generate prompt. Please try again." },
      { status: 500 }
    );
  }
}

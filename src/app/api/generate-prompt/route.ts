import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  checkRateLimit,
  getClientIdentifier,
  createRateLimitHeaders,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { requireAuth } from "@/lib/auth-helpers";

const generatePromptSchema = z.object({
  productContext: z.string().min(1).max(2000),
  language: z.enum(["sv", "no", "en"]),
  contentType: z.enum(["hero", "square", "story"]),
});

// Parse structured product context from ProductInput node output
function parseProductContext(context: string) {
  const lines = context.split("\n");
  const get = (prefix: string) => {
    const line = lines.find((l) => l.startsWith(prefix));
    return line ? line.replace(prefix, "").trim() : "";
  };
  return {
    productName: get("Product:").split(" by ")[0]?.trim() || "",
    brand: get("Product:").split(" by ")[1]?.trim() || "",
    scentNotes: get("Scent:"),
    styleKeywords: get("Style:"),
    brandColor: get("Brand color:"),
    taglineDirection: get("Tagline direction:"),
  };
}

// Language-specific copy templates
const copy = {
  sv: {
    hero: (p: ReturnType<typeof parseProductContext>) => ({
      headline: p.taglineDirection || `Känn dig ${p.productName}`,
      bodyCopy: `${p.brand} presenterar en sinnlig doft av ${p.scentNotes || "lyx och elegans"}.`,
      cta: "Köp nu",
    }),
    square: (p: ReturnType<typeof parseProductContext>) => ({
      headline: p.taglineDirection || `${p.productName} av ${p.brand}`,
      bodyCopy: `En ${p.scentNotes || "exklusiv"} doft som stannar kvar.`,
      cta: "Upptäck mer",
    }),
    story: (p: ReturnType<typeof parseProductContext>) => ({
      headline: p.taglineDirection || `Din nya signatur`,
      bodyCopy: `${p.brand} ${p.productName} — ${p.scentNotes || "en oförglömlig upplevelse"}.`,
      cta: "Handla nu",
    }),
  },
  no: {
    hero: (p: ReturnType<typeof parseProductContext>) => ({
      headline: p.taglineDirection || `Kjenn deg ${p.productName}`,
      bodyCopy: `${p.brand} presenterer en sanselig duft av ${p.scentNotes || "luksus og eleganse"}.`,
      cta: "Kjøp nå",
    }),
    square: (p: ReturnType<typeof parseProductContext>) => ({
      headline: p.taglineDirection || `${p.productName} av ${p.brand}`,
      bodyCopy: `En ${p.scentNotes || "eksklusiv"} duft som varer.`,
      cta: "Oppdag mer",
    }),
    story: (p: ReturnType<typeof parseProductContext>) => ({
      headline: p.taglineDirection || `Din nye signatur`,
      bodyCopy: `${p.brand} ${p.productName} — ${p.scentNotes || "en uforglemmelig opplevelse"}.`,
      cta: "Handle nå",
    }),
  },
  en: {
    hero: (p: ReturnType<typeof parseProductContext>) => ({
      headline: p.taglineDirection || `Feel ${p.productName}`,
      bodyCopy: `${p.brand} presents a sensory journey of ${p.scentNotes || "luxury and elegance"}.`,
      cta: "Shop now",
    }),
    square: (p: ReturnType<typeof parseProductContext>) => ({
      headline: p.taglineDirection || `${p.productName} by ${p.brand}`,
      bodyCopy: `A ${p.scentNotes || "signature"} fragrance that lingers.`,
      cta: "Discover more",
    }),
    story: (p: ReturnType<typeof parseProductContext>) => ({
      headline: p.taglineDirection || `Your new signature`,
      bodyCopy: `${p.brand} ${p.productName} — ${p.scentNotes || "an unforgettable experience"}.`,
      cta: "Shop now",
    }),
  },
};

// Build the image generation prompt
function buildImagePrompt(
  p: ReturnType<typeof parseProductContext>,
  headline: string,
  contentType: "hero" | "square" | "story"
) {
  const layouts: Record<string, string> = {
    hero: "wide cinematic 16:9 landscape composition, product bottle centered with dramatic background extending to the sides",
    square: "clean centered 1:1 square composition, product bottle prominent in the middle with balanced negative space",
    story: "vertical 9:16 portrait composition, product bottle displayed prominently in the upper center, mobile-optimized layout",
  };

  const style = p.styleKeywords || "luxury, dark, moody, minimalist";
  const color = p.brandColor || "#1A1A1A";

  return `${p.brand} ${p.productName} perfume advertisement banner. ${layouts[contentType]}. The perfume bottle is the hero of the image, beautifully lit with soft studio lighting. Background is ${style} with color palette inspired by ${color}. Overlaid text reads "${headline}" in bold elegant sans-serif typography, white text with subtle shadow. The overall mood is ${style}. Ultra high resolution, luxury editorial photography style, professional perfume advertisement, aspirational and sophisticated. Scent notes inspiration: ${p.scentNotes || "woody, fresh, elegant"}. Brand: ${p.brand}. Product: ${p.productName}.`;
}

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

  const product = parseProductContext(productContext);
  const langCopy = copy[language][contentType](product);
  const imagePrompt = buildImagePrompt(product, langCopy.headline, contentType);

  return NextResponse.json({
    prompt: imagePrompt,
    headline: langCopy.headline,
    bodyCopy: langCopy.bodyCopy,
    cta: langCopy.cta,
  });
}

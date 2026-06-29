import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import sharp from "sharp";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import {
  checkRateLimit,
  getClientIdentifier,
  createRateLimitHeaders,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { requireAuth } from "@/lib/auth-helpers";

const textZoneSchema = z.object({
  content: z.string(),
  font: z.enum(["Inter", "Poppins", "Montserrat", "Oswald", "Bebas Neue"]),
  size: z.number().min(8).max(300),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  position: z.enum([
    "top-left",
    "top-center",
    "top-right",
    "middle-left",
    "middle-center",
    "middle-right",
    "bottom-left",
    "bottom-center",
    "bottom-right",
  ]),
});

const compositeSchema = z.object({
  imageUrl: z.string().min(1),
  textZones: z.array(textZoneSchema).min(1).max(3),
});

// Map 9-point position to SVG text-anchor
const TEXT_ANCHOR: Record<string, string> = {
  "top-left": "start",
  "top-center": "middle",
  "top-right": "end",
  "middle-left": "start",
  "middle-center": "middle",
  "middle-right": "end",
  "bottom-left": "start",
  "bottom-center": "middle",
  "bottom-right": "end",
};

// Map 9-point position to pixel coordinates (40px padding from edge)
function getCoords(
  position: string,
  w: number,
  h: number,
  size: number
): { x: number; y: number } {
  const pad = 40;
  const midY = Math.round(h / 2);
  const coordMap: Record<string, { x: number; y: number }> = {
    "top-left": { x: pad, y: pad + size },
    "top-center": { x: Math.round(w / 2), y: pad + size },
    "top-right": { x: w - pad, y: pad + size },
    "middle-left": { x: pad, y: midY },
    "middle-center": { x: Math.round(w / 2), y: midY },
    "middle-right": { x: w - pad, y: midY },
    "bottom-left": { x: pad, y: h - pad },
    "bottom-center": { x: Math.round(w / 2), y: h - pad },
    "bottom-right": { x: w - pad, y: h - pad },
  };
  return coordMap[position] ?? { x: pad, y: pad + size };
}

// Save buffer to uploads/composites/ and return URL path
async function saveCompositeBuffer(buffer: Buffer): Promise<string> {
  const uploadDir = path.join(process.cwd(), "uploads");
  const compositeDir = path.join(uploadDir, "composites");
  if (!existsSync(compositeDir)) {
    await mkdir(compositeDir, { recursive: true });
  }
  const filename = `${randomUUID()}.png`;
  await writeFile(path.join(compositeDir, filename), buffer);
  return `/api/files/composites/${filename}`;
}

export async function POST(request: NextRequest) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const clientId = getClientIdentifier(request);
  const rateLimitResult = await checkRateLimit(clientId, RATE_LIMITS.generation);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
    );
  }

  const body = await request.json();
  const parseResult = compositeSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { imageUrl, textZones } = parseResult.data;

  // Resolve local /api/files/... URLs to absolute for fetching
  const fetchUrl = imageUrl.startsWith("/")
    ? `http://localhost:${process.env.PORT ?? 3000}${imageUrl}`
    : imageUrl;

  let imageBuffer: Buffer;
  try {
    const res = await fetch(fetchUrl);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    imageBuffer = Buffer.from(await res.arrayBuffer());
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch source image" },
      { status: 400 }
    );
  }

  const { width: w = 1920, height: h = 1080 } =
    await sharp(imageBuffer).metadata();

  // Build SVG overlay — each text zone as a <text> element with drop shadow
  const svgTexts = textZones
    .map((zone) => {
      const { x, y } = getCoords(zone.position, w, h, zone.size);
      const anchor = TEXT_ANCHOR[zone.position] ?? "start";
      const escaped = zone.content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      return `<text
      x="${x}"
      y="${y}"
      font-family="${zone.font}, sans-serif"
      font-size="${zone.size}"
      fill="${zone.color}"
      text-anchor="${anchor}"
      dominant-baseline="auto"
      style="filter:drop-shadow(0px 2px 6px rgba(0,0,0,0.85))"
    >${escaped}</text>`;
    })
    .join("\n");

  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">\n${svgTexts}\n</svg>`;

  let compositedBuffer: Buffer;
  try {
    compositedBuffer = await sharp(imageBuffer)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .png()
      .toBuffer();
  } catch {
    return NextResponse.json(
      { error: "Image compositing failed" },
      { status: 500 }
    );
  }

  const url = await saveCompositeBuffer(compositedBuffer);
  return NextResponse.json({ url });
}

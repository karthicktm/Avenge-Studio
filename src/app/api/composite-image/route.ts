import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import sharp from "sharp";
import { writeFile, mkdir, readFile } from "fs/promises";
import { existsSync, lstatSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import {
  checkRateLimit,
  getClientIdentifier,
  createRateLimitHeaders,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { requireAuth } from "@/lib/auth-helpers";
import { getFilePath } from "@/lib/storage";

// Allowed external hostname suffixes for FAL CDN images
const ALLOWED_EXTERNAL_HOSTNAMES = [".fal.run", ".fal.media"];
const ALLOWED_EXACT_HOSTNAMES = ["fal.ai"];

function isAllowedExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname;
    if (ALLOWED_EXACT_HOSTNAMES.includes(host)) return true;
    return ALLOWED_EXTERNAL_HOSTNAMES.some((suffix) => host.endsWith(suffix));
  } catch {
    return false;
  }
}

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
  console.log("[composite-image] body:", JSON.stringify(body).slice(0, 500));
  const parseResult = compositeSchema.safeParse(body);
  if (!parseResult.success) {
    console.error("[composite-image] Zod validation failed:", parseResult.error.issues);
    return NextResponse.json(
      { error: parseResult.error.issues[0]?.message ?? "Invalid request", issues: parseResult.error.issues },
      { status: 400 }
    );
  }

  const { imageUrl, textZones } = parseResult.data;
  console.log("[composite-image] imageUrl:", imageUrl, "zones:", textZones.length);

  let imageBuffer: Buffer;
  if (imageUrl.startsWith("/")) {
    // Local path: resolve to absolute disk path and read directly (no HTTP round-trip)
    const absolutePath = getFilePath(imageUrl);
    if (!absolutePath) {
      return NextResponse.json(
        { error: "Invalid image path" },
        { status: 400 }
      );
    }

    // Security: Ensure the resolved path stays within UPLOAD_DIR (prevent path traversal)
    const UPLOAD_DIR = path.join(process.cwd(), "uploads");
    const resolvedPath = path.resolve(absolutePath);
    if (
      !resolvedPath.startsWith(path.resolve(UPLOAD_DIR) + path.sep) &&
      resolvedPath !== path.resolve(UPLOAD_DIR)
    ) {
      return NextResponse.json(
        { error: "Invalid image path" },
        { status: 400 }
      );
    }

    // Security: Check for symlink attacks
    try {
      const stat = lstatSync(resolvedPath);
      if (stat.isSymbolicLink()) {
        return NextResponse.json(
          { error: "Invalid image path" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Image file not found" },
        { status: 400 }
      );
    }

    if (!existsSync(resolvedPath)) {
      return NextResponse.json(
        { error: "Source image not found" },
        { status: 400 }
      );
    }
    try {
      imageBuffer = await readFile(resolvedPath);
    } catch {
      return NextResponse.json(
        { error: "Failed to read source image" },
        { status: 400 }
      );
    }
  } else {
    // External URL: only allow FAL CDN hostnames
    if (!isAllowedExternalUrl(imageUrl)) {
      return NextResponse.json(
        { error: "External image source not allowed" },
        { status: 400 }
      );
    }
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
      imageBuffer = Buffer.from(await res.arrayBuffer());
    } catch {
      return NextResponse.json(
        { error: "Failed to fetch source image" },
        { status: 400 }
      );
    }
  }

  let w: number;
  let h: number;
  try {
    const meta = await sharp(imageBuffer).metadata();
    w = meta.width ?? 1920;
    h = meta.height ?? 1080;
    console.log("[composite-image] image size:", w, "x", h);
  } catch (e) {
    console.error("[composite-image] sharp metadata failed:", e);
    return NextResponse.json(
      { error: "Failed to read image metadata: " + (e instanceof Error ? e.message : String(e)) },
      { status: 500 }
    );
  }

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
      return `<text x="${x}" y="${y}" font-family="${zone.font}, sans-serif" font-size="${zone.size}" fill="${zone.color}" text-anchor="${anchor}" dominant-baseline="auto" filter="url(#shadow)">${escaped}</text>`;
    })
    .join("\n");

  // flood-color uses rgb + flood-opacity (rgba() is not reliably supported by librsvg)
  const svgDefs = `<defs><filter id="shadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgb(0,0,0)" flood-opacity="0.85"/></filter></defs>`;

  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${svgDefs}${svgTexts}</svg>`;
  console.log("[composite-image] svg length:", svg.length);

  let compositedBuffer: Buffer;
  try {
    compositedBuffer = await sharp(imageBuffer)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .png()
      .toBuffer();
  } catch (e) {
    console.error("[composite-image] sharp composite failed:", e);
    return NextResponse.json(
      { error: "Image compositing failed: " + (e instanceof Error ? e.message : String(e)) },
      { status: 500 }
    );
  }

  let url: string;
  try {
    url = await saveCompositeBuffer(compositedBuffer);
  } catch (e) {
    console.error("[composite-image] save failed:", e);
    return NextResponse.json(
      { error: "Failed to save composited image: " + (e instanceof Error ? e.message : String(e)) },
      { status: 500 }
    );
  }

  console.log("[composite-image] done, url:", url);
  return NextResponse.json({ url });
}

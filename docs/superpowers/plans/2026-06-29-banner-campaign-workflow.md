# Banner Campaign Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `BannerInputNode` and `TextCompositeNode` to the workflow builder, wired through two new API routes (`/api/translate-text`, `/api/composite-image`), enabling pixel-perfect Swedish/Norwegian banner variants from a single master image.

**Architecture:** `BannerInputNode` collects product info + 3 styled text zones + optional reference image + dynamic prompt, producing three output handles (`prompt`, `image`, `textConfig`). Any image gen node produces the master. `TextCompositeNode` translates the text zones via `/api/translate-text` (FAL any-llm), then calls `/api/composite-image` which uses `sharp` + SVG overlay to composite translated text onto the master image server-side.

**Tech Stack:** Next.js App Router, @xyflow/react, TypeScript 5, Zod 4, sharp (already in package.json), @fal-ai/client (already installed), Tailwind CSS 4.

## Global Constraints

- Run `pnpm lint && pnpm typecheck` after every file change; fix ALL errors before committing
- No new npm dependencies — sharp and @fal-ai/client are already available
- Every new API route must call `requireAuth()` and apply `checkRateLimit`
- Handle colors: `prompt=#A78BFA`, `image=#F59E0B`, `textConfig=#2DD4BF`
- Font options restricted to FONTS registry values: `Inter`, `Poppins`, `Montserrat`, `Oswald`, `Bebas Neue`
- `ANTHROPIC_API_KEY` is NOT available — use FAL any-llm for translation
- Follow existing node patterns: `BaseNode`, `useNodeUpdate`, `NodeBadges`
- The execution hook lives in `src/hooks/useWorkflowExecution.ts` — that is where ALL new execution logic goes

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/workflow/types.ts` | Modify | Add `TextPosition`, `TextZone`, `BannerInputNodeData`, `TextCompositeNodeData`; extend `NodeType` and `WorkflowNodeData` unions |
| `src/components/workflow/WorkflowContext.tsx` | Modify | Add `textConfig` to `HANDLE_COLORS` and `COMPATIBLE_HANDLES` |
| `src/app/api/translate-text/route.ts` | Create | Translate 3 text zone contents to SE/NO via FAL any-llm |
| `src/app/api/composite-image/route.ts` | Create | Load image, render SVG text overlays with sharp, save to `uploads/composites/`, return URL |
| `src/components/workflow/nodes/BannerInputNode.tsx` | Create | Node UI: product fields, 3 collapsible text zones, reference image upload, dynamic prompt; 3 output handles |
| `src/components/workflow/nodes/TextCompositeNode.tsx` | Create | Node UI: language dropdown, status, preview; 2 input handles, 1 output handle |
| `src/components/workflow/nodes/index.ts` | Modify | Export `BannerInputNode` and `TextCompositeNode` |
| `src/components/workflow/WorkflowCanvas.tsx` | Modify | Import and register `bannerInput` and `textComposite` in `nodeTypes` |
| `src/hooks/useWorkflowExecution.ts` | Modify | Add `extractTextConfig`, `executeTextComposite`; register in `EXECUTABLE_NODE_TYPES`, `executeNode`, `canExecuteNode` |
| `src/lib/workflow-templates/banner-campaign.ts` | Create | Pre-wired template: BannerInput → NanoBananaPro → 2× TextComposite (SE+NO) → 2× Preview |
| `src/lib/workflow-templates/index.ts` | Modify | Register `bannerCampaignTemplate` |

---

## Task 1: Foundation — Types + Handle Registration

**Files:**
- Modify: `src/components/workflow/types.ts`
- Modify: `src/components/workflow/WorkflowContext.tsx`

**Interfaces:**
- Produces: `TextPosition`, `TextZone`, `BannerInputNodeData`, `TextCompositeNodeData` — used by all later tasks

- [ ] **Step 1: Add new types to `src/components/workflow/types.ts`**

Find the comment `// ProductInput node data type` (currently around line 220) and insert the following BEFORE it:

```ts
// Text overlay types for BannerInputNode
export type TextPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface TextZone {
  content: string;
  font: "Inter" | "Poppins" | "Montserrat" | "Oswald" | "Bebas Neue";
  size: number; // px
  color: string; // hex e.g. "#FFFFFF"
  position: TextPosition;
}
```

Then after the existing `LanguagePromptNodeData` block, add:

```ts
// BannerInput node data type
export interface BannerInputNodeData extends BaseNodeData {
  productName?: string;
  brand?: string;
  scentNotes?: string;
  styleKeywords?: string;
  brandColor?: string;
  taglineDirection?: string;
  textZones: [TextZone, TextZone, TextZone]; // [headline, bodyCopy, cta]
  referenceImageUrl?: string;
  dynamicPrompt?: string;
  prompt?: string; // computed output — carries the built image-gen prompt
}

// TextComposite node data type
export interface TextCompositeNodeData extends BaseNodeData {
  language: "sv" | "no";
  imageUrl?: string; // received master image (input)
  textConfig?: TextZone[]; // received from BannerInputNode (input)
  outputUrl?: string; // composited result (output)
  isGenerating?: boolean;
}
```

- [ ] **Step 2: Extend the `WorkflowNodeData` union**

Find the `WorkflowNodeData` union type and add the two new types:

```ts
// Before: | ProductInputNodeData | LanguagePromptNodeData;
// After:
  | ProductInputNodeData
  | LanguagePromptNodeData
  | BannerInputNodeData
  | TextCompositeNodeData;
```

- [ ] **Step 3: Extend the `NodeType` union**

Find the `NodeType` union and append:

```ts
  | "bannerInput"
  | "textComposite"
```

- [ ] **Step 4: Register the `textConfig` handle in `src/components/workflow/WorkflowContext.tsx`**

In `HANDLE_COLORS`, add after the `audio` line:

```ts
  textConfig: "#2DD4BF", // Teal - text zone configuration data
```

In `COMPATIBLE_HANDLES`, add after the `transcript` line:

```ts
  textConfig: ["textConfig"],
```

- [ ] **Step 5: Verify types compile**

```bash
pnpm typecheck
```

Expected: no errors. Fix any if they appear before continuing.

- [ ] **Step 6: Commit**

```bash
git add src/components/workflow/types.ts src/components/workflow/WorkflowContext.tsx
git commit -m "feat: add TextZone, BannerInputNodeData, TextCompositeNodeData types and textConfig handle"
```

---

## Task 2: `/api/translate-text` Route

**Files:**
- Create: `src/app/api/translate-text/route.ts`

**Interfaces:**
- Consumes: `getApiKey`, `checkRateLimit`, `requireAuth` — same pattern as `src/app/api/generate-image/route.ts`
- Produces: `POST /api/translate-text` → `{ headline, bodyCopy, cta }` — consumed by `executeTextComposite` in Task 5

- [ ] **Step 1: Create `src/app/api/translate-text/route.ts`**

```ts
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

  const apiKey = await getApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "FAL API key not configured" }, { status: 500 });
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
```

- [ ] **Step 2: Run lint + typecheck**

```bash
pnpm lint && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Smoke-test the route with curl (requires dev server running)**

```bash
# Start dev server in another terminal: pnpm dev
curl -s -X POST http://localhost:3000/api/translate-text \
  -H "Content-Type: application/json" \
  -b "session=<your-session-cookie>" \
  -d '{"texts":{"headline":"Feel the forest","bodyCopy":"A woody fragrance that lingers.","cta":"Shop now"},"language":"sv"}' | jq .
```

Expected:
```json
{
  "headline": "Känn skogen",
  "bodyCopy": "En träig doft som dröjer kvar.",
  "cta": "Köp nu"
}
```

(Exact wording may vary — key point is Swedish text returns, not the original English.)

- [ ] **Step 4: Commit**

```bash
git add src/app/api/translate-text/route.ts
git commit -m "feat: add /api/translate-text route using FAL any-llm"
```

---

## Task 3: `/api/composite-image` Route

**Files:**
- Create: `src/app/api/composite-image/route.ts`

**Interfaces:**
- Consumes: `sharp` (already in package.json), `fs/promises` (Node built-in)
- Produces: `POST /api/composite-image` → `{ url: "/api/files/composites/<uuid>.png" }` — consumed by `executeTextComposite` in Task 5

- [ ] **Step 1: Create `src/app/api/composite-image/route.ts`**

```ts
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
    "top-left", "top-center", "top-right",
    "middle-left", "middle-center", "middle-right",
    "bottom-left", "bottom-center", "bottom-right",
  ]),
});

const compositeSchema = z.object({
  imageUrl: z.string().min(1),
  textZones: z.array(textZoneSchema).min(1).max(3),
});

// Map 9-point position to SVG text-anchor
const TEXT_ANCHOR: Record<string, string> = {
  "top-left": "start",    "top-center": "middle",    "top-right": "end",
  "middle-left": "start", "middle-center": "middle", "middle-right": "end",
  "bottom-left": "start", "bottom-center": "middle", "bottom-right": "end",
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
    "top-left":      { x: pad,              y: pad + size },
    "top-center":    { x: Math.round(w / 2), y: pad + size },
    "top-right":     { x: w - pad,           y: pad + size },
    "middle-left":   { x: pad,              y: midY },
    "middle-center": { x: Math.round(w / 2), y: midY },
    "middle-right":  { x: w - pad,           y: midY },
    "bottom-left":   { x: pad,              y: h - pad },
    "bottom-center": { x: Math.round(w / 2), y: h - pad },
    "bottom-right":  { x: w - pad,           y: h - pad },
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
    return NextResponse.json({ error: "Failed to fetch source image" }, { status: 400 });
  }

  const { width: w = 1920, height: h = 1080 } = await sharp(imageBuffer).metadata();

  // Build SVG overlay — each text zone as a <text> element with drop shadow
  const svgTexts = textZones.map((zone) => {
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
  }).join("\n");

  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">\n${svgTexts}\n</svg>`;

  let compositedBuffer: Buffer;
  try {
    compositedBuffer = await sharp(imageBuffer)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .png()
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "Image compositing failed" }, { status: 500 });
  }

  const url = await saveCompositeBuffer(compositedBuffer);
  return NextResponse.json({ url });
}
```

- [ ] **Step 2: Run lint + typecheck**

```bash
pnpm lint && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Smoke-test the route**

Create a test with a real image URL (replace with any `/api/files/...` URL from a prior workflow run):

```bash
curl -s -X POST http://localhost:3000/api/composite-image \
  -H "Content-Type: application/json" \
  -b "session=<your-session-cookie>" \
  -d '{
    "imageUrl": "/api/files/workflows/some-existing-image.png",
    "textZones": [
      {"content":"Känn skogen","font":"Bebas Neue","size":72,"color":"#FFFFFF","position":"top-center"},
      {"content":"En doft som stannar kvar.","font":"Poppins","size":22,"color":"#EEEEEE","position":"middle-center"},
      {"content":"Köp nu","font":"Inter","size":28,"color":"#FFFFFF","position":"bottom-center"}
    ]
  }' | jq .
```

Expected:
```json
{ "url": "/api/files/composites/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.png" }
```

Open that URL in the browser to verify text appears on the image.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/composite-image/route.ts
git commit -m "feat: add /api/composite-image route using sharp + SVG overlay"
```

---

## Task 4: `BannerInputNode` Component

**Files:**
- Create: `src/components/workflow/nodes/BannerInputNode.tsx`
- Modify: `src/components/workflow/nodes/index.ts`
- Modify: `src/components/workflow/WorkflowCanvas.tsx`

**Interfaces:**
- Consumes: `BaseNodeData`, `BannerInputNodeData`, `TextZone`, `TextPosition` from `../types`; `useFileUpload` from `@/hooks/useFileUpload`; `BaseNode` from `./BaseNode`
- Produces: Node with output handles `prompt` (purple), `image` (orange), `textConfig` (teal)

- [ ] **Step 1: Create `src/components/workflow/nodes/BannerInputNode.tsx`**

```tsx
"use client";

import { memo, useCallback, useState } from "react";
import type { NodeProps, Node } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import Image from "next/image";
import BaseNode from "./BaseNode";
import { useFileUpload } from "@/hooks/useFileUpload";
import type { BannerInputNodeData, TextZone, TextPosition } from "../types";

const FONTS = ["Inter", "Poppins", "Montserrat", "Oswald", "Bebas Neue"] as const;
const POSITIONS: TextPosition[] = [
  "top-left", "top-center", "top-right",
  "middle-left", "middle-center", "middle-right",
  "bottom-left", "bottom-center", "bottom-right",
];
const ZONE_LABELS = ["Headline", "Body Copy", "CTA"] as const;

const DEFAULT_ZONES: [TextZone, TextZone, TextZone] = [
  { content: "", font: "Bebas Neue", size: 64, color: "#FFFFFF", position: "top-center" },
  { content: "", font: "Poppins", size: 18, color: "#EEEEEE", position: "middle-center" },
  { content: "", font: "Inter", size: 28, color: "#FFFFFF", position: "bottom-center" },
];

const PRODUCT_FIELDS: {
  key: keyof Omit<BannerInputNodeData, "label" | "prompt" | "textZones" | "referenceImageUrl" | "dynamicPrompt">;
  label: string;
  placeholder: string;
}[] = [
  { key: "productName", label: "Product Name", placeholder: "e.g. Sauvage" },
  { key: "brand", label: "Brand", placeholder: "e.g. Dior" },
  { key: "scentNotes", label: "Scent Notes", placeholder: "e.g. woody, bergamot" },
  { key: "styleKeywords", label: "Style", placeholder: "e.g. luxury, dark, moody" },
  { key: "brandColor", label: "Brand Color", placeholder: "#1A1A1A" },
  { key: "taglineDirection", label: "Tagline Direction", placeholder: "Tagline direction..." },
];

function buildPrompt(data: BannerInputNodeData): string {
  const zones = data.textZones ?? DEFAULT_ZONES;
  const parts = [
    `Product: ${data.productName ?? ""} by ${data.brand ?? ""}`,
    `Scent: ${data.scentNotes ?? ""}`,
    `Style: ${data.styleKeywords ?? ""}`,
    `Brand color: ${data.brandColor ?? ""}`,
    `Tagline direction: ${data.taglineDirection ?? ""}`,
  ];
  if (zones[0]?.content) parts.push(`Headline at ${zones[0].position}: "${zones[0].content}"`);
  if (zones[1]?.content) parts.push(`Body copy at ${zones[1].position}: "${zones[1].content}"`);
  if (zones[2]?.content) parts.push(`CTA at ${zones[2].position}: "${zones[2].content}"`);
  if (data.dynamicPrompt) parts.push(data.dynamicPrompt);
  return parts.join("\n");
}

const inputStyle = {
  backgroundColor: "rgb(31, 31, 35)",
};

const BannerInputNode = memo(function BannerInputNode({
  id,
  data,
  selected,
}: NodeProps<Node<BannerInputNodeData>>) {
  const { setNodes } = useReactFlow();
  const [openZone, setOpenZone] = useState<number | null>(null);
  const { upload, isUploading } = useFileUpload({ category: "workflows" });

  const nodeData = data as BannerInputNodeData;
  const textZones: [TextZone, TextZone, TextZone] = nodeData.textZones ?? DEFAULT_ZONES;

  const updateField = useCallback(
    (key: string, value: string) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== id) return n;
          const next = { ...n.data, [key]: value } as BannerInputNodeData;
          return { ...n, data: { ...next, prompt: buildPrompt(next) } };
        })
      );
    },
    [id, setNodes]
  );

  const updateZone = useCallback(
    (zoneIndex: number, field: keyof TextZone, value: string | number) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== id) return n;
          const d = n.data as BannerInputNodeData;
          const zones: [TextZone, TextZone, TextZone] = [
            ...(d.textZones ?? DEFAULT_ZONES),
          ] as [TextZone, TextZone, TextZone];
          zones[zoneIndex] = { ...zones[zoneIndex], [field]: value } as TextZone;
          const next = { ...d, textZones: zones };
          return { ...n, data: { ...next, prompt: buildPrompt(next) } };
        })
      );
    },
    [id, setNodes]
  );

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = await upload(file);
      if (url) updateField("referenceImageUrl", url);
    },
    [upload, updateField]
  );

  return (
    <BaseNode
      label={nodeData.label || "Banner Input"}
      selected={selected}
      inputs={[]}
      outputs={[
        { id: "prompt", label: "Prompt", color: "#A78BFA" },
        { id: "image", label: "Ref Image", color: "#F59E0B" },
        { id: "textConfig", label: "Text Config", color: "#2DD4BF" },
      ]}
    >
      <div className="flex w-full max-w-[264px] flex-col gap-3">
        {/* Product info */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] font-medium text-zinc-400 uppercase tracking-wide">Product Info</span>
          {PRODUCT_FIELDS.map(({ key, label, placeholder }) => (
            <div key={key} className="flex flex-col gap-0.5">
              <span className="text-[10px] text-zinc-500">{label}</span>
              <input
                className="nodrag nowheel w-full rounded-md px-2 py-1 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                style={inputStyle}
                type="text"
                placeholder={placeholder}
                value={(nodeData[key] as string) ?? ""}
                onChange={(e) => updateField(key, e.target.value)}
              />
            </div>
          ))}
        </div>

        {/* Text zones */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-medium text-zinc-400 uppercase tracking-wide">Text Zones</span>
          {ZONE_LABELS.map((label, i) => (
            <div key={i} className="flex flex-col rounded-md overflow-hidden" style={{ border: "1px solid rgb(63,63,70)" }}>
              <button
                className="nodrag flex items-center justify-between px-2 py-1.5 text-left text-[11px] text-zinc-300 hover:text-white"
                style={{ backgroundColor: "rgb(24,24,27)" }}
                onClick={() => setOpenZone(openZone === i ? null : i)}
              >
                <span>{label}</span>
                <span className="text-zinc-500">{openZone === i ? "▲" : "▼"}</span>
              </button>
              {openZone === i && (
                <div className="flex flex-col gap-1.5 p-2" style={{ backgroundColor: "rgb(31,31,35)" }}>
                  <textarea
                    className="nodrag nowheel w-full resize-none rounded px-2 py-1 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-teal-500/50"
                    style={inputStyle}
                    rows={2}
                    placeholder={`${label} text...`}
                    value={textZones[i]?.content ?? ""}
                    onChange={(e) => updateZone(i, "content", e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-1">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-zinc-500">Font</span>
                      <select
                        className="nodrag nowheel rounded px-1 py-0.5 text-[11px] text-white focus:outline-none"
                        style={inputStyle}
                        value={textZones[i]?.font ?? "Inter"}
                        onChange={(e) => updateZone(i, "font", e.target.value)}
                      >
                        {FONTS.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-zinc-500">Size (px)</span>
                      <input
                        className="nodrag nowheel rounded px-1 py-0.5 text-[11px] text-white focus:outline-none"
                        style={inputStyle}
                        type="number"
                        min={8}
                        max={300}
                        value={textZones[i]?.size ?? 48}
                        onChange={(e) => updateZone(i, "size", Number(e.target.value))}
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-zinc-500">Color</span>
                      <div className="flex items-center gap-1">
                        <input
                          className="nodrag h-6 w-6 cursor-pointer rounded"
                          type="color"
                          value={textZones[i]?.color ?? "#FFFFFF"}
                          onChange={(e) => updateZone(i, "color", e.target.value)}
                        />
                        <input
                          className="nodrag nowheel min-w-0 flex-1 rounded px-1 py-0.5 text-[11px] text-white focus:outline-none"
                          style={inputStyle}
                          type="text"
                          value={textZones[i]?.color ?? "#FFFFFF"}
                          onChange={(e) => updateZone(i, "color", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-zinc-500">Position</span>
                      <select
                        className="nodrag nowheel rounded px-1 py-0.5 text-[11px] text-white focus:outline-none"
                        style={inputStyle}
                        value={textZones[i]?.position ?? "top-center"}
                        onChange={(e) => updateZone(i, "position", e.target.value as TextPosition)}
                      >
                        {POSITIONS.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Reference image */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-medium text-zinc-400 uppercase tracking-wide">Reference Image</span>
          {nodeData.referenceImageUrl ? (
            <div className="relative w-full overflow-hidden rounded-md" style={{ aspectRatio: "16/9" }}>
              <Image
                src={nodeData.referenceImageUrl}
                alt="Reference"
                fill
                className="object-cover"
              />
              <button
                className="nodrag absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-zinc-300 hover:text-white"
                onClick={() => updateField("referenceImageUrl", "")}
              >
                ✕
              </button>
            </div>
          ) : (
            <label className="nodrag flex cursor-pointer flex-col items-center justify-center rounded-md py-3 text-[11px] text-zinc-500 hover:text-zinc-300" style={{ border: "1px dashed rgb(63,63,70)" }}>
              {isUploading ? "Uploading..." : "Click to upload reference image"}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          )}
        </div>

        {/* Dynamic prompt */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-zinc-500">Dynamic Prompt</span>
          <textarea
            className="nodrag nowheel w-full resize-none rounded-md px-2 py-1 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
            style={inputStyle}
            rows={2}
            placeholder="Extra mood or style instructions..."
            value={nodeData.dynamicPrompt ?? ""}
            onChange={(e) => updateField("dynamicPrompt", e.target.value)}
          />
        </div>
      </div>
    </BaseNode>
  );
});

export default BannerInputNode;
```

- [ ] **Step 2: Export from `src/components/workflow/nodes/index.ts`**

Add at the end of the file:

```ts
export { default as BannerInputNode } from "./BannerInputNode";
```

- [ ] **Step 3: Register in `src/components/workflow/WorkflowCanvas.tsx`**

Add to the imports block (after existing node imports):

```ts
import {
  // ... existing imports ...
  BannerInputNode,
} from "./nodes";
```

Add to the `nodeTypes` const (after `languagePrompt`):

```ts
  bannerInput: BannerInputNode,
```

- [ ] **Step 4: Run lint + typecheck**

```bash
pnpm lint && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 5: Verify node renders**

Start the dev server (`pnpm dev`) and open the workflow editor. Drag a `BannerInput` node from the sidebar (or add it via NodeActionMenu), confirm it renders with the product fields, text zone panels, reference image upload, and dynamic prompt textarea. Confirm the three output handles are visible.

- [ ] **Step 6: Commit**

```bash
git add src/components/workflow/nodes/BannerInputNode.tsx \
        src/components/workflow/nodes/index.ts \
        src/components/workflow/WorkflowCanvas.tsx
git commit -m "feat: add BannerInputNode with text zones, reference image, and dynamic prompt"
```

---

## Task 5: `TextCompositeNode` + Execution Wiring

**Files:**
- Create: `src/components/workflow/nodes/TextCompositeNode.tsx`
- Modify: `src/components/workflow/nodes/index.ts`
- Modify: `src/components/workflow/WorkflowCanvas.tsx`
- Modify: `src/hooks/useWorkflowExecution.ts`

**Interfaces:**
- Consumes: `TextCompositeNodeData`, `BannerInputNodeData`, `TextZone` from types; `apiFetch` from `@/lib/csrf`
- Produces: Node with input handles `image` (orange) + `textConfig` (teal), output handle `image` (orange); `executeTextComposite` function registered in `useWorkflowExecution`

- [ ] **Step 1: Create `src/components/workflow/nodes/TextCompositeNode.tsx`**

```tsx
"use client";

import { memo } from "react";
import type { NodeProps, Node } from "@xyflow/react";
import Image from "next/image";
import BaseNode from "./BaseNode";
import { useNodeUpdate } from "./useNodeUpdate";
import { DropdownBadge } from "./NodeBadges";
import type { TextCompositeNodeData } from "../types";

const TextCompositeNode = memo(function TextCompositeNode({
  id,
  data,
  selected,
}: NodeProps<Node<TextCompositeNodeData>>) {
  const updateData = useNodeUpdate(id);
  const nodeData = data as TextCompositeNodeData;

  const languageOptions = [
    { value: "sv", label: "Swedish 🇸🇪" },
    { value: "no", label: "Norwegian 🇳🇴" },
  ];

  return (
    <BaseNode
      label={nodeData.label || "Text Composite"}
      selected={selected}
      inputs={[
        { id: "image", label: "Image", color: "#F59E0B" },
        { id: "textConfig", label: "Text Config", color: "#2DD4BF" },
      ]}
      outputs={[{ id: "image", label: "Image", color: "#F59E0B" }]}
      isGenerating={nodeData.isGenerating}
    >
      <div className="flex w-full max-w-[264px] flex-col gap-2">
        <DropdownBadge
          value={nodeData.language || "sv"}
          options={languageOptions}
          onSelect={(v) => updateData("language", v)}
        />

        {nodeData.isGenerating ? (
          <div
            className="animate-pulse rounded-lg p-3 text-[10px] text-zinc-500"
            style={{ backgroundColor: "rgb(31,31,35)" }}
          >
            Translating and compositing...
          </div>
        ) : nodeData.outputUrl ? (
          <div className="relative w-full overflow-hidden rounded-md" style={{ aspectRatio: "16/9" }}>
            <Image
              src={nodeData.outputUrl}
              alt="Composited banner"
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div
            className="rounded-lg p-3 text-[10px] text-zinc-600"
            style={{ backgroundColor: "rgb(31,31,35)" }}
          >
            Connect an image + Text Config, then run
          </div>
        )}
      </div>
    </BaseNode>
  );
});

export default TextCompositeNode;
```

- [ ] **Step 2: Export from `src/components/workflow/nodes/index.ts`**

Add at the end of the file:

```ts
export { default as TextCompositeNode } from "./TextCompositeNode";
```

- [ ] **Step 3: Register in `src/components/workflow/WorkflowCanvas.tsx`**

Add to the imports block:

```ts
import {
  // ... existing imports ...
  BannerInputNode,
  TextCompositeNode,
} from "./nodes";
```

Add to `nodeTypes`:

```ts
  bannerInput: BannerInputNode,
  textComposite: TextCompositeNode,
```

- [ ] **Step 4: Wire `textComposite` into `src/hooks/useWorkflowExecution.ts`**

**4a.** Add new imports at the top of the file (after existing imports):

```ts
import type {
  // ... existing types ...
  TextCompositeNodeData,
  BannerInputNodeData,
  TextZone,
} from "@/components/workflow/types";
```

**4b.** Add `"textComposite"` to `EXECUTABLE_NODE_TYPES`:

```ts
const EXECUTABLE_NODE_TYPES = new Set([
  // ... existing types ...
  "languagePrompt",
  "textComposite", // ← add this
]);
```

**4c.** Add the `extractTextConfig` helper after `extractVideoUrl`:

```ts
const extractTextConfig = useCallback(
  (inputs: ConnectedInput[]): TextZone[] | undefined => {
    const textConfigInput = inputs.find(
      (input) => input.handleType === "textConfig"
    );
    if (textConfigInput) {
      const d = textConfigInput.data as BannerInputNodeData;
      return d.textZones;
    }
    return undefined;
  },
  []
);
```

**4d.** Add the `executeTextComposite` callback after `executeLanguagePrompt`:

```ts
const executeTextComposite = useCallback(
  async (
    nodeId: string,
    nodeData: TextCompositeNodeData,
    inputs: ConnectedInput[]
  ): Promise<ExecutionResult> => {
    // Extract master image from connected image gen node
    const imageInput = inputs.find(
      (input) =>
        input.handleType === "image" ||
        input.nodeType === "nanoBananaPro" ||
        input.nodeType === "seedream45" ||
        input.nodeType === "file"
    );
    let imageUrl: string | undefined;
    if (imageInput) {
      const d = imageInput.data as { imageUrl?: string; outputUrl?: string };
      imageUrl = d.imageUrl ?? d.outputUrl;
    }

    const textZones = extractTextConfig(inputs);

    if (!imageUrl) {
      return { success: false, error: "Connect an image source (image gen node or file)." };
    }
    if (!textZones || textZones.length === 0) {
      return { success: false, error: "Connect a Banner Input node to supply text zones." };
    }

    updateNodeData(nodeId, { isGenerating: true });

    try {
      // Step 1: translate text content to target language
      const translateRes = await apiFetch("/api/translate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texts: {
            headline: textZones[0]?.content ?? "",
            bodyCopy: textZones[1]?.content ?? "",
            cta: textZones[2]?.content ?? "",
          },
          language: nodeData.language ?? "sv",
        }),
        timeout: 30000,
      });

      if (!translateRes.ok) {
        const err = await translateRes.json();
        updateNodeData(nodeId, { isGenerating: false });
        return { success: false, error: err.error ?? "Translation failed" };
      }

      const translated = await translateRes.json() as {
        headline: string;
        bodyCopy: string;
        cta: string;
      };

      // Merge translated content with original styling
      const translatedZones = textZones.map((zone, i) => ({
        ...zone,
        content: [translated.headline, translated.bodyCopy, translated.cta][i] ?? zone.content,
      }));

      // Step 2: composite translated text onto master image
      const compositeRes = await apiFetch("/api/composite-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, textZones: translatedZones }),
        timeout: 60000,
      });

      if (!compositeRes.ok) {
        const err = await compositeRes.json();
        updateNodeData(nodeId, { isGenerating: false });
        return { success: false, error: err.error ?? "Compositing failed" };
      }

      const { url } = await compositeRes.json() as { url: string };

      updateNodeData(nodeId, {
        outputUrl: url,
        imageUrl,
        textConfig: textZones,
        isGenerating: false,
      });

      return { success: true, data: { url } };
    } catch {
      updateNodeData(nodeId, { isGenerating: false });
      throw new Error("Text composite failed");
    }
  },
  [extractTextConfig, updateNodeData]
);
```

**4e.** Add the `case "textComposite"` to `executeNode`'s switch (after the `languagePrompt` case):

```ts
case "textComposite":
  result = await executeTextComposite(
    nodeId,
    nodeData as TextCompositeNodeData,
    inputs
  );
  break;
```

**4f.** Add the `case "textComposite"` to `canExecuteNode`'s switch (after the `languagePrompt` case):

```ts
case "textComposite": {
  const hasImage = inputs.some(
    (input) =>
      input.handleType === "image" ||
      input.nodeType === "nanoBananaPro" ||
      input.nodeType === "seedream45" ||
      input.nodeType === "file"
  );
  const hasTextConfig = inputs.some((input) => input.handleType === "textConfig");
  if (!hasImage) return { canExecute: false, reason: "Connect an image source" };
  if (!hasTextConfig) return { canExecute: false, reason: "Connect a Banner Input node" };
  return { canExecute: true };
}
```

**4g.** Add `executeTextComposite` and `extractTextConfig` to the `executeNode` dependency array:

```ts
// In the useCallback deps array of executeNode:
[
  getNodes,
  getConnectedInputs,
  // ... existing deps ...
  executeLanguagePrompt,
  executeTextComposite, // ← add
]
```

- [ ] **Step 5: Run lint + typecheck**

```bash
pnpm lint && pnpm typecheck
```

Expected: no errors. Common issues to watch for:
- `extractTextConfig` used in `executeTextComposite` but not yet in the outer scope — it must be declared before the callback that uses it
- Missing type imports — ensure `TextCompositeNodeData`, `BannerInputNodeData`, `TextZone` are all imported

- [ ] **Step 6: End-to-end smoke test**

In the workflow editor:
1. Drop a `BannerInputNode` and fill in: Brand = "Dior", ProductName = "Sauvage", Headline zone content = "Feel the power"
2. Drop a `NanoBananaProNode`, connect BannerInput `[prompt]` → NanoBananaPro `[prompt]`
3. Drop a `TextCompositeNode` (language: Swedish)
4. Connect NanoBananaPro `[image]` → TextComposite `[image]`
5. Connect BannerInput `[textConfig]` → TextComposite `[textConfig]`
6. Run all — confirm TextComposite produces an image with Swedish text

- [ ] **Step 7: Commit**

```bash
git add src/components/workflow/nodes/TextCompositeNode.tsx \
        src/components/workflow/nodes/index.ts \
        src/components/workflow/WorkflowCanvas.tsx \
        src/hooks/useWorkflowExecution.ts
git commit -m "feat: add TextCompositeNode and wire textComposite execution into useWorkflowExecution"
```

---

## Task 6: Banner Campaign Template

**Files:**
- Create: `src/lib/workflow-templates/banner-campaign.ts`
- Modify: `src/lib/workflow-templates/index.ts`

**Interfaces:**
- Consumes: `WorkflowNode`, `WorkflowEdge`, `WorkflowTemplate` from `@/components/workflow/types`
- Produces: `bannerCampaignTemplate` — pre-wired graph surfaced in the Templates toolbar button

- [ ] **Step 1: Create `src/lib/workflow-templates/banner-campaign.ts`**

`WorkflowTemplate` is already defined and exported from `./parfym-banner` — import from there, do NOT redefine it.

```ts
import type { WorkflowNode, WorkflowEdge } from "@/components/workflow/types";
import type { WorkflowTemplate } from "./parfym-banner";

export const bannerCampaignTemplate: WorkflowTemplate = {
  name: "Banner Campaign",
  description: "Generate SE/NO banner variants with custom text overlays",
  nodes: [
    // Column 1 — banner input
    {
      id: "tpl-banner",
      type: "bannerInput",
      position: { x: 50, y: 200 },
      data: {
        label: "Banner Input",
        productName: "",
        brand: "",
        scentNotes: "",
        styleKeywords: "",
        brandColor: "",
        taglineDirection: "",
        textZones: [
          { content: "", font: "Bebas Neue", size: 64, color: "#FFFFFF", position: "top-center" },
          { content: "", font: "Poppins", size: 18, color: "#EEEEEE", position: "middle-center" },
          { content: "", font: "Inter", size: 28, color: "#FFFFFF", position: "bottom-center" },
        ],
        referenceImageUrl: "",
        dynamicPrompt: "",
        prompt: "",
      } as WorkflowNode["data"],
    },

    // Column 2 — master image generation
    {
      id: "tpl-gen",
      type: "nanoBananaPro",
      position: { x: 450, y: 200 },
      data: {
        label: "Master Image",
        mode: "text-to-image",
        aspectRatio: "16:9",
        resolution: "1K",
        outputFormat: "png",
        numImages: 1,
        enableWebSearch: false,
        enableSafetyChecker: true,
        isGenerating: false,
      } as WorkflowNode["data"],
    },

    // Column 3 — language variants (parallel)
    {
      id: "tpl-composite-se",
      type: "textComposite",
      position: { x: 850, y: 50 },
      data: {
        label: "Swedish Banner",
        language: "sv",
        isGenerating: false,
      } as WorkflowNode["data"],
    },
    {
      id: "tpl-composite-no",
      type: "textComposite",
      position: { x: 850, y: 400 },
      data: {
        label: "Norwegian Banner",
        language: "no",
        isGenerating: false,
      } as WorkflowNode["data"],
    },

    // Column 4 — previews
    {
      id: "tpl-preview-se",
      type: "preview",
      position: { x: 1200, y: 50 },
      data: { label: "Preview SE" } as WorkflowNode["data"],
    },
    {
      id: "tpl-preview-no",
      type: "preview",
      position: { x: 1200, y: 400 },
      data: { label: "Preview NO" } as WorkflowNode["data"],
    },
  ],

  edges: [
    // BannerInput → NanoBananaPro (prompt)
    {
      id: "tpl-e1",
      source: "tpl-banner",
      sourceHandle: "prompt",
      target: "tpl-gen",
      targetHandle: "prompt",
      type: "gradient",
    },
    // BannerInput → NanoBananaPro (reference image, optional)
    {
      id: "tpl-e2",
      source: "tpl-banner",
      sourceHandle: "image",
      target: "tpl-gen",
      targetHandle: "image1",
      type: "gradient",
    },
    // NanoBananaPro → TextComposite SE (master image)
    {
      id: "tpl-e3",
      source: "tpl-gen",
      sourceHandle: "image",
      target: "tpl-composite-se",
      targetHandle: "image",
      type: "gradient",
    },
    // NanoBananaPro → TextComposite NO (master image)
    {
      id: "tpl-e4",
      source: "tpl-gen",
      sourceHandle: "image",
      target: "tpl-composite-no",
      targetHandle: "image",
      type: "gradient",
    },
    // BannerInput → TextComposite SE (textConfig)
    {
      id: "tpl-e5",
      source: "tpl-banner",
      sourceHandle: "textConfig",
      target: "tpl-composite-se",
      targetHandle: "textConfig",
      type: "gradient",
    },
    // BannerInput → TextComposite NO (textConfig)
    {
      id: "tpl-e6",
      source: "tpl-banner",
      sourceHandle: "textConfig",
      target: "tpl-composite-no",
      targetHandle: "textConfig",
      type: "gradient",
    },
    // TextComposite SE → Preview SE
    {
      id: "tpl-e7",
      source: "tpl-composite-se",
      sourceHandle: "image",
      target: "tpl-preview-se",
      targetHandle: "image",
      type: "gradient",
    },
    // TextComposite NO → Preview NO
    {
      id: "tpl-e8",
      source: "tpl-composite-no",
      sourceHandle: "image",
      target: "tpl-preview-no",
      targetHandle: "image",
      type: "gradient",
    },
  ],
};
```

- [ ] **Step 2: Register in `src/lib/workflow-templates/index.ts`**

Replace the entire file contents with:

```ts
import { parfymBannerTemplate, type WorkflowTemplate } from "./parfym-banner";
import { bannerCampaignTemplate } from "./banner-campaign";

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  parfymBannerTemplate,
  bannerCampaignTemplate,
];

export type { WorkflowTemplate };
```

- [ ] **Step 3: Run lint + typecheck**

```bash
pnpm lint && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Verify template loads in UI**

1. Open the workflow editor and click the Templates button in the bottom toolbar
2. Confirm "Banner Campaign" appears in the list alongside "Parfym Banner Campaign"
3. Load the template — confirm all 6 nodes appear, all 8 edges are connected correctly
4. Fill in brand/product info in BannerInputNode, add text zone content, run all
5. Confirm SE and NO preview nodes show composited banners with translated text

- [ ] **Step 5: Commit**

```bash
git add src/lib/workflow-templates/banner-campaign.ts \
        src/lib/workflow-templates/index.ts
git commit -m "feat: add Banner Campaign workflow template with SE and NO text composite nodes"
```

---

## Self-Review Checklist

After completing all tasks, verify:

- [ ] `BannerInputNode` renders 3 collapsible text zone panels each with content, font, size, color picker + hex input, and position dropdown
- [ ] `BannerInputNode` reference image upload works and shows preview with ✕ button
- [ ] `BannerInputNode` dynamic prompt field appends to the generated prompt output
- [ ] `TextCompositeNode` language dropdown switches between Swedish and Norwegian
- [ ] Running a workflow with BannerInput → NanoBananaPro → 2× TextComposite produces two images with translated text composited at the specified positions
- [ ] Skip-AI path works: connect BannerInput `[image]` directly to TextComposite `[image]` when a reference image is uploaded — text is composited onto the reference without going through NanoBananaPro
- [ ] `pnpm lint && pnpm typecheck` passes with zero errors across all modified files

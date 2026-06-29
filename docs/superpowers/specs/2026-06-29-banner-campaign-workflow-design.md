# Banner Campaign Workflow — Design Spec

**Date:** 2026-06-29  
**Status:** Approved  

---

## Overview

Extend the visual workflow builder with two new nodes — `BannerInputNode` and `TextCompositeNode` — that together enable a fully configurable banner campaign workflow. The user collects product info plus three styled text zones (headline, body copy, CTA), optionally uploads a reference image, generates a master banner via any image model, then fans out to parallel Swedish and Norwegian variants where only the text is translated and composited onto the master image.

---

## Workflow Structure

```
┌─────────────────────────┐
│     BannerInputNode      │
│  • Product info fields   │
│  • 3 text zones          │
│    (headline/body/CTA)   │
│    each: text, font,     │
│    size, color, position │
│  • Reference image upload│
│  • Dynamic prompt field  │
└────────┬────────┬────────┘
         │        │
    [prompt]  [image] (ref)
         │        │
         ▼        ▼
┌─────────────────────────┐
│   NanoBananaPro / any   │
│   image generation node │
└────────────┬────────────┘
             │ [image] (master)
        ┌────┴────┐
        ▼         ▼
┌──────────────┐ ┌──────────────┐
│TextComposite │ │TextComposite │
│ language: SE │ │ language: NO │
│ translates + │ │ translates + │
│ composites   │ │ composites   │
└──────┬───────┘ └──────┬───────┘
       │ [image]        │ [image]
       ▼                ▼
  [PreviewNode]    [PreviewNode]
```

**Skip-AI path:** If the user wants to composite text onto their reference image directly (no AI generation), they connect `BannerInputNode`'s `[image]` output straight to `TextCompositeNode`'s `[image]` input, bypassing the image gen node entirely.

---

## Node 1: BannerInputNode

### Purpose
Single input node that collects all banner campaign configuration: product metadata, three typed text zones with full typography controls, an optional reference image, and a free-form dynamic prompt.

### UI Sections (within the node)

**Product Info** — same fields as the current `ProductInputNode`:
- Product Name, Brand, Scent Notes, Style Keywords, Brand Color, Tagline Direction

**Text Zones** — three collapsible panels labelled Headline, Body Copy, CTA. Each panel contains:

| Field | Type | Notes |
|-------|------|-------|
| Content | textarea | Free-form text |
| Font | dropdown | Inter, Poppins, Montserrat, Oswald, Bebas Neue |
| Size | number input | Pixels, e.g. 48 |
| Color | hex input | e.g. #FFFFFF |
| Position | dropdown | 9-point grid (see below) |

**Position values:** `top-left`, `top-center`, `top-right`, `middle-left`, `middle-center`, `middle-right`, `bottom-left`, `bottom-center`, `bottom-right`

**Reference Image** — upload/drop zone (same pattern as `FileNode`). Stores URL in node data. Optional.

**Dynamic Prompt** — textarea appended verbatim to the generated image prompt. Examples: "dark moody lighting", "morning mist background", "hyper-realistic product render".

### Output Handles

| Handle ID | Color | Data |
|-----------|-------|------|
| `prompt` | `#A78BFA` (purple) | Full constructed image-gen prompt string |
| `image` | `#F59E0B` (orange) | Reference image URL (if uploaded) |
| `textConfig` | `#2DD4BF` (teal) | Serialised array of 3 `TextZone` objects |

### Prompt Construction

The node builds the `prompt` string by:
1. Combining product fields (same logic as current `ProductInputNode.buildPrompt`)
2. Adding text overlay intent: `"Text overlay: headline '${headline.content}' at ${headline.position}, body '${bodyCopy.content}', CTA '${cta.content}'"`
3. Appending `dynamicPrompt` if present
4. Appending layout/style from brand color and style keywords

---

## Node 2: TextCompositeNode

### Purpose
Takes a master image and the text zone config, translates the text content to the selected language, then composites the translated text onto the image using server-side rendering. Produces a new image with only the text changed.

### Input Handles

| Handle ID | Color | Source |
|-----------|-------|--------|
| `image` | `#F59E0B` (orange) | Master image from image gen node (or reference image directly) |
| `textConfig` | `#2DD4BF` (teal) | Text zones from `BannerInputNode` |

### Node UI Controls
- Language dropdown: `Swedish 🇸🇪` / `Norwegian 🇳🇴`
- Small composited preview once run
- Status indicator (translating / compositing / done)

### Output Handle
- `image` (orange) → final composited banner → PreviewNode or OutputNode

### Execution Flow

1. **Translate** — POST to `/api/translate-text` with the 3 text zone `content` strings + `language`. Returns translated headline, body copy, CTA strings.
2. **Composite** — POST to `/api/composite-image` with the master image URL + translated text zones (each with font/size/color/position). Server loads the image, renders each text zone at the specified position, exports PNG.
3. **Store** — result uploaded via existing upload infrastructure, URL stored in node data as `outputUrl`.

---

## New TypeScript Types

Add to `src/components/workflow/types.ts`:

```ts
type TextPosition =
  | "top-left" | "top-center" | "top-right"
  | "middle-left" | "middle-center" | "middle-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

interface TextZone {
  content: string;
  font: "Inter" | "Poppins" | "Montserrat" | "Oswald" | "Bebas Neue";
  size: number;       // px
  color: string;      // hex e.g. "#FFFFFF"
  position: TextPosition;
}

interface BannerInputNodeData extends BaseNodeData {
  productName?: string;
  brand?: string;
  scentNotes?: string;
  styleKeywords?: string;
  brandColor?: string;
  taglineDirection?: string;
  textZones: [TextZone, TextZone, TextZone]; // [headline, bodyCopy, cta]
  referenceImageUrl?: string;
  dynamicPrompt?: string;
  prompt?: string;         // computed output
}

interface TextCompositeNodeData extends BaseNodeData {
  language: "sv" | "no";
  imageUrl?: string;       // received master image
  textConfig?: TextZone[]; // received from BannerInputNode
  outputUrl?: string;      // composited result
  isGenerating?: boolean;
}
```

Add `textConfig` to `HANDLE_COLORS` and `COMPATIBLE_HANDLES` in `src/components/workflow/WorkflowContext.tsx`:
```ts
HANDLE_COLORS.textConfig = "#2DD4BF";
COMPATIBLE_HANDLES.textConfig = ["textConfig"];
```

Add to `NodeType` union: `"bannerInput" | "textComposite"`

Add to `WorkflowNodeData` union: `BannerInputNodeData | TextCompositeNodeData`

---

## New API Routes

### `POST /api/translate-text`

**Request:**
```json
{
  "texts": { "headline": "...", "bodyCopy": "...", "cta": "..." },
  "language": "sv" | "no"
}
```

**Response:**
```json
{
  "headline": "...",
  "bodyCopy": "...",
  "cta": "..."
}
```

Uses FAL any-llm (same pattern as existing `generate-prompt` route) to translate the exact provided strings — not template copy.

### `POST /api/composite-image`

**Request:**
```json
{
  "imageUrl": "https://...",
  "textZones": [
    { "content": "...", "font": "Inter", "size": 48, "color": "#FFFFFF", "position": "top-center" },
    { "content": "...", "font": "Montserrat", "size": 18, "color": "#CCCCCC", "position": "middle-center" },
    { "content": "...", "font": "Inter", "size": 24, "color": "#FFFFFF", "position": "bottom-center" }
  ]
}
```

**Response:**
```json
{ "url": "https://..." }
```

Implementation: server-side using `sharp` (already in package.json) for image I/O + the existing `src/lib/video-editor/text/` infrastructure for font loading and text rendering. Position mapping translates the 9-point label to pixel x/y coordinates based on image dimensions with 40px padding. No new dependencies required.

---

## New Workflow Template

File: `src/lib/workflow-templates/banner-campaign.ts`

Pre-wired template named `"Banner Campaign"` with:
- 1× `BannerInputNode` (column 1)
- 1× `NanoBananaProNode` (column 2, mode: text-to-image, accepts reference image)
- 2× `TextCompositeNode` (column 3, SE + NO)
- 2× `PreviewNode` (column 4)

Registered in `src/lib/workflow-templates/index.ts` and surfaced in the Templates toolbar button.

---

## File Changelist

| File | Change |
|------|--------|
| `src/components/workflow/types.ts` | Add `TextZone`, `TextPosition`, `BannerInputNodeData`, `TextCompositeNodeData`; extend `NodeType` and `WorkflowNodeData` unions |
| `src/components/workflow/WorkflowContext.tsx` | Add `textConfig` handle color + compatibility |
| `src/components/workflow/nodes/BannerInputNode.tsx` | New component |
| `src/components/workflow/nodes/TextCompositeNode.tsx` | New component |
| `src/components/workflow/nodes/index.ts` | Export new nodes |
| `src/app/api/translate-text/route.ts` | New API route |
| `src/app/api/composite-image/route.ts` | New API route |
| `src/lib/workflow-templates/banner-campaign.ts` | New template |
| `src/lib/workflow-templates/index.ts` | Register new template |
| `src/components/workflow/WorkflowCanvas.tsx` | Register new node types in `nodeTypes` map |

---

## Out of Scope

- Editing text position interactively by dragging on the preview
- More than 3 text zones
- Video banner support
- Real-time preview of compositing while typing

# Parfym Banner Workflow — Design Spec

**Date:** 2026-06-28  
**Status:** Approved  

## Context

Avenge Studio's workflow editor needs a turnkey solution for generating perfume/parfym product banners across three Scandinavian/English markets (SE, NO, EN). Currently users must manually write prompts and wire nodes for every campaign. The goal is a loadable workflow template backed by two new node types — `ProductInput` and `LanguagePrompt` — so a user can fill in product details once and generate all language × format combinations in a single "Run All."

Reference markets: parfym.se and parfym.no (hero section banners — luxury product imagery with market-specific headline, body copy, and CTA text).

---

## Architecture

```
FileNode (product photo)
    │ image (orange)
    ▼
ProductInput node ─────────────────────────────────────── ┐
  [product name · brand · scent notes · style · color · tagline] │
    │ prompt (purple)                                        │ image (orange)
    ├──────────────────────┬──────────────────────┐         │
    ▼                      ▼                      ▼         │
LanguagePrompt(SE)  LanguagePrompt(NO)  LanguagePrompt(EN) │
  calls Claude API to generate SE/NO/EN prompt text        │
    │ prompt (purple)      │                      │         │
    ▼                      ▼                      ▼         │
NanaBananaPro(16:9)  NanaBananaPro(16:9)  NanaBananaPro(16:9) ◄─┘
NanaBananaPro(1:1)   NanaBananaPro(1:1)   NanaBananaPro(1:1)
NanaBananaPro(9:16)  NanaBananaPro(9:16)  NanaBananaPro(9:16)
    │                      │                      │
    ▼ (optional)           ▼                      ▼
Kling25Turbo(SE)    Kling25Turbo(NO)    Kling25Turbo(EN)
(animated video/GIF from 16:9 hero image)
```

**Execution order** (handled by existing DAG engine in `useWorkflowExecution.ts`):
1. No-op — ProductInput + FileNode are data-only
2. Wave 1 — 3 LanguagePrompt nodes run in parallel, each calling `/api/generate-prompt`
3. Wave 2 — 9 NanaBananaPro nodes run in parallel (each reads upstream LanguagePrompt's `data.text` + FileNode's `data.imageUrl`)
4. Wave 3 — 3 Kling25Turbo nodes run in parallel (animated video from 16:9 hero image)

All 3 language branches produce **identical visual parameters** — only the text content (headline, body copy, CTA baked into the prompt) differs between SE/NO/EN.

---

## New Node Types

### `ProductInput` Node

Data-input node (not executable — same pattern as existing `PromptNode`).

**UI fields (inline badge pattern, same as NanaBananaPro):**
| Badge | Type | Purpose |
|---|---|---|
| Product name | InputBadge | e.g., "Sauvage" |
| Brand | InputBadge | e.g., "Dior" |
| Scent notes | InputBadge | e.g., "woody, bergamot, ambergris" |
| Visual style | InputBadge | e.g., "luxury, dark, minimalist, moody" |
| Brand hex color | InputBadge | e.g., "#1A1A1A" |
| Tagline direction | InputBadge | e.g., "Feel alive. Feel powerful." |

**Output handle:** `prompt` (purple) — carries all fields as structured text  
**No input handles.**

Stores data in `data.productName`, `data.brand`, `data.scentNotes`, `data.styleKeywords`, `data.brandColor`, `data.taglineDirection`.

The `prompt` output is constructed as:
```
Product: {name} by {brand}
Scent: {scentNotes}
Style: {styleKeywords}
Brand color: {brandColor}
Tagline direction: {taglineDirection}
```

---

### `LanguagePrompt` Node

Executable node — calls `/api/generate-prompt` during "Run All."

**UI fields:**
| Badge | Type | Values |
|---|---|---|
| Language | ToggleBadge | `SE` / `NO` / `EN` |
| Format | ToggleBadge | `Hero 16:9` / `Square 1:1` / `Story 9:16` |
| Generated prompt | Read-only textarea | Shown after execution, collapsed by default |

**Input handle:** `prompt` (purple) from ProductInput  
**Output handle:** `prompt` (purple)  

**On execution:**
1. Reads product context from connected ProductInput's constructed text via `extractPrompt`
2. POSTs to `/api/generate-prompt` with language + contentType + productContext
3. Receives back `{ prompt, headline, bodyCopy, cta }`
4. Stores `prompt` in `data.text` and headline/bodyCopy/cta in `data.generatedContent` for display
5. Sets `isGenerating` true/false during the API call (same shimmer animation as other nodes)

Downstream NanaBananaPro nodes read `data.text` via `extractPrompt` unchanged — no modifications to existing image generation nodes.

---

## New API Endpoint: `/api/generate-prompt`

**File:** `src/app/api/generate-prompt/route.ts`

**POST request:**
```ts
{
  productContext: string,       // structured text from ProductInput
  language: "sv" | "no" | "en",
  contentType: "hero" | "square" | "story"
}
```

**Response:**
```ts
{
  prompt: string,       // full image-gen prompt (goes into data.text)
  headline: string,     // e.g., "Känn dig levande"
  bodyCopy: string,     // e.g., "En träig doft med frisk bergamott"
  cta: string           // e.g., "Köp nu"
}
```

**Implementation:**
- Uses `@anthropic-ai/sdk` with model `claude-sonnet-4-6`
- Server-side `ANTHROPIC_API_KEY` environment variable (same pattern as other env vars)
- Same auth/rate-limiting middleware as `/api/generate-image`
- System prompt instructs Claude to generate luxury perfume marketing copy in the target language, then embed headline + bodyCopy + CTA into a NanaBananaPro-compatible image generation prompt that describes the banner scene (background, bottle placement, typography style, brand color usage)
- Content type affects prompt framing: hero = wide cinematic, square = centered product shot, story = vertical lifestyle

---

## Workflow Template System

### Template storage
**File:** `src/lib/workflow-templates/parfym-banner.ts`  
Exports a plain object `{ name: string, nodes: WorkflowNode[], edges: WorkflowEdge[] }` matching the exact React Flow serialized format already used by `handleImportWorkflow` and `handleLoadWorkflow`.

**File:** `src/lib/workflow-templates/index.ts`  
Exports `WORKFLOW_TEMPLATES` array — easy to add more templates later.

### Template loading UI
Add a **"Templates"** button to `WorkflowBottomToolbar.tsx` (alongside the existing folder/load icon). On click, shows a small dropdown listing available templates. Selecting one:
1. Shows confirmation dialog if `nodes.length > 0` (canvas not empty)
2. Calls `setNodes(template.nodes)` + `setEdges(template.edges)` + `setWorkflowName(template.name)`
3. Clears the current `workflowId` so it saves as a new workflow on first change

This reuses the exact same code path as `handleLoadWorkflow` and `handleImportWorkflow` — no new save/load infrastructure needed.

### The "Parfym Banner Campaign" template
Pre-configured 17-node graph:

| Node | Count | Pre-set config |
|---|---|---|
| FileNode | 1 | empty, waiting for product image upload |
| ProductInput | 1 | empty fields, ready to fill |
| LanguagePrompt | 3 | SE / NO / EN, each set to Hero 16:9 |
| NanaBananaPro | 9 | 3 per language × 3 aspect ratios (16:9 / 1:1 / 9:16), resolution 2K, webp |
| Kling25Turbo | 3 | one per language, image-to-video mode, 5s duration, takes 16:9 NanaBananaPro output as first frame |

Total: **17 nodes**, laid out in a 4-column grid:
- Column 1: FileNode + ProductInput
- Column 2: 3 LanguagePrompt nodes
- Columns 3–5: 3 NanaBananaPro rows × 3 language columns + 3 Kling nodes at bottom

---

## Files to Create / Modify

**New files:**
- `src/components/workflow/nodes/ProductInputNode.tsx`
- `src/components/workflow/nodes/LanguagePromptNode.tsx`
- `src/app/api/generate-prompt/route.ts`
- `src/lib/workflow-templates/parfym-banner.ts`
- `src/lib/workflow-templates/index.ts`

**Modified files:**
- `src/components/workflow/nodes/index.ts` — add `productInput` and `languagePrompt` to `nodeTypes` map
- `src/hooks/useWorkflow.ts` — add `productInput` and `languagePrompt` to `getDefaultNodeData` and node type union
- `src/hooks/useWorkflowExecution.ts` — add `languagePrompt` to `EXECUTABLE_NODE_TYPES`, implement `executeLanguagePrompt()` in the `executeNode` switch
- `src/components/workflow/WorkflowBottomToolbar.tsx` — add Templates button + dropdown
- `src/types/workflow.ts` (or wherever `WorkflowNodeType` is defined) — add `"productInput"` and `"languagePrompt"` to the union
- `.env.example` — add `ANTHROPIC_API_KEY=`

---

## Key Reused Patterns

| Pattern | Source |
|---|---|
| Executable node with `isGenerating` | `useWorkflowExecution.ts` → `executeNode()` switch |
| Node badge UI | `src/components/workflow/nodes/NodeBadges.tsx` |
| `extractPrompt()` for reading upstream prompt | `src/hooks/useWorkflowExecution.ts` |
| Load workflow from JSON | `handleLoadWorkflow` / `handleImportWorkflow` in `workflow/page.tsx` |
| Auth + rate limiting on API routes | `requireAuth()`, `checkRateLimit()` pattern |
| `getDefaultNodeData()` registration | `src/hooks/useWorkflow.ts` + toolbar's node insertion |

---

## Verification

1. Load template: click Templates → "Parfym Banner Campaign" → 16-node canvas appears in correct layout
2. Fill ProductInput: add product name, brand, scent notes, style, color, tagline
3. Upload product photo to FileNode
4. Click "Run All" → LanguagePrompt nodes execute first (shimmer border, Claude call), then 9 NanaBananaPro + 3 Kling nodes execute in parallel
5. Inspect generated prompts: expand the LanguagePrompt node's preview — verify Swedish text in SE node, Norwegian in NO, English in EN
6. Verify all 9 static images generate successfully with language-correct text visible in the banners
7. Verify 3 video clips generate for each language from the hero image
8. Run `pnpm lint && pnpm typecheck` — zero errors

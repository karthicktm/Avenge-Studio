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
                onChange={(e) => updateField(key as string, e.target.value)}
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

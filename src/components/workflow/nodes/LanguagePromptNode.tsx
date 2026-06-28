"use client";

import { memo } from "react";
import type { NodeProps, Node } from "@xyflow/react";
import BaseNode from "./BaseNode";
import { DropdownBadge } from "./NodeBadges";
import { useNodeUpdate } from "./useNodeUpdate";
import type { LanguagePromptNodeData } from "../types";

const LanguagePromptNode = memo(function LanguagePromptNode({
  id,
  data,
  selected,
}: NodeProps<Node<LanguagePromptNodeData>>) {
  const updateData = useNodeUpdate(id);

  const languageOptions = [
    { value: "sv", label: "Swedish 🇸🇪" },
    { value: "no", label: "Norwegian 🇳🇴" },
    { value: "en", label: "English 🇬🇧" },
  ];

  const contentTypeOptions = [
    { value: "hero", label: "Hero 16:9" },
    { value: "square", label: "Square 1:1" },
    { value: "story", label: "Story 9:16" },
  ];

  return (
    <BaseNode
      label={data.label || "Language Prompt"}
      selected={selected}
      inputs={[{ id: "prompt", label: "Product", color: "#A78BFA" }]}
      outputs={[{ id: "prompt", label: "Prompt", color: "#A78BFA" }]}
      isGenerating={data.isGenerating}
    >
      {/* Settings row */}
      <div className="flex flex-wrap gap-1.5">
        <DropdownBadge
          value={data.language || "sv"}
          options={languageOptions}
          onSelect={(v) => updateData("language", v)}
        />
        <DropdownBadge
          value={data.contentType || "hero"}
          options={contentTypeOptions}
          onSelect={(v) => updateData("contentType", v)}
        />
      </div>

      {/* Generated content display */}
      {data.isGenerating ? (
        <div
          className="animate-pulse rounded-lg p-3 text-[10px] text-zinc-500"
          style={{ backgroundColor: "rgb(31,31,35)" }}
        >
          Generating prompt...
        </div>
      ) : data.prompt ? (
        <div className="flex flex-col gap-1.5">
          {/* Headline/CTA preview pills */}
          {data.headline && (
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-zinc-400 font-medium">
                {data.headline}
              </span>
              {data.bodyCopy && (
                <span className="text-[8px] text-zinc-500">{data.bodyCopy}</span>
              )}
              {data.cta && (
                <span className="inline-flex self-start rounded-full bg-violet-900/40 px-1.5 py-0.5 text-[8px] text-violet-300">
                  {data.cta}
                </span>
              )}
            </div>
          )}
          {/* Full prompt preview (collapsed, scrollable) */}
          <div
            className="nowheel nodrag rounded-lg p-2 text-[8px] text-zinc-400 overflow-y-auto"
            style={{
              backgroundColor: "rgb(31,31,35)",
              maxHeight: 80,
              scrollbarWidth: "none",
            }}
          >
            {data.prompt}
          </div>
        </div>
      ) : (
        <div
          className="rounded-lg p-3 text-[10px] text-zinc-600"
          style={{ backgroundColor: "rgb(31,31,35)" }}
        >
          Connect a Product Input node and run to generate
        </div>
      )}
    </BaseNode>
  );
});

export default LanguagePromptNode;

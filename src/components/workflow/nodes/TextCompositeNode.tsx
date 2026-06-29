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
        ) : nodeData.error ? (
          <div
            className="rounded-lg p-3 text-[10px] text-red-400"
            style={{ backgroundColor: "rgb(31,31,35)" }}
          >
            {nodeData.error}
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

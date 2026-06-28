"use client";

import { memo, useCallback } from "react";
import type { NodeProps, Node } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import BaseNode from "./BaseNode";
import type { ProductInputNodeData } from "../types";

const FIELDS: {
  key: keyof Omit<ProductInputNodeData, "label" | "prompt">;
  label: string;
  placeholder: string;
}[] = [
  {
    key: "productName",
    label: "Product Name",
    placeholder: "Product name (e.g. Sauvage)",
  },
  {
    key: "brand",
    label: "Brand",
    placeholder: "Brand (e.g. Dior)",
  },
  {
    key: "scentNotes",
    label: "Scent Notes",
    placeholder: "Scent notes (e.g. woody, bergamot)",
  },
  {
    key: "styleKeywords",
    label: "Style",
    placeholder: "Style (e.g. luxury, dark, moody)",
  },
  {
    key: "brandColor",
    label: "Brand Color",
    placeholder: "Brand hex color (e.g. #1A1A1A)",
  },
  {
    key: "taglineDirection",
    label: "Tagline Direction",
    placeholder: "Tagline direction...",
  },
];

function buildPrompt(data: ProductInputNodeData): string {
  return [
    `Product: ${data.productName || ""} by ${data.brand || ""}`,
    `Scent: ${data.scentNotes || ""}`,
    `Style: ${data.styleKeywords || ""}`,
    `Brand color: ${data.brandColor || ""}`,
    `Tagline direction: ${data.taglineDirection || ""}`,
  ].join("\n");
}

const ProductInputNode = memo(function ProductInputNode({
  id,
  data,
  selected,
}: NodeProps<Node<ProductInputNodeData>>) {
  const { setNodes } = useReactFlow();

  const handleChange = useCallback(
    (key: keyof Omit<ProductInputNodeData, "label" | "prompt">, value: string) => {
      const nextData = { ...(data as ProductInputNodeData), [key]: value };
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  [key]: value,
                  prompt: buildPrompt(nextData),
                },
              }
            : n
        )
      );
    },
    [id, data, setNodes]
  );

  return (
    <BaseNode
      label={data.label || "Product Input"}
      selected={selected}
      inputs={[]}
      outputs={[{ id: "prompt", label: "Product", color: "#A78BFA" }]}
    >
      <div className="flex w-full max-w-[264px] flex-col gap-2">
        {FIELDS.map(({ key, label, placeholder }) => (
          <div key={key} className="flex flex-col gap-0.5">
            <span className="text-[10px] text-zinc-500">{label}</span>
            <input
              className="nodrag nowheel w-full rounded-md px-2 py-1 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
              style={{ backgroundColor: "rgb(31, 31, 35)" }}
              type="text"
              placeholder={placeholder}
              value={(data[key] as string) || ""}
              onChange={(e) => handleChange(key, e.target.value)}
            />
          </div>
        ))}
      </div>
    </BaseNode>
  );
});

export default ProductInputNode;

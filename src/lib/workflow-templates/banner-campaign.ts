import type { WorkflowNode } from "@/components/workflow/types";
import type { WorkflowTemplate } from "./parfym-banner";

export const bannerCampaignTemplate: WorkflowTemplate = {
  name: "Banner Campaign",
  description: "Generate a master banner then localise text to SE/NO via AI image editing",
  nodes: [
    // Column 1 — banner input
    {
      id: "tpl-banner",
      type: "bannerInput",
      position: { x: 50, y: 250 },
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
      position: { x: 450, y: 250 },
      data: {
        label: "Master Image (EN)",
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

    // Column 3 — language variants (parallel AI image edit)
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
      position: { x: 850, y: 420 },
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
      position: { x: 1230, y: 50 },
      data: { label: "Preview SE" } as WorkflowNode["data"],
    },
    {
      id: "tpl-preview-no",
      type: "preview",
      position: { x: 1230, y: 420 },
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
      targetHandle: undefined,
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
    // NanoBananaPro → TextComposite SE (master image to edit)
    {
      id: "tpl-e3",
      source: "tpl-gen",
      sourceHandle: "image",
      target: "tpl-composite-se",
      targetHandle: "image",
      type: "gradient",
    },
    // NanoBananaPro → TextComposite NO (master image to edit)
    {
      id: "tpl-e4",
      source: "tpl-gen",
      sourceHandle: "image",
      target: "tpl-composite-no",
      targetHandle: "image",
      type: "gradient",
    },
    // TextComposite SE → Preview SE
    {
      id: "tpl-e5",
      source: "tpl-composite-se",
      sourceHandle: "image",
      target: "tpl-preview-se",
      targetHandle: "media",
      type: "gradient",
    },
    // TextComposite NO → Preview NO
    {
      id: "tpl-e6",
      source: "tpl-composite-no",
      sourceHandle: "image",
      target: "tpl-preview-no",
      targetHandle: "media",
      type: "gradient",
    },
  ],
};

import type { WorkflowNode } from "@/components/workflow/types";
import type { WorkflowTemplate } from "./parfym-banner";

export const bannerCampaignTemplate: WorkflowTemplate = {
  name: "Banner Campaign",
  description: "Generate EN / SE / NO banner masters in parallel — each fully AI-generated in its own language",
  nodes: [
    // Column 1 — banner input
    {
      id: "tpl-banner",
      type: "bannerInput",
      position: { x: 50, y: 300 },
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

    // Column 2 — language prompt adapters (parallel)
    {
      id: "tpl-lp-en",
      type: "languagePrompt",
      position: { x: 440, y: 50 },
      data: {
        label: "English Prompt",
        language: "en",
        contentType: "hero",
        isGenerating: false,
      } as WorkflowNode["data"],
    },
    {
      id: "tpl-lp-se",
      type: "languagePrompt",
      position: { x: 440, y: 300 },
      data: {
        label: "Swedish Prompt",
        language: "sv",
        contentType: "hero",
        isGenerating: false,
      } as WorkflowNode["data"],
    },
    {
      id: "tpl-lp-no",
      type: "languagePrompt",
      position: { x: 440, y: 550 },
      data: {
        label: "Norwegian Prompt",
        language: "no",
        contentType: "hero",
        isGenerating: false,
      } as WorkflowNode["data"],
    },

    // Column 3 — image generation (parallel)
    {
      id: "tpl-gen-en",
      type: "nanoBananaPro",
      position: { x: 830, y: 50 },
      data: {
        label: "English Banner",
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
    {
      id: "tpl-gen-se",
      type: "nanoBananaPro",
      position: { x: 830, y: 300 },
      data: {
        label: "Swedish Banner",
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
    {
      id: "tpl-gen-no",
      type: "nanoBananaPro",
      position: { x: 830, y: 550 },
      data: {
        label: "Norwegian Banner",
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

    // Column 4 — previews
    {
      id: "tpl-preview-en",
      type: "preview",
      position: { x: 1200, y: 50 },
      data: { label: "Preview EN" } as WorkflowNode["data"],
    },
    {
      id: "tpl-preview-se",
      type: "preview",
      position: { x: 1200, y: 300 },
      data: { label: "Preview SE" } as WorkflowNode["data"],
    },
    {
      id: "tpl-preview-no",
      type: "preview",
      position: { x: 1200, y: 550 },
      data: { label: "Preview NO" } as WorkflowNode["data"],
    },
  ],

  edges: [
    // BannerInput → LanguagePrompt EN
    {
      id: "tpl-e1",
      source: "tpl-banner",
      sourceHandle: "prompt",
      target: "tpl-lp-en",
      targetHandle: "prompt",
      type: "gradient",
    },
    // BannerInput → LanguagePrompt SE
    {
      id: "tpl-e2",
      source: "tpl-banner",
      sourceHandle: "prompt",
      target: "tpl-lp-se",
      targetHandle: "prompt",
      type: "gradient",
    },
    // BannerInput → LanguagePrompt NO
    {
      id: "tpl-e3",
      source: "tpl-banner",
      sourceHandle: "prompt",
      target: "tpl-lp-no",
      targetHandle: "prompt",
      type: "gradient",
    },
    // LanguagePrompt EN → NanoBananaPro EN
    {
      id: "tpl-e4",
      source: "tpl-lp-en",
      sourceHandle: "prompt",
      target: "tpl-gen-en",
      targetHandle: undefined,
      type: "gradient",
    },
    // LanguagePrompt SE → NanoBananaPro SE
    {
      id: "tpl-e5",
      source: "tpl-lp-se",
      sourceHandle: "prompt",
      target: "tpl-gen-se",
      targetHandle: undefined,
      type: "gradient",
    },
    // LanguagePrompt NO → NanoBananaPro NO
    {
      id: "tpl-e6",
      source: "tpl-lp-no",
      sourceHandle: "prompt",
      target: "tpl-gen-no",
      targetHandle: undefined,
      type: "gradient",
    },
    // NanoBananaPro EN → Preview EN
    {
      id: "tpl-e7",
      source: "tpl-gen-en",
      sourceHandle: "image",
      target: "tpl-preview-en",
      targetHandle: "media",
      type: "gradient",
    },
    // NanoBananaPro SE → Preview SE
    {
      id: "tpl-e8",
      source: "tpl-gen-se",
      sourceHandle: "image",
      target: "tpl-preview-se",
      targetHandle: "media",
      type: "gradient",
    },
    // NanoBananaPro NO → Preview NO
    {
      id: "tpl-e9",
      source: "tpl-gen-no",
      sourceHandle: "image",
      target: "tpl-preview-no",
      targetHandle: "media",
      type: "gradient",
    },
  ],
};

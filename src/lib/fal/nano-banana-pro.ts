/**
 * Fal.ai Nano Banana Pro API Module
 * Google's state-of-the-art image generation and editing model
 *
 * Endpoints:
 * - fal-ai/nano-banana-pro (text-to-image)
 * - fal-ai/nano-banana-pro/edit (image editing)
 */

import {
  fal,
  configureFalClient,
  type QueueUpdate,
  type FalImage,
} from "./client";

// Model IDs
export const NANO_BANANA_PRO_MODEL = "fal-ai/nano-banana-pro";
export const NANO_BANANA_PRO_EDIT_MODEL = "fal-ai/nano-banana-pro/edit";

// Types
export type AspectRatio =
  | "1:1"
  | "16:9"
  | "9:16"
  | "4:3"
  | "3:4"
  | "3:2"
  | "2:3"
  | "21:9"
  | "5:4"
  | "4:5"
  | "auto";

export type Resolution = "1K" | "2K" | "4K";

export type OutputFormat = "png" | "jpeg" | "webp";

// Input schemas
export interface NanoBananaProInput {
  /** The text prompt to generate an image from (required) */
  prompt: string;
  /** Aspect ratio of the output image. Default: "1:1" */
  aspect_ratio?: AspectRatio;
  /** Resolution of the output image. Default: "1K". 4K costs 2x */
  resolution?: Resolution;
  /** Output format. Default: "png" */
  output_format?: OutputFormat;
  /** Number of images to generate. Default: 1 */
  num_images?: number;
  /** Enable web search for latest information. Default: false */
  enable_web_search?: boolean;
  /** Enable safety checker on output. Default: true */
  enable_safety_checker?: boolean;
}

export interface NanoBananaProEditInput {
  /** The editing instruction prompt (required) */
  prompt: string;
  /** Array of input image URLs for editing (required, max 14) */
  image_urls: string[];
  /** Aspect ratio of the output. Use "auto" to preserve original. Default: "auto" */
  aspect_ratio?: AspectRatio;
  /** Resolution of the output image. Default: "1K" */
  resolution?: Resolution;
  /** Output format. Default: "png" */
  output_format?: OutputFormat;
  /** Number of output images. Default: 1 */
  num_images?: number;
  /** Enable safety checker. Default: true */
  enable_safety_checker?: boolean;
}

// Output schemas
export interface NanoBananaProOutput {
  /** Array of generated images */
  images: FalImage[];
  /** Description of the generated images */
  description?: string;
  /** Seed used for generation */
  seed?: number;
}

// Constants
export const ASPECT_RATIOS: AspectRatio[] = [
  "1:1",
  "16:9",
  "9:16",
  "4:3",
  "3:4",
  "3:2",
  "2:3",
  "21:9",
  "5:4",
  "4:5",
  "auto",
];

export const RESOLUTIONS: Resolution[] = ["1K", "2K", "4K"];

export const OUTPUT_FORMATS: OutputFormat[] = ["png", "jpeg", "webp"];

export const DEFAULT_ASPECT_RATIO: AspectRatio = "1:1";
export const DEFAULT_RESOLUTION: Resolution = "1K";
export const DEFAULT_OUTPUT_FORMAT: OutputFormat = "png";

export const MAX_PROMPT_LENGTH = 10000;
export const MAX_REFERENCE_IMAGES = 14;
export const MAX_IMAGE_SIZE_MB = 30;

/**
 * Nano Banana Pro API Client
 */
export class NanoBananaProClient {
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("API key is required");
    }
    configureFalClient(apiKey);
  }

  /**
   * Generate image from text prompt
   */
  async generateImage(
    input: NanoBananaProInput,
    options?: {
      onQueueUpdate?: (update: QueueUpdate) => void;
    }
  ): Promise<NanoBananaProOutput> {
    if (!input.prompt) {
      throw new Error("Prompt is required");
    }

    if (input.prompt.length > MAX_PROMPT_LENGTH) {
      throw new Error(
        `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters`
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (fal.subscribe as any)(NANO_BANANA_PRO_MODEL, {
      input: {
        prompt: input.prompt,
        aspect_ratio: input.aspect_ratio || DEFAULT_ASPECT_RATIO,
        resolution: input.resolution || DEFAULT_RESOLUTION,
        output_format: input.output_format || DEFAULT_OUTPUT_FORMAT,
        num_images: input.num_images || 1,
        enable_web_search: input.enable_web_search ?? false,
        enable_safety_checker: input.enable_safety_checker ?? true,
      },
      logs: true,
      onQueueUpdate: options?.onQueueUpdate,
    });

    return result.data as NanoBananaProOutput;
  }

  /**
   * Edit image with text prompt
   */
  async editImage(
    input: NanoBananaProEditInput,
    options?: {
      onQueueUpdate?: (update: QueueUpdate) => void;
    }
  ): Promise<NanoBananaProOutput> {
    if (!input.prompt) {
      throw new Error("Prompt is required");
    }

    if (!input.image_urls || input.image_urls.length === 0) {
      throw new Error("At least one image URL is required");
    }

    if (input.image_urls.length > MAX_REFERENCE_IMAGES) {
      throw new Error(`Maximum ${MAX_REFERENCE_IMAGES} images allowed`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (fal.subscribe as any)(NANO_BANANA_PRO_EDIT_MODEL, {
      input: {
        prompt: input.prompt,
        image_urls: input.image_urls,
        aspect_ratio: input.aspect_ratio || "auto",
        resolution: input.resolution || DEFAULT_RESOLUTION,
        output_format: input.output_format || DEFAULT_OUTPUT_FORMAT,
        num_images: input.num_images || 1,
      },
      logs: true,
      onQueueUpdate: options?.onQueueUpdate,
    });

    return result.data as NanoBananaProOutput;
  }
}

/**
 * Create a new Nano Banana Pro client
 */
export function createNanoBananaProClient(apiKey: string): NanoBananaProClient {
  return new NanoBananaProClient(apiKey);
}

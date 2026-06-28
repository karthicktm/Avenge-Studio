import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createNanoBananaProClient,
  createSeedream45Client,
  parseFalError,
  type NanoBananaProAspectRatio,
  type NanoBananaProResolution,
  type NanoBananaProOutputFormat,
  type Seedream45AspectRatio,
  type Seedream45OutputFormat,
} from "@/lib/fal";
import { getApiKey } from "@/lib/services/apiKeyService";
import {
  checkRateLimit,
  getClientIdentifier,
  createRateLimitHeaders,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { withTimeout, TIMEOUTS, TimeoutError } from "@/lib/utils/timeout";
import { requireAuth } from "@/lib/auth-helpers";
import { logger } from "@/lib/logger";
import { resolveImageForFal } from "@/lib/storage";

// Zod schema for image generation request
const generateImageSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(2500, "Prompt too long"),
  model: z.enum(["nano-banana-pro", "seedream-4.5"]).default("nano-banana-pro"),
  aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "21:9", "9:21"]).default("1:1"),
  resolution: z.enum(["1K", "2K"]).default("1K"),
  outputFormat: z.enum(["png", "jpeg", "webp"]).default("png"),
  imageUrls: z.array(z.string()).max(10, "Maximum 10 reference images").optional(),
  numImages: z.number().int().min(1).max(6).default(1),
  enableWebSearch: z.boolean().default(false),
  enableSafetyChecker: z.boolean().default(true),
  // Seedream 4.5 specific parameters
  strength: z.number().min(0).max(1).optional(),
  guidanceScale: z.number().min(1).max(20).optional(),
  seed: z.number().int().optional(),
});

export async function POST(request: NextRequest) {
  const { user, error: authError } = await requireAuth();
  if (authError) return authError;

  // Rate limiting for expensive generation operations
  const clientId = getClientIdentifier(request);
  const rateLimitResult = await checkRateLimit(
    clientId,
    RATE_LIMITS.generation
  );

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: "Too many requests. Please wait before generating more images.",
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: createRateLimitHeaders(rateLimitResult),
      }
    );
  }

  try {
    const body = await request.json();
    const parseResult = generateImageSchema.safeParse(body);

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || "Invalid request body" },
        { status: 400 }
      );
    }

    const {
      prompt,
      model,
      aspectRatio,
      resolution,
      outputFormat,
      imageUrls,
      numImages,
      enableWebSearch,
      enableSafetyChecker,
      strength,
      guidanceScale,
      seed,
    } = parseResult.data;

    // Resolve local file URLs to base64 for FAL.ai
    // (FAL.ai can't access our local /api/files/ URLs)
    const resolvedImageUrls: string[] = [];
    if (imageUrls && Array.isArray(imageUrls)) {
      for (const url of imageUrls) {
        const resolved = await resolveImageForFal(url);
        if (resolved) {
          resolvedImageUrls.push(resolved);
        }
      }
    }

    // Validate image sizes (max ~5MB base64 per image)
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
    for (const url of resolvedImageUrls) {
      if (url && url.length > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          {
            error:
              "Reference image is too large. Please use a smaller image (max 5MB).",
          },
          { status: 400 }
        );
      }
    }

    const apiKey = await getApiKey(user!.id);
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "No API key. Add your fal.ai key in Settings.",
          code: "NO_API_KEY",
        },
        { status: 400 }
      );
    }

    // Check if this is an edit request (has image URLs)
    const hasImages = resolvedImageUrls.length > 0;

    // Handle Seedream 4.5 model
    if (model === "seedream-4.5") {
      const seedreamClient = createSeedream45Client(apiKey);

      if (hasImages) {
        // Image editing mode with reference images
        const result = await withTimeout(
          seedreamClient.editImage({
            prompt,
            image_urls: resolvedImageUrls,
            aspect_ratio: (aspectRatio || "1:1") as Seedream45AspectRatio,
            output_format: (outputFormat || "png") as Seedream45OutputFormat,
            num_images: numImages || 1,
            enable_safety_checker: enableSafetyChecker ?? true,
            strength: strength,
            guidance_scale: guidanceScale,
            seed: seed,
          }),
          TIMEOUTS.IMAGE_GENERATION,
          "Image generation timed out. Please try again."
        );

        return NextResponse.json({
          success: true,
          images: result.images,
          resultUrls: result.images.map((img) => img.url),
          seed: result.seed,
        });
      } else {
        // Text-to-image mode
        const result = await withTimeout(
          seedreamClient.generateImage({
            prompt,
            aspect_ratio: (aspectRatio || "1:1") as Seedream45AspectRatio,
            output_format: (outputFormat || "png") as Seedream45OutputFormat,
            num_images: numImages || 1,
            enable_safety_checker: enableSafetyChecker ?? true,
            seed: seed,
          }),
          TIMEOUTS.IMAGE_GENERATION,
          "Image generation timed out. Please try again."
        );

        return NextResponse.json({
          success: true,
          images: result.images,
          resultUrls: result.images.map((img) => img.url),
          seed: result.seed,
        });
      }
    }

    // Handle Nano Banana Pro model (default)
    const nanoBananaClient = createNanoBananaProClient(apiKey);

    if (hasImages) {
      // Image editing mode with reference images (with timeout)
      const result = await withTimeout(
        nanoBananaClient.editImage({
          prompt,
          image_urls: resolvedImageUrls,
          aspect_ratio: (aspectRatio || "auto") as NanoBananaProAspectRatio,
          resolution: (resolution || "1K") as NanoBananaProResolution,
          output_format: (outputFormat || "png") as NanoBananaProOutputFormat,
          num_images: numImages || 1,
          enable_safety_checker: enableSafetyChecker ?? true,
        }),
        TIMEOUTS.IMAGE_GENERATION,
        "Image generation timed out. Please try again."
      );

      return NextResponse.json({
        success: true,
        images: result.images,
        resultUrls: result.images.map((img) => img.url),
        description: result.description,
        seed: result.seed,
      });
    } else {
      // Text-to-image mode (with timeout)
      const result = await withTimeout(
        nanoBananaClient.generateImage({
          prompt,
          aspect_ratio: (aspectRatio || "1:1") as NanoBananaProAspectRatio,
          resolution: (resolution || "1K") as NanoBananaProResolution,
          output_format: (outputFormat || "png") as NanoBananaProOutputFormat,
          num_images: numImages || 1,
          enable_web_search: enableWebSearch ?? false,
          enable_safety_checker: enableSafetyChecker ?? true,
        }),
        TIMEOUTS.IMAGE_GENERATION,
        "Image generation timed out. Please try again."
      );

      return NextResponse.json({
        success: true,
        images: result.images,
        resultUrls: result.images.map((img) => img.url),
        description: result.description,
        seed: result.seed,
      });
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    // Log fal.ai validation details if available (422 errors)
    const errBody = (error as { body?: unknown })?.body;
    logger.error("Image generation error", {
      error: errMsg,
      ...(errBody ? { falDetail: errBody } : {}),
    });

    // Handle timeout errors specifically
    if (error instanceof TimeoutError) {
      return NextResponse.json(
        { error: error.message, code: "TASK_TIMEOUT" },
        { status: 504 }
      );
    }

    const parsed = parseFalError(errMsg || "Failed to generate image");
    return NextResponse.json(parsed, { status: 500 });
  }
}

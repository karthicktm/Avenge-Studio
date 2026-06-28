import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createKling26Client,
  createKling25TurboClient,
  createWan26Client,
  createVeo31Client,
  parseFalError,
  type VideoModelId,
  type Kling25TurboSpecialFx,
  type Veo31Duration,
  type Veo31AspectRatio,
  type Veo31Resolution,
} from "@/lib/fal";
import { prisma } from "@/lib/prisma";
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

// Zod schema for video generation request
const generateVideoSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(5000, "Prompt too long"),
  model: z
    .enum(["kling-2.6", "kling-2.5-turbo", "wan-2.6", "veo-3.1"])
    .default("kling-2.6"),
  mode: z
    .enum(["text-to-video", "image-to-video", "first-last-frame"])
    .default("text-to-video"),
  duration: z.enum(["4", "5", "6", "8", "10", "15"]).default("5"), // Veo uses 4/6/8, others use 5/10/15
  aspectRatio: z
    .enum(["auto", "16:9", "9:16", "1:1", "4:3", "3:4"])
    .default("16:9"),
  resolution: z.enum(["480p", "720p", "1080p"]).optional(),
  audioEnabled: z.boolean().default(false),
  enhanceEnabled: z.boolean().default(false),
  imageUrl: z.string().optional(),
  endImageUrl: z.string().optional(),
  negativePrompt: z.string().max(500).optional(),
  cfgScale: z.number().min(0).max(1).default(0.5),
  seed: z.number().int().optional(),
  specialFx: z.string().optional(),
  // Veo 3.1 specific fields
  firstFrameUrl: z.string().optional(),
  lastFrameUrl: z.string().optional(),
  generateAudio: z.boolean().default(true),
  speed: z.enum(["standard", "fast"]).default("standard"),
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
        error: "Too many requests. Please wait before generating more videos.",
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
    const parseResult = generateVideoSchema.safeParse(body);

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
      mode,
      aspectRatio,
      duration,
      resolution,
      audioEnabled,
      enhanceEnabled,
      imageUrl,
      endImageUrl,
      negativePrompt,
      cfgScale,
      seed,
      specialFx,
      // Veo 3.1 specific
      firstFrameUrl,
      lastFrameUrl,
      generateAudio,
      speed,
    } = parseResult.data;

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

    const modelId = (model || "kling-2.6") as VideoModelId;

    // Log input for debugging (sanitized)
    logger.debug("Video generation request", {
      modelId,
      mode,
      aspectRatio,
      duration,
      audioEnabled,
      hasImageUrl: !!imageUrl,
      hasEndImageUrl: !!endImageUrl,
      hasFirstFrameUrl: !!firstFrameUrl,
      hasLastFrameUrl: !!lastFrameUrl,
      speed,
    });

    // Resolve local file URLs to base64 for FAL.ai
    // (FAL.ai can't access our local /api/files/ URLs)
    const resolvedImageUrl = await resolveImageForFal(imageUrl);
    const resolvedEndImageUrl = await resolveImageForFal(endImageUrl);
    const resolvedFirstFrameUrl = await resolveImageForFal(firstFrameUrl);
    const resolvedLastFrameUrl = await resolveImageForFal(lastFrameUrl);

    // Generate video with timeout protection
    const generateVideo = async (): Promise<{
      video: { url: string };
      seed?: number;
    }> => {
      switch (modelId) {
        case "kling-2.6": {
          const client = createKling26Client(apiKey);
          if (mode === "image-to-video" && resolvedImageUrl) {
            return client.generateImageToVideo({
              prompt,
              image_url: resolvedImageUrl,
              duration: duration as "5" | "10",
              aspect_ratio: aspectRatio as "16:9" | "9:16" | "1:1",
              generate_audio: audioEnabled ?? false,
              negative_prompt: negativePrompt,
              cfg_scale: cfgScale ?? 0.5,
              seed,
            });
          } else {
            return client.generateTextToVideo({
              prompt,
              aspect_ratio: aspectRatio as "16:9" | "9:16" | "1:1",
              duration: duration as "5" | "10",
              generate_audio: audioEnabled ?? false,
              negative_prompt: negativePrompt,
              cfg_scale: cfgScale ?? 0.5,
              seed,
            });
          }
        }

        case "kling-2.5-turbo": {
          const client = createKling25TurboClient(apiKey);
          if (mode === "image-to-video" && resolvedImageUrl) {
            return client.generateImageToVideo({
              prompt,
              image_url: resolvedImageUrl,
              duration: duration as "5" | "10",
              aspect_ratio: aspectRatio as "16:9" | "9:16" | "1:1",
              negative_prompt: negativePrompt,
              cfg_scale: cfgScale ?? 0.5,
              tail_image_url: resolvedEndImageUrl,
              special_fx: (specialFx as Kling25TurboSpecialFx) || undefined,
              seed,
            });
          } else {
            return client.generateTextToVideo({
              prompt,
              aspect_ratio: aspectRatio as "16:9" | "9:16" | "1:1",
              duration: duration as "5" | "10",
              negative_prompt: negativePrompt,
              cfg_scale: cfgScale ?? 0.5,
              seed,
            });
          }
        }

        case "wan-2.6": {
          const client = createWan26Client(apiKey);
          if (mode === "image-to-video" && resolvedImageUrl) {
            return client.generateImageToVideo({
              prompt,
              image_url: resolvedImageUrl,
              duration: duration as "5" | "10" | "15",
              resolution: resolution as "720p" | "1080p",
              aspect_ratio: aspectRatio as
                | "16:9"
                | "9:16"
                | "1:1"
                | "4:3"
                | "3:4",
              enable_prompt_expansion: enhanceEnabled ?? false,
              negative_prompt: negativePrompt,
              seed,
            });
          } else {
            return client.generateTextToVideo({
              prompt,
              aspect_ratio: aspectRatio as
                | "16:9"
                | "9:16"
                | "1:1"
                | "4:3"
                | "3:4",
              duration: duration as "5" | "10" | "15",
              resolution: resolution as "720p" | "1080p",
              enable_prompt_expansion: enhanceEnabled ?? false,
              negative_prompt: negativePrompt,
              seed,
            });
          }
        }

        case "veo-3.1": {
          // Veo 3.1 only accepts 4s, 6s, 8s durations
          const veoValidDurations = ["4", "6", "8"];
          const veoDuration = veoValidDurations.includes(duration) ? duration : "8";
          const client = createVeo31Client(apiKey);
          if (mode === "first-last-frame") {
            // First/Last frame mode
            if (!resolvedFirstFrameUrl || !resolvedLastFrameUrl) {
              throw new Error(
                "First frame and last frame URLs are required for first-last-frame mode"
              );
            }
            return client.generateVideo({
              prompt,
              first_frame_url: resolvedFirstFrameUrl,
              last_frame_url: resolvedLastFrameUrl,
              duration: `${veoDuration}s` as Veo31Duration,
              aspect_ratio: aspectRatio as Veo31AspectRatio,
              resolution: (resolution || "720p") as Veo31Resolution,
              generate_audio: generateAudio ?? true,
              speed: speed as "standard" | "fast",
            });
          } else {
            // Image-to-video mode
            if (!resolvedImageUrl) {
              throw new Error(
                "Image URL is required for image-to-video mode"
              );
            }
            return client.generateImageToVideo({
              prompt,
              image_url: resolvedImageUrl,
              duration: `${veoDuration}s` as Veo31Duration,
              aspect_ratio: aspectRatio as Veo31AspectRatio,
              resolution: (resolution || "720p") as Veo31Resolution,
              generate_audio: generateAudio ?? true,
              speed: speed as "standard" | "fast",
            });
          }
        }

        default:
          throw new Error(`Unknown model: ${modelId}`);
      }
    };

    const result = await withTimeout(
      generateVideo(),
      TIMEOUTS.VIDEO_GENERATION,
      "Video generation timed out. Please try again."
    );

    // Save the video to the database
    // Use the input image as thumbnail for image-to-video generations
    const video = await prisma.generatedVideo.create({
      data: {
        userId: user!.id,
        url: result.video.url,
        thumbnailUrl: imageUrl || null, // Use input image as thumbnail
        prompt,
        model: modelId,
        duration: parseInt(duration) || 5,
        aspectRatio: aspectRatio || "16:9",
        resolution,
        startImageUrl: imageUrl,
        endImageUrl,
        audioEnabled: audioEnabled || false,
      },
    });

    return NextResponse.json({
      success: true,
      video: video, // Return the full database record
      videoUrl: result.video.url,
      seed: result.seed,
      id: video.id,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    // Log fal.ai validation details if available (422 errors)
    const errBody = (error as { body?: unknown })?.body;
    logger.error("Video generation error", {
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

    const parsed = parseFalError(errMsg || "Failed to generate video");
    return NextResponse.json(parsed, { status: 500 });
  }
}

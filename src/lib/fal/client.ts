/**
 * Fal.ai Client Configuration
 * Centralized client setup for all fal.ai API calls
 */

import { fal } from "@fal-ai/client";

/**
 * Configure the fal.ai client with credentials
 */
export function configureFalClient(apiKey: string): void {
  fal.config({
    credentials: apiKey,
  });
}

/**
 * Queue update status types
 */
export type QueueStatus = "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED";

export interface QueueUpdate {
  status: QueueStatus;
  position?: number;
  logs?: Array<{ message: string }>;
}

/**
 * Common result structure from fal.ai
 */
export interface FalImage {
  url: string;
  width?: number;
  height?: number;
  content_type?: string;
}

export interface FalVideo {
  url: string;
  content_type?: string;
  file_name?: string;
  file_size?: number;
}

/**
 * Error parsing for fal.ai errors
 */
export type ErrorCode =
  | "NO_API_KEY"
  | "INVALID_API_KEY"
  | "INSUFFICIENT_CREDITS"
  | "RATE_LIMITED"
  | "CONTENT_POLICY"
  | "INVALID_PROMPT"
  | "TASK_TIMEOUT"
  | "NETWORK_ERROR"
  | "UNKNOWN";

export interface ErrorResponse {
  error: string;
  code: ErrorCode;
}

export function parseFalError(errorMessage: string): ErrorResponse {
  const msg = errorMessage.toLowerCase();

  // API key issues
  if (
    msg.includes("401") ||
    msg.includes("unauthorized") ||
    msg.includes("invalid") ||
    msg.includes("authentication")
  ) {
    return {
      error: "API key is invalid. Check your key in Settings.",
      code: "INVALID_API_KEY",
    };
  }

  // Credit/billing issues
  if (
    msg.includes("402") ||
    msg.includes("insufficient") ||
    msg.includes("credit") ||
    msg.includes("balance") ||
    msg.includes("quota") ||
    msg.includes("payment")
  ) {
    return {
      error: "Out of credits. Top up your fal.ai account.",
      code: "INSUFFICIENT_CREDITS",
    };
  }

  // Rate limiting
  if (msg.includes("429") || msg.includes("rate") || msg.includes("too many")) {
    return {
      error: "Too many requests. Wait a moment and try again.",
      code: "RATE_LIMITED",
    };
  }

  // Content policy
  if (
    msg.includes("policy") ||
    msg.includes("content") ||
    msg.includes("nsfw") ||
    msg.includes("prohibited") ||
    msg.includes("blocked") ||
    msg.includes("safety")
  ) {
    return {
      error: "Content blocked by safety filters. Try a different prompt.",
      code: "CONTENT_POLICY",
    };
  }

  // Validation errors (422 Unprocessable Entity from fal.ai)
  if (
    msg.includes("422") ||
    msg.includes("unprocessable") ||
    msg.includes("validation") ||
    msg.includes("invalid input") ||
    msg.includes("value_error") ||
    msg.includes("field required") ||
    msg.includes("not a valid")
  ) {
    return {
      error: "Invalid generation parameters. Please try adjusting your settings.",
      code: "INVALID_PROMPT",
    };
  }

  // Timeout
  if (msg.includes("timeout") || msg.includes("timed out")) {
    return {
      error: "Generation took too long. Try again.",
      code: "TASK_TIMEOUT",
    };
  }

  // Network issues
  if (
    msg.includes("network") ||
    msg.includes("fetch") ||
    msg.includes("econnrefused") ||
    msg.includes("enotfound")
  ) {
    return {
      error: "Connection failed. Check your internet.",
      code: "NETWORK_ERROR",
    };
  }

  // Default fallback
  return { error: "Something went wrong. Try again.", code: "UNKNOWN" };
}

export { fal };

"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type InteractionMode = "select" | "pan";

// Centralized color mapping for handle types - use these everywhere for consistency
export const HANDLE_COLORS: Record<string, string> = {
  prompt: "#A78BFA", // Purple - text/prompt data
  video: "#EF9092", // Red/Pink - video data
  image: "#F59E0B", // Orange - image data
  result: "#6EDDB3", // Green - final result (output node only)
  media: "#F59E0B", // Orange - generic media
  audio: "#60A5FA", // Blue - audio data
  textConfig: "#2DD4BF", // Teal - text zone configuration data
  firstFrame: "#F59E0B", // Orange - first frame image
  lastFrame: "#F59E0B", // Orange - last frame image
};

// Define which handle types can connect to each other
export const COMPATIBLE_HANDLES: Record<string, string[]> = {
  prompt: ["prompt", "transcript"],
  video: [
    "video",
    "video1",
    "video2",
    "video3",
    "video4",
    "video5",
    "video6",
    "video7",
    "video8",
    "video9",
    "video10",
    "videoIn",
    "videoOut",
    "media",
    "result",
  ],
  image: [
    "image",
    "image1",
    "image2",
    "image3",
    "image4",
    "image5",
    "image6",
    "image7",
    "image8",
    "image9",
    "image10",
    "image11",
    "image12",
    "image13",
    "image14",
    "firstFrame",
    "lastFrame",
    "media",
  ],
  result: ["result", "media"],
  media: ["media", "video", "image", "result"],
  audio: ["audio"],
  transcript: ["transcript", "prompt"],
  textConfig: ["textConfig"],
  // Concat node specific inputs (video1-video10)
  video1: ["video1"],
  video2: ["video2"],
  video3: ["video3"],
  video4: ["video4"],
  video5: ["video5"],
  video6: ["video6"],
  video7: ["video7"],
  video8: ["video8"],
  video9: ["video9"],
  video10: ["video10"],
  // Transition node specific inputs
  videoIn: ["videoIn"],
  videoOut: ["videoOut"],
  // First/Last frame inputs for Kling 2.5 Turbo
  firstFrame: ["firstFrame"],
  lastFrame: ["lastFrame"],
};

interface WorkflowContextValue {
  // Interaction mode
  mode: InteractionMode;
  setMode: (mode: InteractionMode) => void;
  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  // Connection state
  connectingHandleType: string | null;
  setConnectingHandleType: (type: string | null) => void;
}

const WorkflowContext = createContext<WorkflowContextValue | null>(null);

interface WorkflowProviderProps {
  children: ReactNode;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function WorkflowProvider({
  children,
  undo,
  redo,
  canUndo,
  canRedo,
}: WorkflowProviderProps) {
  const [mode, setMode] = useState<InteractionMode>("select");
  const [connectingHandleType, setConnectingHandleType] = useState<
    string | null
  >(null);

  return (
    <WorkflowContext.Provider
      value={{
        mode,
        setMode,
        undo,
        redo,
        canUndo,
        canRedo,
        connectingHandleType,
        setConnectingHandleType,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflowContext() {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error(
      "useWorkflowContext must be used within a WorkflowProvider"
    );
  }
  return context;
}

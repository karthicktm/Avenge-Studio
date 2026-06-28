"use client";

import React, { useCallback, useState, useRef, useEffect } from "react";
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import type {
  WorkflowNode,
  WorkflowEdge,
  NodeType,
} from "@/components/workflow/types";

// Start with empty canvas - user adds nodes themselves
const initialNodes: WorkflowNode[] = [];

const initialEdges: WorkflowEdge[] = [];

interface HistoryState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

const MAX_HISTORY_SIZE = 50;

interface UseWorkflowOptions {
  onNodeSelect?: (nodeId: string | null) => void;
}

interface ClipboardData {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

interface UseWorkflowReturn {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
  onNodesChange: (changes: NodeChange<WorkflowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<WorkflowEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  onNodeClick: (nodeId: string) => void;
  addNode: (type: NodeType, position?: { x: number; y: number }) => void;
  deleteNode: (nodeId: string) => void;
  updateNodeData: (nodeId: string, data: Partial<WorkflowNode["data"]>) => void;
  clearSelection: () => void;
  resetWorkflow: () => void;
  setNodes: React.Dispatch<React.SetStateAction<WorkflowNode[]>>;
  setEdges: React.Dispatch<React.SetStateAction<WorkflowEdge[]>>;
  // History
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  // Clipboard
  copySelectedNodes: () => void;
  pasteNodes: (offset?: { x: number; y: number }) => void;
  hasClipboardData: boolean;
  // Selection
  selectAllNodes: () => void;
}

export function useWorkflow(options?: UseWorkflowOptions): UseWorkflowReturn {
  const [nodes, setNodes] = useState<WorkflowNode[]>(initialNodes);
  const [edges, setEdges] = useState<WorkflowEdge[]>(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Destructure options to get stable callback reference
  const onNodeSelect = options?.onNodeSelect;

  // Clipboard for copy/paste
  const clipboardRef = useRef<ClipboardData | null>(null);
  const [hasClipboardData, setHasClipboardData] = useState(false);

  // History management
  const historyRef = useRef<HistoryState[]>([
    { nodes: initialNodes, edges: initialEdges },
  ]);
  const historyIndexRef = useRef<number>(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const isUndoRedoRef = useRef(false);

  const updateHistoryState = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  const saveToHistory = useCallback(
    (newNodes: WorkflowNode[], newEdges: WorkflowEdge[]) => {
      if (isUndoRedoRef.current) {
        isUndoRedoRef.current = false;
        return;
      }

      // Remove any future states if we're not at the end
      if (historyIndexRef.current < historyRef.current.length - 1) {
        historyRef.current = historyRef.current.slice(
          0,
          historyIndexRef.current + 1
        );
      }

      // Add new state
      historyRef.current.push({ nodes: newNodes, edges: newEdges });

      // Limit history size
      if (historyRef.current.length > MAX_HISTORY_SIZE) {
        historyRef.current = historyRef.current.slice(-MAX_HISTORY_SIZE);
      }

      historyIndexRef.current = historyRef.current.length - 1;
      updateHistoryState();
    },
    [updateHistoryState]
  );

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      isUndoRedoRef.current = true;
      historyIndexRef.current -= 1;
      const state = historyRef.current[historyIndexRef.current];
      setNodes(state.nodes);
      setEdges(state.edges);
      updateHistoryState();
    }
  }, [updateHistoryState]);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      isUndoRedoRef.current = true;
      historyIndexRef.current += 1;
      const state = historyRef.current[historyIndexRef.current];
      setNodes(state.nodes);
      setEdges(state.edges);
      updateHistoryState();
    }
  }, [updateHistoryState]);

  // Debounce timer for position changes
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedSaveToHistory = useCallback(
    (newNodes: WorkflowNode[], newEdges: WorkflowEdge[]) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveToHistory(newNodes, newEdges);
      }, 300);
    },
    [saveToHistory]
  );

  // Refs to access current state without recreating callbacks
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  // Update refs in effect to avoid lint warning
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const onNodesChange = useCallback(
    (changes: NodeChange<WorkflowNode>[]) => {
      setNodes((nds) => {
        const newNodes = applyNodeChanges(changes, nds);

        // Check if this is a significant change (not just selection)
        const hasSignificantChange = changes.some(
          (change) =>
            change.type === "position" ||
            change.type === "remove" ||
            change.type === "add"
        );

        if (hasSignificantChange) {
          // For position changes, debounce; for add/remove, save immediately
          const hasPositionChange = changes.some(
            (change) => change.type === "position"
          );
          if (hasPositionChange) {
            debouncedSaveToHistory(newNodes, edgesRef.current);
          } else {
            saveToHistory(newNodes, edgesRef.current);
          }
        }

        return newNodes;
      });
    },
    [saveToHistory, debouncedSaveToHistory]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<WorkflowEdge>[]) => {
      setEdges((eds) => {
        const newEdges = applyEdgeChanges(changes, eds);

        const hasSignificantChange = changes.some(
          (change) => change.type === "remove" || change.type === "add"
        );

        if (hasSignificantChange) {
          saveToHistory(nodesRef.current, newEdges);
        }

        return newEdges;
      });
    },
    [saveToHistory]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const newEdges = addEdge({ ...connection, type: "gradient" }, eds);
        saveToHistory(nodesRef.current, newEdges);
        return newEdges;
      });
    },
    [saveToHistory]
  );

  const onNodeClick = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId);
      onNodeSelect?.(nodeId);
    },
    [onNodeSelect]
  );

  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  const addNode = useCallback(
    (type: NodeType, position?: { x: number; y: number }) => {
      const newNode: WorkflowNode = {
        id: `node-${Date.now()}`,
        type,
        position: position || { x: 250, y: 250 },
        data: getDefaultNodeData(type),
      };
      setNodes((nds) => {
        const newNodes = [...nds, newNode];
        saveToHistory(newNodes, edges);
        return newNodes;
      });
    },
    [edges, saveToHistory]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      // Compute new values from current state first (no nested setState)
      const newNodes = nodes.filter((node) => node.id !== nodeId);
      const newEdges = edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      );

      // Update both states atomically
      setNodes(newNodes);
      setEdges(newEdges);

      // Save to history with computed values
      saveToHistory(newNodes, newEdges);

      // Clear selection if deleted node was selected
      setSelectedNodeId((current) => (current === nodeId ? null : current));
    },
    [nodes, edges, saveToHistory]
  );

  const updateNodeData = useCallback(
    (nodeId: string, data: Partial<WorkflowNode["data"]>) => {
      setNodes((nds) => {
        const newNodes = nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...data } }
            : node
        );
        saveToHistory(newNodes, edges);
        return newNodes;
      });
    },
    [edges, saveToHistory]
  );

  const resetWorkflow = useCallback(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setSelectedNodeId(null);
    historyRef.current = [{ nodes: initialNodes, edges: initialEdges }];
    historyIndexRef.current = 0;
    updateHistoryState();
  }, [updateHistoryState]);

  // Select all nodes
  const selectAllNodes = useCallback(() => {
    setNodes((nds) => nds.map((node) => ({ ...node, selected: true })));
  }, []);

  // Copy selected nodes to clipboard
  const copySelectedNodes = useCallback(() => {
    // Get all selected nodes
    const selectedNodes = nodes.filter((node) => node.selected);
    if (selectedNodes.length === 0) return;

    // Get IDs of selected nodes
    const selectedIds = new Set(selectedNodes.map((n) => n.id));

    // Get edges that connect selected nodes to each other
    const connectedEdges = edges.filter(
      (edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target)
    );

    // Store in clipboard
    clipboardRef.current = {
      nodes: selectedNodes,
      edges: connectedEdges,
    };
    setHasClipboardData(true);
  }, [nodes, edges]);

  // Paste nodes from clipboard
  const pasteNodes = useCallback(
    (offset: { x: number; y: number } = { x: 50, y: 50 }) => {
      if (!clipboardRef.current) return;

      const { nodes: clipboardNodes, edges: clipboardEdges } =
        clipboardRef.current;

      // Create a mapping from old IDs to new IDs
      const idMapping = new Map<string, string>();
      const timestamp = Date.now();

      // Create new nodes with new IDs and offset positions
      const newNodes: WorkflowNode[] = clipboardNodes.map((node, index) => {
        const newId = `node-${timestamp}-${index}`;
        idMapping.set(node.id, newId);

        return {
          ...node,
          id: newId,
          position: {
            x: node.position.x + offset.x,
            y: node.position.y + offset.y,
          },
          selected: true, // Select the pasted nodes
          data: {
            ...node.data,
            // Clear any generated results when pasting
            imageUrl: undefined,
            videoUrl: undefined,
            isGenerating: false,
          },
        };
      });

      // Create new edges with updated source/target IDs
      const newEdges: WorkflowEdge[] = clipboardEdges.map((edge, index) => ({
        ...edge,
        id: `edge-${timestamp}-${index}`,
        source: idMapping.get(edge.source) || edge.source,
        target: idMapping.get(edge.target) || edge.target,
      }));

      // Deselect existing nodes and add new ones
      setNodes((nds) => {
        const deselectedNodes = nds.map((n) => ({ ...n, selected: false }));
        const updatedNodes = [...deselectedNodes, ...newNodes];
        saveToHistory(updatedNodes, [...edges, ...newEdges]);
        return updatedNodes;
      });

      setEdges((eds) => [...eds, ...newEdges]);
    },
    [edges, saveToHistory]
  );

  return {
    nodes,
    edges,
    selectedNodeId,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    addNode,
    deleteNode,
    updateNodeData,
    clearSelection,
    resetWorkflow,
    setNodes,
    setEdges,
    undo,
    redo,
    canUndo,
    canRedo,
    copySelectedNodes,
    pasteNodes,
    hasClipboardData,
    selectAllNodes,
  };
}

// Helper to get default data for each node type
function getDefaultNodeData(type: NodeType): WorkflowNode["data"] {
  switch (type) {
    case "imageInput":
      return { label: "Image Input" };
    case "model":
      return { label: "Model", modelId: "", modelName: "" };
    case "output":
      return { label: "Output" };
    case "preview":
      return { label: "Preview" };
    case "video":
      return { label: "Video" };
    case "kling26":
      return {
        label: "Kling 2.6 Pro",
        mode: "text-to-video",
        duration: "5",
        aspectRatio: "16:9",
        audioEnabled: true,
        cfgScale: 0.5,
      };
    case "kling25Turbo":
      return {
        label: "Kling 2.5 Turbo",
        mode: "text-to-video",
        duration: "5",
        aspectRatio: "16:9",
        cfgScale: 0.5,
      };
    case "wan26":
      return {
        label: "Wan 2.6",
        mode: "text-to-video",
        duration: "5",
        aspectRatio: "16:9",
        resolution: "720p",
        enhanceEnabled: false,
      };
    case "nanoBananaPro":
      return {
        label: "Nano Banana Pro",
        prompt: "",
        mode: "text-to-image",
        aspectRatio: "1:1",
        resolution: "1K",
        outputFormat: "png",
        numImages: 1,
        enableWebSearch: false,
        enableSafetyChecker: true,
      };
    case "seedream45":
      return {
        label: "Seedream 4.5",
        prompt: "",
        mode: "text-to-image",
        aspectRatio: "1:1",
        outputFormat: "png",
        numImages: 1,
        enableSafetyChecker: true,
      };
    case "veo31":
      return {
        label: "Veo 3.1",
        prompt: "",
        mode: "image-to-video",
        duration: "8",
        aspectRatio: "auto",
        resolution: "720p",
        generateAudio: true,
        speed: "standard",
      };
    case "videoConcat":
      return {
        label: "Concat",
        aspectRatio: "16:9",
        transition: "crossfade",
        transitionDuration: 0.5,
      };
    case "videoSubtitles":
      return {
        label: "Subtitles",
        aspectRatio: "9:16",
        style: "tiktok",
        position: "bottom",
        autoGenerate: true,
      };
    case "videoTrim":
      return {
        label: "Trim",
        aspectRatio: "16:9",
        startTime: 0,
        endTime: 5,
      };
    case "videoTransition":
      return {
        label: "Transition",
        aspectRatio: "16:9",
        transitionType: "fade",
        duration: 0.5,
        easing: "easeInOut",
      };
    case "productInput":
      return {
        label: "Product Input",
        prompt: "",
        productName: "",
        brand: "",
        scentNotes: "",
        styleKeywords: "",
        brandColor: "",
        taglineDirection: "",
      };
    case "languagePrompt":
      return {
        label: "Language Prompt",
        prompt: "",
        language: "sv",
        contentType: "hero",
        isGenerating: false,
      };
    default:
      return { label: "Node" };
  }
}

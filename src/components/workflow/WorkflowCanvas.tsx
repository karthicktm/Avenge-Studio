"use client";

import { useCallback, useMemo, memo } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  type NodeTypes,
  type EdgeTypes,
  SelectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  ImageInputNode,
  ModelNode,
  OutputNode,
  PreviewNode,
  VideoNode,
  FileNode,
  Kling26Node,
  Kling25TurboNode,
  Veo31Node,
  Wan26Node,
  NanoBananaProNode,
  Seedream45Node,
  VideoConcatNode,
  VideoSubtitlesNode,
  VideoTrimNode,
  VideoTransitionNode,
  ProductInputNode,
  LanguagePromptNode,
} from "./nodes";
import { GradientEdge } from "./edges";
import WorkflowBottomToolbar, {
  type SavedWorkflow,
} from "./WorkflowBottomToolbar";
import NodeActionMenu from "./NodeActionMenu";
import RunAllButton from "./RunAllButton";
import {
  useWorkflowContext,
  COMPATIBLE_HANDLES,
  HANDLE_COLORS,
} from "./WorkflowContext";
import type { WorkflowNode, WorkflowEdge } from "./types";
import type { NodeChange, EdgeChange, Connection } from "@xyflow/react";

// Register custom node types - defined outside component to prevent recreation
const nodeTypes: NodeTypes = {
  imageInput: ImageInputNode,
  model: ModelNode,
  output: OutputNode,
  preview: PreviewNode,
  video: VideoNode,
  file: FileNode,
  kling26: Kling26Node,
  kling25Turbo: Kling25TurboNode,
  veo31: Veo31Node,
  wan26: Wan26Node,
  nanoBananaPro: NanoBananaProNode,
  seedream45: Seedream45Node,
  videoConcat: VideoConcatNode,
  videoSubtitles: VideoSubtitlesNode,
  videoTrim: VideoTrimNode,
  videoTransition: VideoTransitionNode,
  productInput: ProductInputNode,
  languagePrompt: LanguagePromptNode,
};

// Register custom edge types - defined outside component to prevent recreation
const edgeTypes: EdgeTypes = {
  gradient: GradientEdge,
};

// Default edge options - memoized outside component
const defaultEdgeOptions = {
  type: "gradient" as const,
  style: { strokeWidth: 3 },
};

// Pro options - memoized outside component
const proOptions = { hideAttribution: true };

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  onNodesChange: (changes: NodeChange<WorkflowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<WorkflowEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  onNodeClick?: (event: React.MouseEvent, node: WorkflowNode) => void;
  onPaneClick?: () => void;
  onDeleteNode?: (nodeId: string) => void;
  onRunNode?: (nodeId: string) => void;
  onRunAll?: () => void;
  onStopAll?: () => void;
  isExecutingAll?: boolean;
  executingCount?: number;
  currentWorkflowId?: string | null;
  onLoadWorkflow?: (workflow: SavedWorkflow) => void;
  onNewWorkflow?: () => void;
}

function WorkflowCanvasInner({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onPaneClick,
  onDeleteNode,
  onRunNode,
  onRunAll,
  onStopAll,
  isExecutingAll = false,
  executingCount = 0,
  currentWorkflowId,
  onLoadWorkflow,
  onNewWorkflow,
}: WorkflowCanvasProps) {
  const { mode, setConnectingHandleType, connectingHandleType } =
    useWorkflowContext();

  // Dynamic connection line style based on source handle type
  const connectionLineStyle = useMemo(
    () => ({
      stroke: connectingHandleType
        ? HANDLE_COLORS[connectingHandleType] || "#6EDDB3"
        : "#6EDDB3",
      strokeWidth: 3,
    }),
    [connectingHandleType]
  );

  // Validate connections based on handle types
  const isValidConnection = useCallback(
    (connection: Connection | WorkflowEdge) => {
      const sourceHandle = connection.sourceHandle || "";
      const targetHandle = connection.targetHandle || "";
      const compatibleTargets = COMPATIBLE_HANDLES[sourceHandle] || [
        sourceHandle,
      ];
      return compatibleTargets.includes(targetHandle);
    },
    []
  );

  // Track when connection starts/ends
  const onConnectStart = useCallback(
    (_: unknown, params: { handleId: string | null }) => {
      setConnectingHandleType(params.handleId || null);
    },
    [setConnectingHandleType]
  );

  const onConnectEnd = useCallback(() => {
    setConnectingHandleType(null);
  }, [setConnectingHandleType]);

  // Memoize pan/selection settings
  const panOnDrag = useMemo(
    () => (mode === "pan" ? [0, 1, 2] : [1, 2]),
    [mode]
  );
  const selectionOnDrag = mode === "select";

  // Memoize fitView options
  const fitViewOptions = useMemo(
    () => ({
      padding: 0.2,
      maxZoom: 1,
      minZoom: 0.1,
    }),
    []
  );

  return (
    <div className="h-full w-full">
      <style jsx global>{`
        /* Cursor styles */
        .react-flow__pane {
          cursor: ${mode === "pan" ? "grab" : "default"} !important;
        }
        .react-flow__pane:active {
          cursor: ${mode === "pan" ? "grabbing" : "default"} !important;
        }
        /* Clean node appearance */
        .react-flow__node {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        /* GPU acceleration for smooth dragging */
        .react-flow__node.dragging {
          will-change: transform;
        }
        .react-flow__nodes {
          will-change: transform;
        }
        /* Smooth transitions */
        .react-flow__edge path {
          transition:
            stroke 0.15s ease,
            opacity 0.3s ease;
        }
        /* Edge flow animation for generating state */
        @keyframes edgeFlowAnimation {
          from {
            stroke-dashoffset: 40;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes edgePulseAnimation {
          0%,
          100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }
        /* Node generating border animations */
        @keyframes borderShimmer {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        isValidConnection={isValidConnection}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={fitViewOptions}
        panOnDrag={panOnDrag}
        selectionOnDrag={selectionOnDrag}
        selectionMode={SelectionMode.Partial}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineStyle={connectionLineStyle}
        proOptions={proOptions}
        // Performance optimizations
        onlyRenderVisibleElements
        elevateNodesOnSelect
        nodeDragThreshold={2}
        minZoom={0.1}
        maxZoom={2}
        // Smoother dragging
        nodesDraggable
        nodesConnectable
        elementsSelectable
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={2}
          color="#404048"
        />
        <WorkflowBottomToolbar
          currentWorkflowId={currentWorkflowId}
          onLoadWorkflow={onLoadWorkflow}
          onNewWorkflow={onNewWorkflow}
        />
        <NodeActionMenu onRun={onRunNode} onDelete={onDeleteNode} />
      </ReactFlow>
      {onRunAll && onStopAll && (
        <RunAllButton
          onRunAll={onRunAll}
          onStopAll={onStopAll}
          isExecuting={isExecutingAll}
          executingCount={executingCount}
        />
      )}
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
const WorkflowCanvas = memo(WorkflowCanvasInner);
export default WorkflowCanvas;

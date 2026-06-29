"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { useReactFlow, useViewport, Position } from "@xyflow/react";
import Dagre from "@dagrejs/dagre";
import { apiFetch } from "@/lib/csrf";
import { useWorkflowContext } from "./WorkflowContext";
import type { NodeType } from "./types";
import { WORKFLOW_TEMPLATES, type WorkflowTemplate } from "@/lib/workflow-templates";

export interface SavedWorkflow {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// Icons - Clean stroke-based SVGs
const PlusIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const SelectIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 4l7.07 17 2.51-7.39L21 11.07 4 4z" />
    <path d="M13 13l6 6" />
  </svg>
);

const PanIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v0" />
    <path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v6" />
    <path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
  </svg>
);

const UndoIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.36 2.64L3 13" />
  </svg>
);

const RedoIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 7v6h-6" />
    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.36 2.64L21 13" />
  </svg>
);

const CleanLayoutIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="6" height="6" rx="1" />
    <rect x="15" y="3" width="6" height="6" rx="1" />
    <rect x="9" y="15" width="6" height="6" rx="1" />
    <path d="M9 6h6" />
    <path d="M12 9v6" />
  </svg>
);

const FitViewIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
    <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
    <path d="M3 16v3a2 2 0 0 0 2 2h3" />
    <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
  </svg>
);

const ZoomInIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
    <path d="M11 8v6" />
    <path d="M8 11h6" />
  </svg>
);

const ZoomOutIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
    <path d="M8 11h6" />
  </svg>
);

const SearchIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

const FolderIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const TemplatesIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const TrashIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

// Node type icons
const ImageIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);

const ModelIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

const EditIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const FileIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M12 18v-6" />
    <path d="M9 15l3-3 3 3" />
  </svg>
);

// Node items configuration
interface NodeItem {
  type: NodeType;
  label: string;
  icon: React.ReactNode;
  category: string;
  badge?: string; // Optional badge to display (e.g., "First/Last Frame")
}

const nodeItems: NodeItem[] = [
  {
    type: "file",
    label: "File",
    icon: <FileIcon />,
    category: "Input",
  },
  {
    type: "productInput",
    label: "Product Input",
    icon: <EditIcon />,
    category: "Input",
  },
  {
    type: "languagePrompt",
    label: "Language Prompt",
    icon: <EditIcon />,
    category: "Input",
  },
  {
    type: "kling26",
    label: "Kling 2.6 Pro",
    icon: <ModelIcon />,
    category: "Video",
  },
  {
    type: "kling25Turbo",
    label: "Kling 2.5 Turbo",
    icon: <ModelIcon />,
    category: "Video",
    badge: "First/Last",
  },
  {
    type: "veo31",
    label: "Veo 3.1",
    icon: <ModelIcon />,
    category: "Video",
  },
  { type: "wan26", label: "Wan 2.6", icon: <ModelIcon />, category: "Video" },
  {
    type: "nanoBananaPro",
    label: "Nano Banana Pro",
    icon: <ImageIcon />,
    category: "Image",
  },
  {
    type: "seedream45",
    label: "Seedream 4.5",
    icon: <ImageIcon />,
    category: "Image",
  },
  {
    type: "videoConcat",
    label: "Concat",
    icon: <EditIcon />,
    category: "Editing",
  },
  {
    type: "videoSubtitles",
    label: "Subtitles",
    icon: <EditIcon />,
    category: "Editing",
  },
  {
    type: "videoTrim",
    label: "Trim",
    icon: <EditIcon />,
    category: "Editing",
  },
  {
    type: "videoTransition",
    label: "Transition",
    icon: <EditIcon />,
    category: "Editing",
  },
];

const ToolbarButton = ({
  onClick,
  active,
  disabled,
  children,
  title,
}: {
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
  title?: string;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`flex h-8 w-8 items-center justify-center rounded-[12px] transition-all duration-200 outline-none focus:outline-none ${
      active
        ? "bg-white/20 text-white"
        : disabled
          ? "cursor-not-allowed text-white/35"
          : "text-white/70 hover:bg-white/10 hover:text-white"
    }`}
  >
    {children}
  </button>
);

const Divider = () => <div className="h-px w-6 bg-white/10" />;

interface WorkflowBottomToolbarProps {
  currentWorkflowId?: string | null;
  onLoadWorkflow?: (workflow: SavedWorkflow) => void;
  onNewWorkflow?: () => void;
}

export default function WorkflowBottomToolbar({
  currentWorkflowId,
  onLoadWorkflow,
  onNewWorkflow,
}: WorkflowBottomToolbarProps) {
  const { mode, setMode, undo, redo, canUndo, canRedo } = useWorkflowContext();
  const {
    setViewport,
    fitView,
    zoomIn,
    zoomOut,
    screenToFlowPosition,
    setNodes,
    setEdges,
    getNodes,
    getEdges,
  } = useReactFlow();
  const viewport = useViewport();
  const [showZoomPopup, setShowZoomPopup] = useState(false);
  const [showNodesMenu, setShowNodesMenu] = useState(false);
  const [showTemplatesMenu, setShowTemplatesMenu] = useState(false);
  const [showWorkflowsMenu, setShowWorkflowsMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [workflowSearchQuery, setWorkflowSearchQuery] = useState("");
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([]);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const zoomRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<HTMLDivElement>(null);
  const templatesRef = useRef<HTMLDivElement>(null);
  const workflowsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const workflowSearchInputRef = useRef<HTMLInputElement>(null);

  const zoomPercentage = Math.round(viewport.zoom * 100);

  // Fetch workflows when menu opens
  const fetchWorkflows = useCallback(async () => {
    setIsLoadingWorkflows(true);
    try {
      const response = await apiFetch("/api/workflows");
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data);
      }
    } catch (error) {
      console.error("Failed to fetch workflows:", error);
    } finally {
      setIsLoadingWorkflows(false);
    }
  }, []);

  useEffect(() => {
    if (showWorkflowsMenu) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchWorkflows();
      setPendingDeleteId(null);
      if (workflowSearchInputRef.current) {
        workflowSearchInputRef.current.focus();
      }
    }
  }, [showWorkflowsMenu, fetchWorkflows]);

  // Delete workflow
  const deleteWorkflow = useCallback(
    async (workflowId: string) => {
      try {
        const response = await apiFetch(`/api/workflows/${workflowId}`, {
          method: "DELETE",
        });
        if (response.ok) {
          setWorkflows((prev) => prev.filter((w) => w.id !== workflowId));
          setPendingDeleteId(null);
          // If we deleted the current workflow, create a new one
          if (currentWorkflowId === workflowId && onNewWorkflow) {
            onNewWorkflow();
          }
        }
      } catch (error) {
        console.error("Failed to delete workflow:", error);
      }
    },
    [currentWorkflowId, onNewWorkflow]
  );

  // Load a template onto the canvas
  const handleLoadTemplate = useCallback(
    (template: WorkflowTemplate) => {
      const existingNodes = getNodes();
      if (existingNodes.length > 0) {
        if (!confirm(`Load "${template.name}"? This will replace your current workflow.`)) {
          return;
        }
      }
      setNodes(template.nodes);
      setEdges(template.edges);
      setShowTemplatesMenu(false);
      setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
    },
    [getNodes, setNodes, setEdges, fitView]
  );

  // Auto-layout nodes using dagre for proper graph layout
  const cleanLayout = useCallback(() => {
    const nodes = getNodes();
    const edges = getEdges();

    if (nodes.length === 0) return;

    // Layout constants
    const NODE_WIDTH = 280;
    const NODE_SEP = 250; // Vertical spacing between nodes (accounts for tall nodes)
    const RANK_SEP = 100; // Horizontal spacing between ranks/columns

    // Create dagre graph
    const dagreGraph = new Dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({
      rankdir: "LR", // Left to right layout
      nodesep: NODE_SEP,
      ranksep: RANK_SEP,
      align: "UL", // Align nodes to upper-left for cleaner look
      ranker: "tight-tree", // Tighter layout
    });

    // Add nodes to dagre graph with actual measured heights
    nodes.forEach((node) => {
      // Estimate height based on node type
      let nodeHeight = 120; // Default for small nodes like Prompt
      if (node.type === "productInput") {
        nodeHeight = 320;
      } else if (node.type === "languagePrompt") {
        nodeHeight = 200;
      } else if (node.type === "bannerInput") {
        nodeHeight = 600;
      } else if (node.type === "textComposite") {
        nodeHeight = 200;
      } else if (node.type === "file" || node.type === "imageInput") {
        nodeHeight = 400;
      } else if (
        node.type === "nanoBananaPro" ||
        node.type === "seedream45" ||
        node.type === "kling26" ||
        node.type === "kling25Turbo" ||
        node.type === "veo31" ||
        node.type === "wan26" ||
        node.type === "videoConcat" ||
        node.type === "videoSubtitles" ||
        node.type === "videoTrim" ||
        node.type === "videoTransition"
      ) {
        nodeHeight = 450;
      }

      dagreGraph.setNode(node.id, {
        width: NODE_WIDTH,
        height: nodeHeight,
      });
    });

    // Add edges to dagre graph
    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    // Run the layout algorithm
    Dagre.layout(dagreGraph);

    // Update node positions from dagre results
    setNodes((nds) =>
      nds.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        if (nodeWithPosition) {
          return {
            ...node,
            position: {
              // Dagre gives center position, convert to top-left for React Flow
              x: nodeWithPosition.x - nodeWithPosition.width / 2,
              y: nodeWithPosition.y - nodeWithPosition.height / 2,
            },
            targetPosition: Position.Left,
            sourcePosition: Position.Right,
          };
        }
        return node;
      })
    );

    // Fit view after layout
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 300 });
    }, 50);
  }, [getNodes, getEdges, setNodes, fitView]);

  // Group workflows by date
  const groupWorkflowsByDate = (workflows: SavedWorkflow[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const groups: { [key: string]: SavedWorkflow[] } = {
      Today: [],
      Yesterday: [],
      "This Week": [],
      "This Month": [],
      Older: [],
    };

    workflows.forEach((workflow) => {
      const date = new Date(workflow.updatedAt);
      if (date >= today) {
        groups.Today.push(workflow);
      } else if (date >= yesterday) {
        groups.Yesterday.push(workflow);
      } else if (date >= thisWeek) {
        groups["This Week"].push(workflow);
      } else if (date >= thisMonth) {
        groups["This Month"].push(workflow);
      } else {
        groups.Older.push(workflow);
      }
    });

    return groups;
  };

  // Filter workflows based on search
  const filteredWorkflows = workflows.filter((w) =>
    w.name.toLowerCase().includes(workflowSearchQuery.toLowerCase())
  );
  const groupedWorkflows = groupWorkflowsByDate(filteredWorkflows);

  // Filter nodes based on search
  const filteredNodes = nodeItems.filter(
    (item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by category
  const categories = [...new Set(filteredNodes.map((item) => item.category))];

  // Focus search input when menu opens
  useEffect(() => {
    if (showNodesMenu && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showNodesMenu]);

  // Close popups when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (zoomRef.current && !zoomRef.current.contains(event.target as Node)) {
        setShowZoomPopup(false);
      }
      if (
        nodesRef.current &&
        !nodesRef.current.contains(event.target as Node)
      ) {
        setShowNodesMenu(false);
        setSearchQuery("");
      }
      if (templatesRef.current && !templatesRef.current.contains(event.target as Node)) {
        setShowTemplatesMenu(false);
      }
      if (
        workflowsRef.current &&
        !workflowsRef.current.contains(event.target as Node)
      ) {
        setShowWorkflowsMenu(false);
        setWorkflowSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Tab to toggle nodes menu - always handle this first
      if (event.key === "Tab") {
        event.preventDefault();
        event.stopPropagation();
        setShowNodesMenu((prev) => {
          if (prev) setSearchQuery("");
          return !prev;
        });
        return;
      }

      // Escape to close menus - works even in inputs
      if (event.key === "Escape") {
        setShowNodesMenu(false);
        setShowZoomPopup(false);
        setShowTemplatesMenu(false);
        setShowWorkflowsMenu(false);
        setSearchQuery("");
        setWorkflowSearchQuery("");
        return;
      }

      // Skip other shortcuts if user is typing in an input
      if (
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLInputElement
      ) {
        return;
      }

      // Undo: Cmd/Ctrl + Z
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key === "z" &&
        !event.shiftKey
      ) {
        event.preventDefault();
        if (canUndo) undo();
      }
      // Redo: Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y
      if (
        (event.metaKey || event.ctrlKey) &&
        (event.key === "y" || (event.key === "z" && event.shiftKey))
      ) {
        event.preventDefault();
        if (canRedo) redo();
      }
      // Pan mode: Space (while held)
      if (event.key === " " && !event.repeat) {
        event.preventDefault();
        setMode("pan");
      }
      // Select mode: V
      if (event.key === "v" || event.key === "V") {
        setMode("select");
      }
      // Pan mode: H
      if (event.key === "h" || event.key === "H") {
        setMode("pan");
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === " ") {
        setMode("select");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [canUndo, canRedo, undo, redo, setMode]);

  const handleZoomChange = (newZoom: number) => {
    setViewport({ x: viewport.x, y: viewport.y, zoom: newZoom / 100 });
    setShowZoomPopup(false);
  };

  const handleFitView = () => {
    fitView({ padding: 0.2 });
    setShowZoomPopup(false);
  };

  const handleAddNode = useCallback(
    (type: NodeType) => {
      const position = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });

      const newNode = {
        id: `node-${Date.now()}`,
        type,
        position,
        data: getDefaultNodeData(type),
      };

      setNodes((nodes) => [...nodes, newNode]);
      setShowNodesMenu(false);
      setSearchQuery("");
    },
    [screenToFlowPosition, setNodes, setShowNodesMenu, setSearchQuery],
  );

  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      className="absolute top-1/2 left-4 -translate-y-1/2 transform"
      style={{ zIndex: 40 }}
    >
      <div className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-zinc-900/90 p-1 shadow-lg backdrop-blur-xl">
        {/* Add Node Button with Dropdown */}
        <div className="relative" ref={nodesRef}>
          <ToolbarButton
            onClick={() => setShowNodesMenu(!showNodesMenu)}
            active={showNodesMenu}
            title="Add Node"
          >
            <PlusIcon />
          </ToolbarButton>

          {/* Nodes Dropdown Menu */}
          {showNodesMenu && (
            <div className="absolute top-0 left-full ml-2 w-52 rounded-xl border border-white/10 bg-zinc-900/95 shadow-xl backdrop-blur-xl">
              <style>{`
                .nodes-scrollbar::-webkit-scrollbar { width: 6px; }
                .nodes-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .nodes-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
                .nodes-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
              `}</style>
              {/* Search Input */}
              <div className="p-2">
                <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5">
                  <span className="text-white/40">
                    <SearchIcon />
                  </span>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search nodes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent text-xs text-white placeholder-white/40 outline-none"
                  />
                </div>
              </div>

              {/* Nodes List */}
              <div
                className="nodes-scrollbar max-h-64 overflow-y-auto px-1 pb-1"
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: "rgba(255,255,255,0.2) transparent",
                }}
              >
                {categories.map((category, index) => (
                  <div key={category}>
                    {index > 0 && (
                      <div className="mx-2 my-1.5 h-px bg-white/10" />
                    )}
                    <div className="px-2 py-1">
                      <span className="text-[10px] font-medium tracking-wider text-white/40 uppercase">
                        {category}
                      </span>
                    </div>
                    {filteredNodes
                      .filter((item) => item.category === category)
                      .map((item) => (
                        <button
                          key={item.type}
                          onClick={() => handleAddNode(item.type)}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item.type)}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          <span className="text-white/50">{item.icon}</span>
                          <span className="flex-1 text-xs">{item.label}</span>
                          {item.badge && (
                            <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-medium text-purple-300">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      ))}
                  </div>
                ))}
                {filteredNodes.length === 0 && (
                  <div className="px-2 py-4 text-center text-xs text-white/40">
                    No nodes found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Templates Button with Dropdown */}
        <div className="relative" ref={templatesRef}>
          <ToolbarButton
            onClick={() => setShowTemplatesMenu(!showTemplatesMenu)}
            active={showTemplatesMenu}
            title="Workflow Templates"
          >
            <TemplatesIcon />
          </ToolbarButton>

          {showTemplatesMenu && (
            <div className="absolute top-0 left-full ml-2 w-56 rounded-xl border border-white/10 bg-zinc-900/95 shadow-xl backdrop-blur-xl">
              <div className="px-3 py-2">
                <span className="text-[10px] font-medium tracking-wider text-white/40 uppercase">Templates</span>
              </div>
              <div className="px-1 pb-1">
                {WORKFLOW_TEMPLATES.map((template) => (
                  <button
                    key={template.name}
                    onClick={() => handleLoadTemplate(template)}
                    className="flex w-full flex-col gap-0.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/10"
                  >
                    <span className="text-xs font-medium text-white">{template.name}</span>
                    <span className="text-[10px] text-white/40">{template.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Workflows Button with Dropdown */}
        <div className="relative" ref={workflowsRef}>
          <ToolbarButton
            onClick={() => setShowWorkflowsMenu(!showWorkflowsMenu)}
            active={showWorkflowsMenu}
            title="Saved Workflows"
          >
            <FolderIcon />
          </ToolbarButton>

          {/* Workflows Dropdown Menu */}
          {showWorkflowsMenu && (
            <div className="absolute top-0 left-full ml-2 w-56 rounded-xl border border-white/10 bg-zinc-900/95 shadow-xl backdrop-blur-xl">
              {/* New Workflow Button */}
              <div className="p-2 pb-0">
                <button
                  onClick={() => {
                    if (onNewWorkflow) {
                      onNewWorkflow();
                    }
                    setShowWorkflowsMenu(false);
                    setWorkflowSearchQuery("");
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/20"
                >
                  <PlusIcon />
                  New Workflow
                </button>
              </div>

              {/* Search Input */}
              <div className="p-2">
                <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5">
                  <span className="text-white/40">
                    <SearchIcon />
                  </span>
                  <input
                    ref={workflowSearchInputRef}
                    type="text"
                    placeholder="Search workflows..."
                    value={workflowSearchQuery}
                    onChange={(e) => setWorkflowSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent text-xs text-white placeholder-white/40 outline-none"
                  />
                </div>
              </div>

              {/* Workflows List */}
              <div
                className="nodes-scrollbar max-h-72 overflow-y-auto px-1 pb-1"
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: "rgba(255,255,255,0.2) transparent",
                }}
              >
                {isLoadingWorkflows ? (
                  <div className="px-2 py-4 text-center text-xs text-white/40">
                    Loading...
                  </div>
                ) : filteredWorkflows.length === 0 ? (
                  <div className="px-2 py-4 text-center text-xs text-white/40">
                    {workflows.length === 0
                      ? "No saved workflows"
                      : "No workflows found"}
                  </div>
                ) : (
                  Object.entries(groupedWorkflows).map(
                    ([group, items], groupIndex) => {
                      if (items.length === 0) return null;
                      return (
                        <div key={group}>
                          {groupIndex > 0 &&
                            Object.entries(groupedWorkflows)
                              .slice(0, groupIndex)
                              .some(([, v]) => v.length > 0) && (
                              <div className="mx-2 my-1.5 h-px bg-white/10" />
                            )}
                          <div className="px-2 py-1">
                            <span className="text-[10px] font-medium tracking-wider text-white/40 uppercase">
                              {group}
                            </span>
                          </div>
                          {items.map((workflow) => (
                            <div
                              key={workflow.id}
                              className={`group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/10 ${
                                currentWorkflowId === workflow.id
                                  ? "bg-white/10 text-white"
                                  : "text-white/70 hover:text-white"
                              }`}
                            >
                              <button
                                onClick={() => {
                                  if (pendingDeleteId === workflow.id) {
                                    setPendingDeleteId(null);
                                    return;
                                  }
                                  if (onLoadWorkflow) {
                                    onLoadWorkflow(workflow);
                                  }
                                  setShowWorkflowsMenu(false);
                                  setWorkflowSearchQuery("");
                                }}
                                className="flex flex-1 items-center gap-2 text-left"
                              >
                                <span className="text-white/50">
                                  <FolderIcon />
                                </span>
                                <span className="flex-1 truncate text-xs">
                                  {workflow.name}
                                </span>
                              </button>
                              {pendingDeleteId === workflow.id ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteWorkflow(workflow.id);
                                  }}
                                  className="shrink-0 rounded px-2 py-0.5 text-[10px] font-medium text-red-400 transition-colors hover:bg-red-500/20"
                                >
                                  Confirm
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPendingDeleteId(workflow.id);
                                  }}
                                  className="shrink-0 rounded p-1 text-white/30 opacity-0 transition-all group-hover:opacity-100 hover:bg-white/10 hover:text-red-400"
                                >
                                  <TrashIcon />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    }
                  )
                )}
              </div>
            </div>
          )}
        </div>

        <Divider />

        {/* Selection Mode */}
        <ToolbarButton
          onClick={() => setMode("select")}
          active={mode === "select"}
          title="Select (V)"
        >
          <SelectIcon />
        </ToolbarButton>

        {/* Pan Mode */}
        <ToolbarButton
          onClick={() => setMode("pan")}
          active={mode === "pan"}
          title="Pan (H or hold Space)"
        >
          <PanIcon />
        </ToolbarButton>

        <Divider />

        {/* Zoom Controls */}
        <div className="relative" ref={zoomRef}>
          <ToolbarButton
            onClick={() => setShowZoomPopup(!showZoomPopup)}
            title="Zoom"
          >
            <span className="text-[10px] font-medium">{zoomPercentage}%</span>
          </ToolbarButton>

          {/* Zoom Popup */}
          {showZoomPopup && (
            <div className="absolute top-0 left-full ml-2 flex flex-col gap-1 rounded-xl border border-white/10 bg-zinc-900/95 p-1 shadow-lg backdrop-blur-xl">
              <ToolbarButton onClick={() => zoomIn()} title="Zoom In">
                <ZoomInIcon />
              </ToolbarButton>
              <ToolbarButton onClick={() => zoomOut()} title="Zoom Out">
                <ZoomOutIcon />
              </ToolbarButton>
              <Divider />
              <ToolbarButton onClick={handleFitView} title="Fit to View">
                <FitViewIcon />
              </ToolbarButton>
              <Divider />
              {[50, 100, 150, 200].map((level) => (
                <button
                  key={level}
                  onClick={() => handleZoomChange(level)}
                  className={`flex h-7 w-full items-center justify-center rounded-lg px-3 text-[10px] font-medium transition-colors ${
                    zoomPercentage === level
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {level}%
                </button>
              ))}
            </div>
          )}
        </div>

        <Divider />

        {/* Undo / Redo */}
        <div className="flex flex-col gap-1">
          <ToolbarButton onClick={undo} disabled={!canUndo} title="Undo (⌘Z)">
            <UndoIcon />
          </ToolbarButton>
          <ToolbarButton onClick={redo} disabled={!canRedo} title="Redo (⌘⇧Z)">
            <RedoIcon />
          </ToolbarButton>
        </div>

        <Divider />

        {/* Clean Layout */}
        <ToolbarButton onClick={cleanLayout} title="Clean Layout">
          <CleanLayoutIcon />
        </ToolbarButton>
      </div>
    </div>
  );
}

// Helper to get default data for each node type
function getDefaultNodeData(type: NodeType) {
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
        audioEnabled: true,
        cfgScale: 0.5,
      };
    case "kling25Turbo":
      return {
        label: "Kling 2.5 Turbo",
        mode: "text-to-video",
        duration: "5",
        cfgScale: 0.5,
      };
    case "veo31":
      return {
        label: "Veo 3.1",
        mode: "first-last-frame",
        duration: "8",
        resolution: "720p",
        generateAudio: true,
      };
    case "wan26":
      return {
        label: "Wan 2.6",
        mode: "text-to-video",
        duration: "5",
        resolution: "720p",
        enhanceEnabled: false,
      };
    case "nanoBananaPro":
      return {
        label: "Nano Banana Pro",
        prompt: "",
        mode: "text-to-image",
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
        outputFormat: "png",
        numImages: 1,
        enableSafetyChecker: true,
      };
    case "videoConcat":
      return {
        label: "Concat",
        transition: "crossfade",
        transitionDuration: 0.5,
      };
    case "videoSubtitles":
      return {
        label: "Subtitles",
        style: "tiktok",
        position: "bottom",
        autoGenerate: true,
      };
    case "videoTrim":
      return {
        label: "Trim",
        startTime: 0,
        endTime: 5,
      };
    case "videoTransition":
      return {
        label: "Transition",
        transitionType: "fade",
        duration: 0.5,
        easing: "easeInOut",
      };
    case "file":
      return { label: "File" };
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

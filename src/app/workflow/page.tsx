"use client";

import { Suspense, useCallback, useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import type { Edge } from "@xyflow/react";
import { toast } from "sonner";
import { WorkflowCanvas } from "@/components/workflow";
import Header from "@/components/Header";
import { WorkflowProvider } from "@/components/workflow/WorkflowContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useWorkflow } from "@/hooks/useWorkflow";
import { useWorkflowExecution } from "@/hooks/useWorkflowExecution";
import {
  getWorkflow,
  createWorkflow,
  updateWorkflow,
} from "@/lib/api/workflows";
import type { WorkflowNode } from "@/components/workflow/types";
import type { SavedWorkflow } from "@/components/workflow/WorkflowBottomToolbar";

// Download icon
const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Import/Upload icon
const ImportIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function WorkflowPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState("Untitled Workflow");
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSaveAnimation, setShowSaveAnimation] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);
  const hasLoadedFromUrl = useRef(false);
  const workflowNameInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    addNode,
    deleteNode,
    clearSelection,
    undo,
    redo,
    canUndo,
    canRedo,
    setNodes,
    setEdges,
    copySelectedNodes,
    pasteNodes,
    selectAllNodes,
  } = useWorkflow();

  // Workflow execution
  const {
    executeNode,
    executeAll,
    stopExecution,
    isExecuting,
    executingNodeIds,
  } = useWorkflowExecution();

  // Load workflow from URL on mount
  useEffect(() => {
    if (hasLoadedFromUrl.current) return;
    hasLoadedFromUrl.current = true;

    const urlWorkflowId = searchParams.get("id");
    if (urlWorkflowId) {
      getWorkflow(urlWorkflowId)
        .then((result) => {
          if (result.success) {
            setWorkflowId(result.data.id);
            setWorkflowName(result.data.name);
            setNodes(result.data.nodes);
            setEdges(result.data.edges);
            isInitialMount.current = true;
          } else if (result.error.code !== "NOT_FOUND") {
            toast.error("Failed to load workflow");
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(false);
    }
  }, [searchParams, setNodes, setEdges]);

  // Update URL when workflow ID changes
  useEffect(() => {
    if (workflowId) {
      const newUrl = `/workflow?id=${workflowId}`;
      if (window.location.pathname + window.location.search !== newUrl) {
        router.replace(newUrl, { scroll: false });
      }
    }
  }, [workflowId, router]);

  // Keyboard shortcuts for copy/paste
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if we're in an input field
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifierKey = isMac ? event.metaKey : event.ctrlKey;

      if (modifierKey && event.key === "c") {
        event.preventDefault();
        copySelectedNodes();
      } else if (modifierKey && event.key === "v") {
        event.preventDefault();
        pasteNodes();
      } else if (modifierKey && event.key === "a") {
        event.preventDefault();
        selectAllNodes();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [copySelectedNodes, pasteNodes, selectAllNodes]);

  // Auto-save workflow with debounce
  const saveWorkflow = useCallback(async (showFeedback = false) => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      if (workflowId) {
        const result = await updateWorkflow(workflowId, {
          name: workflowName,
          nodes,
          edges,
        });
        if (!result.success) {
          toast.error("Failed to save workflow");
        } else if (showFeedback) {
          toast.success("Workflow saved");
          setShowSaveAnimation(true);
          setTimeout(() => setShowSaveAnimation(false), 600);
        }
      } else {
        const result = await createWorkflow({
          name: workflowName,
          nodes,
          edges,
        });
        if (result.success) {
          setWorkflowId(result.data.id);
          if (showFeedback) {
            toast.success("Workflow created");
            setShowSaveAnimation(true);
            setTimeout(() => setShowSaveAnimation(false), 600);
          }
        } else {
          toast.error("Failed to create workflow");
        }
      }
    } catch (error) {
      console.error("Failed to save workflow:", error);
      toast.error("Failed to save workflow");
    } finally {
      setIsSaving(false);
    }
  }, [workflowId, workflowName, nodes, edges, isSaving]);

  // Handle workflow name save on Enter key
  const handleWorkflowNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        // Cancel any pending auto-save
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = null;
        }
        // Blur the input
        workflowNameInputRef.current?.blur();
        // Save with feedback
        setHasUnsavedChanges(false);
        saveWorkflow(true);
      }
    },
    [saveWorkflow]
  );

  // Track changes (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setHasUnsavedChanges(true);
  }, [nodes, edges, workflowName]);

  // Debounced auto-save when there are unsaved changes
  // Only auto-save if: existing workflow OR new workflow with actual nodes
  useEffect(() => {
    if (!hasUnsavedChanges || isLoading) return;

    // Don't auto-save empty new workflows
    if (!workflowId && nodes.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasUnsavedChanges(false);
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveWorkflow();
      setHasUnsavedChanges(false);
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, saveWorkflow, isLoading, workflowId, nodes.length]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: WorkflowNode) => {
      onNodeClick(node.id);
    },
    [onNodeClick]
  );

  const handlePaneClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type as Parameters<typeof addNode>[0], position);
    },
    [addNode, screenToFlowPosition]
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },
    []
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      deleteNode(nodeId);
    },
    [deleteNode]
  );

  const handleRunNode = useCallback(
    async (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        toast.info(`Running ${node.data.label || node.type}...`);
        const result = await executeNode(nodeId);
        if (result.success) {
          toast.success(`${node.data.label || node.type} completed`);
        } else {
          toast.error(result.error || "Execution failed");
        }
      }
    },
    [nodes, executeNode]
  );

  const handleLoadWorkflow = useCallback(
    async (workflow: SavedWorkflow) => {
      const result = await getWorkflow(workflow.id);
      if (result.success) {
        setWorkflowId(result.data.id);
        setWorkflowName(result.data.name);
        setNodes(result.data.nodes);
        setEdges(result.data.edges);
        setHasUnsavedChanges(false);
        isInitialMount.current = true;
        toast.success(`Loaded "${result.data.name}"`);
      } else {
        toast.error("Failed to load workflow");
      }
    },
    [setNodes, setEdges]
  );

  const handleNewWorkflow = useCallback(() => {
    setWorkflowId(null);
    setWorkflowName("Untitled Workflow");
    setNodes([]);
    setEdges([]);
    setHasUnsavedChanges(false);
    isInitialMount.current = true; // Reset to prevent immediate save
    clearSelection();
    router.replace("/workflow", { scroll: false });
  }, [setNodes, setEdges, clearSelection, router]);

  // Handle Run All execution
  const handleRunAll = useCallback(async () => {
    toast.info("Running all nodes...");
    const result = await executeAll();
    if (result.stopped) {
      toast.info("Workflow execution stopped");
    } else if (result.success) {
      toast.success(
        `Completed ${result.completed} node${result.completed !== 1 ? "s" : ""}`
      );
    } else if (result.failed > 0) {
      toast.error(
        `${result.failed} node${result.failed !== 1 ? "s" : ""} failed`
      );
    }
  }, [executeAll]);

  // Handle Stop All execution
  const handleStopAll = useCallback(() => {
    stopExecution();
    toast.info("Stopping workflow...");
  }, [stopExecution]);

  // Download current workflow as JSON file
  const handleDownloadWorkflow = useCallback(() => {
    const workflowData = {
      name: workflowName,
      nodes,
      edges,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(workflowData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${workflowName.replace(/[^a-z0-9]/gi, "_")}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Workflow downloaded");
  }, [workflowName, nodes, edges]);

  // Import workflow from JSON file
  const handleImportWorkflow = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content) as {
            name?: string;
            nodes?: WorkflowNode[];
            edges?: Edge[];
          };

          if (!data.nodes || !Array.isArray(data.nodes)) {
            toast.error("Invalid workflow file: missing nodes");
            return;
          }

          // Reset to a new workflow with imported data
          setWorkflowId(null);
          setWorkflowName(data.name || "Imported Workflow");
          setNodes(data.nodes);
          setEdges(data.edges || []);
          setHasUnsavedChanges(true);
          isInitialMount.current = false;
          clearSelection();
          router.replace("/workflow", { scroll: false });
          toast.success(`Imported "${data.name || "workflow"}"`);
        } catch {
          toast.error("Failed to parse workflow file");
        }
      };
      reader.readAsText(file);

      // Reset the input so the same file can be imported again
      event.target.value = "";
    },
    [setNodes, setEdges, clearSelection, router]
  );

  return (
    <WorkflowProvider
      undo={undo}
      redo={redo}
      canUndo={canUndo}
      canRedo={canRedo}
    >
      <div className="flex h-screen flex-col overflow-hidden bg-[#0a0a0a]">
        <Header />

        {/* Main Canvas Area */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div
            className="relative flex-1"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {/* Workflow Name Input */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <input
                ref={workflowNameInputRef}
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                onKeyDown={handleWorkflowNameKeyDown}
                className={`w-48 rounded-lg border bg-zinc-900/90 px-3 py-2 text-sm text-white placeholder-gray-500 backdrop-blur-xl transition-all duration-300 outline-none focus:border-white/20 ${
                  showSaveAnimation
                    ? "border-emerald-500/70 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                    : "border-white/10"
                }`}
                placeholder="Workflow name..."
              />
              {/* Import button */}
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-zinc-900/90 text-gray-400 backdrop-blur-xl transition-colors hover:border-white/20 hover:text-white"
                title="Import workflow"
              >
                <ImportIcon />
              </button>
              {/* Download button */}
              <button
                type="button"
                onClick={handleDownloadWorkflow}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-zinc-900/90 text-gray-400 backdrop-blur-xl transition-colors hover:border-white/20 hover:text-white"
                title="Download workflow"
              >
                <DownloadIcon />
              </button>
              {/* Hidden file input for import */}
              <input
                ref={importInputRef}
                type="file"
                accept=".json"
                onChange={handleImportWorkflow}
                className="hidden"
              />
            </div>
            <WorkflowCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={handleNodeClick}
              onPaneClick={handlePaneClick}
              onDeleteNode={handleDeleteNode}
              onRunNode={handleRunNode}
              onRunAll={handleRunAll}
              onStopAll={handleStopAll}
              isExecutingAll={isExecuting}
              executingCount={executingNodeIds.length}
              currentWorkflowId={workflowId}
              onLoadWorkflow={handleLoadWorkflow}
              onNewWorkflow={handleNewWorkflow}
            />

            {/* Empty State */}
            {!isLoading && nodes.length === 0 && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center justify-center gap-2">
                  <h2 className="font-heading text-center text-2xl font-bold text-white uppercase">
                    Nothing Here Yet
                  </h2>
                  <p className="text-center text-sm text-gray-400">
                    Press <kbd className="rounded bg-zinc-700 px-1.5 py-0.5 font-mono text-xs text-zinc-300">TAB</kbd> to open the nodes panel
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </WorkflowProvider>
  );
}

function WorkflowPageWithProvider() {
  return (
    <ReactFlowProvider>
      <WorkflowPageContent />
    </ReactFlowProvider>
  );
}

export default function WorkflowPage() {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center bg-[#0a0a0a]">
            <div className="text-gray-400">Loading workflow...</div>
          </div>
        }
      >
        <WorkflowPageWithProvider />
      </Suspense>
    </ErrorBoundary>
  );
}

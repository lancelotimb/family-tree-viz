"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useOnSelectionChange,
  type Edge,
  type Node,
  type OnSelectionChangeParams,
  type ReactFlowInstance,
} from "@xyflow/react";
import { FamilyMemberNode } from "./FamilyMemberNode";
import { MarriageNode } from "./MarriageNode";
import { SearchBar } from "./SearchBar";
import { ControlSidebar } from "./ControlSidebar";
import { ZoomControls } from "./ZoomControls";
import { ProfilePanel } from "./ProfilePanel";
import {
  buildAdjacencyList,
  findShortestPath,
  pathEdgeIds,
} from "./graphPath";
import { buildFlowEdges, buildFlowNodes } from "./familyGraph";
import { computeLayout } from "./elkLayout";
import type { FamilyNodeData } from "./types";

const nodeTypes = { familyMember: FamilyMemberNode, union: MarriageNode };

const defaultEdgeStyle = { stroke: "#c4b49a", strokeWidth: 1.5 };

const highlightedEdgeStyle = {
  stroke: "#7a9e6a",
  strokeWidth: 3,
};

function FamilyTreeCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FamilyNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [baseEdges, setBaseEdges] = useState<Edge[]>([]);
  const [ready, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [greyDeceased, setGreyDeceased] = useState(false);
  const [pathFromId, setPathFromId] = useState("");
  const [pathToId, setPathToId] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const instanceRef = useRef<ReactFlowInstance<Node<FamilyNodeData>, Edge> | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    computeLayout().then((positions) => {
      if (cancelled) return;
      setNodes(buildFlowNodes(positions));
      const built = buildFlowEdges(positions);
      setBaseEdges(built);
      setEdges(built);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [setNodes, setEdges]);

  useEffect(() => {
    if (!ready) return;
    requestAnimationFrame(() => {
      instanceRef.current?.fitView({ padding: 0.15, duration: 400 });
    });
  }, [ready]);

  const adjacency = useMemo(() => buildAdjacencyList(baseEdges), [baseEdges]);

  const pathResult = useMemo(() => {
    if (!pathFromId || !pathToId) return null;
    return findShortestPath(pathFromId, pathToId, adjacency);
  }, [pathFromId, pathToId, adjacency]);

  const pathNodeIds = useMemo(
    () => (pathResult ? new Set(pathResult) : null),
    [pathResult],
  );

  const pathEdgeIdSet = useMemo(
    () => (pathResult ? pathEdgeIds(pathResult, baseEdges) : null),
    [pathResult, baseEdges],
  );

  const pathStatus = useMemo((): "idle" | "ready" | "no-path" => {
    if (!pathFromId || !pathToId) return "idle";
    if (pathResult) return "ready";
    return "no-path";
  }, [pathFromId, pathToId, pathResult]);

  useEffect(() => {
    setNodes((current) =>
      current.map((node) => {
        const data = node.data;
        const pathHighlighted = pathNodeIds?.has(node.id) ?? false;
        if (data.kind === "person") {
          const isDeceased = data.deathYear !== null;
          return {
            ...node,
            data: {
              ...data,
              selected: node.id === selectedId,
              greyed: greyDeceased && isDeceased,
              pathHighlighted,
            },
            selected: node.id === selectedId,
          };
        }
        return { ...node, data: { ...data, pathHighlighted } };
      }),
    );
    setEdges((current) =>
      current.map((edge) => {
        const highlighted = pathEdgeIdSet?.has(edge.id) ?? false;
        const baseStyle = baseEdges.find((e) => e.id === edge.id)?.style ?? defaultEdgeStyle;
        return {
          ...edge,
          style: highlighted ? highlightedEdgeStyle : baseStyle,
          animated: highlighted,
        };
      }),
    );
  }, [
    selectedId,
    greyDeceased,
    pathNodeIds,
    pathEdgeIdSet,
    baseEdges,
    setNodes,
    setEdges,
  ]);

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
      const node = selectedNodes.find(
        (n) => (n.data as FamilyNodeData)?.kind === "person",
      ) as Node<FamilyNodeData> | undefined;
      if (node) {
        setSelectedId(node.id);
        setPanelOpen(true);
      }
    },
    [],
  );

  useOnSelectionChange({ onChange: onSelectionChange });

  const handlePaneClick = useCallback(() => {
    setSelectedId(null);
    setPanelOpen(false);
  }, []);

  return (
    <div className="relative h-full w-full bg-[#fdfbf7]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onInit={(instance) => {
          instanceRef.current = instance;
        }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{ style: defaultEdgeStyle }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        panOnDrag
        zoomOnScroll
        minZoom={0.2}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
        onPaneClick={handlePaneClick}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        className="family-tree-flow"
      />

      {!ready && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <p className="rounded-full bg-white/80 px-4 py-2 text-sm text-[#8b7d6b] shadow backdrop-blur-md">
            Arranging the family tree…
          </p>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
        <header className="flex justify-center px-6 pt-6">
          <SearchBar />
        </header>
        <div className="flex flex-1 items-start p-6">
          <ControlSidebar
            greyDeceased={greyDeceased}
            onGreyDeceasedChange={setGreyDeceased}
            pathFromId={pathFromId}
            pathToId={pathToId}
            onPathFromChange={setPathFromId}
            onPathToChange={setPathToId}
            pathStatus={pathStatus}
          />
        </div>
        <div className="flex justify-end p-6">
          <ZoomControls />
        </div>
      </div>

      <ProfilePanel
        memberId={selectedId}
        open={panelOpen}
        onClose={() => {
          setPanelOpen(false);
          setSelectedId(null);
        }}
      />
    </div>
  );
}

export function FamilyTreeVisualizer() {
  return (
    <ReactFlowProvider>
      <FamilyTreeCanvas />
    </ReactFlowProvider>
  );
}

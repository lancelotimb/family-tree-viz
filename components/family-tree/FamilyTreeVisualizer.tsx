"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type ReactFlowInstance,
} from "@xyflow/react";
import { FamilyMemberNode } from "./FamilyMemberNode";
import { MarriageNode } from "./MarriageNode";
import { SearchBar } from "./SearchBar";
import { ControlDrawer } from "./ControlDrawer";
import { ControlSidebar } from "./ControlSidebar";
import { SettingsButton } from "./SettingsButton";
import { MAX_ZOOM, MIN_ZOOM } from "./layoutConstants";
import { ZoomControls } from "./ZoomControls";
import { ProfilePanel } from "./ProfilePanel";
import {
  buildAdjacencyList,
  findShortestPath,
  pathEdgeIds,
} from "./graphPath";
import {
  buildFlowEdges,
  buildFlowNodes,
  familyBranches,
  individuals,
} from "./familyGraph";
import { computeLayout } from "./elkLayout";
import type { FamilyNodeData } from "./types";

const nodeTypes = { familyMember: FamilyMemberNode, union: MarriageNode };
const allFamilyNames = familyBranches.map((branch) => branch.familyName);

const defaultEdgeStyle = { stroke: "#c4b49a", strokeWidth: 1.5 };

const highlightedEdgeStyle = {
  stroke: "#7a9e6a",
  strokeWidth: 3,
};

type BranchEdgeData = {
  familyName?: string;
};

function edgeFamilyName(edge: Edge): string | null {
  return (edge.data as BranchEdgeData | undefined)?.familyName ?? null;
}

function neutralEdgeStyle(edge: Edge) {
  const dash = (edge.style as { strokeDasharray?: string } | undefined)?.strokeDasharray;
  return dash ? { ...defaultEdgeStyle, strokeDasharray: dash } : defaultEdgeStyle;
}

function FamilyTreeCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FamilyNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [baseEdges, setBaseEdges] = useState<Edge[]>([]);
  const [ready, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [greyDeceased, setGreyDeceased] = useState(false);
  const [colorByFamily, setColorByFamily] = useState(true);
  const [visibleFamilyNames, setVisibleFamilyNames] = useState<Set<string>>(
    () => new Set(allFamilyNames),
  );
  const [pathFromId, setPathFromId] = useState("");
  const [pathToId, setPathToId] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSidebarExpanded, setSettingsSidebarExpanded] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
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
      instanceRef.current?.fitView({ padding: 0.15, minZoom: MIN_ZOOM, duration: 400 });
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

  const clearHiddenPeople = useCallback((nextVisibleFamilyNames: Set<string>) => {
    const isVisiblePerson = (id: string) =>
      nextVisibleFamilyNames.has(individuals[id]?.familyName ?? "");

    if (selectedId && !isVisiblePerson(selectedId)) {
      setSelectedId(null);
      setPanelOpen(false);
    }
    if (pathFromId && !isVisiblePerson(pathFromId)) {
      setPathFromId("");
    }
    if (pathToId && !isVisiblePerson(pathToId)) {
      setPathToId("");
    }
  }, [selectedId, pathFromId, pathToId]);

  const handleFamilyVisibilityChange = useCallback(
    (familyName: string, visible: boolean) => {
      const next = new Set(visibleFamilyNames);
      if (visible) {
        next.add(familyName);
      } else {
        next.delete(familyName);
      }
      setVisibleFamilyNames(next);
      clearHiddenPeople(next);
    },
    [clearHiddenPeople, visibleFamilyNames],
  );

  const showAllBranches = useCallback(() => {
    setVisibleFamilyNames(new Set(allFamilyNames));
  }, []);

  const hideAllBranches = useCallback(() => {
    const next = new Set<string>();
    setVisibleFamilyNames(next);
    clearHiddenPeople(next);
  }, [clearHiddenPeople]);

  useEffect(() => {
    const visibleUnionNodeIds = new Set<string>();
    for (const edge of baseEdges) {
      const familyName = edgeFamilyName(edge);
      if (!familyName || !visibleFamilyNames.has(familyName)) continue;
      visibleUnionNodeIds.add(edge.source);
      visibleUnionNodeIds.add(edge.target);
    }

    setNodes((current) =>
      current.map((node) => {
        const data = node.data;
        const pathHighlighted = pathNodeIds?.has(node.id) ?? false;
        if (data.kind === "person") {
          const isDeceased = data.deathYear !== null;
          const hidden = !visibleFamilyNames.has(data.familyName);
          return {
            ...node,
            hidden,
            data: {
              ...data,
              selected: !hidden && node.id === selectedId,
              greyed: greyDeceased && isDeceased,
              pathHighlighted: !hidden && pathHighlighted,
              colorByFamily,
            },
          };
        }
        const hidden =
          !visibleUnionNodeIds.has(node.id) && !visibleFamilyNames.has(data.familyName);
        return {
          ...node,
          hidden,
          data: {
            ...data,
            pathHighlighted: !hidden && pathHighlighted,
            colorByFamily,
          },
        };
      }),
    );
    setEdges((current) =>
      current.map((edge) => {
        const highlighted = pathEdgeIdSet?.has(edge.id) ?? false;
        const familyName = edgeFamilyName(edge);
        const hidden = !familyName || !visibleFamilyNames.has(familyName);
        const baseEdge = baseEdges.find((e) => e.id === edge.id);
        const baseStyle = baseEdge?.style ?? defaultEdgeStyle;
        const visibleStyle = colorByFamily
          ? baseStyle
          : neutralEdgeStyle(baseEdge ?? edge);
        return {
          ...edge,
          hidden,
          style: !hidden && highlighted ? highlightedEdgeStyle : visibleStyle,
          animated: !hidden && highlighted,
        };
      }),
    );
  }, [
    selectedId,
    greyDeceased,
    colorByFamily,
    pathNodeIds,
    pathEdgeIdSet,
    visibleFamilyNames,
    baseEdges,
    setNodes,
    setEdges,
  ]);

  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    const data = node.data as FamilyNodeData;
    if (data.kind !== "person" || node.hidden) return;
    setSelectedId(node.id);
    setPanelOpen(true);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedId(null);
    setPanelOpen(false);
  }, []);

  const closeProfilePanel = useCallback(() => {
    setPanelOpen(false);
    setSelectedId(null);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (searchOpen) return;

      if (settingsOpen) {
        e.preventDefault();
        setSettingsOpen(false);
        return;
      }
      if (panelOpen) {
        e.preventDefault();
        closeProfilePanel();
        return;
      }
      if (settingsSidebarExpanded) {
        e.preventDefault();
        setSettingsSidebarExpanded(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchOpen, settingsOpen, panelOpen, settingsSidebarExpanded, closeProfilePanel]);

  const controlPanelProps = {
    greyDeceased,
    onGreyDeceasedChange: setGreyDeceased,
    colorByFamily,
    onColorByFamilyChange: setColorByFamily,
    familyBranches,
    visibleFamilyNames,
    onFamilyVisibilityChange: handleFamilyVisibilityChange,
    onShowAllBranches: showAllBranches,
    onHideAllBranches: hideAllBranches,
    pathFromId,
    pathToId,
    onPathFromChange: setPathFromId,
    onPathToChange: setPathToId,
    pathStatus,
  };

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
        elementsSelectable={false}
        selectNodesOnDrag={false}
        onNodeClick={handleNodeClick}
        panOnDrag
        zoomOnScroll
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        proOptions={{ hideAttribution: true }}
        onPaneClick={handlePaneClick}
        fitView
        fitViewOptions={{ padding: 0.15, minZoom: MIN_ZOOM }}
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
        <header className="relative flex justify-center px-6 pt-6">
          <div className="w-full max-w-md max-md:pr-14">
            <SearchBar
              visibleFamilyNames={visibleFamilyNames}
              onOpenChange={setSearchOpen}
            />
          </div>
          <div className="pointer-events-auto absolute right-6 top-6 flex items-start">
            <div className="hidden md:block">
              <ControlSidebar
                expanded={settingsSidebarExpanded}
                onExpandedChange={setSettingsSidebarExpanded}
                {...controlPanelProps}
              />
            </div>
            <SettingsButton
              className="md:hidden"
              onClick={() => setSettingsOpen(true)}
            />
          </div>
        </header>
        <div className="mt-auto flex justify-end pb-3 pr-3">
          <ZoomControls />
        </div>
      </div>

      <ControlDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        {...controlPanelProps}
      />

      <ProfilePanel
        memberId={selectedId}
        open={panelOpen}
        onClose={closeProfilePanel}
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

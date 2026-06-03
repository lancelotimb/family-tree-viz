"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
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
  getFamilyHighlight,
  individuals,
} from "./familyGraph";
import { computeLayout } from "./elkLayout";
import { pathHighlight } from "./pathHighlightColors";
import { isDeceased } from "./personUtils";
import type { FamilyNodeData } from "./types";

const nodeTypes = { familyMember: FamilyMemberNode, union: MarriageNode };
const allFamilyNames = familyBranches.map((branch) => branch.familyName);

const defaultEdgeStyle = { stroke: "#c4b49a", strokeWidth: 1.5 };

const pathMutedEdgeStyle = {
  stroke: pathHighlight.muted.edge,
  strokeWidth: pathHighlight.muted.edgeWidth,
};

const pathFocusEdgeStyle = {
  stroke: pathHighlight.focus.edge,
  strokeWidth: pathHighlight.focus.edgeWidth,
};

const hoverEdgeStyle = {
  stroke: "#2563eb",
  strokeWidth: 4.5,
};

function dimmedEdgeStyle(style: Edge["style"]) {
  return { ...(typeof style === "object" && style ? style : defaultEdgeStyle), strokeOpacity: 0.18 };
}

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
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const instanceRef = useRef<ReactFlowInstance<Node<FamilyNodeData>, Edge> | null>(
    null,
  );
  const { fitView, getNode } = useReactFlow();

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

  const familyHighlight = useMemo(
    () => (hoveredId ? getFamilyHighlight(hoveredId) : null),
    [hoveredId],
  );

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

  const pathFocusNodeIds = useMemo(() => {
    if (!pathNodeIds) return null;
    const focus = new Set<string>();
    if (hoveredId && pathNodeIds.has(hoveredId)) focus.add(hoveredId);
    if (selectedId && pathNodeIds.has(selectedId)) focus.add(selectedId);
    return focus.size > 0 ? focus : null;
  }, [pathNodeIds, hoveredId, selectedId]);

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
          const deceased = isDeceased(data.birthYear, data.deathYear);
          const hidden = !visibleFamilyNames.has(data.familyName);
          const inHoverFamily = familyHighlight?.nodeIds.has(node.id) ?? false;
          const isHovered = hoveredId === node.id;
          return {
            ...node,
            hidden,
            data: {
              ...data,
              selected: !hidden && node.id === selectedId,
              greyed: greyDeceased && deceased,
              pathHighlighted: !hidden && pathHighlighted,
              hovered: !hidden && isHovered,
              hoverRelated: !hidden && inHoverFamily && !isHovered,
              colorByFamily,
            },
          };
        }
        const hidden =
          !visibleUnionNodeIds.has(node.id) && !visibleFamilyNames.has(data.familyName);
        const inHoverFamily = familyHighlight?.nodeIds.has(node.id) ?? false;
        return {
          ...node,
          hidden,
          data: {
            ...data,
            pathHighlighted: !hidden && pathHighlighted,
            hoverRelated: !hidden && inHoverFamily,
            colorByFamily,
          },
        };
      }),
    );
    setEdges((current) =>
      current.map((edge) => {
        const pathActive = pathEdgeIdSet?.has(edge.id) ?? false;
        const pathFocusActive =
          pathActive &&
          pathFocusNodeIds !== null &&
          (pathFocusNodeIds.has(edge.source) || pathFocusNodeIds.has(edge.target));
        const hoverActive = familyHighlight?.edgeIds.has(edge.id) ?? false;
        const familyName = edgeFamilyName(edge);
        const hidden = !familyName || !visibleFamilyNames.has(familyName);
        const baseEdge = baseEdges.find((e) => e.id === edge.id);
        const baseStyle = baseEdge?.style ?? defaultEdgeStyle;
        const visibleStyle = colorByFamily
          ? baseStyle
          : neutralEdgeStyle(baseEdge ?? edge);
        const hoverDimOthers = familyHighlight !== null && !hidden && !pathActive;
        return {
          ...edge,
          hidden,
          className: !hidden && hoverActive ? "family-hover-edge" : undefined,
          style: !hidden && pathActive
            ? pathFocusActive
              ? pathFocusEdgeStyle
              : pathMutedEdgeStyle
            : !hidden && hoverActive
              ? hoverEdgeStyle
              : hoverDimOthers
                ? dimmedEdgeStyle(visibleStyle)
                : visibleStyle,
          animated: !hidden && (pathActive || hoverActive),
        };
      }),
    );
  }, [
    selectedId,
    greyDeceased,
    colorByFamily,
    pathNodeIds,
    pathEdgeIdSet,
    pathFocusNodeIds,
    familyHighlight,
    hoveredId,
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

  const handleNodeMouseEnter: NodeMouseHandler = useCallback((_event, node) => {
    const data = node.data as FamilyNodeData;
    if (data.kind !== "person" || node.hidden) return;
    setHoveredId(node.id);
  }, []);

  const handleNodeMouseLeave: NodeMouseHandler = useCallback(() => {
    setHoveredId(null);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedId(null);
    setPanelOpen(false);
    setHoveredId(null);
  }, []);

  const closeProfilePanel = useCallback(() => {
    setPanelOpen(false);
    setSelectedId(null);
  }, []);

  const handleSelectPerson = useCallback(
    (id: string) => {
      setSelectedId(id);
      setPanelOpen(true);
      const node = getNode(id);
      if (node && !node.hidden) {
        fitView({
          nodes: [{ id }],
          duration: 500,
          padding: 0.4,
          maxZoom: 1.2,
          minZoom: MIN_ZOOM,
        });
      }
    },
    [fitView, getNode],
  );

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
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
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
          <div className="w-full max-w-md">
            <SearchBar
              visibleFamilyNames={visibleFamilyNames}
              onOpenChange={setSearchOpen}
            />
          </div>
          <div className="pointer-events-auto absolute left-6 top-6 hidden md:block">
            <ControlSidebar
              expanded={settingsSidebarExpanded}
              onExpandedChange={setSettingsSidebarExpanded}
              {...controlPanelProps}
            />
          </div>
        </header>
        <div className="mt-auto flex justify-end pb-3 pr-3">
          <ZoomControls onSettingsClick={() => setSettingsOpen(true)} />
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
        onSelectPerson={handleSelectPerson}
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

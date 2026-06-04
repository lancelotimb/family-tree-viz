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
  pruneOrphanedFamilyNames,
} from "./graphPath";
import {
  buildFlowEdges,
  buildFlowNodes,
  familyBranches,
  getFamilyHighlight,
  getLineagePersonIds,
  getLineagePersonIdsForUnion,
  individuals,
  unionInLineage,
  unions,
} from "./familyGraph";
import { computeLayout, type LayoutPosition } from "./elkLayout";
import { isDeceased } from "./personUtils";
import type { FamilyNodeData } from "./types";

const nodeTypes = { familyMember: FamilyMemberNode, union: MarriageNode };
const allFamilyNames = familyBranches.map((branch) => branch.familyName);

const defaultEdgeStyle = { stroke: "#c4b49a", strokeWidth: 1.5 };

const highlightedEdgeStyle = {
  stroke: "#7a9e6a",
  strokeWidth: 4,
};

const hoverEdgeStyle = {
  stroke: "#2563eb",
  strokeWidth: 4,
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
  const [layouting, setLayouting] = useState(true);
  const fullLayoutRef = useRef<{
    centerParents: boolean;
    positions: Map<string, LayoutPosition>;
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [greyDeceased, setGreyDeceased] = useState(false);
  const [colorByFamily, setColorByFamily] = useState(true);
  const [centerParents, setCenterParents] = useState(false);
  const [visibleFamilyNames, setVisibleFamilyNames] = useState<Set<string>>(
    () => new Set(allFamilyNames),
  );
  const [pathFromId, setPathFromId] = useState("");
  const [pathToId, setPathToId] = useState("");
  const [focusPersonId, setFocusPersonId] = useState("");
  const [focusUnionId, setFocusUnionId] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSidebarExpanded, setSettingsSidebarExpanded] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const instanceRef = useRef<ReactFlowInstance<Node<FamilyNodeData>, Edge> | null>(
    null,
  );
  const { fitView, getNode } = useReactFlow();

  const applyLayout = useCallback(
    (positions: Map<string, LayoutPosition>, personIds?: Set<string>) => {
      const layoutOptions = personIds ? { personIds } : undefined;
      setNodes(buildFlowNodes(positions));
      const built = buildFlowEdges(positions, layoutOptions);
      setBaseEdges(built);
      setEdges(built);
    },
    [setNodes, setEdges],
  );

  const lineagePersonIds = useMemo(() => {
    if (focusPersonId) return getLineagePersonIds(focusPersonId);
    if (focusUnionId) return getLineagePersonIdsForUnion(focusUnionId);
    return null;
  }, [focusPersonId, focusUnionId]);

  const allBranchesVisible = useMemo(
    () => allFamilyNames.every((name) => visibleFamilyNames.has(name)),
    [visibleFamilyNames],
  );

  /** When set, ELK lays out only these people (branch and/or lineage filter). */
  const layoutPersonIds = useMemo(() => {
    const needsFilteredLayout = !allBranchesVisible || lineagePersonIds !== null;
    if (!needsFilteredLayout) return null;

    const ids = new Set<string>();
    for (const person of Object.values(individuals)) {
      if (!visibleFamilyNames.has(person.familyName)) continue;
      if (lineagePersonIds && !lineagePersonIds.has(person.id)) continue;
      ids.add(person.id);
    }
    return ids;
  }, [allBranchesVisible, visibleFamilyNames, lineagePersonIds]);

  useEffect(() => {
    let cancelled = false;

    async function runLayout() {
      setLayouting(true);
      try {
        if (layoutPersonIds === null) {
          const cached =
            fullLayoutRef.current?.centerParents === centerParents
              ? fullLayoutRef.current.positions
              : null;
          const positions =
            cached ??
            (await computeLayout({ centerParentsOverChildren: centerParents }));
          if (cancelled) return;
          fullLayoutRef.current = { centerParents, positions };
          applyLayout(positions);
        } else if (layoutPersonIds.size === 0) {
          if (cancelled) return;
          applyLayout(new Map());
        } else {
          const positions = await computeLayout({
            personIds: layoutPersonIds,
            centerParentsOverChildren: centerParents,
          });
          if (cancelled) return;
          applyLayout(positions, layoutPersonIds);
        }
        setReady(true);
      } finally {
        if (!cancelled) setLayouting(false);
      }
    }

    void runLayout();
    return () => {
      cancelled = true;
    };
  }, [layoutPersonIds, applyLayout, centerParents]);

  useEffect(() => {
    if (!ready || layouting) return;
    requestAnimationFrame(() => {
      if (layoutPersonIds !== null) {
        const fitNodeIds = new Set<string>(layoutPersonIds);
        if (focusUnionId && unions[focusUnionId]) {
          fitNodeIds.add(focusUnionId);
        }
        for (const union of Object.values(unions)) {
          if (union.partnerIds.some((id) => layoutPersonIds.has(id))) {
            fitNodeIds.add(union.id);
          }
        }
        if (fitNodeIds.size === 0) return;
        fitView({
          nodes: [...fitNodeIds].map((id) => ({ id })),
          padding: 0.2,
          minZoom: MIN_ZOOM,
          duration: 500,
        });
      } else {
        instanceRef.current?.fitView({
          padding: 0.15,
          minZoom: MIN_ZOOM,
          duration: 400,
        });
      }
    });
  }, [ready, layouting, layoutPersonIds, focusUnionId, fitView]);

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

  const focusHighlightNodeIds = useMemo(() => {
    if (focusPersonId) return new Set([focusPersonId]);
    if (focusUnionId) {
      const union = unions[focusUnionId];
      const ids = new Set<string>([focusUnionId]);
      for (const partnerId of union?.partnerIds ?? []) {
        ids.add(partnerId);
      }
      return ids;
    }
    return null;
  }, [focusPersonId, focusUnionId]);

  const handleFocusPersonChange = useCallback((id: string) => {
    setFocusPersonId(id);
    if (id) setFocusUnionId("");
  }, []);

  const handleFocusUnionChange = useCallback((id: string) => {
    setFocusUnionId(id);
    if (id) setFocusPersonId("");
  }, []);

  const isPersonVisible = useCallback(
    (id: string, familyName: string, visibleFamilies: Set<string>) => {
      if (!visibleFamilies.has(familyName)) return false;
      if (lineagePersonIds && !lineagePersonIds.has(id)) return false;
      return true;
    },
    [lineagePersonIds],
  );

  const clearHiddenPeople = useCallback(
    (nextVisibleFamilyNames: Set<string>) => {
      const isVisible = (id: string) => {
        const person = individuals[id];
        if (!person) return false;
        return isPersonVisible(id, person.familyName, nextVisibleFamilyNames);
      };

      if (selectedId && !isVisible(selectedId)) {
        setSelectedId(null);
        setPanelOpen(false);
      }
      if (pathFromId && !isVisible(pathFromId)) {
        setPathFromId("");
      }
      if (pathToId && !isVisible(pathToId)) {
        setPathToId("");
      }
      if (focusPersonId && !isVisible(focusPersonId)) {
        setFocusPersonId("");
      }
      if (focusUnionId) {
        const union = unions[focusUnionId];
        const stillVisible = union?.partnerIds.some((id) => isVisible(id));
        if (!stillVisible) setFocusUnionId("");
      }
    },
    [selectedId, pathFromId, pathToId, focusPersonId, focusUnionId, isPersonVisible],
  );

  const handleFamilyVisibilityChange = useCallback(
    (familyName: string, visible: boolean) => {
      const next = new Set(visibleFamilyNames);
      if (visible) {
        next.add(familyName);
      } else {
        next.delete(familyName);
        const pruned = pruneOrphanedFamilyNames(
          next,
          baseEdges,
          individuals,
          unions,
        );
        next.clear();
        for (const name of pruned) next.add(name);
      }
      setVisibleFamilyNames(next);
      clearHiddenPeople(next);
    },
    [clearHiddenPeople, visibleFamilyNames, baseEdges],
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
    const isEdgeVisibleByLineage = (edge: Edge) => {
      if (!lineagePersonIds) return true;
      if (individuals[edge.source] && !lineagePersonIds.has(edge.source)) return false;
      if (individuals[edge.target] && !lineagePersonIds.has(edge.target)) return false;
      return true;
    };

    const visibleUnionNodeIds = new Set<string>();
    for (const edge of baseEdges) {
      const familyName = edgeFamilyName(edge);
      if (!familyName || !visibleFamilyNames.has(familyName)) continue;
      if (!isEdgeVisibleByLineage(edge)) continue;
      visibleUnionNodeIds.add(edge.source);
      visibleUnionNodeIds.add(edge.target);
    }

    setNodes((current) =>
      current.map((node) => {
        const data = node.data;
        const pathHighlighted = pathNodeIds?.has(node.id) ?? false;
        const focusHighlighted = focusHighlightNodeIds?.has(node.id) ?? false;
        if (data.kind === "person") {
          const deceased = isDeceased(data.birthYear, data.deathYear);
          const hidden = !isPersonVisible(node.id, data.familyName, visibleFamilyNames);
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
              focusHighlighted: !hidden && focusHighlighted,
              hovered: !hidden && isHovered,
              hoverRelated: !hidden && inHoverFamily && !isHovered,
              colorByFamily,
            },
          };
        }
        const hiddenByFamily =
          !visibleUnionNodeIds.has(node.id) && !visibleFamilyNames.has(data.familyName);
        const hiddenByLineage =
          lineagePersonIds !== null && !unionInLineage(node.id, lineagePersonIds);
        const hidden = hiddenByFamily || hiddenByLineage;
        const inHoverFamily = familyHighlight?.nodeIds.has(node.id) ?? false;
        return {
          ...node,
          hidden,
          data: {
            ...data,
            pathHighlighted: !hidden && pathHighlighted,
            focusHighlighted: !hidden && focusHighlighted,
            hoverRelated: !hidden && inHoverFamily,
            colorByFamily,
          },
        };
      }),
    );
    setEdges((current) =>
      current.map((edge) => {
        const pathActive = pathEdgeIdSet?.has(edge.id) ?? false;
        const hoverActive = familyHighlight?.edgeIds.has(edge.id) ?? false;
        const familyName = edgeFamilyName(edge);
        const hiddenByFamily = !familyName || !visibleFamilyNames.has(familyName);
        const hiddenByLineage = !isEdgeVisibleByLineage(edge);
        const hidden = hiddenByFamily || hiddenByLineage;
        const baseEdge = baseEdges.find((e) => e.id === edge.id);
        const baseStyle = baseEdge?.style ?? defaultEdgeStyle;
        const visibleStyle = colorByFamily
          ? baseStyle
          : neutralEdgeStyle(baseEdge ?? edge);
        const hoverDimOthers = familyHighlight !== null && !hidden && !pathActive;
        return {
          ...edge,
          hidden,
          className:
            !hidden && pathActive
              ? "family-path-edge"
              : !hidden && hoverActive
                ? "family-hover-edge"
                : undefined,
          style: !hidden && pathActive
            ? highlightedEdgeStyle
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
    familyHighlight,
    hoveredId,
    visibleFamilyNames,
    lineagePersonIds,
    focusHighlightNodeIds,
    isPersonVisible,
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
    centerParents,
    onCenterParentsChange: setCenterParents,
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
    focusPersonId,
    onFocusPersonChange: handleFocusPersonChange,
    focusUnionId,
    onFocusUnionChange: handleFocusUnionChange,
    lineagePersonIds,
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

      {!ready || layouting ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <p className="rounded-full bg-white/80 px-4 py-2 text-sm text-[#8b7d6b] shadow backdrop-blur-md">
            Arranging the family tree…
          </p>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
        <header className="flex items-start gap-2 p-3">
          <div className="pointer-events-auto hidden shrink-0 md:block">
            <ControlSidebar
              expanded={settingsSidebarExpanded}
              onExpandedChange={setSettingsSidebarExpanded}
              {...controlPanelProps}
            />
          </div>
          <div className="pointer-events-auto min-w-0 flex-1">
            <SearchBar
              visibleFamilyNames={visibleFamilyNames}
              lineagePersonIds={lineagePersonIds}
              onOpenChange={setSearchOpen}
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

"use client";

import dynamic from "next/dynamic";
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
import {
  getLayoutMetrics,
  MAX_ZOOM,
  MIN_ZOOM,
  PERSON_FOCUS_DURATION_MS,
  PERSON_FOCUS_ZOOM,
} from "./layoutConstants";
import { ZoomControls, type ViewMode } from "./ZoomControls";
import { TimePlayer } from "./TimePlayer";
import { ProfilePanel } from "./ProfilePanel";
import {
  FamilyTreeActionsContext,
  type NodeContextMenuTarget,
} from "./familyTreeActionsContext";
import { NodeContextMenu } from "./NodeContextMenu";
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
  unionSearchIndex,
  unions,
} from "./familyGraph";
import { computeLayout, type LayoutPosition } from "./elkLayout";
import { isDeceased, isDeceasedAsOfYear } from "./personUtils";
import { getFamilyTimeRange, isBornByYear } from "./timeUtils";
import type { FamilyTree3DControls } from "./FamilyTree3D";
import type { FamilyNodeData } from "./types";

const currentCalendarYear = new Date().getFullYear();

/**
 * The 3D view depends on three.js / WebGL, which only run in the browser, so it
 * is loaded lazily and client-only (no SSR) and kept out of the initial bundle.
 */
const FamilyTree3D = dynamic(
  () => import("./FamilyTree3D").then((mod) => mod.FamilyTree3D),
  {
    ssr: false,
    loading: () => (
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
        <p className="rounded-full bg-white/80 px-4 py-2 text-sm text-[#8b7d6b] shadow backdrop-blur-md">
          Loading 3D view…
        </p>
      </div>
    ),
  },
);

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

function endpointIsDeceased(
  nodeId: string,
  timeTravelOpen: boolean,
  timeTravelYear: number,
): boolean {
  const person = individuals[nodeId];
  if (!person) return false;
  const birthYear = person.birth.year;
  const deathYear = person.death?.year ?? null;
  return timeTravelOpen
    ? isDeceasedAsOfYear(birthYear, deathYear, timeTravelYear)
    : isDeceased(birthYear, deathYear);
}

function edgeTouchesDeceased(
  edge: Edge,
  timeTravelOpen: boolean,
  timeTravelYear: number,
): boolean {
  return (
    endpointIsDeceased(edge.source, timeTravelOpen, timeTravelYear) ||
    endpointIsDeceased(edge.target, timeTravelOpen, timeTravelYear)
  );
}

function visibleFamilyNamesKey(names: Set<string>): string {
  return [...names].sort().join("\0");
}

function layoutPersonIdsKey(personIds: Set<string> | null): string {
  if (personIds === null) return "full";
  return [...personIds].sort().join("\0");
}

function FamilyTreeCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FamilyNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [baseEdges, setBaseEdges] = useState<Edge[]>([]);
  const [ready, setReady] = useState(false);
  const [layouting, setLayouting] = useState(true);
  const fullLayoutRef = useRef<{
    centerParents: boolean;
    showNamesOnly: boolean;
    positions: Map<string, LayoutPosition>;
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [greyDeceased, setGreyDeceased] = useState(false);
  const [colorByFamily, setColorByFamily] = useState(true);
  const [centerParents, setCenterParents] = useState(false);
  const [showNamesOnly2D, setShowNamesOnly2D] = useState(false);
  const [showNamesOnly3D, setShowNamesOnly3D] = useState(true);
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
  const [contextMenuTarget, setContextMenuTarget] =
    useState<NodeContextMenuTarget | null>(null);
  const [layoutRequestNonce, setLayoutRequestNonce] = useState(0);
  const [timeTravelOpen, setTimeTravelOpen] = useState(false);
  const [timeTravelYear, setTimeTravelYear] = useState(currentCalendarYear);
  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const controls3DRef = useRef<FamilyTree3DControls | null>(null);
  const suppressNextNodeClickRef = useRef(false);
  const instanceRef = useRef<ReactFlowInstance<Node<FamilyNodeData>, Edge> | null>(
    null,
  );
  const dismissSearchRef = useRef<(() => void) | null>(null);
  const { fitView, getNode, setCenter } = useReactFlow();
  const activeShowNamesOnly = viewMode === "3d" ? showNamesOnly3D : showNamesOnly2D;
  const setActiveShowNamesOnly = viewMode === "3d" ? setShowNamesOnly3D : setShowNamesOnly2D;

  const applyLayout = useCallback(
    (positions: Map<string, LayoutPosition>, personIds?: Set<string>) => {
      const layoutOptions = {
        ...(personIds ? { personIds } : {}),
        showNamesOnly: showNamesOnly2D,
      };
      setNodes(buildFlowNodes(positions));
      const built = buildFlowEdges(positions, layoutOptions);
      setBaseEdges(built);
      setEdges(built);
    },
    [setNodes, setEdges, showNamesOnly2D],
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

  const timeRange = useMemo(() => getFamilyTimeRange(individuals), []);

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

  /** Stable key so layout re-runs when focus/visibility changes, not only Set identity. */
  const layoutRequestKey = useMemo(
    () =>
      [
        layoutRequestNonce,
        focusPersonId,
        focusUnionId,
        visibleFamilyNamesKey(visibleFamilyNames),
        layoutPersonIdsKey(layoutPersonIds),
      ].join("|"),
    [
      layoutRequestNonce,
      focusPersonId,
      focusUnionId,
      visibleFamilyNames,
      layoutPersonIds,
    ],
  );

  const bumpLayoutRequest = useCallback(() => {
    setLayoutRequestNonce((nonce) => nonce + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function runLayout() {
      setLayouting(true);
      try {
        if (layoutPersonIds === null) {
          const cached =
            fullLayoutRef.current?.centerParents === centerParents &&
            fullLayoutRef.current?.showNamesOnly === showNamesOnly2D
              ? fullLayoutRef.current.positions
              : null;
          const positions =
            cached ??
            (await computeLayout({
              centerParentsOverChildren: centerParents,
              showNamesOnly: showNamesOnly2D,
            }));
          if (cancelled) return;
          fullLayoutRef.current = { centerParents, showNamesOnly: showNamesOnly2D, positions };
          applyLayout(positions);
        } else if (layoutPersonIds.size === 0) {
          if (cancelled) return;
          applyLayout(new Map());
        } else {
          const positions = await computeLayout({
            personIds: layoutPersonIds,
            centerParentsOverChildren: centerParents,
            showNamesOnly: showNamesOnly2D,
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
  }, [layoutRequestKey, layoutPersonIds, applyLayout, centerParents, showNamesOnly2D]);

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
  }, [ready, layouting, layoutRequestKey, layoutPersonIds, focusPersonId, focusUnionId, fitView]);

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

  const handleFocusPersonChange = useCallback(
    (id: string) => {
      setFocusPersonId(id);
      if (id) setFocusUnionId("");
      bumpLayoutRequest();
    },
    [bumpLayoutRequest],
  );

  const handleFocusUnionChange = useCallback(
    (id: string) => {
      setFocusUnionId(id);
      if (id) setFocusPersonId("");
      bumpLayoutRequest();
    },
    [bumpLayoutRequest],
  );

  const closeContextMenu = useCallback(() => {
    setContextMenuTarget(null);
  }, []);

  const familyTreeActions = useMemo(
    () => ({
      openNodeContextMenu: setContextMenuTarget,
      suppressNextNodeClick: () => {
        suppressNextNodeClickRef.current = true;
      },
    }),
    [],
  );

  const handleFocusLineageFromContextMenu = useCallback(
    (target: NodeContextMenuTarget) => {
      if (target.kind === "person") {
        handleFocusPersonChange(target.nodeId);
      } else {
        handleFocusUnionChange(target.nodeId);
      }
    },
    [handleFocusPersonChange, handleFocusUnionChange],
  );

  const handleUnfocusLineage = useCallback(() => {
    setFocusPersonId("");
    setFocusUnionId("");
    bumpLayoutRequest();
  }, [bumpLayoutRequest]);

  const handleNodeContextMenu: NodeMouseHandler = useCallback((event, node) => {
    event.preventDefault();
    if (node.hidden) return;
    const data = node.data as FamilyNodeData;
    const label =
      data.kind === "person"
        ? data.name
        : (unionSearchIndex.find((union) => union.id === node.id)?.label ?? "Union");
    setContextMenuTarget({
      nodeId: node.id,
      kind: data.kind === "person" ? "person" : "union",
      label,
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  const isPersonStructurallyVisible = useCallback(
    (id: string, familyName: string, visibleFamilies: Set<string>) => {
      if (!visibleFamilies.has(familyName)) return false;
      if (lineagePersonIds && !lineagePersonIds.has(id)) return false;
      return true;
    },
    [lineagePersonIds],
  );

  const isPersonHiddenByYear = useCallback(
    (id: string) => {
      if (!timeTravelOpen) return false;
      const person = individuals[id];
      if (!person) return false;
      return !isBornByYear(person.birth.year, timeTravelYear);
    },
    [timeTravelOpen, timeTravelYear],
  );

  const clearHiddenPeople = useCallback(
    (nextVisibleFamilyNames: Set<string>) => {
      const isVisible = (id: string) => {
        const person = individuals[id];
        if (!person) return false;
        return isPersonStructurallyVisible(id, person.familyName, nextVisibleFamilyNames);
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
    [selectedId, pathFromId, pathToId, focusPersonId, focusUnionId, isPersonStructurallyVisible],
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

  const handleTimeTravelOpen = useCallback(() => {
    setTimeTravelOpen(true);
    setTimeTravelYear(currentCalendarYear);
  }, []);

  const handleTimeTravelClose = useCallback(() => {
    setTimeTravelOpen(false);
    setTimeTravelYear(currentCalendarYear);
  }, []);

  useEffect(() => {
    const isEdgeVisibleByLineage = (edge: Edge) => {
      if (!lineagePersonIds) return true;
      if (individuals[edge.source] && !lineagePersonIds.has(edge.source)) return false;
      if (individuals[edge.target] && !lineagePersonIds.has(edge.target)) return false;
      return true;
    };

    const isEdgeEndpointStructurallyVisible = (id: string) => {
      const person = individuals[id];
      if (!person) return true;
      return isPersonStructurallyVisible(id, person.familyName, visibleFamilyNames);
    };

    const visibleUnionNodeIds = new Set<string>();
    for (const edge of baseEdges) {
      const familyName = edgeFamilyName(edge);
      if (!familyName || !visibleFamilyNames.has(familyName)) continue;
      if (!isEdgeVisibleByLineage(edge)) continue;
      if (
        !isEdgeEndpointStructurallyVisible(edge.source) ||
        !isEdgeEndpointStructurallyVisible(edge.target)
      ) {
        continue;
      }
      visibleUnionNodeIds.add(edge.source);
      visibleUnionNodeIds.add(edge.target);
    }

    const isUnionHiddenByYear = (unionId: string) => {
      if (!timeTravelOpen) return false;
      const union = unions[unionId];
      if (!union) return false;
      return !union.partnerIds.some(
        (partnerId) =>
          !isPersonHiddenByYear(partnerId) &&
          isPersonStructurallyVisible(
            partnerId,
            individuals[partnerId]?.familyName ?? "",
            visibleFamilyNames,
          ),
      );
    };

    setNodes((current) =>
      current.map((node) => {
        const data = node.data;
        const pathHighlighted = pathNodeIds?.has(node.id) ?? false;
        const focusHighlighted = focusHighlightNodeIds?.has(node.id) ?? false;
        if (data.kind === "person") {
          const deceased = timeTravelOpen
            ? isDeceasedAsOfYear(data.birthYear, data.deathYear, timeTravelYear)
            : isDeceased(data.birthYear, data.deathYear);
          const hidden =
            !isPersonStructurallyVisible(node.id, data.familyName, visibleFamilyNames) ||
            isPersonHiddenByYear(node.id);
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
              showNamesOnly: showNamesOnly2D,
            },
          };
        }
        const hiddenByFamily =
          !visibleUnionNodeIds.has(node.id) && !visibleFamilyNames.has(data.familyName);
        const hiddenByLineage =
          lineagePersonIds !== null && !unionInLineage(node.id, lineagePersonIds);
        const hidden = hiddenByFamily || hiddenByLineage || isUnionHiddenByYear(node.id);
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
        const hiddenByYear =
          isPersonHiddenByYear(edge.source) || isPersonHiddenByYear(edge.target);
        const hidden = hiddenByFamily || hiddenByLineage || hiddenByYear;
        const baseEdge = baseEdges.find((e) => e.id === edge.id);
        const baseStyle = baseEdge?.style ?? defaultEdgeStyle;
        const visibleStyle = colorByFamily
          ? baseStyle
          : neutralEdgeStyle(baseEdge ?? edge);
        const hoverDimOthers = familyHighlight !== null && !hidden && !pathActive;
        const greyEdge =
          greyDeceased &&
          !hidden &&
          !pathActive &&
          !hoverActive &&
          !hoverDimOthers &&
          edgeTouchesDeceased(edge, timeTravelOpen, timeTravelYear);
        return {
          ...edge,
          hidden,
          className:
            !hidden && pathActive
              ? "family-path-edge"
              : !hidden && hoverActive
                ? "family-hover-edge"
                : greyEdge
                  ? "family-grey-edge"
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
    showNamesOnly2D,
    pathNodeIds,
    pathEdgeIdSet,
    familyHighlight,
    hoveredId,
    visibleFamilyNames,
    lineagePersonIds,
    focusHighlightNodeIds,
    isPersonStructurallyVisible,
    isPersonHiddenByYear,
    timeTravelOpen,
    timeTravelYear,
    baseEdges,
    setNodes,
    setEdges,
  ]);

  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    dismissSearchRef.current?.();
    if (suppressNextNodeClickRef.current) {
      suppressNextNodeClickRef.current = false;
      return;
    }
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
    dismissSearchRef.current?.();
    closeContextMenu();
    setSelectedId(null);
    setPanelOpen(false);
    setHoveredId(null);
  }, [closeContextMenu]);

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
        const nodeData = node.data as FamilyNodeData;
        const metrics = getLayoutMetrics(
          nodeData.kind === "person" ? (nodeData.showNamesOnly ?? false) : false,
        );
        const width = node.width ?? node.measured?.width ?? metrics.nodeWidth;
        const height = node.height ?? node.measured?.height ?? metrics.nodeHeight;
        const centerX = node.position.x + width / 2;
        const centerY = node.position.y + height / 2;
        void setCenter(centerX, centerY, {
          zoom: PERSON_FOCUS_ZOOM,
          duration: PERSON_FOCUS_DURATION_MS,
        });
      }
    },
    [getNode, setCenter],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (searchOpen) return;

      if (contextMenuTarget) {
        e.preventDefault();
        closeContextMenu();
        return;
      }

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
  }, [
    searchOpen,
    settingsOpen,
    panelOpen,
    settingsSidebarExpanded,
    contextMenuTarget,
    closeContextMenu,
    closeProfilePanel,
  ]);

  const controlPanelProps = {
    greyDeceased,
    onGreyDeceasedChange: setGreyDeceased,
    colorByFamily,
    onColorByFamilyChange: setColorByFamily,
    centerParents,
    onCenterParentsChange: setCenterParents,
    centerParentsDisabled: viewMode === "3d",
    showNamesOnly: activeShowNamesOnly,
    onShowNamesOnlyChange: setActiveShowNamesOnly,
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
    aliveAtYear: timeTravelOpen ? timeTravelYear : null,
  };

  return (
    <FamilyTreeActionsContext.Provider value={familyTreeActions}>
    <div className="relative h-full w-full bg-[#fdfbf7]">
      {viewMode === "3d" ? (
        <FamilyTree3D
          selectedId={selectedId}
          onSelectPerson={handleSelectPerson}
          onClearSelection={handlePaneClick}
          colorByFamily={colorByFamily}
          greyDeceased={greyDeceased}
          showNamesOnly={activeShowNamesOnly}
          visibleFamilyNames={visibleFamilyNames}
          lineagePersonIds={lineagePersonIds}
          focusHighlightNodeIds={focusHighlightNodeIds}
          pathNodeIds={pathNodeIds}
          pathEdgeIds={pathEdgeIdSet}
          onOpenNodeContextMenu={setContextMenuTarget}
          controlsRef={controls3DRef}
        />
      ) : (
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
          onNodeContextMenu={handleNodeContextMenu}
          onNodeMouseEnter={handleNodeMouseEnter}
          onNodeMouseLeave={handleNodeMouseLeave}
          panOnDrag
          zoomOnScroll
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          proOptions={{ hideAttribution: true }}
          onPaneClick={handlePaneClick}
          onMoveStart={() => dismissSearchRef.current?.()}
          onPaneContextMenu={(event) => event.preventDefault()}
          fitView
          fitViewOptions={{ padding: 0.15, minZoom: MIN_ZOOM }}
          className="family-tree-flow"
        />
      )}

      {viewMode === "2d" && (!ready || layouting) ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <p className="rounded-full bg-white/80 px-4 py-2 text-sm text-[#8b7d6b] shadow backdrop-blur-md">
            Arranging the family tree…
          </p>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
        <header className="flex items-start justify-between gap-2 overflow-visible p-3">
          <div className="pointer-events-auto hidden shrink-0 md:block">
            <ControlSidebar
              expanded={settingsSidebarExpanded}
              onExpandedChange={setSettingsSidebarExpanded}
              {...controlPanelProps}
            />
          </div>
          <div className="pointer-events-auto min-w-0 w-full md:w-[450px] md:shrink-0">
            <SearchBar
              visibleFamilyNames={visibleFamilyNames}
              lineagePersonIds={lineagePersonIds}
              aliveAtYear={timeTravelOpen ? timeTravelYear : null}
              onOpenChange={setSearchOpen}
              onDismissRef={dismissSearchRef}
            />
          </div>
        </header>
        <div
          className={`mt-auto flex items-end gap-3 pb-3 pl-3 pr-3 max-md:flex-col-reverse max-md:items-end max-md:gap-2 ${
            settingsOpen ? "max-md:hidden" : ""
          }`}
        >
          {timeTravelOpen && viewMode === "2d" ? (
            <TimePlayer
              minYear={timeRange.minYear}
              maxYear={timeRange.maxYear}
              year={timeTravelYear}
              onYearChange={setTimeTravelYear}
              onClose={handleTimeTravelClose}
              className="w-full max-md:flex-none md:min-w-0 md:flex-1"
            />
          ) : null}
          <div className="shrink-0 md:ml-auto">
            <ZoomControls
              onSettingsClick={() => setSettingsOpen(true)}
              timeTravelOpen={timeTravelOpen}
              onTimeTravelOpen={handleTimeTravelOpen}
              onTimeTravelClose={handleTimeTravelClose}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onZoomIn3D={() => controls3DRef.current?.zoomIn()}
              onZoomOut3D={() => controls3DRef.current?.zoomOut()}
              onResetView={() => controls3DRef.current?.resetView()}
            />
          </div>
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
        focusPersonId={focusPersonId}
        onFocusLineage={handleFocusPersonChange}
      />

      <NodeContextMenu
        target={contextMenuTarget}
        onClose={closeContextMenu}
        onFocusLineage={handleFocusLineageFromContextMenu}
        onUnfocusLineage={handleUnfocusLineage}
        focusPersonId={focusPersonId}
        focusUnionId={focusUnionId}
      />
    </div>
    </FamilyTreeActionsContext.Provider>
  );
}

export function FamilyTreeVisualizer() {
  return (
    <ReactFlowProvider>
      <FamilyTreeCanvas />
    </ReactFlowProvider>
  );
}

"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls, useCursor } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  computeLayout3D,
  type GenerationPlane,
  type Layout3DLink,
  type Layout3DResult,
} from "./layout3d";
import {
  getFamilyColor,
  getFamilyHighlight,
  individuals,
  unionSearchIndex,
  unions,
} from "./familyGraph";
import { treeCardName } from "./gedcom";
import type { NodeContextMenuTarget } from "./familyTreeActionsContext";
import { familyHighlight as highlightColors } from "./familyHighlightColors";
import { isDeceased, isDeceasedAsOfYear } from "./personUtils";
import { ProfileAvatar } from "./ProfileAvatar";
import { isBornByYear } from "./timeUtils";

const NEUTRAL_STROKE = "#c4b49a";
const NEUTRAL_BORDER = "#d8cab0";
const NEUTRAL_BG = "#fffef9";
const GREY_STROKE = "#b3a791";
const PATH_STROKE = "#48a066";
const FOCUS_STROKE = "#c85f5f";
const CAMERA_FOV = 45;
const SCENE_BG = "#f4efe5";
// Keep the DOM person cards strictly below the overlay UI (parameters sidebar,
// search, controls) which sits at Tailwind `z-10`, so they never paint over it.
const CARD_Z_RANGE: [number, number] = [9, 0];

export type FamilyTree3DControls = {
  resetView: () => void;
  focusPerson: (id: string) => boolean;
  zoomIn: () => void;
  zoomOut: () => void;
};

type FamilyTree3DProps = {
  selectedId: string | null;
  onSelectPerson: (id: string) => void;
  onClearSelection: () => void;
  colorByFamily: boolean;
  greyDeceased: boolean;
  showNamesOnly: boolean;
  visibleFamilyNames: Set<string>;
  lineagePersonIds: Set<string> | null;
  focusHighlightNodeIds: Set<string> | null;
  pathNodeIds: Set<string> | null;
  pathEdgeIds: Set<string> | null;
  aliveAtYear: number | null;
  onOpenNodeContextMenu: (target: NodeContextMenuTarget) => void;
  /** Parent assigns camera controls here for the bottom-right button group. */
  controlsRef?: React.MutableRefObject<FamilyTree3DControls | null>;
};

type Vec3 = [number, number, number];

function cameraPositionFor(bounds: Layout3DResult["bounds"]): Vec3 {
  const radius = Math.max(bounds.radius, 40);
  const heightSpan = Math.max(bounds.maxY - bounds.minY, 40);
  const fitRadius = Math.max(radius, heightSpan / 2);
  const dist =
    (fitRadius / Math.tan(((CAMERA_FOV * Math.PI) / 180) / 2)) * 1.2 + 40;
  const dir = new THREE.Vector3(0.45, 0.5, 1).normalize();
  return [dir.x * dist, dir.y * dist, dir.z * dist];
}

/** Frames the tree on mount and exposes a reset callback to the parent. */
function CameraRig({
  bounds,
  positions,
  orbitControlsRef,
  viewControlsRef,
  minDistance,
  maxDistance,
  onReady,
}: {
  bounds: Layout3DResult["bounds"];
  positions: Map<string, Vec3>;
  orbitControlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
  viewControlsRef?: React.MutableRefObject<FamilyTree3DControls | null>;
  minDistance: number;
  maxDistance: number;
  onReady: () => void;
}) {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    const target = new THREE.Vector3(0, 0, 0);

    const apply = () => {
      const [x, y, z] = cameraPositionFor(bounds);
      camera.position.set(x, y, z);
      camera.updateProjectionMatrix();
      camera.lookAt(target);
      const controls = orbitControlsRef.current;
      if (controls) {
        controls.target.copy(target);
        controls.update();
      }
      invalidate();
    };

    const zoomBy = (factor: number) => {
      const controls = orbitControlsRef.current;
      const currentTarget = controls?.target ?? target;
      const offset = camera.position.clone().sub(currentTarget);
      const nextDistance = THREE.MathUtils.clamp(
        offset.length() * factor,
        minDistance,
        maxDistance,
      );
      offset.setLength(nextDistance);
      camera.position.copy(currentTarget).add(offset);
      camera.updateProjectionMatrix();
      camera.lookAt(currentTarget);
      controls?.update();
      invalidate();
    };

    const focusPerson = (id: string) => {
      const position = positions.get(id);
      if (!position) return false;

      const controls = orbitControlsRef.current;
      const currentTarget = controls?.target ?? target;
      const nextTarget = new THREE.Vector3(...position);
      const direction = camera.position.clone().sub(currentTarget);
      if (direction.lengthSq() === 0) direction.set(0.45, 0.5, 1);
      direction.normalize();
      const nextDistance = THREE.MathUtils.clamp(85, minDistance, maxDistance);
      camera.position.copy(nextTarget).add(direction.multiplyScalar(nextDistance));
      camera.updateProjectionMatrix();
      camera.lookAt(nextTarget);
      if (controls) {
        controls.target.copy(nextTarget);
        controls.update();
      }
      invalidate();
      return true;
    };

    apply();
    onReady();
    if (viewControlsRef) {
      viewControlsRef.current = {
        resetView: apply,
        focusPerson,
        zoomIn: () => zoomBy(0.72),
        zoomOut: () => zoomBy(1 / 0.72),
      };
      return () => {
        viewControlsRef.current = null;
      };
    }
  }, [
    bounds,
    camera,
    invalidate,
    maxDistance,
    minDistance,
    onReady,
    orbitControlsRef,
    positions,
    viewControlsRef,
  ]);

  return null;
}

/** Translucent disc that visually anchors all the people of one generation. */
function GenerationDisc({ plane }: { plane: GenerationPlane }) {
  return (
    <group position={[0, plane.y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <circleGeometry args={[plane.radius, 64]} />
        <meshBasicMaterial
          color="#cdbfa6"
          transparent
          opacity={0.07}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <ringGeometry args={[plane.radius - 0.6, plane.radius, 64]} />
        <meshBasicMaterial
          color="#b9a888"
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/**
 * A billboarded person card rendered as DOM via drei's `<Html>`. It mirrors the
 * 2D `FamilyMemberNode`: a full card with avatar + name + lifespan, or — when
 * "Show names only" is on — a compact single-line name card.
 */
function PersonCard({
  id,
  position,
  colorByFamily,
  greyed,
  selected,
  dimmed,
  emphasized,
  pathHighlighted,
  focusHighlighted,
  hoverKind,
  showNamesOnly,
  onSelect,
  onHover,
  onOpenContextMenu,
}: {
  id: string;
  position: Vec3;
  colorByFamily: boolean;
  greyed: boolean;
  selected: boolean;
  dimmed: boolean;
  emphasized: boolean;
  pathHighlighted: boolean;
  focusHighlighted: boolean;
  hoverKind: "primary" | "related" | null;
  showNamesOnly: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onOpenContextMenu: (target: NodeContextMenuTarget) => void;
}) {
  const person = individuals[id];
  if (!person) return null;

  const branch = getFamilyColor(person.familyName);
  const hoverHighlight =
    hoverKind === "primary"
      ? highlightColors.hover.primary
      : hoverKind === "related"
        ? highlightColors.hover.related
        : null;
  const borderColor = selected
    ? hoverHighlight?.border ?? "#b8956a"
    : hoverHighlight
      ? hoverHighlight.border
    : colorByFamily
      ? branch.border
      : NEUTRAL_BORDER;
  const textColor = hoverHighlight
    ? hoverHighlight.text
    : colorByFamily
      ? branch.text
      : "#3d3428";
  const avatarColor = hoverHighlight
    ? hoverHighlight.stroke
    : colorByFamily
      ? branch.stroke
      : "#a8957a";
  const lifespan = person.death?.year
    ? `${person.birth.year ?? "?"} – ${person.death.year}`
    : `${person.birth.year ?? "?"} –`;
  const cardLabel = treeCardName(person.firstName, person.familyName);

  const shouldGrey = greyed && !selected && !emphasized;
  const wrapperOpacity = dimmed ? 0.26 : shouldGrey ? 0.5 : 1;
  const scale = selected ? 1.1 : emphasized ? 1.04 : 1;
  const ring = selected
    ? `0 0 0 2px ${branch.stroke}, 0 6px 18px rgba(120, 80, 40, 0.35)`
    : pathHighlighted
      ? "0 0 0 2px rgba(72,160,102,0.65), 0 6px 16px rgba(40,120,70,0.24)"
    : focusHighlighted
      ? "0 0 0 2px rgba(200,95,95,0.65), 0 6px 16px rgba(130,45,45,0.24)"
    : emphasized
      ? "0 0 0 2px rgba(90,148,208,0.55), 0 6px 16px rgba(45,95,160,0.25)"
      : "0 3px 10px rgba(60, 52, 40, 0.18)";

  const sharedWrapperStyle: React.CSSProperties = {
    pointerEvents: "auto",
    cursor: "pointer",
    opacity: wrapperOpacity,
    transform: `scale(${scale})`,
    transition: "opacity 150ms ease, transform 150ms ease",
    filter: shouldGrey ? "grayscale(0.85)" : "none",
  };

  const interactionProps = {
    onClick: (event: React.MouseEvent) => {
      event.stopPropagation();
      onSelect(id);
    },
    onPointerEnter: () => onHover(id),
    onPointerLeave: () => onHover(null),
    onContextMenu: (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onOpenContextMenu({
        nodeId: id,
        kind: "person" as const,
        label: person.name,
        x: event.clientX,
        y: event.clientY,
      });
    },
    title: `${person.name} (${person.familyName}) · ${lifespan}`,
  };

  if (showNamesOnly) {
    const compactBg = colorByFamily
      ? hoverHighlight
        ? `color-mix(in srgb, ${branch.background} 32%, ${hoverHighlight.background})`
        : `color-mix(in srgb, ${branch.background} 45%, #fffef9)`
      : hoverHighlight
        ? hoverHighlight.background
      : NEUTRAL_BG;
    return (
      <Html
        position={position}
        center
        distanceFactor={125}
        zIndexRange={CARD_Z_RANGE}
        style={{ pointerEvents: "none" }}
      >
        <div
          {...interactionProps}
          style={{
            ...sharedWrapperStyle,
            width: 240,
            height: 46,
            borderRadius: 8,
            border: `1.5px solid ${borderColor}`,
            background: compactBg,
            boxShadow: ring,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 8px",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-playfair), Georgia, serif",
              fontSize: 17,
              fontWeight: 500,
              lineHeight: 1,
              color: textColor,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              width: "100%",
              textAlign: "center",
            }}
          >
            {cardLabel}
          </span>
        </div>
      </Html>
    );
  }

  const cardBg = colorByFamily
    ? hoverHighlight
      ? `color-mix(in srgb, ${branch.background} 32%, ${hoverHighlight.background})`
      : `color-mix(in srgb, ${branch.background} 45%, #fffef9)`
    : hoverHighlight
      ? hoverHighlight.background
    : NEUTRAL_BG;
  const avatarBg = colorByFamily
    ? `linear-gradient(180deg, ${branch.background}, #f0e8da)`
    : "linear-gradient(180deg, #faf6ef, #f0e8da)";

  return (
    <Html
      position={position}
      center
      distanceFactor={120}
      zIndexRange={CARD_Z_RANGE}
      style={{ pointerEvents: "none" }}
    >
      <div
        {...interactionProps}
        style={{
          ...sharedWrapperStyle,
          width: 200,
          borderRadius: 14,
          border: `2px solid ${borderColor}`,
          background: cardBg,
          boxShadow: ring,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "12px 16px",
        }}
      >
        <div
          style={{
            display: "flex",
            height: 56,
            width: 56,
            flexShrink: 0,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "9999px",
            border: `1px solid ${borderColor}`,
            background: avatarBg,
          }}
        >
          <ProfileAvatar
            gender={person.gender}
            src={person.avatarUrl || undefined}
            alt={person.name}
            style={{ height: 32, width: 32, color: avatarColor }}
          />
        </div>
        <div
          style={{
            marginTop: 8,
            display: "flex",
            height: 40,
            width: "100%",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              width: "100%",
              textAlign: "center",
              fontFamily: "var(--font-playfair), Georgia, serif",
              fontSize: 16,
              fontWeight: 500,
              lineHeight: 1.15,
              color: textColor,
              wordBreak: "break-word",
            }}
          >
            {cardLabel}
          </p>
        </div>
        <p
          style={{
            margin: "4px 0 0",
            flexShrink: 0,
            textAlign: "center",
            fontSize: 12,
            letterSpacing: "0.03em",
            color: "#8b7d6b",
            fontFamily: "var(--font-inter), system-ui, sans-serif",
          }}
        >
          {lifespan}
        </p>
      </div>
    </Html>
  );
}

function unionMarriageTooltip(marriageYear: number | null, divorced: boolean): string | undefined {
  if (!marriageYear) return undefined;
  return `Marié(e) en ${marriageYear}${divorced ? " (divorcé(e))" : ""}`;
}

/** Marriage anchor in 3D — sphere with optional marriage year centered on it. */
function UnionAnchor({
  unionId,
  position,
  colorByFamily,
  showNamesOnly,
  active,
  pathActive,
  focusActive,
  familyActive,
  dimmed,
  greyed,
  onHover,
  onHoverEnd,
  onOpenContextMenu,
}: {
  unionId: string;
  position: Vec3;
  colorByFamily: boolean;
  showNamesOnly: boolean;
  active: boolean;
  pathActive: boolean;
  focusActive: boolean;
  familyActive: boolean;
  dimmed: boolean;
  greyed: boolean;
  onHover: (unionId: string) => void;
  onHoverEnd: (unionId: string) => void;
  onOpenContextMenu: (
    unionId: string,
    event: { stopPropagation: () => void; nativeEvent: MouseEvent },
  ) => void;
}) {
  const union = unions[unionId];
  const marriageYear = union?.marriage?.year ?? null;
  const divorced = union?.divorce !== null;
  const showYear = !showNamesOnly && marriageYear != null;
  const familyName =
    union?.childIds.map((id) => individuals[id]?.familyName).find(Boolean) ?? "UNKNOWN";
  const color = colorByFamily ? getFamilyColor(familyName).stroke : NEUTRAL_STROKE;
  const sphereColor = pathActive
    ? PATH_STROKE
    : focusActive
      ? FOCUS_STROKE
      : familyActive
        ? "#4a8ac8"
        : greyed
          ? GREY_STROKE
          : color;

  return (
    <group position={position}>
      <mesh
        onPointerOver={(event) => {
          event.stopPropagation();
          onHover(unionId);
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          onHoverEnd(unionId);
        }}
        onContextMenu={(event) => onOpenContextMenu(unionId, event)}
      >
        <sphereGeometry args={[active ? 3 : 2.2, 16, 16]} />
        <meshStandardMaterial
          color={sphereColor}
          transparent
          opacity={dimmed ? 0.2 : greyed ? 0.35 : 0.9}
        />
      </mesh>
      {showYear ? (
        <Html
          position={[0, 0, 0.1]}
          center
          distanceFactor={active ? 42 : 48}
          zIndexRange={CARD_Z_RANGE}
          style={{ pointerEvents: "none" }}
        >
          <span
            title={unionMarriageTooltip(marriageYear, divorced)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: 10,
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
              color: "#ffffff",
              textShadow: "0 0 3px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.45)",
              whiteSpace: "nowrap",
              opacity: dimmed ? 0.35 : greyed ? 0.55 : 1,
            }}
          >
            {marriageYear}
          </span>
        </Html>
      ) : null}
    </group>
  );
}

function SceneContent({
  layout,
  selectedId,
  onSelectPerson,
  colorByFamily,
  greyDeceased,
  showNamesOnly,
  visibleFamilyNames,
  focusHighlightNodeIds,
  pathNodeIds,
  pathEdgeIds,
  aliveAtYear,
  onOpenNodeContextMenu,
  viewControlsRef,
}: {
  layout: Layout3DResult;
  selectedId: string | null;
  onSelectPerson: (id: string) => void;
  colorByFamily: boolean;
  greyDeceased: boolean;
  showNamesOnly: boolean;
  visibleFamilyNames: Set<string>;
  focusHighlightNodeIds: Set<string> | null;
  pathNodeIds: Set<string> | null;
  pathEdgeIds: Set<string> | null;
  aliveAtYear: number | null;
  onOpenNodeContextMenu: (target: NodeContextMenuTarget) => void;
  viewControlsRef?: React.MutableRefObject<FamilyTree3DControls | null>;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredUnionId, setHoveredUnionId] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const markCameraReady = useCallback(() => setCameraReady(true), []);
  useCursor(hoveredUnionId !== null, "pointer", "auto");
  const minDistance = 20;
  const maxDistance = Math.max(layout.bounds.radius, 200) * 6;

  const positions = useMemo(() => {
    const map = new Map<string, Vec3>();
    for (const node of layout.nodes) map.set(node.id, [node.x, node.y, node.z]);
    return map;
  }, [layout]);

  const isPersonVisibleByBranch = useCallback(
    (id: string) => {
      const person = individuals[id];
      return !person || visibleFamilyNames.has(person.familyName);
    },
    [visibleFamilyNames],
  );

  const isPersonVisibleByYear = useCallback(
    (id: string) => {
      if (aliveAtYear === null) return true;
      const person = individuals[id];
      return !person || isBornByYear(person.birth.year, aliveAtYear);
    },
    [aliveAtYear],
  );

  const visibleLinks = useMemo(
    () =>
      layout.links.filter(
        (link) =>
          visibleFamilyNames.has(link.familyName) &&
          isPersonVisibleByBranch(link.sourceId) &&
          isPersonVisibleByBranch(link.targetId) &&
          isPersonVisibleByYear(link.sourceId) &&
          isPersonVisibleByYear(link.targetId),
      ),
    [isPersonVisibleByBranch, isPersonVisibleByYear, layout.links, visibleFamilyNames],
  );

  const visibleUnionIds = useMemo(() => {
    const ids = new Set<string>();
    for (const link of visibleLinks) {
      if (unions[link.sourceId]) ids.add(link.sourceId);
      if (unions[link.targetId]) ids.add(link.targetId);
    }
    return ids;
  }, [visibleLinks]);

  const isPersonDeceasedForView = (id: string) => {
    const person = individuals[id];
    if (!person) return false;
    return aliveAtYear === null
      ? isDeceased(person.birth.year, person.death?.year ?? null)
      : isDeceasedAsOfYear(person.birth.year, person.death?.year ?? null, aliveAtYear);
  };

  /** True when the link connects to a deceased person (for "Grey out deceased"). */
  const linkTouchesDeceased = (sourceId: string, targetId: string) =>
    [sourceId, targetId].some(isPersonDeceasedForView);

  /** True when a visible partner or child attached to the union is deceased. */
  const unionTouchesDeceased = (unionId: string) => {
    const union = unions[unionId];
    if (!union) return false;
    return [...union.partnerIds, ...union.childIds].some(
      (id) =>
        visibleFamilyNames.has(individuals[id]?.familyName ?? "") &&
        isPersonVisibleByYear(id) &&
        isPersonDeceasedForView(id),
    );
  };

  // Highlight the family of whichever node is hovered, or the selected person
  // when nothing is hovered — same idea as the 2D hover behaviour.
  const familyNodeHighlight = useMemo(() => {
    const focusId = hoveredId ?? selectedId;
    if (!focusId || !individuals[focusId]) return null;
    return getFamilyHighlight(focusId);
  }, [hoveredId, selectedId]);

  const linkIsPathHighlighted = (link: Layout3DLink) =>
    pathEdgeIds?.has(link.edgeId) ?? false;

  const openUnionContextMenu = (
    nodeId: string,
    event: { stopPropagation: () => void; nativeEvent: MouseEvent },
  ) => {
    event.stopPropagation();
    event.nativeEvent.preventDefault();
    onOpenNodeContextMenu({
      nodeId,
      kind: "union",
      label: unionSearchIndex.find((union) => union.id === nodeId)?.label ?? "Union",
      x: event.nativeEvent.clientX,
      y: event.nativeEvent.clientY,
    });
  };

  return (
    <>
      <color attach="background" args={[SCENE_BG]} />
      <ambientLight intensity={0.95} />
      <directionalLight position={[60, 120, 80]} intensity={0.5} />

      {layout.planes.map((plane) => (
        <GenerationDisc key={plane.generation} plane={plane} />
      ))}

      {visibleLinks.map((link) => {
        const from = positions.get(link.sourceId);
        const to = positions.get(link.targetId);
        if (!from || !to) return null;
        const pathActive = linkIsPathHighlighted(link);
        const familyActive = Boolean(
          familyNodeHighlight?.nodeIds.has(link.sourceId) &&
            familyNodeHighlight?.nodeIds.has(link.targetId),
        );
        const active = pathActive || familyActive;
        const dimmed =
          (pathEdgeIds !== null && !pathActive) ||
          (familyNodeHighlight !== null && !familyActive && !pathActive);
        const greyed =
          greyDeceased &&
          !pathActive &&
          !familyActive &&
          !dimmed &&
          linkTouchesDeceased(link.sourceId, link.targetId);
        const color = pathActive
          ? PATH_STROKE
          : familyActive
            ? "#4a8ac8"
          : greyed
            ? GREY_STROKE
            : colorByFamily
              ? getFamilyColor(link.familyName).stroke
              : NEUTRAL_STROKE;
        return (
          <Line
            key={link.edgeId}
            points={[from, to]}
            color={color}
            lineWidth={pathActive ? 3 : familyActive ? 2.6 : 1.2}
            transparent
            opacity={dimmed ? 0.12 : active ? 0.95 : greyed ? 0.22 : 0.5}
            dashed={false}
          />
        );
      })}

      {layout.nodes.map((node) => {
        if (node.kind !== "union") return null;
        if (!visibleUnionIds.has(node.id)) return null;
        const pathActive = pathNodeIds?.has(node.id) ?? false;
        const focusActive = focusHighlightNodeIds?.has(node.id) ?? false;
        const familyActive = familyNodeHighlight?.nodeIds.has(node.id) ?? false;
        const active = pathActive || focusActive || familyActive;
        const dimmed =
          (pathNodeIds !== null && !pathActive) ||
          (familyNodeHighlight !== null && !familyActive && !pathActive && !focusActive);
        const greyed =
          greyDeceased &&
          !pathActive &&
          !focusActive &&
          !familyActive &&
          !dimmed &&
          unionTouchesDeceased(node.id);
        return (
          <UnionAnchor
            key={node.id}
            unionId={node.id}
            position={[node.x, node.y, node.z]}
            colorByFamily={colorByFamily}
            showNamesOnly={showNamesOnly}
            active={active}
            pathActive={pathActive}
            focusActive={focusActive}
            familyActive={familyActive}
            dimmed={dimmed}
            greyed={greyed}
            onHover={(unionId) => setHoveredUnionId(unionId)}
            onHoverEnd={(unionId) =>
              setHoveredUnionId((current) => (current === unionId ? null : current))
            }
            onOpenContextMenu={openUnionContextMenu}
          />
        );
      })}

      {cameraReady
        ? layout.nodes.map((node) => {
            if (node.kind !== "person") return null;
            const person = individuals[node.id];
            if (!person) return null;
            if (!visibleFamilyNames.has(person.familyName)) return null;
            if (!isPersonVisibleByYear(node.id)) return null;
            const pathActive = pathNodeIds?.has(node.id) ?? false;
            const focusActive = focusHighlightNodeIds?.has(node.id) ?? false;
            const familyActive = familyNodeHighlight?.nodeIds.has(node.id) ?? false;
            const hoverKind =
              hoveredId === node.id
                ? "primary"
                : familyNodeHighlight?.nodeIds.has(node.id)
                  ? "related"
                  : null;
            const active = pathActive || focusActive || familyActive;
            const dimmed =
              (pathNodeIds !== null && !pathActive) ||
              (familyNodeHighlight !== null && !familyActive && !pathActive && !focusActive);
            return (
              <PersonCard
                key={node.id}
                id={node.id}
                position={[node.x, node.y, node.z]}
                colorByFamily={colorByFamily}
                greyed={greyDeceased && isPersonDeceasedForView(node.id)}
                selected={selectedId === node.id}
                dimmed={dimmed}
                emphasized={active && selectedId !== node.id}
                pathHighlighted={pathActive}
                focusHighlighted={focusActive}
                hoverKind={hoverKind}
                showNamesOnly={showNamesOnly}
                onSelect={onSelectPerson}
                onHover={setHoveredId}
                onOpenContextMenu={onOpenNodeContextMenu}
              />
            );
          })
        : null}

      <CameraRig
        bounds={layout.bounds}
        positions={positions}
        orbitControlsRef={controlsRef}
        viewControlsRef={viewControlsRef}
        minDistance={minDistance}
        maxDistance={maxDistance}
        onReady={markCameraReady}
      />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.12}
        rotateSpeed={0.6}
        zoomSpeed={0.8}
        panSpeed={0.7}
        maxDistance={maxDistance}
        minDistance={minDistance}
      />
    </>
  );
}

export function FamilyTree3D({
  selectedId,
  onSelectPerson,
  onClearSelection,
  colorByFamily,
  greyDeceased,
  showNamesOnly,
  visibleFamilyNames,
  lineagePersonIds,
  focusHighlightNodeIds,
  pathNodeIds,
  pathEdgeIds,
  aliveAtYear,
  onOpenNodeContextMenu,
  controlsRef,
}: FamilyTree3DProps) {
  const layout = useMemo(
    () =>
      computeLayout3D({
        ...(lineagePersonIds ? { personIds: lineagePersonIds } : {}),
      }),
    [lineagePersonIds],
  );
  const initialCamera = useMemo(
    () => ({ position: cameraPositionFor(layout.bounds), fov: CAMERA_FOV }),
    [layout.bounds],
  );

  return (
    <div className="h-full w-full cursor-grab active:cursor-grabbing">
      <Canvas
        className="cursor-grab active:cursor-grabbing"
        dpr={[1, 2]}
        gl={{ antialias: true }}
        camera={initialCamera}
        onPointerMissed={() => onClearSelection()}
      >
        <SceneContent
          layout={layout}
          selectedId={selectedId}
          onSelectPerson={onSelectPerson}
          colorByFamily={colorByFamily}
          greyDeceased={greyDeceased}
          showNamesOnly={showNamesOnly}
          visibleFamilyNames={visibleFamilyNames}
          focusHighlightNodeIds={focusHighlightNodeIds}
          pathNodeIds={pathNodeIds}
          pathEdgeIds={pathEdgeIds}
          aliveAtYear={aliveAtYear}
          onOpenNodeContextMenu={onOpenNodeContextMenu}
          viewControlsRef={controlsRef}
        />
      </Canvas>
    </div>
  );
}

export default FamilyTree3D;

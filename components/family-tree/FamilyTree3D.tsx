"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  computeLayout3D,
  type GenerationPlane,
  type Layout3DResult,
} from "./layout3d";
import { getFamilyColor, getFamilyHighlight, individuals, unions } from "./familyGraph";
import { isDeceased } from "./personUtils";
import { ProfileAvatar } from "./ProfileAvatar";

const NEUTRAL_STROKE = "#c4b49a";
const NEUTRAL_BORDER = "#d8cab0";
const NEUTRAL_BG = "#fffef9";
const GREY_STROKE = "#b3a791";
const CAMERA_FOV = 45;
const SCENE_BG = "#f4efe5";
// Keep the DOM person cards strictly below the overlay UI (parameters sidebar,
// search, controls) which sits at Tailwind `z-10`, so they never paint over it.
const CARD_Z_RANGE: [number, number] = [9, 0];

type FamilyTree3DProps = {
  selectedId: string | null;
  onSelectPerson: (id: string) => void;
  onClearSelection: () => void;
  colorByFamily: boolean;
  greyDeceased: boolean;
  showNamesOnly: boolean;
  /** Parent assigns a "reset camera to the default framing" callback here. */
  resetViewRef?: React.MutableRefObject<(() => void) | null>;
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
  controlsRef,
  resetViewRef,
  onReady,
}: {
  bounds: Layout3DResult["bounds"];
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
  resetViewRef?: React.MutableRefObject<(() => void) | null>;
  onReady: () => void;
}) {
  const camera = useThree((state) => state.camera);
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    const apply = () => {
      const [x, y, z] = cameraPositionFor(bounds);
      camera.position.set(x, y, z);
      camera.updateProjectionMatrix();
      camera.lookAt(0, 0, 0);
      const controls = controlsRef.current;
      if (controls) {
        controls.target.set(0, 0, 0);
        controls.update();
      }
      invalidate();
    };
    apply();
    onReady();
    if (resetViewRef) {
      resetViewRef.current = apply;
      return () => {
        resetViewRef.current = null;
      };
    }
  }, [bounds, camera, controlsRef, invalidate, onReady, resetViewRef]);

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
  showNamesOnly,
  onSelect,
  onHover,
}: {
  id: string;
  position: Vec3;
  colorByFamily: boolean;
  greyed: boolean;
  selected: boolean;
  dimmed: boolean;
  emphasized: boolean;
  showNamesOnly: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const person = individuals[id];
  if (!person) return null;

  const branch = getFamilyColor(person.familyName);
  const borderColor = selected
    ? "#b8956a"
    : colorByFamily
      ? branch.border
      : NEUTRAL_BORDER;
  const textColor = colorByFamily ? branch.text : "#3d3428";
  const avatarColor = colorByFamily ? branch.stroke : "#a8957a";
  const lifespan = person.death?.year
    ? `${person.birth.year ?? "?"} – ${person.death.year}`
    : `${person.birth.year ?? "?"} –`;

  const shouldGrey = greyed && !selected && !emphasized;
  const wrapperOpacity = dimmed ? 0.26 : shouldGrey ? 0.5 : 1;
  const scale = selected ? 1.1 : emphasized ? 1.04 : 1;
  const ring = selected
    ? `0 0 0 2px ${branch.stroke}, 0 6px 18px rgba(120, 80, 40, 0.35)`
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
    title: `${person.name} (${person.familyName}) · ${lifespan}`,
  };

  if (showNamesOnly) {
    const compactBg = colorByFamily
      ? `color-mix(in srgb, ${branch.background} 45%, #fffef9)`
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
            {person.name}
          </span>
        </div>
      </Html>
    );
  }

  const cardBg = colorByFamily
    ? `color-mix(in srgb, ${branch.background} 45%, #fffef9)`
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
            {person.name}
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

function SceneContent({
  layout,
  selectedId,
  onSelectPerson,
  colorByFamily,
  greyDeceased,
  showNamesOnly,
  resetViewRef,
}: {
  layout: Layout3DResult;
  selectedId: string | null;
  onSelectPerson: (id: string) => void;
  colorByFamily: boolean;
  greyDeceased: boolean;
  showNamesOnly: boolean;
  resetViewRef?: React.MutableRefObject<(() => void) | null>;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const markCameraReady = useCallback(() => setCameraReady(true), []);

  const positions = useMemo(() => {
    const map = new Map<string, Vec3>();
    for (const node of layout.nodes) map.set(node.id, [node.x, node.y, node.z]);
    return map;
  }, [layout]);

  /** True when the link connects to a deceased person (for "Grey out deceased"). */
  const linkTouchesDeceased = (sourceId: string, targetId: string) => {
    for (const id of [sourceId, targetId]) {
      const person = individuals[id];
      if (person && isDeceased(person.birth.year, person.death?.year ?? null)) {
        return true;
      }
    }
    return false;
  };

  // Highlight the family of whichever node is hovered, or the selected person
  // when nothing is hovered — same idea as the 2D hover behaviour.
  const highlight = useMemo(() => {
    const focusId = hoveredId ?? selectedId;
    if (!focusId || !individuals[focusId]) return null;
    return getFamilyHighlight(focusId);
  }, [hoveredId, selectedId]);

  return (
    <>
      <color attach="background" args={[SCENE_BG]} />
      <ambientLight intensity={0.95} />
      <directionalLight position={[60, 120, 80]} intensity={0.5} />

      {layout.planes.map((plane) => (
        <GenerationDisc key={plane.generation} plane={plane} />
      ))}

      {layout.links.map((link) => {
        const from = positions.get(link.sourceId);
        const to = positions.get(link.targetId);
        if (!from || !to) return null;
        const active = Boolean(
          highlight?.nodeIds.has(link.sourceId) &&
            highlight?.nodeIds.has(link.targetId),
        );
        const dimmed = highlight !== null && !active;
        const greyed =
          greyDeceased &&
          !active &&
          !dimmed &&
          linkTouchesDeceased(link.sourceId, link.targetId);
        const color = active
          ? "#4a8ac8"
          : greyed
            ? GREY_STROKE
            : colorByFamily
              ? getFamilyColor(link.familyName).stroke
              : NEUTRAL_STROKE;
        return (
          <Line
            key={`${link.sourceId}-${link.targetId}-${link.kind}`}
            points={[from, to]}
            color={color}
            lineWidth={active ? 2.6 : 1.2}
            transparent
            opacity={dimmed ? 0.12 : active ? 0.95 : greyed ? 0.22 : 0.5}
            dashed={false}
          />
        );
      })}

      {layout.nodes.map((node) => {
        if (node.kind !== "union") return null;
        const union = unions[node.id];
        const familyName =
          union?.childIds.map((id) => individuals[id]?.familyName).find(Boolean) ??
          "UNKNOWN";
        const active = highlight?.nodeIds.has(node.id) ?? false;
        const dimmed = highlight !== null && !active;
        const color = colorByFamily ? getFamilyColor(familyName).stroke : NEUTRAL_STROKE;
        return (
          <mesh key={node.id} position={[node.x, node.y, node.z]}>
            <sphereGeometry args={[active ? 3 : 2.2, 16, 16]} />
            <meshStandardMaterial
              color={active ? "#4a8ac8" : color}
              transparent
              opacity={dimmed ? 0.2 : 0.9}
            />
          </mesh>
        );
      })}

      {cameraReady
        ? layout.nodes.map((node) => {
            if (node.kind !== "person") return null;
            const person = individuals[node.id];
            if (!person) return null;
            const active = highlight?.nodeIds.has(node.id) ?? false;
            const dimmed = highlight !== null && !active;
            return (
              <PersonCard
                key={node.id}
                id={node.id}
                position={[node.x, node.y, node.z]}
                colorByFamily={colorByFamily}
                greyed={
                  greyDeceased && isDeceased(person.birth.year, person.death?.year ?? null)
                }
                selected={selectedId === node.id}
                dimmed={dimmed}
                emphasized={active && selectedId !== node.id}
                showNamesOnly={showNamesOnly}
                onSelect={onSelectPerson}
                onHover={setHoveredId}
              />
            );
          })
        : null}

      <CameraRig
        bounds={layout.bounds}
        controlsRef={controlsRef}
        resetViewRef={resetViewRef}
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
        maxDistance={Math.max(layout.bounds.radius, 200) * 6}
        minDistance={20}
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
  resetViewRef,
}: FamilyTree3DProps) {
  const layout = useMemo(() => computeLayout3D(), []);
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
          resetViewRef={resetViewRef}
        />
      </Canvas>
    </div>
  );
}

export default FamilyTree3D;

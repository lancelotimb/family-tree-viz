"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

const NEUTRAL_STROKE = "#c4b49a";
const NEUTRAL_BORDER = "#d8cab0";
const NEUTRAL_BG = "#fffef9";
const CAMERA_FOV = 45;
const SCENE_BG = "#f4efe5";

type FamilyTree3DProps = {
  selectedId: string | null;
  onSelectPerson: (id: string) => void;
  onClearSelection: () => void;
  colorByFamily: boolean;
  greyDeceased: boolean;
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
}: {
  bounds: Layout3DResult["bounds"];
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>;
  resetViewRef?: React.MutableRefObject<(() => void) | null>;
}) {
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    const apply = () => {
      const [x, y, z] = cameraPositionFor(bounds);
      camera.position.set(x, y, z);
      camera.lookAt(0, 0, 0);
      const controls = controlsRef.current;
      if (controls) {
        controls.target.set(0, 0, 0);
        controls.update();
      }
    };
    apply();
    if (resetViewRef) {
      resetViewRef.current = apply;
      return () => {
        resetViewRef.current = null;
      };
    }
  }, [bounds, camera, controlsRef, resetViewRef]);

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

function PersonCard({
  id,
  position,
  colorByFamily,
  greyed,
  selected,
  dimmed,
  emphasized,
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
  const background = colorByFamily
    ? `color-mix(in srgb, ${branch.background} 55%, #fffef9)`
    : NEUTRAL_BG;
  const textColor = colorByFamily ? branch.text : "#3d3428";
  const lifespan = person.death?.year
    ? `${person.birth.year ?? "?"} – ${person.death.year}`
    : `${person.birth.year ?? "?"} –`;

  const opacity = dimmed ? 0.28 : greyed ? 0.55 : 1;

  return (
    <Html
      position={position}
      center
      distanceFactor={120}
      zIndexRange={[20, 0]}
      style={{ pointerEvents: "none" }}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onSelect(id);
        }}
        onPointerEnter={() => onHover(id)}
        onPointerLeave={() => onHover(null)}
        title={`${person.name} (${person.familyName}) · ${lifespan}`}
        style={{
          pointerEvents: "auto",
          opacity,
          width: 150,
          transform: `scale(${selected ? 1.12 : emphasized ? 1.06 : 1})`,
          transition: "opacity 150ms ease, transform 150ms ease",
          borderRadius: 12,
          border: `2px solid ${borderColor}`,
          background,
          color: textColor,
          padding: "8px 10px",
          boxShadow: selected
            ? "0 6px 18px rgba(120, 80, 40, 0.35)"
            : "0 3px 10px rgba(60, 52, 40, 0.18)",
          cursor: "pointer",
          fontFamily: "var(--font-playfair), Georgia, serif",
          textAlign: "center",
          filter: greyed && !selected && !emphasized ? "grayscale(0.85)" : "none",
          outline: selected ? `2px solid ${branch.stroke}` : "none",
          outlineOffset: 2,
        }}
      >
        <span
          style={{
            display: "block",
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1.15,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {person.name}
        </span>
        <span
          style={{
            display: "block",
            marginTop: 2,
            fontSize: 11,
            letterSpacing: "0.02em",
            color: "#8b7d6b",
            fontFamily: "var(--font-inter), system-ui, sans-serif",
          }}
        >
          {lifespan}
        </span>
      </button>
    </Html>
  );
}

function SceneContent({
  layout,
  selectedId,
  onSelectPerson,
  colorByFamily,
  greyDeceased,
  resetViewRef,
}: {
  layout: Layout3DResult;
  selectedId: string | null;
  onSelectPerson: (id: string) => void;
  colorByFamily: boolean;
  greyDeceased: boolean;
  resetViewRef?: React.MutableRefObject<(() => void) | null>;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const positions = useMemo(() => {
    const map = new Map<string, Vec3>();
    for (const node of layout.nodes) map.set(node.id, [node.x, node.y, node.z]);
    return map;
  }, [layout]);

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
        const active =
          highlight?.nodeIds.has(link.sourceId) &&
          highlight?.nodeIds.has(link.targetId);
        const dimmed = highlight !== null && !active;
        const color = active
          ? "#4a8ac8"
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
            opacity={dimmed ? 0.12 : active ? 0.95 : 0.5}
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

      {layout.nodes.map((node) => {
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
            greyed={greyDeceased && isDeceased(person.birth.year, person.death?.year ?? null)}
            selected={selectedId === node.id}
            dimmed={dimmed}
            emphasized={active && selectedId !== node.id}
            onSelect={onSelectPerson}
            onHover={setHoveredId}
          />
        );
      })}

      <CameraRig
        bounds={layout.bounds}
        controlsRef={controlsRef}
        resetViewRef={resetViewRef}
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
  resetViewRef,
}: FamilyTree3DProps) {
  const layout = useMemo(() => computeLayout3D(), []);
  const initialCamera = useMemo(
    () => ({ position: cameraPositionFor(layout.bounds), fov: CAMERA_FOV }),
    [layout.bounds],
  );

  return (
    <div className="h-full w-full">
      <Canvas
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
          resetViewRef={resetViewRef}
        />
      </Canvas>
    </div>
  );
}

export default FamilyTree3D;

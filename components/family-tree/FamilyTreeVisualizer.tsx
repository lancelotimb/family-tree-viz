"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useOnSelectionChange,
  type Node,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import { FamilyMemberNode } from "./FamilyMemberNode";
import { SearchBar } from "./SearchBar";
import { ControlSidebar } from "./ControlSidebar";
import { ProfilePanel } from "./ProfilePanel";
import {
  buildInitialNodes,
  initialEdges,
  maxGeneration,
} from "./mockFamilyData";
import type { FamilyMemberNodeData } from "./types";

const nodeTypes = { familyMember: FamilyMemberNode };

const defaultEdgeOptions = {
  type: "smoothstep" as const,
  style: { stroke: "#c4b49a", strokeWidth: 1.5 },
};

function FamilyTreeCanvas() {
  const [initialNodes] = useState(() => buildInitialNodes());
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [maxDepth, setMaxDepth] = useState(maxGeneration);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const visibleNodeIds = useMemo(() => {
    return new Set(
      initialNodes
        .filter((n) => (n.data as FamilyMemberNodeData).generation <= maxDepth)
        .map((n) => n.id),
    );
  }, [initialNodes, maxDepth]);

  useEffect(() => {
    setNodes((current) =>
      current.map((node) => {
        const data = node.data as FamilyMemberNodeData;
        const hidden = !visibleNodeIds.has(node.id);
        return {
          ...node,
          hidden,
          data: {
            ...data,
            selected: node.id === selectedId,
          },
          selected: node.id === selectedId,
        };
      }),
    );
    setEdges((current) =>
      current.map((edge) => ({
        ...edge,
        hidden: !visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target),
      })),
    );
  }, [visibleNodeIds, selectedId, setNodes, setEdges]);

  const onSelectionChange = useCallback(({ nodes: selectedNodes }: OnSelectionChangeParams) => {
    const node = selectedNodes[0] as Node<FamilyMemberNodeData> | undefined;
    if (node) {
      setSelectedId(node.id);
      setPanelOpen(true);
    }
  }, []);

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
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
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

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
        <header className="flex justify-center px-6 pt-6">
          <SearchBar maxDepth={maxDepth} />
        </header>
        <div className="flex flex-1 items-start p-6">
          <ControlSidebar maxDepth={maxDepth} onMaxDepthChange={setMaxDepth} />
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

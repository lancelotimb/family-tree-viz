"use client";

import { createContext, useContext } from "react";

export type NodeContextMenuTarget = {
  nodeId: string;
  kind: "person" | "union";
  label: string;
  x: number;
  y: number;
};

export type FamilyTreeActions = {
  openNodeContextMenu: (target: NodeContextMenuTarget) => void;
  suppressNextNodeClick: () => void;
};

export const FamilyTreeActionsContext = createContext<FamilyTreeActions | null>(
  null,
);

export function useFamilyTreeActions(): FamilyTreeActions {
  const ctx = useContext(FamilyTreeActionsContext);
  if (!ctx) {
    throw new Error("useFamilyTreeActions must be used within FamilyTreeActionsContext");
  }
  return ctx;
}

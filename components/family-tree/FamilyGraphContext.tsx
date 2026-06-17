"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { saveGedcomAction } from "@/app/actions/gedcom";
import { extractGedcomHead, serializeGedcom } from "./gedcomSerialize";
import {
  graph,
  initializeGraphFromGedcom,
  replaceGraph,
  unionSearchIndex,
} from "./familyGraph";
import {
  addPersonToGraph,
  addMarriageToGraph,
  cloneGraph,
  type AddMarriageFormData,
  type PersonFormData,
  type RemoveUnionFormData,
  type UnionFormData,
  removeUnionFromGraph,
  updatePersonInGraph,
  updateUnionInGraph,
} from "./graphMutations";
import { useGraphRevision } from "./useGraphRevision";

type FamilyGraphContextValue = {
  adminMode: boolean;
  graphReady: boolean;
  saving: boolean;
  saveError: string | null;
  saveGedcom: () => Promise<boolean>;
  updatePerson: (personId: string, data: PersonFormData) => Promise<boolean>;
  addPerson: (data: PersonFormData) => Promise<string | null>;
  updateUnion: (unionId: string, data: UnionFormData) => Promise<{ ok: boolean; error?: string }>;
  removeUnion: (unionId: string, data: RemoveUnionFormData) => Promise<{ ok: boolean; error?: string }>;
  addMarriage: (data: AddMarriageFormData) => Promise<{ ok: boolean; unionId?: string; error?: string }>;
};

const FamilyGraphContext = createContext<FamilyGraphContextValue | null>(null);

type FamilyGraphProviderProps = {
  children: ReactNode;
  initialGedcom: string;
  adminMode?: boolean;
};

export function FamilyGraphProvider({
  children,
  initialGedcom,
  adminMode = false,
}: FamilyGraphProviderProps) {
  const [graphReady, setGraphReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const gedcomHead = useMemo(() => extractGedcomHead(initialGedcom), [initialGedcom]);

  useLayoutEffect(() => {
    initializeGraphFromGedcom(initialGedcom);
    setGraphReady(true);
  }, [initialGedcom]);

  const persistGraph = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const text = serializeGedcom(
        { individuals: graph.individuals, unions: graph.unions },
        gedcomHead,
      );
      const result = await saveGedcomAction(text);
      if (!result.ok) {
        throw new Error(result.error);
      }
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save GEDCOM file";
      setSaveError(message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [gedcomHead]);

  const updatePerson = useCallback(
    async (personId: string, data: PersonFormData) => {
      const next = updatePersonInGraph(
        { individuals: graph.individuals, unions: graph.unions },
        personId,
        data,
      );
      replaceGraph(next);
      return persistGraph();
    },
    [persistGraph],
  );

  const addPerson = useCallback(
    async (data: PersonFormData) => {
      const { graph: next, personId } = addPersonToGraph(
        cloneGraph({ individuals: graph.individuals, unions: graph.unions }),
        data,
      );
      replaceGraph(next);
      const ok = await persistGraph();
      return ok ? personId : null;
    },
    [persistGraph],
  );

  const updateUnion = useCallback(
    async (unionId: string, data: UnionFormData) => {
      const result = updateUnionInGraph(
        { individuals: graph.individuals, unions: graph.unions },
        unionId,
        data,
      );
      if ("error" in result) {
        return { ok: false, error: result.error };
      }
      replaceGraph(result);
      const ok = await persistGraph();
      return ok ? { ok: true } : { ok: false, error: "Failed to save GEDCOM file." };
    },
    [persistGraph],
  );

  const removeUnion = useCallback(
    async (unionId: string, data: RemoveUnionFormData) => {
      const result = removeUnionFromGraph(
        { individuals: graph.individuals, unions: graph.unions },
        unionId,
        data,
      );
      if ("error" in result) {
        return { ok: false, error: result.error };
      }
      replaceGraph(result);
      const ok = await persistGraph();
      return ok ? { ok: true } : { ok: false, error: "Failed to save GEDCOM file." };
    },
    [persistGraph],
  );

  const addMarriage = useCallback(
    async (data: AddMarriageFormData) => {
      const result = addMarriageToGraph(
        cloneGraph({ individuals: graph.individuals, unions: graph.unions }),
        data,
      );
      if ("error" in result) {
        return { ok: false, error: result.error };
      }
      replaceGraph(result.graph);
      const ok = await persistGraph();
      return ok ? { ok: true, unionId: result.unionId } : { ok: false, error: "Failed to save GEDCOM file." };
    },
    [persistGraph],
  );

  const value = useMemo<FamilyGraphContextValue>(
    () => ({
      adminMode,
      graphReady,
      saving,
      saveError,
      saveGedcom: persistGraph,
      updatePerson,
      addPerson,
      updateUnion,
      removeUnion,
      addMarriage,
    }),
    [adminMode, graphReady, saving, saveError, persistGraph, updatePerson, addPerson, updateUnion, removeUnion, addMarriage],
  );

  return (
    <FamilyGraphContext.Provider value={value}>{children}</FamilyGraphContext.Provider>
  );
}

export function useFamilyGraphAdmin(): FamilyGraphContextValue {
  const context = useContext(FamilyGraphContext);
  if (!context) {
    return {
      adminMode: false,
      graphReady: false,
      saving: false,
      saveError: null,
      saveGedcom: async () => false,
      updatePerson: async () => false,
      addPerson: async () => null,
      updateUnion: async () => ({ ok: false }),
      removeUnion: async () => ({ ok: false }),
      addMarriage: async () => ({ ok: false }),
    };
  }
  return context;
}

export function useUnionOptions() {
  const revision = useGraphRevision();
  return useMemo(
    () =>
      unionSearchIndex.map((union) => ({
        id: union.id,
        label: union.label,
      })),
    [revision],
  );
}

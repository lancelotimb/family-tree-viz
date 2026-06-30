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
  getFullGraph,
  initializeGraphFromGedcom,
  replaceGraph,
  unionSearchIndex,
} from "./familyGraph";
import {
  addPersonToGraph,
  addMarriageToGraph,
  addMediaToGraph,
  cloneGraph,
  generateMediaId,
  type AddMarriageFormData,
  type MediaFormData,
  type PersonFormData,
  type RemoveUnionFormData,
  type UnionFormData,
  removeMediaFromGraph,
  removeUnionFromGraph,
  updateMediaInGraph,
  updatePersonAvatarInGraph,
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
  updateAvatar: (personId: string, avatarUrl: string) => Promise<boolean>;
  addPerson: (data: PersonFormData) => Promise<string | null>;
  addMedia: (mediaId: string, data: MediaFormData) => Promise<boolean>;
  updateMedia: (mediaId: string, data: Partial<MediaFormData>) => Promise<boolean>;
  removeMedia: (mediaId: string) => Promise<boolean>;
  updateUnion: (unionId: string, data: UnionFormData) => Promise<{ ok: boolean; error?: string }>;
  removeUnion: (unionId: string, data: RemoveUnionFormData) => Promise<{ ok: boolean; error?: string }>;
  addMarriage: (data: AddMarriageFormData) => Promise<{ ok: boolean; unionId?: string; error?: string }>;
  generateMediaId: () => string;
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
      const text = serializeGedcom(getFullGraph(), gedcomHead);
      const result = await saveGedcomAction(text);
      if (!result.ok) {
        throw new Error(result.error);
      }
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Échec de l'enregistrement du fichier GEDCOM";
      setSaveError(message);
      return false;
    } finally {
      setSaving(false);
    }
  }, [gedcomHead]);

  const updatePerson = useCallback(
    async (personId: string, data: PersonFormData) => {
      const next = updatePersonInGraph(getFullGraph(), personId, data);
      replaceGraph(next);
      return persistGraph();
    },
    [persistGraph],
  );

  const updateAvatar = useCallback(
    async (personId: string, avatarUrl: string) => {
      const next = updatePersonAvatarInGraph(getFullGraph(), personId, avatarUrl);
      replaceGraph(next);
      return persistGraph();
    },
    [persistGraph],
  );

  const addPerson = useCallback(
    async (data: PersonFormData) => {
      const { graph: next, personId } = addPersonToGraph(cloneGraph(getFullGraph()), data);
      replaceGraph(next);
      const ok = await persistGraph();
      return ok ? personId : null;
    },
    [persistGraph],
  );

  const addMedia = useCallback(
    async (mediaId: string, data: MediaFormData) => {
      const next = addMediaToGraph(getFullGraph(), mediaId, data);
      replaceGraph(next);
      return persistGraph();
    },
    [persistGraph],
  );

  const updateMedia = useCallback(
    async (mediaId: string, data: Partial<MediaFormData>) => {
      const next = updateMediaInGraph(getFullGraph(), mediaId, data);
      replaceGraph(next);
      return persistGraph();
    },
    [persistGraph],
  );

  const removeMedia = useCallback(
    async (mediaId: string) => {
      const next = removeMediaFromGraph(getFullGraph(), mediaId);
      replaceGraph(next);
      return persistGraph();
    },
    [persistGraph],
  );

  const updateUnion = useCallback(
    async (unionId: string, data: UnionFormData) => {
      const result = updateUnionInGraph(getFullGraph(), unionId, data);
      if ("error" in result) {
        return { ok: false, error: result.error };
      }
      replaceGraph(result);
      const ok = await persistGraph();
      return ok ? { ok: true } : { ok: false, error: "Échec de l'enregistrement du fichier GEDCOM." };
    },
    [persistGraph],
  );

  const removeUnion = useCallback(
    async (unionId: string, data: RemoveUnionFormData) => {
      const result = removeUnionFromGraph(getFullGraph(), unionId, data);
      if ("error" in result) {
        return { ok: false, error: result.error };
      }
      replaceGraph(result);
      const ok = await persistGraph();
      return ok ? { ok: true } : { ok: false, error: "Échec de l'enregistrement du fichier GEDCOM." };
    },
    [persistGraph],
  );

  const addMarriage = useCallback(
    async (data: AddMarriageFormData) => {
      const result = addMarriageToGraph(cloneGraph(getFullGraph()), data);
      if ("error" in result) {
        return { ok: false, error: result.error };
      }
      replaceGraph(result.graph);
      const ok = await persistGraph();
      return ok
        ? { ok: true, unionId: result.unionId }
        : { ok: false, error: "Échec de l'enregistrement du fichier GEDCOM." };
    },
    [persistGraph],
  );

  const nextMediaId = useCallback(() => generateMediaId(getFullGraph()), []);

  const value = useMemo<FamilyGraphContextValue>(
    () => ({
      adminMode,
      graphReady,
      saving,
      saveError,
      saveGedcom: persistGraph,
      updatePerson,
      updateAvatar,
      addPerson,
      addMedia,
      updateMedia,
      removeMedia,
      updateUnion,
      removeUnion,
      addMarriage,
      generateMediaId: nextMediaId,
    }),
    [
      adminMode,
      graphReady,
      saving,
      saveError,
      persistGraph,
      updatePerson,
      updateAvatar,
      addPerson,
      addMedia,
      updateMedia,
      removeMedia,
      updateUnion,
      removeUnion,
      addMarriage,
      nextMediaId,
    ],
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
      updateAvatar: async () => false,
      addPerson: async () => null,
      addMedia: async () => false,
      updateMedia: async () => false,
      removeMedia: async () => false,
      updateUnion: async () => ({ ok: false }),
      removeUnion: async () => ({ ok: false }),
      addMarriage: async () => ({ ok: false }),
      generateMediaId: () => "M_photo_1",
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

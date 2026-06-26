"use client";

import { useSyncExternalStore } from "react";
import { getGraphRevision, subscribeGraph } from "./familyGraph";

export function useGraphRevision(): number {
  return useSyncExternalStore(subscribeGraph, getGraphRevision, getGraphRevision);
}

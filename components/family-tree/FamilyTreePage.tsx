"use client";

import { Suspense } from "react";
import {
  FamilyGraphProvider,
  useFamilyGraphAdmin,
} from "@/components/family-tree/FamilyGraphContext";
import { FamilyTreeVisualizer } from "@/components/family-tree/FamilyTreeVisualizer";

type FamilyTreePageProps = {
  initialGedcom: string;
};

function FamilyTreePageContent() {
  const { graphReady } = useFamilyGraphAdmin();

  if (!graphReady) {
    return (
      <main className="flex h-dvh w-full items-center justify-center bg-[#faf6ef]">
        <p className="text-sm text-[#8b7d6b]">Chargement de l&apos;arbre généalogique...</p>
      </main>
    );
  }

  return (
    <main className="h-dvh w-full overflow-hidden">
      <FamilyTreeVisualizer />
    </main>
  );
}

function FamilyTreePageInner({ initialGedcom }: FamilyTreePageProps) {
  return (
    <FamilyGraphProvider initialGedcom={initialGedcom} adminMode={false}>
      <FamilyTreePageContent />
    </FamilyGraphProvider>
  );
}

export function FamilyTreePage({ initialGedcom }: FamilyTreePageProps) {
  return (
    <Suspense
      fallback={
        <main className="flex h-dvh w-full items-center justify-center bg-[#faf6ef]">
          <p className="text-sm text-[#8b7d6b]">Chargement de l&apos;arbre généalogique...</p>
        </main>
      }
    >
      <FamilyTreePageInner initialGedcom={initialGedcom} />
    </Suspense>
  );
}

import { FamilyTreePage } from "@/components/family-tree/FamilyTreePage";
import { readGedcom } from "@/lib/gedcomStore";

export const dynamic = "force-dynamic";

export default async function Home() {
  const initialGedcom = await readGedcom();
  return <FamilyTreePage initialGedcom={initialGedcom} />;
}

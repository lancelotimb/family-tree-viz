import { AdminPage } from "@/components/family-tree/AdminPage";
import { readGedcom } from "@/lib/gedcomStore";

export const dynamic = "force-dynamic";

export default async function AdminRoute() {
  const initialGedcom = await readGedcom();
  return <AdminPage initialGedcom={initialGedcom} />;
}

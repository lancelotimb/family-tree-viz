"use server";

import { hasAdminSession } from "@/lib/adminAuth";
import { writeGedcom } from "@/lib/gedcomStore";

export async function saveGedcomAction(
  text: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await hasAdminSession())) {
    return { ok: false, error: "Non autorisé" };
  }

  try {
    await writeGedcom(text);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Échec de l'enregistrement du GEDCOM";
    return { ok: false, error: message };
  }
}

import { verifyAuthorizationHeader } from "@/lib/adminAuth";
import { readGedcom, writeGedcom } from "@/lib/gedcomStore";

export async function GET() {
  const content = await readGedcom();
  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function PUT(request: Request) {
  if (!verifyAuthorizationHeader(request.headers.get("authorization"))) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.text();
  try {
    await writeGedcom(body);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "GEDCOM invalide";
    return Response.json({ error: message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createJob, pool, JobType } from "@/lib/db";
import { signedPutUrl } from "@/lib/storage";
import { triggerWorker } from "@/lib/worker";

export const runtime = "nodejs";

const NEEDS_UPLOAD: JobType[] = ["caption", "uniquify", "subtitles"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const type = body.type as JobType;
    const params = (body.params || {}) as Record<string, unknown>;

    if (
      !["tiktok", "instagram", "caption", "uniquify", "subtitles", "profile", "edit"].includes(type)
    ) {
      return NextResponse.json({ error: "type invalide" }, { status: 400 });
    }

    if (type === "tiktok" || type === "instagram" || type === "profile") {
      if (!params.url || typeof params.url !== "string") {
        return NextResponse.json({ error: "url requise" }, { status: 400 });
      }
      const id = await createJob(type, params);
      await triggerWorker(id);
      return NextResponse.json({ id });
    }

    // « edit » avec un lien (TikTok/Instagram) : pas d'upload, le worker télécharge.
    if (type === "edit" && typeof params.url === "string" && params.url) {
      const id = await createJob(type, params);
      await triggerWorker(id);
      return NextResponse.json({ id });
    }

    // caption / uniquify / subtitles / edit-fichier : on crée le job,
    // puis on renvoie une URL d'upload directe pour le fichier source.
    const id = await createJob(type, params);
    const inputKey = `inputs/${id}.mp4`;
    await pool.query("UPDATE jobs SET input_key=$1 WHERE id=$2", [inputKey, id]);
    const uploadUrl = await signedPutUrl(inputKey, "video/mp4");
    return NextResponse.json({ id, uploadUrl });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || "erreur" }, { status: 500 });
  }
}

// GET /api/jobs — historique : les 30 derniers téléchargements réussis,
// avec la légende et les liens de l'auteur quand on les a.
export async function GET() {
  const base = `FROM jobs WHERE type IN ('tiktok','instagram') AND status='done'
       ORDER BY created_at DESC LIMIT 30`;
  try {
    const { rows } = await pool.query(
      `SELECT id, type, params, meta, created_at ${base}`
    );
    return NextResponse.json({
      items: rows.map((r: any) => ({
        id: r.id,
        type: r.type,
        url: (r.params && r.params.url) || "",
        caption: (r.meta && r.meta.caption) || "",
        author: (r.meta && r.meta.author) || "",
        authorUrl: (r.meta && r.meta.authorUrl) || "",
        createdAt: r.created_at,
      })),
    });
  } catch {
    // Colonne meta absente (migration pas encore appliquée) : version minimale.
    try {
      const { rows } = await pool.query(`SELECT id, type, params, created_at ${base}`);
      return NextResponse.json({
        items: rows.map((r: any) => ({
          id: r.id,
          type: r.type,
          url: (r.params && r.params.url) || "",
          caption: "",
          author: "",
          authorUrl: "",
          createdAt: r.created_at,
        })),
      });
    } catch (e: any) {
      return NextResponse.json({ items: [], error: e.message }, { status: 200 });
    }
  }
}

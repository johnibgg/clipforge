import { Pool } from "pg";

// Un seul pool réutilisé entre les invocations (évite d'épuiser les connexions).
// On le met en cache sur `global` en dev ET en prod : sur Vercel, une instance
// « chaude » réutilise ainsi le même pool au lieu d'en ouvrir un nouveau.
const globalForPg = global as unknown as { pgPool?: Pool };

export const pool =
  globalForPg.pgPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === "disable" ? false : { rejectUnauthorized: false },
    // Peu de connexions par instance : on est derrière le pooler Supabase.
    max: 3,
    // Si aucune connexion n'est disponible en 10 s, on échoue proprement
    // (au lieu de laisser la requête — et l'UI — pendre indéfiniment).
    connectionTimeoutMillis: 10_000,
    // Libère les connexions inactives pour ne pas saturer le pooler.
    idleTimeoutMillis: 10_000,
    // Garde-fou : une requête qui dépasse 15 s est annulée.
    statement_timeout: 15_000,
    query_timeout: 15_000,
  });

// Évite qu'une erreur sur un client inactif ne fasse planter le process.
pool.on("error", (err) => {
  console.error("pg pool error", err.message);
});

globalForPg.pgPool = pool;

export type JobType = "tiktok" | "instagram" | "caption" | "uniquify" | "subtitles";

export async function createJob(
  type: JobType,
  params: Record<string, unknown>,
  inputKey?: string
) {
  const { rows } = await pool.query(
    `INSERT INTO jobs (type, params, input_key, status)
     VALUES ($1, $2, $3, 'queued') RETURNING id`,
    [type, params, inputKey ?? null]
  );
  return rows[0].id as string;
}

export async function getJob(id: string) {
  const { rows } = await pool.query("SELECT * FROM jobs WHERE id=$1", [id]);
  return rows[0];
}

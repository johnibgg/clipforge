"use client";

import { useState } from "react";

type Tool = "tiktok" | "instagram" | "caption" | "uniquify" | "subtitles";
type Status = "idle" | "uploading" | "processing" | "done" | "error";

const TABS: { key: Tool; label: string; emoji: string; desc: string }[] = [
  { key: "tiktok", label: "TikTok HD", emoji: "⬇️", desc: "Colle un lien TikTok → vidéo HD sans watermark." },
  { key: "instagram", label: "Reels IG", emoji: "📸", desc: "Colle un lien de Reel Instagram → vidéo téléchargée." },
  { key: "caption", label: "Légende", emoji: "✍️", desc: "Upload une vidéo + une légende → rendu propre." },
  { key: "uniquify", label: "Rendre unique", emoji: "🌀", desc: "Même vidéo, empreinte différente pour le repost." },
  { key: "subtitles", label: "Sous-titres", emoji: "💬", desc: "Transcription auto de la voix → sous-titres incrustés." },
];

function Logo({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="ClipForge">
      <rect width="40" height="40" rx="11" fill="url(#cflogo)" />
      <polygon points="24,7 13,22 19.5,22 17,33 28,17 21.5,17" fill="white" />
      <defs>
        <linearGradient id="cflogo" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34d399" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function Home() {
  const [tab, setTab] = useState<Tool>("tiktok");

  return (
    <main className="mx-auto max-w-2xl px-5 py-14">
      <header className="mb-10 text-center">
        <div className="mb-4 flex justify-center">
          <Logo />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight">
          Clip<span className="text-brand">Forge</span>
        </h1>
        <p className="mt-3 text-zinc-400">
          Télécharge, légende et rends tes vidéos uniques — prêtes à reposter partout.
        </p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-white/5 p-1 sm:grid-cols-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === t.key ? "bg-brand text-white" : "text-zinc-300 hover:bg-white/5"
            }`}
          >
            <span className="mr-1">{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      <p className="mb-4 text-center text-sm text-zinc-500">
        {TABS.find((t) => t.key === tab)!.desc}
      </p>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl">
        {tab === "tiktok" || tab === "instagram" ? (
          <UrlTool
            type={tab}
            key={tab}
            placeholder={
              tab === "tiktok"
                ? "https://www.tiktok.com/@…/video/…"
                : "https://www.instagram.com/reel/…"
            }
          />
        ) : (
          <VideoTool tool={tab} key={tab} />
        )}
      </div>

      <footer className="mt-10 text-center text-xs text-zinc-600">
        ClipForge · usage réservé à tes propres contenus et aux contenus dont tu as les droits.
      </footer>
    </main>
  );
}

function useJobRunner() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  async function poll(id: string) {
    setStatus("processing");
    for (let i = 0; i < 150; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const res = await fetch(`/api/jobs/${id}`);
      const j = await res.json();
      if (j.status === "done") {
        setDownloadUrl(j.downloadUrl);
        setStatus("done");
        return;
      }
      if (j.status === "error") {
        setError(j.error || "Le traitement a échoué.");
        setStatus("error");
        return;
      }
    }
    setError("Délai dépassé.");
    setStatus("error");
  }

  function reset() {
    setStatus("idle");
    setError(null);
    setDownloadUrl(null);
  }

  return { status, setStatus, error, setError, downloadUrl, poll, reset };
}

function UrlTool({ type, placeholder }: { type: "tiktok" | "instagram"; placeholder: string }) {
  const [url, setUrl] = useState("");
  const { status, setStatus, error, setError, downloadUrl, poll, reset } = useJobRunner();

  async function run() {
    reset();
    setStatus("processing");
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, params: { url } }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      await poll(j.id);
    } catch (e: any) {
      setError(e.message);
      setStatus("error");
    }
  }

  return (
    <div className="space-y-4">
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-brand"
      />
      <RunButton disabled={!url || status === "processing"} onClick={run} status={status} />
      <Result status={status} error={error} downloadUrl={downloadUrl} />
    </div>
  );
}

const CAPTION_PRESETS = [
  "Nouveau 🔥",
  "Dispo maintenant 💌",
  "Lien en bio 👆",
  "Ne rate pas ça 👀",
];
const HASHTAG_SET = "#fyp #viral #foryou #trending #pourtoi";

const FORMATS: { key: string; label: string }[] = [
  { key: "original", label: "Original" },
  { key: "9:16", label: "9:16" },
  { key: "4:5", label: "4:5" },
  { key: "1:1", label: "1:1" },
];

// Cibles du "Pack réseaux" : une vidéo déclinée sur tous les formats d'un coup.
const PACK_TARGETS: { key: string; label: string }[] = [
  { key: "9:16", label: "9:16 · Reels / TikTok / Stories" },
  { key: "4:5", label: "4:5 · Feed portrait Insta" },
  { key: "1:1", label: "1:1 · Feed carré" },
];

type JobResult = {
  key: string;
  label: string;
  status: "processing" | "done" | "error";
  url?: string;
  error?: string;
};

function VideoTool({ tool }: { tool: "caption" | "uniquify" | "subtitles" }) {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [position, setPosition] = useState("bottom");
  const [format, setFormat] = useState("original");
  const [watermark, setWatermark] = useState("");
  const [trimStart, setTrimStart] = useState("");
  const [trimEnd, setTrimEnd] = useState("");
  const [flip, setFlip] = useState(false);
  const [pack, setPack] = useState(false);
  const [busy, setBusy] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [results, setResults] = useState<JobResult[]>([]);

  function addToCaption(txt: string) {
    setCaption((c) => (c.trim() ? c.trim() + " " + txt : txt));
  }

  async function pollJob(id: string): Promise<string> {
    for (let i = 0; i < 150; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const res = await fetch(`/api/jobs/${id}`);
      const j = await res.json();
      if (j.status === "done") return j.downloadUrl as string;
      if (j.status === "error") throw new Error(j.error || "Le traitement a échoué.");
    }
    throw new Error("Délai dépassé.");
  }

  async function runOne(target: { key: string }, base: any): Promise<string> {
    const params = { ...base };
    if (target.key !== "original") params.format = target.key;
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: tool, params }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error);
    const put = await fetch(j.uploadUrl, {
      method: "PUT",
      headers: { "content-type": "video/mp4" },
      body: file!,
    });
    if (!put.ok) throw new Error("Échec de l'upload");
    await fetch(`/api/jobs/${j.id}/start`, { method: "POST" });
    return pollJob(j.id);
  }

  async function run() {
    if (!file) return;
    setGlobalError(null);
    setBusy(true);

    const ns = parseFloat(trimStart);
    const ne = parseFloat(trimEnd);
    if (Number.isFinite(ns) && Number.isFinite(ne) && ne <= ns) {
      setGlobalError("La fin de découpe doit être après le début.");
      setBusy(false);
      return;
    }

    const base: any = { watermark: watermark.trim() || undefined };
    if (Number.isFinite(ns) && ns > 0) base.trimStart = ns;
    if (Number.isFinite(ne) && ne > 0) base.trimEnd = ne;
    if (tool === "caption") {
      base.caption = caption;
      base.position = position;
    } else if (tool === "uniquify") {
      base.level = "light";
      if (flip) base.flip = true;
    } else {
      // subtitles : la transcription est automatique, on ne passe que la position.
      base.position = position;
    }

    const targets = pack
      ? PACK_TARGETS
      : [{ key: format, label: format === "original" ? "Original" : format }];

    setResults(targets.map((t) => ({ key: t.key, label: t.label, status: "processing" })));

    await Promise.all(
      targets.map(async (t) => {
        try {
          const url = await runOne(t, base);
          setResults((rs) => rs.map((r) => (r.key === t.key ? { ...r, status: "done", url } : r)));
        } catch (e: any) {
          setResults((rs) =>
            rs.map((r) => (r.key === t.key ? { ...r, status: "error", error: e.message } : r))
          );
        }
      })
    );
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <label className="block cursor-pointer rounded-lg border border-dashed border-white/20 bg-black/20 px-4 py-8 text-center hover:border-brand">
        <input
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        {file ? (
          <span className="text-sm text-zinc-200">{file.name}</span>
        ) : (
          <span className="text-sm text-zinc-500">Clique pour choisir une vidéo (mp4)</span>
        )}
      </label>

      {tool === "caption" && (
        <>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Ta légende…"
            rows={2}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-brand"
          />
          <div className="flex flex-wrap gap-2">
            {CAPTION_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => addToCaption(p)}
                className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-300 hover:bg-white/10"
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => addToCaption(HASHTAG_SET)}
              className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-300 hover:bg-white/10"
            >
              # hashtags
            </button>
          </div>
          <div className="flex gap-2">
            {["top", "center", "bottom"].map((p) => (
              <button
                key={p}
                onClick={() => setPosition(p)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm ${
                  position === p ? "bg-brand text-white" : "bg-white/5 text-zinc-300"
                }`}
              >
                {p === "top" ? "Haut" : p === "center" ? "Centre" : "Bas"}
              </button>
            ))}
          </div>
        </>
      )}

      {tool === "uniquify" && (
        <button
          onClick={() => setFlip((v) => !v)}
          className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm ${
            flip ? "bg-brand text-white" : "bg-white/5 text-zinc-300"
          }`}
        >
          <span>🪞 Miroir horizontal (booste l'unicité)</span>
          <span>{flip ? "activé" : "désactivé"}</span>
        </button>
      )}

      {tool === "subtitles" && (
        <div>
          <p className="mb-1 text-xs text-zinc-500">
            Position des sous-titres — la transcription est automatique.
          </p>
          <div className="flex gap-2">
            {["top", "center", "bottom"].map((p) => (
              <button
                key={p}
                onClick={() => setPosition(p)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm ${
                  position === p ? "bg-brand text-white" : "bg-white/5 text-zinc-300"
                }`}
              >
                {p === "top" ? "Haut" : p === "center" ? "Centre" : "Bas"}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-1 text-xs text-zinc-500">Découpe (optionnel, en secondes)</p>
        <div className="flex gap-2">
          <input
            value={trimStart}
            onChange={(e) => setTrimStart(e.target.value)}
            inputMode="decimal"
            placeholder="Début (ex : 3)"
            className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-2 text-sm outline-none focus:border-brand"
          />
          <input
            value={trimEnd}
            onChange={(e) => setTrimEnd(e.target.value)}
            inputMode="decimal"
            placeholder="Fin (ex : 18)"
            className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-2 text-sm outline-none focus:border-brand"
          />
        </div>
      </div>

      <button
        onClick={() => setPack((v) => !v)}
        className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm ${
          pack ? "bg-brand text-white" : "bg-white/5 text-zinc-300"
        }`}
      >
        <span>📦 Pack réseaux — génère 9:16, 4:5 et 1:1 d'un coup</span>
        <span>{pack ? "activé" : "désactivé"}</span>
      </button>

      <div className={pack ? "pointer-events-none opacity-40" : ""}>
        <p className="mb-1 text-xs text-zinc-500">
          {pack ? "Format d'export (géré par le Pack)" : "Format d'export"}
        </p>
        <div className="flex gap-2">
          {FORMATS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFormat(f.key)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm ${
                format === f.key && !pack ? "bg-brand text-white" : "bg-white/5 text-zinc-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <input
        value={watermark}
        onChange={(e) => setWatermark(e.target.value)}
        placeholder="Filigrane @pseudo (optionnel)"
        className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-brand"
      />

      <RunButton
        disabled={!file || busy}
        onClick={run}
        status={busy ? "processing" : "idle"}
        label={pack ? "Générer le pack" : "Lancer"}
      />
      <ResultsList results={results} globalError={globalError} />
    </div>
  );
}

function RunButton({
  disabled,
  onClick,
  status,
  label,
}: {
  disabled: boolean;
  onClick: () => void;
  status: Status;
  label?: string;
}) {
  const text =
    status === "uploading"
      ? "Envoi…"
      : status === "processing"
      ? "Traitement…"
      : label || "Lancer";
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="w-full rounded-lg bg-brand px-4 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
    >
      {text}
    </button>
  );
}

function ResultsList({
  results,
  globalError,
}: {
  results: JobResult[];
  globalError: string | null;
}) {
  if (globalError)
    return <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">⚠️ {globalError}</p>;
  if (!results.length) return null;
  const anyProcessing = results.some((r) => r.status === "processing");
  return (
    <div className="space-y-2">
      {anyProcessing && (
        <p className="text-center text-sm text-zinc-400">⏳ Un instant, on prépare tes vidéos…</p>
      )}
      {results.map((r) => (
        <div
          key={r.key}
          className="flex items-center justify-between rounded-lg bg-black/20 px-4 py-3 text-sm"
        >
          <span className="text-zinc-300">{r.label}</span>
          {r.status === "processing" && <span className="text-zinc-500">⏳ traitement…</span>}
          {r.status === "error" && <span className="text-red-300">⚠️ {r.error}</span>}
          {r.status === "done" && r.url && (
            <a
              href={r.url}
              download
              className="font-semibold text-emerald-300 hover:text-emerald-200"
            >
              ✅ télécharger
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function Result({
  status,
  error,
  downloadUrl,
}: {
  status: Status;
  error: string | null;
  downloadUrl: string | null;
}) {
  if (status === "error")
    return <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">⚠️ {error}</p>;
  if (status === "done" && downloadUrl)
    return (
      <a
        href={downloadUrl}
        className="block rounded-lg bg-emerald-500/15 px-4 py-3 text-center text-sm font-semibold text-emerald-300 hover:bg-emerald-500/25"
        download
      >
        ✅ Prêt — télécharger la vidéo
      </a>
    );
  if (status === "processing" || status === "uploading")
    return (
      <p className="text-center text-sm text-zinc-400">
        ⏳ Un instant, on prépare ta vidéo…
      </p>
    );
  return null;
}

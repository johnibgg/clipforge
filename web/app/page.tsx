"use client";

import { useEffect, useState } from "react";

type Tool = "tiktok" | "instagram" | "caption" | "uniquify" | "subtitles" | "profile" | "edit" | "history";
type Status = "idle" | "uploading" | "processing" | "done" | "error";

type VideoMeta = {
  caption?: string;
  author?: string;
  authorUrl?: string;
  sourceUrl?: string;
};

const TABS: { key: Tool; label: string; emoji: string; desc: string }[] = [
  { key: "tiktok", label: "TikTok HD", emoji: "⬇️", desc: "Colle un lien TikTok → vidéo HD sans watermark." },
  { key: "instagram", label: "Reels IG", emoji: "📸", desc: "Colle un lien de Reel Instagram → vidéo HD téléchargée." },
  { key: "profile", label: "Compte", emoji: "👤", desc: "Colle un lien de compte TikTok ou Instagram → choisis les vidéos à télécharger." },
  { key: "caption", label: "Légende", emoji: "✍️", desc: "Upload une vidéo + une légende → rendu propre." },
  { key: "uniquify", label: "Rendre unique", emoji: "🌀", desc: "Même vidéo, empreinte différente pour le repost." },
  { key: "subtitles", label: "Sous-titres", emoji: "💬", desc: "Transcription auto de la voix → sous-titres incrustés." },
  { key: "edit", label: "Éditer", emoji: "🎬", desc: "Plusieurs vidéos + une légende chacune → versions éditées HD (uniques, prêtes à poster)." },
  // Onglet "Historique" retiré du menu (il montrait les téléchargements de tous
  // les visiteurs). Le composant HistoryTool et l'API GET /api/jobs restent en
  // place pour un usage futur (ex : historique privé par compte).
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
        ) : tab === "profile" ? (
          <ProfileTool key={tab} />
        ) : tab === "edit" ? (
          <EditTool key={tab} />
        ) : tab === "history" ? (
          <HistoryTool key={tab} />
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
  const [meta, setMeta] = useState<VideoMeta | null>(null);

  async function poll(id: string) {
    setStatus("processing");
    for (let i = 0; i < 150; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const res = await fetch(`/api/jobs/${id}`);
      const j = await res.json();
      if (j.status === "done") {
        setDownloadUrl(j.downloadUrl);
        setMeta(j.meta || null);
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
    setMeta(null);
  }

  return { status, setStatus, error, setError, downloadUrl, meta, poll, reset };
}

function UrlTool({ type, placeholder }: { type: "tiktok" | "instagram"; placeholder: string }) {
  const [url, setUrl] = useState("");
  const [submittedUrl, setSubmittedUrl] = useState("");
  const { status, setStatus, error, setError, downloadUrl, meta, poll, reset } = useJobRunner();

  async function run() {
    reset();
    setSubmittedUrl(url);
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
      {status === "done" && <MetaCard meta={meta} />}
      {status === "done" && meta?.authorUrl && (
        <AuthorVideos
          key={submittedUrl}
          author={meta.author || ""}
          authorUrl={meta.authorUrl}
          excludeUrl={submittedUrl}
        />
      )}
    </div>
  );
}

// Après un téléchargement par lien : liste les autres vidéos du même compte,
// avec sélection multiple pour un téléchargement en masse.
function AuthorVideos({
  author,
  authorUrl,
  excludeUrl,
}: {
  author: string;
  authorUrl: string;
  excludeUrl: string;
}) {
  const [state, setState] = useState<"loading" | "done" | "failed">("loading");
  const [videos, setVideos] = useState<ProfileVideo[]>([]);

  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const res = await fetch("/api/jobs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type: "profile", params: { url: authorUrl } }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error);
        for (let i = 0; i < 60; i++) {
          await new Promise((r) => setTimeout(r, 2500));
          if (stop) return;
          const d = await (await fetch(`/api/jobs/${j.id}`)).json();
          if (d.status === "done") {
            const vids: ProfileVideo[] = (d.meta?.videos || []).filter(
              (v: ProfileVideo) => v.url !== excludeUrl && !(v.id && excludeUrl.includes(v.id))
            );
            if (!stop) {
              setVideos(vids);
              setState("done");
            }
            return;
          }
          if (d.status === "error") throw new Error(d.error);
        }
        throw new Error("timeout");
      } catch {
        if (!stop) setState("failed");
      }
    })();
    return () => {
      stop = true;
    };
  }, [authorUrl, excludeUrl]);

  if (state === "failed") return null;
  if (state === "loading")
    return (
      <p className="text-center text-sm text-zinc-500">
        ⏳ On regarde les autres vidéos {author ? `de ${author}` : "du compte"}…
      </p>
    );
  if (!videos.length) return null;
  return (
    <div className="space-y-2 border-t border-white/10 pt-4">
      <p className="text-sm font-semibold text-zinc-300">
        🎯 Les autres vidéos {author ? `de ${author}` : "du compte"} — coche et télécharge en
        masse :
      </p>
      <ProfileVideos videos={videos} />
    </div>
  );
}

// Carte affichée après un téléchargement : légende d'origine + liens de l'auteur.
function MetaCard({ meta }: { meta: VideoMeta | null }) {
  const [copied, setCopied] = useState(false);
  if (!meta || (!meta.caption && !meta.author)) return null;

  function copy() {
    navigator.clipboard.writeText(meta?.caption || "").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="space-y-2 rounded-lg bg-black/20 px-4 py-3 text-sm">
      {meta.author && (
        <p className="text-zinc-300">
          👤{" "}
          {meta.authorUrl ? (
            <a
              href={meta.authorUrl}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-emerald-300 hover:underline"
            >
              {meta.author}
            </a>
          ) : (
            <span className="font-semibold">{meta.author}</span>
          )}
          {meta.sourceUrl && (
            <>
              {" · "}
              <a
                href={meta.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-zinc-400 hover:underline"
              >
                voir la publication
              </a>
            </>
          )}
        </p>
      )}
      {meta.caption && (
        <>
          <p className="whitespace-pre-wrap break-words text-zinc-400">{meta.caption}</p>
          <button
            onClick={copy}
            className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-300 hover:bg-white/10"
          >
            {copied ? "✅ copiée !" : "📋 Copier la légende"}
          </button>
        </>
      )}
    </div>
  );
}

// ---- Compte : liste les vidéos d'un profil TikTok/Instagram à télécharger ----

type ProfileVideo = { url: string; id: string; title: string; thumbnail: string };

function ProfileTool() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [author, setAuthor] = useState("");
  const [authorUrl, setAuthorUrl] = useState("");
  const [videos, setVideos] = useState<ProfileVideo[]>([]);

  async function run() {
    setBusy(true);
    setError(null);
    setVideos([]);
    setAuthor("");
    setAuthorUrl("");
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "profile", params: { url } }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      for (let i = 0; i < 90; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const d = await (await fetch(`/api/jobs/${j.id}`)).json();
        if (d.status === "done") {
          const m = d.meta || {};
          const vids: ProfileVideo[] = Array.isArray(m.videos) ? m.videos : [];
          setAuthor(m.author || "");
          setAuthorUrl(m.authorUrl || "");
          setVideos(vids);
          if (!vids.length)
            setError(
              "Aucune vidéo trouvée — compte privé, ou la plateforme bloque le listing. Réessaie, ou colle directement le lien d'une vidéo."
            );
          setBusy(false);
          return;
        }
        if (d.status === "error") throw new Error(d.error || "Le listing a échoué.");
      }
      throw new Error("Délai dépassé.");
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://www.tiktok.com/@compte  ou  https://www.instagram.com/compte/"
        className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-brand"
      />
      <RunButton
        disabled={!url || busy}
        onClick={run}
        status={busy ? "processing" : "idle"}
        label="Lister les vidéos"
      />
      {busy && (
        <p className="text-center text-sm text-zinc-400">
          ⏳ Un instant, on récupère les vidéos du compte…
        </p>
      )}
      {error && (
        <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">⚠️ {error}</p>
      )}
      {author && (
        <p className="text-sm text-zinc-300">
          👤{" "}
          {authorUrl ? (
            <a
              href={authorUrl}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-emerald-300 hover:underline"
            >
              {author}
            </a>
          ) : (
            <span className="font-semibold">{author}</span>
          )}
          {videos.length > 0 && (
            <span className="text-zinc-500"> · {videos.length} vidéo(s)</span>
          )}
        </p>
      )}
      {videos.length > 0 && <ProfileVideos videos={videos} />}
    </div>
  );
}

// ---- Liste de vidéos : sélection multiple + téléchargement en masse ----

type DlState = { st: "waiting" | "processing" | "done" | "error"; url?: string; err?: string };

function ProfileVideos({ videos }: { videos: ProfileVideo[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dl, setDl] = useState<Record<string, DlState>>({});
  const [running, setRunning] = useState(false);

  const allSelected = videos.length > 0 && selected.size === videos.length;

  function toggle(u: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(u)) n.delete(u);
      else n.add(u);
      return n;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(videos.map((v) => v.url)));
  }

  function setOne(u: string, s: DlState) {
    setDl((m) => ({ ...m, [u]: s }));
  }

  async function downloadOne(v: ProfileVideo) {
    setOne(v.url, { st: "processing" });
    try {
      const type = v.url.includes("instagram.") ? "instagram" : "tiktok";
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, params: { url: v.url } }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      for (let i = 0; i < 240; i++) {
        await new Promise((r) => setTimeout(r, 2500));
        const d = await (await fetch(`/api/jobs/${j.id}`)).json();
        if (d.status === "done") {
          setOne(v.url, { st: "done", url: d.downloadUrl });
          return;
        }
        if (d.status === "error") throw new Error(d.error || "Le téléchargement a échoué.");
      }
      throw new Error("Délai dépassé.");
    } catch (e: any) {
      setOne(v.url, { st: "error", err: e.message });
    }
  }

  // Téléchargement en masse : 2 suivis à la fois côté client, le worker
  // traite un par un derrière — chaque vidéo s'affiche dès qu'elle est prête.
  async function bulk() {
    const list = videos.filter((v) => selected.has(v.url) && dl[v.url]?.st !== "done");
    if (!list.length) return;
    setRunning(true);
    setDl((m) => {
      const n = { ...m };
      for (const v of list) n[v.url] = { st: "waiting" };
      return n;
    });
    let i = 0;
    await Promise.all(
      Array.from({ length: Math.min(2, list.length) }, async () => {
        while (i < list.length) {
          const v = list[i++];
          await downloadOne(v);
        }
      })
    );
    setRunning(false);
  }

  const doneCount = videos.filter((v) => dl[v.url]?.st === "done").length;
  const pending = videos.filter((v) => selected.has(v.url) && dl[v.url]?.st !== "done").length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={toggleAll}
          className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-300 hover:bg-white/10"
        >
          {allSelected ? "Tout désélectionner" : "☑️ Tout sélectionner"}
        </button>
        <button
          onClick={bulk}
          disabled={running || pending === 0}
          className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running
            ? `⏳ Téléchargement en masse… (${doneCount} prêt${doneCount > 1 ? "es" : "e"})`
            : `📥 Télécharger la sélection (${pending})`}
        </button>
      </div>
      {doneCount > 0 && (
        <p className="text-xs text-zinc-500">
          ✅ {doneCount} vidéo{doneCount > 1 ? "s" : ""} prête{doneCount > 1 ? "s" : ""} — clique
          « enregistrer » sur chaque ligne.
        </p>
      )}
      <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
        {videos.map((v) => (
          <ProfileVideoRow
            key={v.url}
            v={v}
            checked={selected.has(v.url)}
            onToggle={() => toggle(v.url)}
            state={dl[v.url]}
            onDownload={() => downloadOne(v)}
            busy={running}
          />
        ))}
      </div>
    </div>
  );
}

function ProfileVideoRow({
  v,
  checked,
  onToggle,
  state,
  onDownload,
  busy,
}: {
  v: ProfileVideo;
  checked: boolean;
  onToggle: () => void;
  state?: DlState;
  onDownload: () => void;
  busy: boolean;
}) {
  const st = state?.st;
  return (
    <div className="flex items-center gap-3 rounded-lg bg-black/20 px-3 py-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4 shrink-0 accent-emerald-500"
      />
      {v.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={v.thumbnail}
          alt=""
          className="h-12 w-9 rounded object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <span className="flex h-12 w-9 items-center justify-center rounded bg-white/5">🎬</span>
      )}
      <span className="min-w-0 flex-1 truncate text-zinc-300">{v.title || v.id || "Vidéo"}</span>
      {!st && (
        <button
          onClick={onDownload}
          disabled={busy}
          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          Télécharger
        </button>
      )}
      {st === "waiting" && <span className="text-xs text-zinc-500">🕐 en file…</span>}
      {st === "processing" && <span className="text-xs text-zinc-500">⏳ en cours…</span>}
      {st === "error" && (
        <button
          onClick={onDownload}
          title={state?.err || ""}
          className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/30"
        >
          ⚠️ réessayer
        </button>
      )}
      {st === "done" && state?.url && (
        <a
          href={state.url}
          download
          className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
        >
          ✅ enregistrer
        </a>
      )}
    </div>
  );
}

// ---- Historique : téléchargements passés + légendes + liens auteurs ----

type HistoryItem = {
  id: string;
  type: string;
  url: string;
  caption: string;
  author: string;
  authorUrl: string;
  createdAt: string;
};

function HistoryTool() {
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((j) => setItems(j.items || []))
      .catch(() => setError("Impossible de charger l'historique."));
  }, []);

  if (error)
    return <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">⚠️ {error}</p>;
  if (items === null)
    return <p className="text-center text-sm text-zinc-400">⏳ Chargement de l'historique…</p>;
  if (!items.length)
    return (
      <p className="text-center text-sm text-zinc-500">
        Aucun téléchargement pour l'instant — passe par TikTok HD ou Reels IG, puis reviens ici.
      </p>
    );

  return (
    <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
      {items.map((it) => (
        <HistoryRow key={it.id} it={it} />
      ))}
    </div>
  );
}

function HistoryRow({ it }: { it: HistoryItem }) {
  const [dl, setDl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function getLink() {
    setBusy(true);
    try {
      const d = await (await fetch(`/api/jobs/${it.id}`)).json();
      setDl(d.downloadUrl || null);
    } catch {}
    setBusy(false);
  }

  function copy() {
    navigator.clipboard.writeText(it.caption).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const date = new Date(it.createdAt);
  const dateTxt = isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) +
      " " +
      date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-1.5 rounded-lg bg-black/20 px-4 py-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-zinc-300">
          {it.type === "instagram" ? "📸" : "⬇️"}{" "}
          {it.author ? (
            it.authorUrl ? (
              <a
                href={it.authorUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-emerald-300 hover:underline"
              >
                {it.author}
              </a>
            ) : (
              <span className="font-semibold">{it.author}</span>
            )
          ) : (
            <span className="text-zinc-500">auteur inconnu</span>
          )}
          {dateTxt && <span className="text-xs text-zinc-600"> · {dateTxt}</span>}
        </span>
        {dl ? (
          <a
            href={dl}
            download
            className="shrink-0 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
          >
            ✅ enregistrer
          </a>
        ) : (
          <button
            onClick={getLink}
            disabled={busy}
            className="shrink-0 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10 disabled:opacity-50"
          >
            {busy ? "⏳…" : "⬇️ re-télécharger"}
          </button>
        )}
      </div>
      {it.url && (
        <a
          href={it.url}
          target="_blank"
          rel="noreferrer"
          className="block truncate text-xs text-zinc-500 hover:text-zinc-300 hover:underline"
        >
          🔗 {it.url}
        </a>
      )}
      {it.caption && (
        <div className="flex items-start gap-2">
          <p className="line-clamp-2 min-w-0 flex-1 whitespace-pre-wrap break-words text-xs text-zinc-400">
            {it.caption}
          </p>
          <button
            onClick={copy}
            className="shrink-0 rounded-full bg-white/5 px-2 py-1 text-[10px] text-zinc-300 hover:bg-white/10"
          >
            {copied ? "✅" : "📋 copier"}
          </button>
        </div>
      )}
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

// ---- Éditer : lot de vidéos, chacune uniquisée + légende incrustée (façon bot drive), HD ----

type EditItem = {
  id: number;
  mode: "file" | "link";
  file: File | null;
  url: string;
  caption: string;
  status: "idle" | "processing" | "done" | "error";
  downloadUrl?: string;
  error?: string;
};

let editSeq = 0;
function newEditItem(): EditItem {
  return { id: ++editSeq, mode: "file", file: null, url: "", caption: "", status: "idle" };
}

function EditTool() {
  const [items, setItems] = useState<EditItem[]>([newEditItem()]);
  const [format, setFormat] = useState("original");
  const [busy, setBusy] = useState(false);

  function update(id: number, patch: Partial<EditItem>) {
    setItems((its) => its.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((its) => [...its, newEditItem()]);
  }
  function removeItem(id: number) {
    setItems((its) => (its.length > 1 ? its.filter((it) => it.id !== id) : its));
  }
  function ready(it: EditItem) {
    return it.mode === "file" ? !!it.file : it.url.trim().length > 5;
  }

  async function pollEdit(jobId: string): Promise<string> {
    // Édition HD pleine durée + file d'attente : on laisse jusqu'à ~15 min.
    for (let i = 0; i < 300; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const j = await (await fetch(`/api/jobs/${jobId}`)).json();
      if (j.status === "done") return j.downloadUrl as string;
      if (j.status === "error") throw new Error(j.error || "Le traitement a échoué.");
    }
    throw new Error("Délai dépassé.");
  }

  async function processItem(it: EditItem): Promise<string> {
    const fmt = format !== "original" ? format : undefined;
    if (it.mode === "link") {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "edit",
          params: { url: it.url.trim(), caption: it.caption, format: fmt },
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      return pollEdit(j.id);
    }
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "edit", params: { caption: it.caption, format: fmt } }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error);
    const put = await fetch(j.uploadUrl, {
      method: "PUT",
      headers: { "content-type": "video/mp4" },
      body: it.file!,
    });
    if (!put.ok) throw new Error("Échec de l'upload");
    await fetch(`/api/jobs/${j.id}/start`, { method: "POST" });
    return pollEdit(j.id);
  }

  async function run() {
    const todo = items.filter((it) => ready(it) && it.status !== "done");
    if (!todo.length) return;
    setBusy(true);
    setItems((its) =>
      its.map((it) =>
        todo.find((t) => t.id === it.id) ? { ...it, status: "processing", error: undefined } : it
      )
    );
    // 2 suivis à la fois côté client ; le worker traite un par un derrière.
    let i = 0;
    await Promise.all(
      Array.from({ length: Math.min(2, todo.length) }, async () => {
        while (i < todo.length) {
          const it = todo[i++];
          try {
            const url = await processItem(it);
            update(it.id, { status: "done", downloadUrl: url });
          } catch (e: any) {
            update(it.id, { status: "error", error: e.message });
          }
        }
      })
    );
    setBusy(false);
  }

  const doneCount = items.filter((it) => it.status === "done").length;
  const readyCount = items.filter((it) => ready(it) && it.status !== "done").length;

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-black/20 px-4 py-3 text-xs text-zinc-400">
        🎬 Chaque vidéo est <b className="text-zinc-200">rendue unique</b> (recadrage, teinte et
        vitesse imperceptibles, métadonnées effacées) et reçoit sa{" "}
        <b className="text-zinc-200">légende incrustée</b> au centre — sortie HD, prête à reposter.
        Ajoute autant de vidéos que tu veux, une légende par vidéo.
      </div>

      <div className="space-y-3">
        {items.map((it, idx) => (
          <EditRow
            key={it.id}
            index={idx + 1}
            item={it}
            onChange={(patch) => update(it.id, patch)}
            onRemove={() => removeItem(it.id)}
            canRemove={items.length > 1}
            busy={busy}
          />
        ))}
      </div>

      <button
        onClick={addItem}
        disabled={busy}
        className="w-full rounded-lg border border-dashed border-white/20 bg-black/10 px-4 py-2.5 text-sm text-zinc-300 hover:border-brand disabled:opacity-50"
      >
        ➕ Ajouter une vidéo
      </button>

      <div>
        <p className="mb-1 text-xs text-zinc-500">Format d'export (toutes les vidéos)</p>
        <div className="flex gap-2">
          {FORMATS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFormat(f.key)}
              disabled={busy}
              className={`flex-1 rounded-lg px-3 py-2 text-sm ${
                format === f.key ? "bg-brand text-white" : "bg-white/5 text-zinc-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <RunButton
        disabled={busy || readyCount === 0}
        onClick={run}
        status={busy ? "processing" : "idle"}
        label={readyCount > 1 ? `Éditer ${readyCount} vidéos` : "Éditer la vidéo"}
      />
      {busy && (
        <p className="text-center text-sm text-zinc-400">
          ⏳ Édition en cours — les vidéos s'affichent au fur et à mesure…
        </p>
      )}
      {doneCount > 0 && (
        <p className="text-xs text-zinc-500">
          ✅ {doneCount} vidéo{doneCount > 1 ? "s" : ""} prête{doneCount > 1 ? "s" : ""} — clique
          « télécharger » sur chaque ligne.
        </p>
      )}
    </div>
  );
}

function EditRow({
  index,
  item,
  onChange,
  onRemove,
  canRemove,
  busy,
}: {
  index: number;
  item: EditItem;
  onChange: (patch: Partial<EditItem>) => void;
  onRemove: () => void;
  canRemove: boolean;
  busy: boolean;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-400">Vidéo {index}</span>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg bg-white/5 text-xs">
            {(["file", "link"] as const).map((m) => (
              <button
                key={m}
                disabled={busy}
                onClick={() => onChange({ mode: m })}
                className={`px-3 py-1 ${
                  item.mode === m ? "bg-brand text-white" : "text-zinc-300"
                }`}
              >
                {m === "file" ? "📁 Fichier" : "🔗 Lien"}
              </button>
            ))}
          </div>
          {canRemove && (
            <button
              onClick={onRemove}
              disabled={busy}
              title="Retirer cette vidéo"
              className="rounded-lg bg-white/5 px-2 py-1 text-xs text-zinc-400 hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {item.mode === "file" ? (
        <label className="block cursor-pointer rounded-lg border border-dashed border-white/20 bg-black/20 px-4 py-4 text-center hover:border-brand">
          <input
            type="file"
            accept="video/*"
            className="hidden"
            disabled={busy}
            onChange={(e) => onChange({ file: e.target.files?.[0] || null })}
          />
          <span className="text-sm text-zinc-300">
            {item.file ? item.file.name : "Choisir une vidéo (mp4)"}
          </span>
        </label>
      ) : (
        <input
          value={item.url}
          disabled={busy}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="https://www.instagram.com/reel/…  ou lien TikTok"
          className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-2.5 text-sm outline-none focus:border-brand"
        />
      )}

      <textarea
        value={item.caption}
        disabled={busy}
        onChange={(e) => onChange({ caption: e.target.value })}
        placeholder="Légende de cette vidéo (incrustée au centre)…"
        rows={2}
        className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-2.5 text-sm outline-none focus:border-brand"
      />

      {item.status === "processing" && (
        <p className="text-xs text-zinc-500">⏳ édition en cours…</p>
      )}
      {item.status === "error" && <p className="text-xs text-red-300">⚠️ {item.error}</p>}
      {item.status === "done" && item.downloadUrl && (
        <a
          href={item.downloadUrl}
          download
          className="inline-block rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
        >
          ✅ télécharger
        </a>
      )}
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

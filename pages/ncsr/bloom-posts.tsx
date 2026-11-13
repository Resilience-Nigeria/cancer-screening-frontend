import React, { useEffect, useRef, useState } from "react";
import { Button } from "@roketid/windmill-react-ui";
import { Loader2, Plus, Send, Pencil, Trash2, EyeOff, Megaphone, Newspaper, Smartphone, Pin, Search, ImagePlus, X } from "lucide-react";
import toast from "react-hot-toast";

import Layout from "../containers/Layout";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";
import { friendlyError } from "../../lib/apiError";

type Post = {
  id: number;
  kind: "article" | "announcement";
  title: string;
  summary: string | null;
  body: string | null;
  coverUrl: string | null;
  linkUrl: string | null;
  pinned: boolean;
  publishedAt: string | null;
  status: "draft" | "published";
  audience: "all" | "women" | "chw";
  state: string | null;
  pushedAt: string | null;
  pushCount: number;
  updatedAt: string | null;
};

type Summary = { published: number; draft: number; phones: number; phonesWomen: number; phonesChw: number };

const AUDIENCE: Record<Post["audience"], string> = { all: "Everyone", women: "Women", chw: "Health workers" };
const STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun",
  "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];
const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

type Form = {
  id: number | null;
  kind: Post["kind"];
  title: string;
  summary: string;
  body: string;
  audience: Post["audience"];
  state: string;
  linkUrl: string;
  pinned: boolean;
  cover: File | null;
  coverPreview: string | null;
  removeCover: boolean;
};
const EMPTY: Form = { id: null, kind: "article", title: "", summary: "", body: "", audience: "all", state: "", linkUrl: "", pinned: false, cover: null, coverPreview: null, removeCover: false };

const input =
  "w-full rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-green-600";

/**
 * Articles and announcements for the Bloom app. Choose who sees each one (women, health workers or both; health
 * worker posts can be limited to one state), publish it, and optionally send it to their phones as a notification.
 */
export default function BloomPostsPage() {
  const [tab, setTab] = useState<"all" | "published" | "draft">("all");
  const [rows, setRows] = useState<Post[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState<{ post: Post; notify: boolean; resend?: boolean } | null>(null);
  const [deleting, setDeleting] = useState<Post | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load(t = tab, s = term) {
    setLoading(true);
    try {
      const { data } = await api.get("/bloom-admin/posts", { params: { status: t, search: s || undefined } });
      setRows(data.data ?? []);
      setSummary(data.summary ?? null);
      setDenied(false);
    } catch (e: any) {
      if (e?.response?.status === 403) setDenied(true);
      else toast.error(friendlyError(e, "Could not load articles."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(tab, term);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, term]);

  useEffect(() => {
    const t = setTimeout(() => setTerm(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const openNew = (kind: Post["kind"]) => setForm({ ...EMPTY, kind });
  const openEdit = (p: Post) =>
    setForm({
      id: p.id,
      kind: p.kind,
      title: p.title,
      summary: p.summary ?? "",
      body: p.body ?? "",
      audience: p.audience,
      state: p.state ?? "",
      linkUrl: p.linkUrl ?? "",
      pinned: p.pinned,
      cover: null,
      coverPreview: p.coverUrl,
      removeCover: false,
    });

  function pickCover(file: File | undefined) {
    if (!form || !file) return;
    if (file.size > 3 * 1024 * 1024) return toast.error("The picture must be 3 MB or smaller.");
    setForm({ ...form, cover: file, coverPreview: URL.createObjectURL(file), removeCover: false });
  }

  /** Saves the form; returns the saved post. */
  async function save(): Promise<Post | null> {
    if (!form) return null;
    if (form.title.trim().length < 3) {
      toast.error("Give it a title.");
      return null;
    }
    if (form.kind === "article" && form.body.trim().length < 20) {
      toast.error("Write the article text (at least a few sentences).");
      return null;
    }
    const fd = new FormData();
    fd.append("kind", form.kind);
    fd.append("title", form.title.trim());
    fd.append("summary", form.summary.trim());
    fd.append("body", form.body);
    fd.append("audience", form.audience);
    fd.append("state", form.audience === "women" ? "" : form.state);
    fd.append("linkUrl", form.linkUrl.trim());
    fd.append("pinned", form.pinned ? "1" : "0");
    if (form.cover) fd.append("cover", form.cover);
    if (form.removeCover) fd.append("removeCover", "1");

    setSaving(true);
    try {
      const url = form.id ? `/bloom-admin/posts/${form.id}` : "/bloom-admin/posts";
      const { data } = await api.post(url, fd, { headers: { "Content-Type": "multipart/form-data" } });
      return data.data as Post;
    } catch (e) {
      toast.error(friendlyError(e, "Could not save."));
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function saveDraft() {
    const p = await save();
    if (!p) return;
    toast.success(p.status === "published" ? "Saved. The app shows the new version." : "Saved as a draft.");
    setForm(null);
    load();
  }

  async function saveAndPublish() {
    const p = await save();
    if (!p) return;
    setForm(null);
    setPublishing({ post: p, notify: true });
    load();
  }

  async function confirmPublish() {
    if (!publishing) return;
    const { post, notify, resend } = publishing;
    setBusyId(post.id);
    try {
      const { data } = resend
        ? await api.post(`/bloom-admin/posts/${post.id}/notify`)
        : await api.post(`/bloom-admin/posts/${post.id}/publish`, { notify });
      toast.success(data?.message ?? "Done.");
      setPublishing(null);
      load();
    } catch (e) {
      toast.error(friendlyError(e, "Could not publish."));
    } finally {
      setBusyId(null);
    }
  }

  async function unpublish(p: Post) {
    setBusyId(p.id);
    try {
      const { data } = await api.post(`/bloom-admin/posts/${p.id}/unpublish`);
      toast.success(data?.message ?? "Unpublished.");
      load();
    } catch (e) {
      toast.error(friendlyError(e, "Could not unpublish."));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      await api.delete(`/bloom-admin/posts/${deleting.id}`);
      toast.success("Deleted.");
      setDeleting(null);
      load();
    } catch (e) {
      toast.error(friendlyError(e, "Could not delete."));
    } finally {
      setBusyId(null);
    }
  }

  const reach = (p: { audience: Post["audience"]; state: string | null }) => {
    if (!summary) return null;
    if (p.state) return `health workers in ${p.state}`;
    const n = p.audience === "women" ? summary.phonesWomen : p.audience === "chw" ? summary.phonesChw : summary.phones;
    return `${n} ${n === 1 ? "phone" : "phones"}`;
  };

  if (denied) {
    return (
      <Layout>
        <PageTitle>Bloom News &amp; Articles</PageTitle>
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-dashed border-gray-300 p-10 text-center text-gray-600">Only NICRAT admins can manage Bloom articles.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageTitle>Bloom News &amp; Articles</PageTitle>
      <p className="-mt-4 mb-5 text-sm text-gray-500">
        Write articles and announcements for the Bloom app. They show on the women&apos;s home screen and/or the health worker dashboard. When you publish,
        you can also send it to their phones as a notification (it shows on the lock screen).
      </p>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Published", value: summary.published },
            { label: "Drafts", value: summary.draft },
            { label: "Women's phones", value: summary.phonesWomen },
            { label: "Health workers' phones", value: summary.phonesChw },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4">
              <p className="text-xs text-gray-500">{c.label}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
        <div className="flex flex-wrap gap-2">
          {(["all", "published", "draft"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${
                tab === t ? "bg-green-700 border-green-700 text-white" : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
              }`}
            >
              {t === "all" ? "All" : t === "published" ? "Published" : "Drafts"}
            </button>
          ))}
        </div>
        <div className="relative md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search titles" className={`${input} rounded-full pl-9`} />
        </div>
        <div className="flex gap-2 md:ml-auto">
          <Button layout="outline" className="rounded-xl" onClick={() => openNew("announcement")}>
            <Megaphone className="w-4 h-4 mr-1" /> New announcement
          </Button>
          <Button className="rounded-xl bg-green-700 border-green-700 hover:bg-green-800" onClick={() => openNew("article")}>
            <Plus className="w-4 h-4 mr-1" /> New article
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-10 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center">
          <p className="font-semibold text-gray-700 dark:text-gray-200">{term ? "Nothing matches your search." : "No articles yet. Write the first one."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {rows.map((p) => (
            <div key={p.id} className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex">
              {p.coverUrl ? (
                <img src={p.coverUrl} alt="" className="w-28 sm:w-36 object-cover shrink-0 bg-gray-100" />
              ) : (
                <div className="w-28 sm:w-36 shrink-0 bg-green-50 dark:bg-gray-700 flex items-center justify-center">
                  {p.kind === "announcement" ? <Megaphone className="w-8 h-8 text-green-600" /> : <Newspaper className="w-8 h-8 text-green-600" />}
                </div>
              )}
              <div className="p-4 flex-1 min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${p.status === "published" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                    {p.status === "published" ? "Published" : "Draft"}
                  </span>
                  <span className="rounded-full px-2 py-0.5 bg-purple-50 text-purple-700 font-medium">{p.kind === "announcement" ? "Announcement" : "Article"}</span>
                  <span className="rounded-full px-2 py-0.5 bg-blue-50 text-blue-700 font-medium">
                    {AUDIENCE[p.audience]}
                    {p.state ? ` · ${p.state}` : ""}
                  </span>
                  {p.pinned && (
                    <span className="inline-flex items-center gap-0.5 text-amber-700">
                      <Pin className="w-3 h-3" /> Pinned
                    </span>
                  )}
                </div>
                <p className="font-semibold text-gray-800 dark:text-white break-words">{p.title}</p>
                {p.summary && <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 break-words">{p.summary}</p>}
                <p className="text-xs text-gray-400">
                  {p.status === "published" ? `Published ${fmt(p.publishedAt)}` : `Edited ${fmt(p.updatedAt)}`}
                  {p.pushedAt ? ` · Sent to phones ${fmt(p.pushedAt)}${p.pushCount > 1 ? ` (${p.pushCount}×)` : ""}` : ""}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="small" layout="outline" className="rounded-xl" onClick={() => openEdit(p)}>
                    <Pencil className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  {p.status === "draft" ? (
                    <Button size="small" className="rounded-xl bg-green-700 border-green-700 hover:bg-green-800" disabled={busyId === p.id} onClick={() => setPublishing({ post: p, notify: true })}>
                      <Send className="w-4 h-4 mr-1" /> Publish
                    </Button>
                  ) : (
                    <>
                      <Button size="small" layout="outline" className="rounded-xl" disabled={busyId === p.id} onClick={() => setPublishing({ post: p, notify: true, resend: true })}>
                        <Smartphone className="w-4 h-4 mr-1" /> {p.pushedAt ? "Send again" : "Send to phones"}
                      </Button>
                      <Button size="small" layout="outline" className="rounded-xl" disabled={busyId === p.id} onClick={() => unpublish(p)}>
                        <EyeOff className="w-4 h-4 mr-1" /> Unpublish
                      </Button>
                    </>
                  )}
                  <Button size="small" layout="outline" className="rounded-xl text-red-600 border-red-300" disabled={busyId === p.id} onClick={() => setDeleting(p)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-black/50 p-4 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-gray-800 shadow-2xl p-6 my-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                {form.id ? "Edit" : "New"} {form.kind === "announcement" ? "announcement" : "article"}
              </h3>
              <button type="button" aria-label="Close" onClick={() => setForm(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-200">Type</span>
                  <select className={`${input} mt-1`} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as Post["kind"] })}>
                    <option value="article">Article (to read in the app)</option>
                    <option value="announcement">Announcement (short notice)</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-200">Who sees it</span>
                  <select className={`${input} mt-1`} value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value as Post["audience"] })}>
                    <option value="all">Everyone (women and health workers)</option>
                    <option value="women">Women only</option>
                    <option value="chw">Health workers only</option>
                  </select>
                </label>
              </div>

              {form.audience !== "women" && (
                <label className="block text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-200">Health workers in</span>
                  <select className={`${input} mt-1`} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>
                    <option value="">All states</option>
                    {STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {form.state && form.audience === "all" && (
                    <span className="mt-1 block text-xs text-amber-700">With a state chosen, only health workers in {form.state} see it (women don&apos;t have a state in the app).</span>
                  )}
                </label>
              )}

              <label className="block text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-200">Title</span>
                <input className={`${input} mt-1`} maxLength={150} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Free breast screening week" />
              </label>

              <label className="block text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-200">Summary</span>
                <textarea className={`${input} mt-1`} rows={2} maxLength={300} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="One or two sentences. Shown on the card and in the phone notification." />
                <span className="text-xs text-gray-400">{form.summary.length}/300</span>
              </label>

              <label className="block text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-200">{form.kind === "article" ? "Article text" : "Details (optional)"}</span>
                <textarea className={`${input} mt-1 font-mono`} rows={10} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder={"Leave a blank line between paragraphs.\n\n## A heading\n- A bullet point\n- Another one"} />
                <span className="text-xs text-gray-400">Blank line = new paragraph · start a line with “## ” for a heading · “- ” for a bullet point.</span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                <div className="text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-200">Picture (optional)</span>
                  <div className="mt-1 flex items-center gap-3">
                    {form.coverPreview && !form.removeCover ? (
                      <div className="relative">
                        <img src={form.coverPreview} alt="" className="w-32 h-20 object-cover rounded-xl" />
                        <button
                          type="button"
                          aria-label="Remove picture"
                          onClick={() => setForm({ ...form, cover: null, coverPreview: null, removeCover: !!form.id })}
                          className="absolute -top-2 -right-2 rounded-full bg-white shadow p-1 text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : null}
                    <Button size="small" layout="outline" className="rounded-xl" onClick={() => fileRef.current?.click()}>
                      <ImagePlus className="w-4 h-4 mr-1" /> {form.coverPreview && !form.removeCover ? "Change" : "Add picture"}
                    </Button>
                    <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pickCover(e.target.files?.[0])} />
                  </div>
                  <span className="text-xs text-gray-400">Wide picture (16:9) works best · JPG, PNG or WebP up to 3 MB.</span>
                </div>
                <label className="block text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-200">“Read more” link (optional)</span>
                  <input className={`${input} mt-1`} value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} placeholder="https://…" />
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
                Pin to the top of the list
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button layout="outline" className="rounded-2xl" onClick={() => setForm(null)} disabled={saving}>
                Cancel
              </Button>
              <Button layout="outline" className="rounded-2xl" onClick={saveDraft} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
              {(!form.id || rows.find((r) => r.id === form.id)?.status !== "published") && (
                <Button className="rounded-2xl bg-green-700 border-green-700 hover:bg-green-800" onClick={saveAndPublish} disabled={saving}>
                  Save and publish…
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Publish / send */}
      {publishing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-gray-800 shadow-2xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{publishing.resend ? "Send to phones?" : "Publish?"}</h3>
            <p className="mt-1 text-sm text-gray-500 break-words">“{publishing.post.title}” · {AUDIENCE[publishing.post.audience]}{publishing.post.state ? ` in ${publishing.post.state}` : ""}</p>
            {!publishing.resend && (
              <label className="mt-4 flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input type="checkbox" className="mt-1" checked={publishing.notify} onChange={(e) => setPublishing({ ...publishing, notify: e.target.checked })} />
                <span>
                  Also send it as a phone notification
                  {reach(publishing.post) ? <span className="text-gray-500"> (about {reach(publishing.post)})</span> : null}. People get it on their lock screen; tapping it opens the article.
                </span>
              </label>
            )}
            {publishing.resend && (
              <p className="mt-3 text-sm text-gray-600">
                Everyone in the audience gets a phone notification{reach(publishing.post) ? ` (about ${reach(publishing.post)})` : ""}. Use this sparingly.
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button layout="outline" className="rounded-2xl" onClick={() => setPublishing(null)} disabled={busyId !== null}>
                Back
              </Button>
              <Button className="rounded-2xl bg-green-700 border-green-700 hover:bg-green-800" onClick={confirmPublish} disabled={busyId !== null}>
                {busyId !== null ? "Working…" : publishing.resend ? "Send" : publishing.notify ? "Publish and send" : "Publish"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-gray-800 shadow-2xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Delete this {deleting.kind}?</h3>
            <p className="mt-1 text-sm text-gray-500 break-words">“{deleting.title}” will be removed from the app. This cannot be undone; use Unpublish to hide it instead.</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button layout="outline" className="rounded-2xl" onClick={() => setDeleting(null)} disabled={busyId !== null}>
                Back
              </Button>
              <Button className="rounded-2xl bg-red-600 border-red-600 hover:bg-red-700" onClick={confirmDelete} disabled={busyId !== null}>
                {busyId !== null ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

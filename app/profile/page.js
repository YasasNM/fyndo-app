"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Ico } from "@/components/Icon";
import Avatar from "@/components/Avatar";
import { db } from "@/lib/data";
import { useUser, useSpots, goLogin } from "@/lib/hooks";
import { compressImage } from "@/lib/photos";
import ListEditor from "@/components/ListEditor";

// Your public profile: username, photo, bio, Top 4, private switch, and your lists.
export default function EditProfile() {
  const user = useUser();
  const { spots } = useSpots();
  const [f, setF] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [lists, setLists] = useState([]);
  const [editList, setEditList] = useState(null);
  const loadLists = () => db.myLists().then(setLists).catch(() => setLists([]));
  useEffect(() => {
    if (user === null) goLogin();
    // Fill the form once: a later account refresh (for example after a photo upload) must not wipe unsaved edits.
    if (user && !f) {
      setF({ username: user.username || "", name: user.name || "", bio: user.bio || "", city: user.city || "", favorites: user.favorites || [], is_private: !!user.is_private });
      loadLists();
    }
  }, [user]); // eslint-disable-line
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  if (!user || !f) return <div className="loading">Loading...</div>;
  const save = async () => {
    setErr(""); setMsg(""); setBusy(true);
    try { await db.updateMyProfile(f); setMsg("Profile saved."); } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const photo = async (e) => {
    const file = e.target.files && e.target.files[0]; e.target.value = "";
    if (!file) return;
    setErr(""); setBusy(true);
    try { await db.uploadAvatar(await compressImage(file, 480, 0.85)); setMsg("Photo updated."); } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  const fav = (id) => setF({ ...f, favorites: f.favorites.includes(id) ? f.favorites.filter((x) => x !== id) : [...f.favorites, id].slice(0, 4) });

  if (editList) return <ListEditor list={editList} spots={spots || []} onDone={() => { setEditList(null); loadLists(); }} />;

  return (
    <div className="narrow">
      <Link href="/me" className="small muted">Me</Link>
      <h1 style={{ marginTop: 6 }}>Your profile</h1>
      <div className="row" style={{ gap: 14, flexWrap: "nowrap" }}>
        <Avatar src={user.avatar_url} name={f.name || user.email} size={72} />
        <label className="btn sm ghost filepick"><Ico n="plus" size={16} />{user.avatar_url ? "Change photo" : "Add a photo"}
          <input type="file" accept="image/*" className="sr-only" onChange={photo} disabled={busy} /></label>
      </div>
      <div className="card pad" style={{ marginTop: 14 }}>
        <label className="field"><span>Username</span>
          <div className="usernamefield"><span aria-hidden="true">@</span><input className="input" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "") })} maxLength={20} placeholder="yourname" autoComplete="off" /></div>
          <span className="small muted fieldhint">3 to 20 letters, numbers, dots or underscores. Your profile link uses it.</span></label>
        <label className="field"><span>Name</span><input className="input" value={f.name} onChange={set("name")} maxLength={60} /></label>
        <label className="field"><span>Bio</span><textarea className="input" rows={2} maxLength={160} value={f.bio} onChange={set("bio")} placeholder="Kottu hunter. Always looking for a quiet café." /></label>
        <label className="field"><span>City</span><input className="input" value={f.city} onChange={set("city")} maxLength={40} placeholder="Colombo" /></label>
        <div className="row between" style={{ background: "var(--surface-2)", padding: 12, borderRadius: 8, margin: "4px 0 14px" }}>
          <div><b>Private profile</b><div className="small muted">Hides your profile, diary and lists. Reviews still show on place pages with your first name.</div></div>
          <label className="switch"><input type="checkbox" checked={f.is_private} onChange={(e) => setF({ ...f, is_private: e.target.checked })} aria-label="Private profile" /><span /></label>
        </div>
        <FavoritesPicker spots={spots || []} chosen={f.favorites} toggle={fav} />
        {err && <div className="alert">{err}</div>}
        {msg && <div className="alert ok">{msg}</div>}
        <div className="row" style={{ gap: 10 }}>
          <button className="btn" onClick={save} disabled={busy}>Save profile</button>
          {user.username && <Link className="linkbtn" href={`/u?name=${user.username}`}>View your profile</Link>}
        </div>
      </div>

      <div className="row between" style={{ marginTop: 28 }}>
        <h2 style={{ margin: 0 }}>Your lists</h2>
        <button className="btn sm" onClick={() => setEditList({ title: "", note: "", spot_ids: [], is_public: true })}><Ico n="plus" size={16} />New list</button>
      </div>
      {lists.length === 0 ? <p className="small muted">Make a list like "Best kottu in Colombo 4" and share it.</p> : (
        <div className="stack" style={{ marginTop: 10 }}>
          {lists.map((l) => (
            <div key={l.id} className="card pad row between">
              <span><Link className="linkbtn" href={`/list?id=${l.id}`}><b>{l.title}</b></Link><br /><span className="small muted">{l.spot_ids.length} places{l.is_public ? "" : ", only you"}</span></span>
              <span className="row" style={{ gap: 12 }}>
                <button className="linkbtn" onClick={() => setEditList(l)}>Edit</button>
                <button className="linkbtn" style={{ color: "var(--chili)" }} onClick={async () => { if (window.confirm(`Delete "${l.title}"?`)) { await db.deleteList(l.id); loadLists(); } }}>Delete</button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FavoritesPicker({ spots, chosen, toggle }) {
  const [q, setQ] = useState("");
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t.length < 2 ? [] : spots.filter((s) => s.name.toLowerCase().includes(t) && !chosen.includes(s.id)).slice(0, 6);
  }, [q, spots, chosen]);
  const byId = (id) => spots.find((s) => s.id === id);
  return (
    <div className="field">
      <span>Top 4 places</span>
      <div className="row" style={{ gap: 6 }}>
        {chosen.map((id) => byId(id) && (
          <button key={id} type="button" className="chip on" onClick={() => toggle(id)} aria-label={`Remove ${byId(id).name}`}>{byId(id).name}<Ico n="close" size={14} /></button>
        ))}
        {chosen.length === 0 && <span className="small muted">Pick up to four places you love.</span>}
      </div>
      {chosen.length < 4 && (
        <>
          <input className="input" style={{ marginTop: 8 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a place to add" aria-label="Search a place to add to your Top 4" />
          {matches.length > 0 && <div className="row" style={{ gap: 6, marginTop: 6 }}>{matches.map((s) => (
            <button key={s.id} type="button" className="chip" onClick={() => { toggle(s.id); setQ(""); }}><Ico n="plus" size={14} />{s.name}</button>
          ))}</div>}
        </>
      )}
    </div>
  );
}

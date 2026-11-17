"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Ico } from "@/components/Icon";
import Avatar from "@/components/Avatar";
import Stars from "@/components/Stars";
import { db } from "@/lib/data";
import { useUser, useSpots } from "@/lib/hooks";

// Friends: what the people you follow rated and listed (no chat). Plus finding people.
export default function Feed() {
  const user = useUser();
  const { spots } = useSpots();
  const [items, setItems] = useState(null);
  const [q, setQ] = useState("");
  const [people, setPeople] = useState([]);
  useEffect(() => { if (user) db.friendsFeed().then(setItems).catch(() => setItems([])); else if (user === null) setItems([]); }, [user]);
  useEffect(() => {
    const t = setTimeout(() => { if (q.trim().length >= 2) db.searchPeople(q).then(setPeople).catch(() => setPeople([])); else setPeople([]); }, 250);
    return () => clearTimeout(t);
  }, [q]);
  const spot = (id) => (spots || []).find((s) => s.id === id);

  return (
    <div className="narrow">
      <h1>Friends</h1>
      {user && !user.username && (
        <div className="claimcta" style={{ marginTop: 0 }}>
          <Ico n="user" size={22} />
          <span><b>Set up your profile</b><span className="small">Pick a username and photo so friends can find and follow you.</span></span>
          <Link className="btn sm" href="/profile" style={{ marginLeft: "auto" }}>Set up</Link>
        </div>
      )}
      <label className="field" style={{ marginTop: 16 }}><span>Find people</span>
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or @username" autoComplete="off" /></label>
      {people.length > 0 && (
        <div className="stack" style={{ marginBottom: 18 }}>
          {people.map((p) => (
            <Link key={p.id} href={`/u?name=${p.username}`} className="card pad personrow">
              <Avatar src={p.avatar_url} name={p.name} size={44} />
              <span><b>{p.name}</b> <span className="muted">@{p.username}</span><br /><span className="small muted">{p.is_private ? "Private profile" : `${p.followers} followers`}</span></span>
            </Link>
          ))}
        </div>
      )}
      {q.trim().length >= 2 && people.length === 0 && <p className="small muted">No one found with that name.</p>}

      <h2>From people you follow</h2>
      {user === null ? (
        <p className="small muted"><Link className="linkbtn" href="/login?next=/feed">Log in</Link> to follow people and see what they rate.</p>
      ) : !items ? <div className="loading">Loading...</div> : items.length === 0 ? (
        <p className="small muted">Nothing yet. Follow people to see the places they rate and the lists they make.</p>
      ) : (
        <div className="stack">
          {items.map((it, i) => (
            <article key={i} className="card pad feeditem">
              <Link href={`/u?name=${it.username}`} className="row" style={{ gap: 10, flexWrap: "nowrap" }}>
                <Avatar src={it.avatar_url} name={it.name} size={36} />
                <span className="small"><b>{it.name}</b> <span className="muted">@{it.username}</span>
                  <span className="muted">, {new Date(it.at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span></span>
              </Link>
              {it.kind === "review" ? (
                <div style={{ marginTop: 8 }}>
                  <div className="row between" style={{ flexWrap: "nowrap" }}>
                    <span>rated {spot(it.spot_id) ? <Link className="linkbtn" href={`/spot?id=${it.spot_id}`}>{spot(it.spot_id).name}</Link> : "a place"}</span>
                    <Stars value={it.rating} size={14} />
                  </div>
                  {it.body && <p className="small" style={{ margin: "6px 0 0" }}>{it.body}</p>}
                </div>
              ) : (
                <div style={{ marginTop: 8 }}>made a list <Link className="linkbtn" href={`/list?id=${it.list_id}`}>{it.list_title}</Link>
                  {it.body && <p className="small muted" style={{ margin: "6px 0 0" }}>{it.body}</p>}</div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

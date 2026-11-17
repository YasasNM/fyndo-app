"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Ico } from "@/components/Icon";
import Avatar from "@/components/Avatar";
import Stars from "@/components/Stars";
import ShareSheet from "@/components/ShareSheet";
import { CardMedia } from "@/components/SpotCard";
import { db } from "@/lib/data";
import { useUser, useSpots, goLogin } from "@/lib/hooks";
import { profileCard, reviewCard } from "@/lib/sharecard";

export default function ProfileWrapper() {
  return <Suspense fallback={<div className="loading">Loading...</div>}><Profile /></Suspense>;
}

function Profile() {
  const name = (useSearchParams().get("name") || "").toLowerCase();
  const user = useUser();
  const { spots } = useSpots();
  const [p, setP] = useState(undefined);
  const [tab, setTab] = useState("diary");
  const [reviews, setReviews] = useState(null);
  const [lists, setLists] = useState(null);
  const [following, setFollowing] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => { db.getProfile(name).then(setP).catch(() => setP(null)); }, [name]);
  useEffect(() => {
    if (!p || p.is_private) return;
    db.userReviews(p.id).then(setReviews).catch(() => setReviews([]));
    db.userLists(p.id).then(setLists).catch(() => setLists([]));
  }, [p && p.id]); // eslint-disable-line
  useEffect(() => { if (p && user) db.isFollowing(p.id).then(setFollowing).catch(() => {}); }, [p && p.id, user]); // eslint-disable-line

  if (p === undefined) return <div className="loading">Loading...</div>;
  if (!p) return <div className="empty"><div className="big"><Ico n="user" size={30} /></div>No one has the username @{name}.<br /><Link className="linkbtn" href="/feed">Find people</Link></div>;
  const mine = user && user.id === p.id;
  const byId = (id) => (spots || []).find((s) => s.id === id);
  const favs = (p.favorites || []).map(byId).filter(Boolean);

  const toggleFollow = async () => {
    if (!user) return goLogin();
    setMsg("");
    try {
      if (following) { await db.unfollow(p.id); setFollowing(false); setP({ ...p, followers: p.followers - 1 }); }
      else { await db.follow(p.id); setFollowing(true); setP({ ...p, followers: p.followers + 1 }); }
    } catch (e) { setMsg(e.message); }
  };
  const report = async () => {
    if (!user) return goLogin();
    const why = window.prompt(`What's wrong with @${p.username}'s profile? (photo, name, bio)`);
    if (!why) return;
    try { await db.report("user", p.id, why); setMsg("Thanks. The Fyndo team will check it."); } catch (e) { setMsg(e.message); }
  };

  return (
    <div className="narrow">
      <header className="profilehead">
        <Avatar src={p.avatar_url} name={p.name} size={88} />
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0 }}>{p.name}</h1>
          <div className="profile-handle">@{p.username}</div>
          {p.city && <div className="small muted"><Ico n="pin" size={13} /> {p.city}</div>}
        </div>
      </header>
      {p.bio && <p className="profile-bio">{p.bio}</p>}
      <div className="profilestats">
        <span><b>{p.reviews}</b> {p.reviews === 1 ? "place" : "places"} rated</span>
        <span><b>{p.followers}</b> {p.followers === 1 ? "follower" : "followers"}</span>
        <span><b>{p.following}</b> following</span>
      </div>
      <div className="row" style={{ gap: 8, marginTop: 12 }}>
        {mine ? <Link className="btn sm ghost" href="/profile">Edit profile</Link>
          : <button className={"btn sm" + (following ? " ghost" : "")} onClick={toggleFollow} aria-pressed={following}>{following ? "Following" : "Follow"}</button>}
        {!p.is_private && <ShareSheet label="Share profile" title={`@${p.username} on Fyndo`} text={`Follow @${p.username} on Fyndo`} url={`/u?name=${p.username}`}
          make={() => profileCard({ profile: p, favorites: favs })} fileName={`fyndo-${p.username}.png`} />}
        {!mine && <button className="linkbtn" onClick={report}>Report</button>}
      </div>
      {msg && <div className={"alert" + (/^Thanks/.test(msg) ? " ok" : "")}>{msg}</div>}

      {p.is_private ? (
        <div className="empty"><div className="big"><Ico n="lock" size={30} /></div>This profile is private.</div>
      ) : (
        <>
          {favs.length > 0 && (
            <>
              <h2>Top places</h2>
              <div className="favgrid">
                {favs.map((s) => (
                  <Link key={s.id} href={`/spot?id=${s.id}`} className="favtile">
                    <CardMedia spot={s}><span className="favtile-name">{s.name}</span></CardMedia>
                  </Link>
                ))}
              </div>
            </>
          )}
          <div className="tabs-in" role="tablist" aria-label="Profile sections" style={{ marginTop: 22 }}>
            {[["diary", `Diary (${reviews ? reviews.length : "..."})`], ["lists", `Lists (${lists ? lists.length : "..."})`]].map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>
          {tab === "diary" && (!reviews ? <div className="loading">Loading...</div> : reviews.length === 0
            ? <p className="small muted">No places rated yet.</p>
            : <div className="stack">{reviews.map((r) => {
                const s = r.spot || byId(r.spot_id);
                return (
                  <article key={r.id} className="card pad diaryrow">
                    <div className="row between" style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0 }}>
                        {s ? <Link href={`/spot?id=${s.id}`}><b>{s.name}</b></Link> : <b>{r.spot_id}</b>}
                        <div className="small muted">{s ? s.area + ", " : ""}{new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
                      </div>
                      <Stars value={r.rating} size={15} />
                    </div>
                    {r.body && <p className="small" style={{ margin: "8px 0 0" }}>{r.body}</p>}
                    <div className="row small" style={{ gap: 14, marginTop: 8 }}>
                      {r.likes > 0 && <span className="muted"><Ico n="heart" size={13} /> {r.likes}</span>}
                      {r.would_return && <span className="muted">Would go again</span>}
                      {mine && s && <ShareSheet label="Share as story" className="linkbtn" title={`${s.name} on Fyndo`} text={`My review of ${s.name} on Fyndo`} url={`/spot?id=${s.id}`}
                        make={() => reviewCard({ spot: s, rating: r.rating, body: r.body, username: p.username })} fileName={`fyndo-${s.id}.png`} />}
                    </div>
                  </article>
                );
              })}</div>)}
          {tab === "lists" && (!lists ? <div className="loading">Loading...</div> : lists.length === 0
            ? <p className="small muted">No lists yet.{mine && <> <Link className="linkbtn" href="/profile">Make one</Link></>}</p>
            : <div className="stack">{lists.map((l) => (
                <Link key={l.id} href={`/list?id=${l.id}`} className="card pad listrow">
                  <b>{l.title}</b>
                  <span className="small muted">{l.spot_ids.length} places{l.note ? `: ${l.note.slice(0, 80)}` : ""}</span>
                </Link>
              ))}</div>)}
        </>
      )}
    </div>
  );
}

"use client";
import { useState } from "react";
import { Ico } from "./Icon";

// Official links for a place, plus its own public posts through Facebook's and Instagram's official embeds.
// Embeds load only when tapped: faster pages, and Meta does not see visitors who never open them.
const FB = /^https:\/\/(?:www\.)?facebook\.com\/[A-Za-z0-9.\-_]{3,80}\/?$/;
const IG_POST = /^https:\/\/(?:www\.)?instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]{5,40})\/?/;

export const instagramCode = (url) => { const m = IG_POST.exec(String(url || "").trim()); return m ? m[1] : null; };
export const isFacebookPage = (url) => FB.test(String(url || "").trim());

// Editor for the links above (admin place form and the owner's dashboard). f = the place being edited.
export function LinksFields({ f, set }) {
  const [posts, setPosts] = useState((f.instagram_posts || []).join("\n"));
  const badPost = (f.instagram_posts || []).some((u) => u && !instagramCode(u));
  const badFb = f.facebook_url && !isFacebookPage(f.facebook_url);
  return (
    <div className="field">
      <span>Official links</span>
      <div className="grid2">
        <label className="field" style={{ marginBottom: 6 }}><span className="small muted">Website</span>
          <input className="input" type="url" value={f.website || ""} onChange={(e) => set({ website: e.target.value.trim() })} placeholder="https://..." /></label>
        <label className="field" style={{ marginBottom: 6 }}><span className="small muted">Facebook page</span>
          <input className="input" type="url" value={f.facebook_url || ""} onChange={(e) => set({ facebook_url: e.target.value.trim() })} placeholder="https://www.facebook.com/yourpage" />
          {badFb && <span className="fielderr">Use the page's own address, like https://www.facebook.com/yourpage</span>}</label>
        <label className="field" style={{ marginBottom: 6 }}><span className="small muted">Instagram account</span>
          <input className="input" type="url" value={f.instagram_url || ""} onChange={(e) => set({ instagram_url: e.target.value.trim() })} placeholder="https://www.instagram.com/yourplace/" /></label>
      </div>
      <label className="field" style={{ marginBottom: 0 }}><span className="small muted">Instagram posts to show on the page (one link per line, up to 6)</span>
        <textarea className="input" rows={3} value={posts} placeholder="https://www.instagram.com/p/..."
          onChange={(e) => { setPosts(e.target.value); set({ instagram_posts: e.target.value.split(/\s+/).map((x) => x.trim()).filter(Boolean).slice(0, 6) }); }} />
        {badPost && <span className="fielderr">Each line must be a post link like https://www.instagram.com/p/ABC123/</span>}</label>
    </div>
  );
}

export default function OfficialLinks({ spot }) {
  const [showFb, setShowFb] = useState(false);
  const [showIg, setShowIg] = useState(false);
  const site = /^https?:\/\//.test(spot.website || "") ? spot.website : "";
  const fb = isFacebookPage(spot.facebook_url) ? spot.facebook_url : "";
  const ig = /^https:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._]{2,30}\/?$/.test(spot.instagram_url || "") ? spot.instagram_url : "";
  const posts = (spot.instagram_posts || []).map(instagramCode).filter(Boolean).slice(0, 6);
  if (!site && !fb && !ig && !posts.length) return null;

  return (
    <section className="official" aria-labelledby="official-h">
      <h2 id="official-h">From {spot.name}</h2>
      <div className="row" style={{ gap: 8 }}>
        {site && <a className="btn sm ghost" href={site} target="_blank" rel="noreferrer"><Ico n="globe" size={16} />Website</a>}
        {fb && <a className="btn sm ghost" href={fb} target="_blank" rel="noreferrer"><Ico n="link" size={16} />Facebook</a>}
        {ig && <a className="btn sm ghost" href={ig} target="_blank" rel="noreferrer"><Ico n="link" size={16} />Instagram</a>}
      </div>
      {posts.length > 0 && (
        showIg ? (
          <div className="embeds">
            {posts.map((code) => (
              <iframe key={code} className="embed-ig" src={`https://www.instagram.com/p/${code}/embed`} title={`Instagram post by ${spot.name}`}
                loading="lazy" allowtransparency="true" scrolling="no" />
            ))}
          </div>
        ) : (
          <button className="embed-load" onClick={() => setShowIg(true)}>
            <Ico n="play" size={18} /><span><b>See their Instagram posts ({posts.length})</b><span className="small muted">Loads from Instagram</span></span>
          </button>
        )
      )}
      {fb && (
        showFb ? (
          <iframe className="embed-fb" title={`Facebook posts from ${spot.name}`} loading="lazy"
            src={`https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(fb)}&tabs=timeline&width=500&height=620&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false`} />
        ) : (
          <button className="embed-load" onClick={() => setShowFb(true)}>
            <Ico n="chat" size={18} /><span><b>See their latest Facebook posts</b><span className="small muted">Loads from Facebook</span></span>
          </button>
        )
      )}
    </section>
  );
}

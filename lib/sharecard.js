"use client";
// Story-size share images (1080 x 1920) drawn in the browser, for Instagram/Facebook/WhatsApp stories.
// Nothing is uploaded: the image is made on the phone and handed to the phone's share sheet.
import { coverFor } from "./coverPhotos";

const W = 1080, H = 1920;
// The night theme: slate ground, white type, one sapphire accent.
const C = { board: "#14181c", shell: "#1b2026", shellDeep: "#232a31", plate: "#8fa8ff", white: "#ffffff", soft: "#c8d0d8", muted: "#93a0ad", pin: "#ffffff" };
const DISPLAY = '"Geist", system-ui, sans-serif';
const BODY = '"Geist", system-ui, sans-serif';

async function fontsReady() {
  try { await Promise.all([document.fonts.load(`800 120px ${DISPLAY}`), document.fonts.load(`700 40px ${BODY}`), document.fonts.load(`400 40px ${BODY}`)]); } catch {}
}
function loadImage(src) {
  return new Promise((res) => {
    if (!src) return res(null);
    const img = new Image();
    // Same-site photos, data links and Supabase storage (which allows it) can be drawn; others are skipped.
    if (!src.startsWith("/") && !src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}
function cover(ctx, img, x, y, w, h) {
  const r = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / r, sh = h / r;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}
function wrap(ctx, text, maxW, maxLines) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (ctx.measureText(t).width <= maxW) { line = t; continue; }
    if (line) lines.push(line);
    line = w;
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    let last = lines[maxLines - 1];
    while (last && ctx.measureText(last + "…").width > maxW) last = last.slice(0, -1);
    lines[maxLines - 1] = last.trimEnd() + "…";
  }
  return lines;
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function pin(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 40, s / 40);
  ctx.fillStyle = C.pin; ctx.strokeStyle = C.pin; ctx.lineWidth = 2;
  const p = new Path2D("M20 47C14 39 3 30 3 19A17 17 0 0 1 37 19C37 30 26 39 20 47Z"); ctx.fill(p); ctx.stroke(p);
  ctx.fillStyle = C.board; ctx.fill(new Path2D("M16 12V26L28 19Z"));
  ctx.restore();
}
function header(ctx) {
  ctx.fillStyle = C.shell; ctx.fillRect(0, 0, W, 170);
  pin(ctx, 70, 52, 62);
  ctx.fillStyle = C.white; ctx.font = `800 76px ${DISPLAY}`; ctx.textBaseline = "middle"; ctx.fillText("Fyndo", 150, 92);
}
function footer(ctx, line) {
  ctx.fillStyle = C.shell; ctx.fillRect(0, H - 150, W, 150);
  ctx.fillStyle = C.soft; ctx.font = `700 38px ${BODY}`; ctx.textBaseline = "middle";
  ctx.fillText(line || "Find the real spots in Sri Lanka", 70, H - 75);
}
function plate(ctx, text, x, y, size = 46) {
  ctx.font = `800 ${size}px ${DISPLAY}`;
  const w = ctx.measureText(text).width + 44, h = size + 26;
  roundRect(ctx, x, y, w, h, 10); ctx.fillStyle = C.plate; ctx.fill();
  ctx.lineWidth = 5; ctx.strokeStyle = C.board; ctx.stroke();
  ctx.fillStyle = C.board; ctx.textBaseline = "middle"; ctx.fillText(text, x + 22, y + h / 2 + 2);
  return h;
}
function stars(ctx, value, x, y, size) {
  for (let i = 0; i < 5; i++) {
    const cx = x + i * (size + 14) + size / 2, cy = y + size / 2;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const r = k % 2 ? size * 0.22 : size * 0.5, a = -Math.PI / 2 + (k * Math.PI) / 5;
      ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    ctx.closePath();
    ctx.fillStyle = i < Math.round(value) ? C.plate : "#3b4651"; ctx.fill();
  }
}
async function placePhoto(spot) {
  const own = spot && spot.photos && spot.photos[0];
  const img = own ? await loadImage(own) : null;
  if (img) return img;
  const ex = spot ? coverFor(spot) : null;
  return ex ? loadImage(ex.large) : null;
}
function toBlob(canvas) { return new Promise((res, rej) => { try { canvas.toBlob((b) => (b ? res(b) : rej(new Error("no image"))), "image/png"); } catch (e) { rej(e); } }); }

// Draws with photos; if a photo would block saving (another site's image), draws again without it.
async function render(draw) {
  await fontsReady();
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  try { await draw(ctx, true); return await toBlob(canvas); }
  catch { ctx.clearRect(0, 0, W, H); await draw(ctx, false); return toBlob(canvas); }
}

export function reviewCard({ spot, rating, body, username }) {
  return render(async (ctx, withPhoto) => {
    ctx.fillStyle = C.board; ctx.fillRect(0, 0, W, H); header(ctx);
    const img = withPhoto ? await placePhoto(spot) : null;
    if (img) cover(ctx, img, 0, 170, W, 900); else { ctx.fillStyle = C.shellDeep; ctx.fillRect(0, 170, W, 900); }
    plate(ctx, spot.area || "Sri Lanka", 70, 1000);
    ctx.fillStyle = C.white; ctx.font = `800 104px ${DISPLAY}`; ctx.textBaseline = "alphabetic";
    let y = 1200;
    for (const l of wrap(ctx, spot.name, W - 140, 2)) { ctx.fillText(l, 70, y); y += 100; }
    stars(ctx, rating || 0, 70, y - 40, 64); y += 90;
    if (body) {
      ctx.fillStyle = C.soft; ctx.font = `400 44px ${BODY}`;
      for (const l of wrap(ctx, `“${body}”`, W - 140, 4)) { ctx.fillText(l, 70, y); y += 60; }
    }
    footer(ctx, username ? `@${username} on Fyndo` : "Rated on Fyndo");
  });
}

export function badgeCard({ badge, username, tier }) {
  return render(async (ctx) => {
    ctx.fillStyle = C.board; ctx.fillRect(0, 0, W, H); header(ctx);
    ctx.beginPath(); ctx.arc(W / 2, 700, 250, 0, Math.PI * 2); ctx.fillStyle = C.plate; ctx.fill();
    ctx.lineWidth = 14; ctx.strokeStyle = C.white; ctx.stroke();
    ctx.font = `220px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(badge.emoji || "★", W / 2, 715);
    ctx.fillStyle = C.soft; ctx.font = `700 46px ${BODY}`; ctx.textBaseline = "alphabetic"; ctx.fillText("Badge unlocked", W / 2, 1080);
    ctx.fillStyle = C.white; ctx.font = `800 120px ${DISPLAY}`;
    let y = 1210;
    for (const l of wrap(ctx, badge.label, W - 140, 2)) { ctx.fillText(l, W / 2, y); y += 112; }
    ctx.fillStyle = C.muted; ctx.font = `400 44px ${BODY}`;
    for (const l of wrap(ctx, badge.hint || "", W - 200, 2)) { ctx.fillText(l, W / 2, y + 10); y += 58; }
    if (tier) { ctx.fillStyle = C.plate; ctx.font = `800 54px ${DISPLAY}`; ctx.fillText(`${tier} on Fyndo Rewards`, W / 2, y + 110); }
    ctx.textAlign = "left";
    footer(ctx, username ? `@${username} on Fyndo` : "Earned on Fyndo");
  });
}

export function listCard({ title, note, spots, username }) {
  return render(async (ctx, withPhoto) => {
    ctx.fillStyle = C.board; ctx.fillRect(0, 0, W, H); header(ctx);
    const first = spots.slice(0, 3);
    const imgs = withPhoto ? await Promise.all(first.map(placePhoto)) : [];
    const tw = W / Math.max(1, first.length);
    first.forEach((s, i) => { if (imgs[i]) cover(ctx, imgs[i], i * tw, 170, tw, 560); else { ctx.fillStyle = i % 2 ? C.shellDeep : C.shell; ctx.fillRect(i * tw, 170, tw, 560); } });
    ctx.fillStyle = C.white; ctx.font = `800 104px ${DISPLAY}`; ctx.textBaseline = "alphabetic";
    let y = 870;
    for (const l of wrap(ctx, title, W - 140, 2)) { ctx.fillText(l, 70, y); y += 100; }
    if (note) { ctx.fillStyle = C.soft; ctx.font = `400 42px ${BODY}`; for (const l of wrap(ctx, note, W - 140, 2)) { ctx.fillText(l, 70, y); y += 56; } }
    y += 30;
    spots.slice(0, 6).forEach((s, i) => {
      ctx.fillStyle = C.plate; ctx.font = `800 64px ${DISPLAY}`; ctx.fillText(String(i + 1), 70, y + 50);
      ctx.fillStyle = C.white; ctx.font = `800 58px ${DISPLAY}`; ctx.fillText(wrap(ctx, s.name, W - 260, 1)[0] || "", 150, y + 48);
      ctx.fillStyle = C.muted; ctx.font = `400 34px ${BODY}`; ctx.fillText(s.area || "", 150, y + 92);
      y += 128;
    });
    if (spots.length > 6) { ctx.fillStyle = C.muted; ctx.font = `700 38px ${BODY}`; ctx.fillText(`and ${spots.length - 6} more`, 150, y + 20); }
    footer(ctx, username ? `A list by @${username} on Fyndo` : "A list on Fyndo");
  });
}

export function profileCard({ profile, favorites }) {
  return render(async (ctx, withPhoto) => {
    ctx.fillStyle = C.board; ctx.fillRect(0, 0, W, H); header(ctx);
    const av = withPhoto ? await loadImage(profile.avatar_url) : null;
    ctx.save(); ctx.beginPath(); ctx.arc(W / 2, 520, 220, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
    if (av) cover(ctx, av, W / 2 - 220, 300, 440, 440); else { ctx.fillStyle = C.shell; ctx.fillRect(W / 2 - 220, 300, 440, 440);
      ctx.fillStyle = C.plate; ctx.font = `800 220px ${DISPLAY}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText((profile.name || "?")[0].toUpperCase(), W / 2, 530); }
    ctx.restore();
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = C.white; ctx.font = `800 110px ${DISPLAY}`; ctx.fillText(profile.name || "", W / 2, 880);
    ctx.fillStyle = C.plate; ctx.font = `800 64px ${DISPLAY}`; ctx.fillText(`@${profile.username}`, W / 2, 960);
    ctx.fillStyle = C.soft; ctx.font = `700 44px ${BODY}`;
    const n = (k, one, many) => `${k || 0} ${k === 1 ? one : many}`;
    ctx.fillText(`${n(profile.reviews, "place", "places")} rated, ${n(profile.followers, "follower", "followers")}`, W / 2, 1060);
    if (favorites && favorites.length) {
      ctx.fillStyle = C.muted; ctx.font = `700 40px ${BODY}`; ctx.fillText("Top places", W / 2, 1190);
      ctx.fillStyle = C.white; ctx.font = `800 58px ${DISPLAY}`;
      favorites.slice(0, 4).forEach((s, i) => ctx.fillText(wrap(ctx, s.name, W - 160, 1)[0] || "", W / 2, 1280 + i * 84));
    }
    ctx.textAlign = "left";
    footer(ctx, "Follow me on Fyndo");
  });
}

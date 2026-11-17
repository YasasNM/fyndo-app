// DEMO MODE: everything is saved in this browser only (localStorage).
// Used automatically when Supabase keys are not set.
import { SEED_SPOTS } from "./seed";
import { refCode } from "./utils";
import { blobToDataUrl } from "./photos";

const KEY = "fyndo_demo_v1";
const LIVE_ONLY = "This feature needs the live database (Supabase). It is not available in demo mode.";
const listeners = new Set();

const DEMO_USERS = {
  "user@demo.lk": { id: "u-user", email: "user@demo.lk", name: "Demo User", phone: "0770000001", role: "user" },
  "owner@demo.lk": { id: "u-owner", email: "owner@demo.lk", name: "Demo Owner", phone: "0770000002", role: "owner" },
  "admin@demo.lk": { id: "u-admin", email: "admin@demo.lk", name: "Demo Admin", phone: "0770000003", role: "admin" },
};

function fresh() {
  const spots = SEED_SPOTS.map((s) => ({ ...s }));
  // Demo owner owns the first two spots
  spots[0].owner_id = "u-owner";
  spots[1].owner_id = "u-owner";
  return { spots, users: { ...DEMO_USERS }, session: null, saves: {}, plans: [], bookings: [] };
}

// Demo data saved before deals existed gets the sample deals from the seed.
function withDeal(s) {
  if (s.deal !== undefined) return s;
  const seed = SEED_SPOTS.find((x) => x.id === s.id);
  return { ...s, deal: (seed && seed.deal) || {} };
}
function load() {
  if (typeof window === "undefined") return fresh();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const db = fresh();
  save(db);
  return db;
}
function save(db) {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {}
}
const me = (db) => (db.session ? db.users[db.session] : null);
function need(db, roles) {
  const u = me(db);
  if (!u) throw new Error("Please log in first.");
  if (roles && !roles.includes(u.role)) throw new Error("You don't have access to this.");
  return u;
}
// What anyone may see about a person (mirrors the public_profiles view in schema_v7.sql).
function publicOf(db, p) {
  const priv = !!p.is_private;
  return { id: p.id, username: p.username, name: (p.name || "Fyndo user").split(" ")[0], avatar_url: p.avatar_url || "", is_private: priv,
    bio: priv ? "" : p.bio || "", city: priv ? "" : p.city || "", favorites: priv ? [] : p.favorites || [],
    followers: (db.follows || []).filter((f) => f.followee_id === p.id).length, following: (db.follows || []).filter((f) => f.follower_id === p.id).length,
    reviews: (db.reviews || []).filter((r) => r.user_id === p.id).length };
}
// Reviews with the reviewer's public username, photo and like count (mirrors reviews_public).
function decorate(db, r) {
  const p = Object.values(db.users).find((x) => x.id === r.user_id);
  return { ...r, username: p && !p.is_private ? p.username || null : null, avatar_url: p && !p.is_private ? p.avatar_url || "" : "",
    likes: (db.likes || []).filter((l) => l.review_id === r.id).length };
}
const canManage = (u, spot) => u.role === "admin" || spot.owner_id === u.id;
const emit = () => listeners.forEach((f) => f());

export const demo = {
  mode: "demo",
  async getSpots() { return load().spots.map(withDeal); },
  async getSpot(id) { const s = load().spots.find((x) => x.id === id); return s ? withDeal(s) : null; },

  // ---- auth ----
  async getUser() { return me(load()); },
  async authToken() { return null; },
  onAuthChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },
  async signIn(email) {
    const db = load();
    const e = email.trim().toLowerCase();
    if (!db.users[e]) throw new Error("No account with that email. Sign up first, or use a demo account.");
    db.session = e; save(db); emit();
  },
  async signUp(email, _pw, name, phone) {
    const db = load();
    const e = email.trim().toLowerCase();
    if (db.users[e]) { const err = new Error("That email already has an account. Log in, or reset your password."); err.code = "exists"; throw err; }
    db.users[e] = { id: "u-" + Date.now(), email: e, name, phone, role: "user" };
    db.session = e; save(db); emit();
    return { needsConfirm: false }; // demo mode has no email, so accounts are ready straight away
  },
  async resendConfirmation() {},
  async sendPasswordReset() {},
  async updatePassword() {},
  watchRecovery(cb) { const t = setTimeout(() => cb(Boolean(me(load()))), 300); return () => clearTimeout(t); },
  async signOut() { const db = load(); db.session = null; save(db); emit(); },
  async updateProfile(patch) {
    const db = load(); const u = need(db);
    Object.assign(db.users[u.email], { name: patch.name, phone: patch.phone }); save(db); emit();
  },

  // ---- saves & plans ----
  async getSaves() { const db = load(); const u = me(db); return u ? db.saves[u.id] || [] : []; },
  async toggleSave(spotId) {
    const db = load(); const u = need(db);
    const list = db.saves[u.id] || [];
    db.saves[u.id] = list.includes(spotId) ? list.filter((x) => x !== spotId) : [...list, spotId];
    save(db); return db.saves[u.id].includes(spotId);
  },
  async getPlans() { const db = load(); const u = me(db); return u ? db.plans.filter((p) => p.user_id === u.id) : []; },
  async savePlan(title, data) {
    const db = load(); const u = need(db);
    db.plans.unshift({ id: "p-" + Date.now(), user_id: u.id, title, data, created_at: new Date().toISOString() });
    save(db);
  },
  async deletePlan(id) { const db = load(); db.plans = db.plans.filter((p) => p.id !== id); save(db); },

  // ---- reviews, ratings, popular ----
  async getRatings() {
    const out = {};
    (load().reviews || []).forEach((r) => {
      const o = out[r.spot_id] || (out[r.spot_id] = { sum: 0, count: 0 });
      o.sum += r.rating; o.count++;
    });
    Object.keys(out).forEach((k) => (out[k] = { avg: Math.round((out[k].sum / out[k].count) * 10) / 10, count: out[k].count }));
    return out;
  },
  async getReviews(spotId) {
    const db = load();
    return (db.reviews || []).filter((r) => r.spot_id === spotId).sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).map((r) => decorate(db, r));
  },
  async saveReview(spotId, rating, body, extra = {}) {
    const db = load(); const u = need(db);
    db.reviews = (db.reviews || []).filter((r) => !(r.spot_id === spotId && r.user_id === u.id));
    db.reviews.push({ id: "r-" + Date.now(), spot_id: spotId, user_id: u.id, author: (u.name || "").split(" ")[0] || "Fyndo user",
      rating, body: (body || "").trim().slice(0, 600), tags: extra.tags || [], would_return: extra.would_return, visit_type: extra.visit_type || null,
      owner_reply: null, visited: false, created_at: new Date().toISOString() });
    save(db);
  },
  async deleteReview(id) {
    const db = load(); const u = need(db);
    db.reviews = (db.reviews || []).filter((r) => !(r.id === id && (r.user_id === u.id || u.role === "admin"))); save(db);
  },
  async getPopular() {
    const db = load(); const n = {};
    Object.values(db.saves).forEach((l) => l.forEach((id) => (n[id] = (n[id] || 0) + 1)));
    return Object.keys(n).sort((a, b) => n[b] - n[a]).slice(0, 8);
  },

  async replyReview(id, text) {
    const db = load(); need(db, ["owner", "admin"]);
    const r = (db.reviews || []).find((x) => x.id === id); if (r) { r.owner_reply = text || null; save(db); }
  },
  async myReviewCount() { const db = load(); const u = me(db); return u ? (db.reviews || []).filter((r) => r.user_id === u.id).length : 0; },

  // ---- server-only features: need the live database ----
  async checkIn() { throw new Error(LIVE_ONLY); },
  async myCheckins() {
    const db = load(); const u = me(db); if (!u) return [];
    return (db.checkins || []).filter((c) => c.user_id === u.id).map((c) => ({ ...c, spot: db.spots.find((s) => s.id === c.spot_id) || null }));
  },
  async updateCheckin() { throw new Error(LIVE_ONLY); },
  async checkinCode() { throw new Error(LIVE_ONLY); },
  async checkinStats() { return null; },
  async sendFeedback() { throw new Error(LIVE_ONLY); },
  async spotFeedback() { return []; },
  async report() { throw new Error(LIVE_ONLY); },
  async getReports() { return []; },
  async resolveReport() {},
  async getCollections() { return []; },
  async saveCollection() { throw new Error(LIVE_ONLY); },
  async deleteCollection() {},
  async createPoll() { throw new Error(LIVE_ONLY); },
  async getPoll() { return null; },
  async votePoll() { throw new Error(LIVE_ONLY); },

  // ---- bookings ----
  async getSlotCounts(spotId, date) {
    const out = {};
    load().bookings
      .filter((b) => b.spot_id === spotId && b.date === date && ["requested", "confirmed", "arrived"].includes(b.status))
      .forEach((b) => (out[b.time] = (out[b.time] || 0) + 1));
    return out;
  },
  async createBooking({ spotId, guests, date, time, note, name, phone }) {
    const db = load(); const u = need(db);
    const spot = db.spots.find((s) => s.id === spotId);
    if (!spot || !spot.booking_enabled) throw new Error("This place is not taking bookings.");
    const counts = await this.getSlotCounts(spotId, date);
    if ((counts[time] || 0) >= spot.tables_for_booking) throw new Error("Sorry, that time is now full.");
    const b = { id: "b-" + Date.now(), ref_code: refCode(), spot_id: spotId, user_id: u.id, guest_name: name,
      guest_phone: phone, guests, date, time, note, source: "app",
      status: spot.booking_mode === "instant" ? "confirmed" : "requested", created_at: new Date().toISOString() };
    db.bookings.push(b); save(db); return b;
  },
  async myBookings() {
    const db = load(); const u = me(db); if (!u) return [];
    return db.bookings.filter((b) => b.user_id === u.id)
      .map((b) => ({ ...b, spot: db.spots.find((s) => s.id === b.spot_id) }))
      .sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1));
  },
  async cancelBooking(id) {
    const db = load(); const u = need(db);
    const b = db.bookings.find((x) => x.id === id && x.user_id === u.id);
    if (b) { b.status = "cancelled"; save(db); }
  },

  // ---- owner ----
  async ownerSpots() {
    const db = load(); const u = need(db, ["owner", "admin"]);
    return db.spots.filter((s) => canManage(u, s));
  },
  async spotBookings(spotId) {
    const db = load(); const u = need(db, ["owner", "admin"]);
    const spot = db.spots.find((s) => s.id === spotId);
    if (!spot || !canManage(u, spot)) return [];
    return db.bookings.filter((b) => b.spot_id === spotId).sort((a, b) => (a.date + a.time > b.date + b.time ? 1 : -1));
  },
  async updateBookingStatus(id, status) {
    const db = load(); const u = need(db, ["owner", "admin"]);
    const b = db.bookings.find((x) => x.id === id);
    const spot = b && db.spots.find((s) => s.id === b.spot_id);
    if (!b || !canManage(u, spot)) throw new Error("Not allowed.");
    b.status = status; save(db);
  },
  async addWalkIn(spotId, { name, phone, guests, date, time, note, source }) {
    const db = load(); const u = need(db, ["owner", "admin"]);
    const spot = db.spots.find((s) => s.id === spotId);
    if (!canManage(u, spot)) throw new Error("Not allowed.");
    db.bookings.push({ id: "b-" + Date.now(), ref_code: refCode(), spot_id: spotId, user_id: null, guest_name: name,
      guest_phone: phone, guests, date, time, note, source: source || "phone", status: "confirmed",
      created_at: new Date().toISOString() });
    save(db);
  },
  async updateSpot(id, patch) {
    const db = load(); const u = need(db, ["owner", "admin"]);
    const spot = db.spots.find((s) => s.id === id);
    if (!spot || !canManage(u, spot)) throw new Error("Not allowed.");
    if (u.role !== "admin" && spot.owner_paid_until && new Date(spot.owner_paid_until) < new Date())
      throw new Error("Changes were not saved. If your owner plan has ended, email fyndolk.official@gmail.com to renew it.");
    const { owner_id, verified, owner_paid_until, id: _i, ...safe } = patch;
    Object.assign(spot, u.role === "admin" ? patch : safe);
    save(db);
  },
  async spotStats(spotId) {
    const db = load();
    const saves = Object.values(db.saves).filter((l) => l.includes(spotId)).length;
    const bookings = db.bookings.filter((b) => b.spot_id === spotId);
    return { saves, bookings: bookings.length, arrived: bookings.filter((b) => b.status === "arrived").length,
             noShows: bookings.filter((b) => b.status === "no_show").length };
  },

  // ---- photos (demo: small copies kept in this browser) ----
  async addSpotPhoto(spotId, blob, current = []) {
    const db = load(); const u = need(db, ["owner", "admin"]);
    const spot = db.spots.find((x) => x.id === spotId);
    if (!spot || !canManage(u, spot)) throw new Error("Not allowed.");
    const url = await blobToDataUrl(blob);
    spot.photos = [...current, url];
    try { save(db); } catch { throw new Error("Demo storage is full. Remove a photo first."); }
    return spot.photos;
  },
  async removeSpotPhoto(spotId, url, current = [], index = current.indexOf(url)) {
    const db = load(); const u = need(db, ["owner", "admin"]);
    const spot = db.spots.find((x) => x.id === spotId);
    if (!spot || !canManage(u, spot)) throw new Error("Not allowed.");
    spot.photos = current.filter((_, k) => k !== index); save(db);
    return spot.photos;
  },

  // ---- owner claims (demo: kept in this browser; files kept as small data links) ----
  async submitClaim({ spotId, contact_name, job_role, phone, business_email, reg_no, note }) {
    const db = load(); const u = need(db);
    db.claims = db.claims || [];
    if (db.claims.some((c) => c.spot_id === spotId && c.user_id === u.id && ["submitted", "paid"].includes(c.status)))
      throw new Error("You already have an open claim for this place. See My claims.");
    const spot = db.spots.find((s) => s.id === spotId);
    if (!spot) throw new Error("Place not found.");
    if (spot.owner_id && spot.owner_id !== u.id) throw new Error("This place already has a verified owner. Email fyndolk.official@gmail.com if that is wrong.");
    const c = { id: "c-" + Date.now(), ref: "FYC-" + Math.random().toString(36).slice(2, 8).toUpperCase(), spot_id: spotId, user_id: u.id,
      contact_name: contact_name.trim(), job_role, phone: phone.trim(), business_email: (business_email || "").trim(), reg_no: (reg_no || "").trim(),
      note: (note || "").trim(), proof_path: "", receipt_path: "", fee_lkr: 5000, status: "submitted", paid_at: null, payment_ref: "", admin_note: "",
      reviewed_at: null, created_at: new Date().toISOString() };
    db.claims.unshift(c); save(db); return c;
  },
  async uploadClaimFile(claimId, kind, file) {
    const db = load(); const u = need(db);
    const c = (db.claims || []).find((x) => x.id === claimId && x.user_id === u.id);
    if (!c) throw new Error("Claim not found.");
    if (file.size > 1.5 * 1024 * 1024) throw new Error("Demo mode keeps files in this browser, so use one under 1.5 MB.");
    const path = `${u.id}/${claimId}-${kind}-${Date.now()}`;
    db.claimFiles = db.claimFiles || {};
    db.claimFiles[path] = await blobToDataUrl(file);
    c[kind === "receipt" ? "receipt_path" : "proof_path"] = path;
    try { save(db); } catch { throw new Error("Demo storage is full. Use a smaller file."); }
    return path;
  },
  async myClaims() {
    const db = load(); const u = me(db); if (!u) return [];
    return (db.claims || []).filter((c) => c.user_id === u.id).map((c) => ({ ...c, spot: db.spots.find((s) => s.id === c.spot_id) || null }));
  },
  async cancelClaim(id) {
    const db = load(); const u = need(db);
    const c = (db.claims || []).find((x) => x.id === id && x.user_id === u.id && ["submitted", "paid"].includes(x.status));
    if (c) { c.status = "cancelled"; save(db); }
  },
  async allClaims() {
    const db = load(); need(db, ["admin"]);
    const byId = Object.fromEntries(Object.values(db.users).map((x) => [x.id, x]));
    return (db.claims || []).map((c) => ({ ...c, spot: db.spots.find((s) => s.id === c.spot_id) || null, person: byId[c.user_id] || null }));
  },
  async claimFileUrl(path) { const db = load(); return (db.claimFiles || {})[path] || ""; },
  async markClaimPaid(id, ref) {
    const db = load(); need(db, ["admin"]);
    const c = (db.claims || []).find((x) => x.id === id);
    if (!c || c.status !== "submitted") throw new Error("Only a new claim can be marked as paid.");
    Object.assign(c, { status: "paid", paid_at: new Date().toISOString(), payment_ref: ref || "" }); save(db);
  },
  async approveClaim(id, note) {
    const db = load(); need(db, ["admin"]);
    const c = (db.claims || []).find((x) => x.id === id);
    if (!c) throw new Error("Claim not found.");
    if (c.status !== "paid") throw new Error("Mark the payment as received first.");
    Object.assign(c, { status: "approved", reviewed_at: new Date().toISOString(), admin_note: note || "" });
    const spot = db.spots.find((s) => s.id === c.spot_id);
    const until = new Date(); until.setMonth(until.getMonth() + 12);
    if (spot) { spot.owner_id = c.user_id; spot.owner_paid_until = until.toISOString(); }
    const person = Object.values(db.users).find((x) => x.id === c.user_id);
    if (person && person.role === "user") person.role = "owner";
    db.claims.forEach((x) => { if (x.spot_id === c.spot_id && x.id !== id && ["submitted", "paid"].includes(x.status)) Object.assign(x, { status: "rejected", admin_note: "Another owner was verified for this place." }); });
    save(db); emit();
  },
  async rejectClaim(id, note) {
    const db = load(); need(db, ["admin"]);
    const c = (db.claims || []).find((x) => x.id === id && ["submitted", "paid"].includes(x.status));
    if (!c) throw new Error("This claim is already closed.");
    Object.assign(c, { status: "rejected", reviewed_at: new Date().toISOString(), admin_note: note || "" }); save(db);
  },

  // ---- social (demo: kept in this browser) ----
  async updateMyProfile(patch) {
    const db = load(); const u = need(db);
    const me2 = db.users[u.email];
    if (patch.username !== undefined) {
      const name = String(patch.username || "").trim().toLowerCase();
      if (name && !/^[a-z0-9_.]{3,20}$/.test(name)) throw new Error("Usernames are 3 to 20 letters, numbers, dots or underscores.");
      if (name && Object.values(db.users).some((x) => x.id !== u.id && x.username === name)) throw new Error("That username is taken. Try another.");
      if (["admin", "fyndo", "support", "help", "official"].includes(name)) throw new Error("That username is taken. Try another.");
      me2.username = name || null;
    }
    ["name", "bio", "city", "favorites", "is_private"].forEach((k) => { if (patch[k] !== undefined) me2[k] = patch[k]; });
    save(db); emit();
  },
  async uploadAvatar(blob) {
    const db = load(); const u = need(db);
    if (blob.size > 400 * 1024) throw new Error("Demo mode keeps photos in this browser, so use a smaller one.");
    db.users[u.email].avatar_url = await blobToDataUrl(blob);
    try { save(db); } catch { throw new Error("Demo storage is full."); }
    emit(); return db.users[u.email].avatar_url;
  },
  async getProfile(username) {
    const db = load();
    const p = Object.values(db.users).find((x) => x.username && x.username === String(username || "").toLowerCase());
    return p ? publicOf(db, p) : null;
  },
  async searchPeople(q) {
    const db = load(); const t = String(q || "").trim().toLowerCase();
    if (t.length < 2) return [];
    return Object.values(db.users).filter((x) => x.username && (x.username.includes(t) || (x.name || "").toLowerCase().includes(t))).map((x) => publicOf(db, x));
  },
  async isFollowing(id) { const db = load(); const u = me(db); return !!u && (db.follows || []).some((f) => f.follower_id === u.id && f.followee_id === id); },
  async follow(id) {
    const db = load(); const u = need(db);
    if (id === u.id) throw new Error("You can't follow yourself.");
    db.follows = (db.follows || []).filter((f) => !(f.follower_id === u.id && f.followee_id === id));
    db.follows.push({ follower_id: u.id, followee_id: id, created_at: new Date().toISOString() }); save(db);
  },
  async unfollow(id) { const db = load(); const u = need(db); db.follows = (db.follows || []).filter((f) => !(f.follower_id === u.id && f.followee_id === id)); save(db); },
  async userReviews(userId) {
    const db = load();
    return (db.reviews || []).filter((r) => r.user_id === userId).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map((r) => ({ ...decorate(db, r), spot: db.spots.find((s) => s.id === r.spot_id) || null }));
  },
  async userLists(userId) {
    const db = load(); const u = me(db);
    const owner = Object.values(db.users).find((x) => x.id === userId);
    return (db.lists || []).filter((l) => l.user_id === userId && (l.is_public && !(owner && owner.is_private) || (u && u.id === userId)))
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  },
  async myLists() { const db = load(); const u = me(db); return u ? this.userLists(u.id) : []; },
  async getList(id) {
    const db = load(); const u = me(db);
    const l = (db.lists || []).find((x) => x.id === id);
    if (!l) return null;
    const owner = Object.values(db.users).find((x) => x.id === l.user_id);
    if (!(u && u.id === l.user_id) && (!l.is_public || (owner && owner.is_private))) return null;
    return { ...l, owner: owner ? publicOf(db, owner) : null };
  },
  async saveList({ id, title, note, spot_ids, is_public }) {
    const db = load(); const u = need(db);
    const row = { title: String(title || "").trim().slice(0, 80), note: String(note || "").trim().slice(0, 300), spot_ids: (spot_ids || []).slice(0, 50),
      is_public: is_public !== false, updated_at: new Date().toISOString() };
    if (row.title.length < 2) throw new Error("Give your list a name.");
    db.lists = db.lists || [];
    if (id) { const l = db.lists.find((x) => x.id === id && x.user_id === u.id); if (!l) throw new Error("List not found."); Object.assign(l, row); save(db); return id; }
    const nl = { id: "l-" + Date.now(), user_id: u.id, created_at: row.updated_at, ...row };
    db.lists.push(nl); save(db); return nl.id;
  },
  async deleteList(id) { const db = load(); const u = need(db); db.lists = (db.lists || []).filter((x) => !(x.id === id && (x.user_id === u.id || u.role === "admin"))); save(db); },
  async toggleLike(reviewId) {
    const db = load(); const u = need(db);
    db.likes = db.likes || [];
    const has = db.likes.some((l) => l.user_id === u.id && l.review_id === reviewId);
    db.likes = has ? db.likes.filter((l) => !(l.user_id === u.id && l.review_id === reviewId)) : [...db.likes, { user_id: u.id, review_id: reviewId }];
    save(db); return !has;
  },
  async myLikes(reviewIds) { const db = load(); const u = me(db); return u ? (db.likes || []).filter((l) => l.user_id === u.id && reviewIds.includes(l.review_id)).map((l) => l.review_id) : []; },
  async friendsFeed() {
    const db = load(); const u = me(db); if (!u) return [];
    const ids = (db.follows || []).filter((f) => f.follower_id === u.id).map((f) => f.followee_id);
    const people = Object.values(db.users).filter((x) => ids.includes(x.id) && !x.is_private);
    const pid = new Set(people.map((x) => x.id));
    const by = (id) => people.find((x) => x.id === id);
    const items = [
      ...(db.reviews || []).filter((r) => pid.has(r.user_id)).map((r) => ({ kind: "review", at: r.created_at, user_id: r.user_id, username: by(r.user_id).username,
        name: (by(r.user_id).name || "").split(" ")[0], avatar_url: by(r.user_id).avatar_url || "", spot_id: r.spot_id, rating: r.rating, body: r.body, review_id: r.id })),
      ...(db.lists || []).filter((l) => pid.has(l.user_id) && l.is_public).map((l) => ({ kind: "list", at: l.updated_at, user_id: l.user_id, username: by(l.user_id).username,
        name: (by(l.user_id).name || "").split(" ")[0], avatar_url: by(l.user_id).avatar_url || "", body: l.note, list_id: l.id, list_title: l.title })),
    ];
    return items.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 50);
  },
  async adminClearProfile(userId) {
    const db = load(); need(db, ["admin"]);
    const p = Object.values(db.users).find((x) => x.id === userId); if (p) { p.avatar_url = ""; p.bio = ""; save(db); }
  },

  // ---- visitor photos (demo: kept in this browser) ----
  async submitPhoto(spotId, blob, caption = "") {
    const db = load(); const u = need(db);
    if (blob.size > 1.5 * 1024 * 1024) throw new Error("Demo mode keeps photos in this browser, so use a smaller one.");
    db.photoSubs = db.photoSubs || [];
    db.photoSubs.push({ id: "ps-" + Date.now(), spot_id: spotId, user_id: u.id, path: await blobToDataUrl(blob), caption: caption.trim().slice(0, 140),
      status: "pending", created_at: new Date().toISOString() });
    try { save(db); } catch { throw new Error("Demo storage is full. Use a smaller photo."); }
  },
  async pendingPhotos() {
    const db = load(); need(db, ["admin"]);
    const byId = Object.fromEntries(Object.values(db.users).map((x) => [x.id, x]));
    return (db.photoSubs || []).filter((s) => s.status === "pending")
      .map((s) => ({ ...s, url: s.path, spot: db.spots.find((x) => x.id === s.spot_id) || null, person: byId[s.user_id] || null }));
  },
  async approvePhoto(sub) {
    const db = load(); need(db, ["admin"]);
    const spot = db.spots.find((x) => x.id === sub.spot_id);
    const s = (db.photoSubs || []).find((x) => x.id === sub.id);
    if (!spot || !s) throw new Error("Not found.");
    spot.photos = [...(spot.photos || []), s.path];
    spot.photo_info = { ...(spot.photo_info || {}), [s.path]: { source: "user", credit: ((sub.person && sub.person.name) || "").split(" ")[0] || "a Fyndo visitor" } };
    s.status = "approved"; save(db);
  },
  async rejectPhoto(sub) {
    const db = load(); need(db, ["admin"]);
    db.photoSubs = (db.photoSubs || []).filter((x) => x.id !== sub.id); save(db);
  },
  async getSuggestions() { return (load().suggestions || []).filter((s) => s.status === "new").map((s) => ({ ...s, spot: load().spots.find((x) => x.id === s.spot_id) || null })); },
  async applySuggestion(s, patch) {
    await this.updateSpot(s.spot_id, patch);
    const db = load(); const x = (db.suggestions || []).find((y) => y.id === s.id); if (x) { x.status = "applied"; save(db); }
  },
  async dismissSuggestion(id) { const db = load(); const x = (db.suggestions || []).find((y) => y.id === id); if (x) { x.status = "dismissed"; save(db); } },

  // ---- admin ----
  async createSpot(spot) {
    const db = load(); need(db, ["admin"]);
    if (db.spots.some((s) => s.id === spot.id)) throw new Error("A spot with this ID already exists.");
    db.spots.push(spot); save(db);
  },
  async deleteSpot(id) {
    const db = load(); need(db, ["admin"]);
    db.spots = db.spots.filter((s) => s.id !== id); save(db);
  },
  async assignOwner(spotId, email) {
    const db = load(); need(db, ["admin"]);
    const target = db.users[email.trim().toLowerCase()];
    if (!target) throw new Error("No user with that email. Ask them to sign up first.");
    if (target.role === "user") target.role = "owner";
    db.spots.find((s) => s.id === spotId).owner_id = target.id; save(db);
  },
  async resetDemo() { save(fresh()); emit(); },
};

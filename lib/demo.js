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
const canManage = (u, spot) => u.role === "admin" || spot.owner_id === u.id;
const emit = () => listeners.forEach((f) => f());

export const demo = {
  mode: "demo",
  async getSpots() { return load().spots; },
  async getSpot(id) { return load().spots.find((s) => s.id === id) || null; },

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
    if (db.users[e]) throw new Error("That email already has an account.");
    db.users[e] = { id: "u-" + Date.now(), email: e, name, phone, role: "user" };
    db.session = e; save(db); emit();
  },
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
    return (load().reviews || []).filter((r) => r.spot_id === spotId).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
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
  async myCheckins() { return []; },
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
    const { owner_id, verified, id: _i, ...safe } = patch;
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

// LIVE MODE: real database with Supabase (free tier).
// Used automatically when NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.
import { createClient } from "@supabase/supabase-js";

let sb = null;
const client = () =>
  sb || (sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));

function ok({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

async function profile() {
  const { data: { session } } = await client().auth.getSession();
  if (!session) return null;
  const { data } = await client().from("profiles").select("*").eq("id", session.user.id).maybeSingle();
  return data || { id: session.user.id, email: session.user.email, name: "", phone: "", role: "user" };
}
async function need() {
  const u = await profile();
  if (!u) throw new Error("Please log in first.");
  return u;
}

export const live = {
  mode: "live",
  async getSpots() { return ok(await client().from("spots").select("*").order("name")); },
  async getSpot(id) { return ok(await client().from("spots").select("*").eq("id", id).maybeSingle()); },

  // ---- auth ----
  getUser: profile,
  async authToken() {
    const { data: { session } } = await client().auth.getSession();
    return session ? session.access_token : null;
  },
  onAuthChange(cb) {
    const { data } = client().auth.onAuthStateChange(() => cb());
    return () => data.subscription.unsubscribe();
  },
  async signIn(email, password) {
    ok(await client().auth.signInWithPassword({ email: email.trim(), password }));
  },
  async signUp(email, password, name, phone) {
    const data = ok(await client().auth.signUp({ email: email.trim(), password, options: { data: { name, phone } } }));
    if (!data.session) throw new Error("Account created. Check your email to confirm it, then log in.");
  },
  async signOut() { await client().auth.signOut(); },
  async updateProfile({ name, phone }) {
    const u = await need();
    ok(await client().from("profiles").update({ name, phone }).eq("id", u.id));
  },

  // ---- saves & plans ----
  async getSaves() {
    const u = await profile(); if (!u) return [];
    return ok(await client().from("saves").select("spot_id").eq("user_id", u.id)).map((r) => r.spot_id);
  },
  async toggleSave(spotId) {
    const u = await need();
    const has = ok(await client().from("saves").select("spot_id").eq("user_id", u.id).eq("spot_id", spotId));
    if (has.length) { ok(await client().from("saves").delete().eq("user_id", u.id).eq("spot_id", spotId)); return false; }
    ok(await client().from("saves").insert({ user_id: u.id, spot_id: spotId })); return true;
  },
  async getPlans() {
    const u = await profile(); if (!u) return [];
    return ok(await client().from("plans").select("*").eq("user_id", u.id).order("created_at", { ascending: false }));
  },
  async savePlan(title, data) {
    const u = await need();
    ok(await client().from("plans").insert({ user_id: u.id, title, data }));
  },
  async deletePlan(id) { ok(await client().from("plans").delete().eq("id", id)); },

  // ---- reviews, ratings, popular ----
  async getRatings() {
    try {
      const out = {};
      ok(await client().from("spot_ratings").select("*")).forEach((r) =>
        (out[r.spot_id] = { avg: r.avg, count: r.count, visited: r.visited_count || 0 }));
      return out;
    } catch { return {}; } // SQL not run yet: the app still works without ratings
  },
  async getReviews(spotId) {
    try {
      return ok(await client().from("reviews_public").select("*").eq("spot_id", spotId).order("created_at", { ascending: false }));
    } catch {
      try { return ok(await client().from("reviews").select("*").eq("spot_id", spotId).order("created_at", { ascending: false })); }
      catch { return []; }
    }
  },
  async saveReview(spotId, rating, body, extra = {}) {
    const u = await need();
    const row = { spot_id: spotId, user_id: u.id, rating, body: (body || "").trim().slice(0, 600) };
    if (extra.tags) row.tags = extra.tags.slice(0, 6);
    if (typeof extra.would_return === "boolean") row.would_return = extra.would_return;
    ok(await client().from("reviews").upsert(row, { onConflict: "spot_id,user_id" }));
  },
  async deleteReview(id) { ok(await client().from("reviews").delete().eq("id", id)); },
  async getPopular() {
    try { return ok(await client().rpc("popular_spots", { p_limit: 8 })).map((r) => r.spot_id); } catch { return []; }
  },
  async replyReview(id, text) { ok(await client().rpc("reply_review", { p_review: id, p_text: text })); },
  async myReviewCount() {
    const u = await profile(); if (!u) return 0;
    try { const { count } = await client().from("reviews").select("id", { count: "exact", head: true }).eq("user_id", u.id); return count || 0; }
    catch { return 0; }
  },

  // ---- rewards: check-ins ----
  async checkIn(spotId, code) {
    return ok(await client().rpc("check_in", { p_spot: spotId, p_code: code }));
  },
  async myCheckins() {
    const u = await profile(); if (!u) return [];
    try {
      return ok(await client().from("checkins")
        .select("*, spot:spots(id,name,area,category,color,moods,hidden_gem,stamp_goal,stamp_reward)")
        .eq("user_id", u.id).order("created_at", { ascending: false }));
    } catch { return []; }
  },
  async updateCheckin(id, note, spent) {
    ok(await client().rpc("update_checkin", { p_id: id, p_note: note || "", p_spent: spent === "" || spent == null ? null : Number(spent) }));
  },
  async checkinCode(spotId, rotate = false) { return ok(await client().rpc("get_checkin_code", { p_spot: spotId, p_rotate: rotate })); },
  async checkinStats(spotId) {
    try { return ok(await client().rpc("spot_checkin_stats", { p_spot: spotId })); } catch { return null; }
  },

  // ---- feedback & reports ----
  async sendFeedback(spotId, body) {
    const u = await need();
    ok(await client().from("feedback").insert({ spot_id: spotId, user_id: u.id, body: body.trim() }));
  },
  async spotFeedback(spotId) {
    try { return ok(await client().from("feedback").select("id,body,created_at").eq("spot_id", spotId).order("created_at", { ascending: false })); }
    catch { return []; }
  },
  async report(kind, target, reason) {
    const u = await need();
    ok(await client().from("reports").insert({ kind, target, reason: reason.trim(), reporter: u.id }));
  },
  async getReports() {
    try { return ok(await client().from("reports").select("*").order("resolved").order("created_at", { ascending: false })); }
    catch { return []; }
  },
  async resolveReport(id) { ok(await client().from("reports").update({ resolved: true }).eq("id", id)); },

  // ---- collections ----
  async getCollections() {
    try { return ok(await client().from("collections").select("*").order("sort").order("created_at")); } catch { return []; }
  },
  async saveCollection(c) { ok(await client().from("collections").upsert(c, { onConflict: "id" })); },
  async deleteCollection(id) { ok(await client().from("collections").delete().eq("id", id)); },

  // ---- group votes ----
  async createPoll(title, options) { return ok(await client().rpc("create_poll", { p_title: title, p_options: options })); },
  async getPoll(id) { return ok(await client().rpc("get_poll", { p_id: id })); },
  async votePoll(id, voter, choice) { ok(await client().rpc("vote_poll", { p_id: id, p_voter: voter, p_choice: choice })); },

  // ---- bookings ----
  async getSlotCounts(spotId, date) {
    const rows = ok(await client().rpc("slot_counts", { p_spot: spotId, p_date: date }));
    const out = {}; rows.forEach((r) => (out[r.time] = r.taken)); return out;
  },
  async createBooking({ spotId, guests, date, time, note, name, phone }) {
    const u = await need();
    // status, ref code and "slot full" checks are done by the database (see schema.sql)
    return ok(await client().from("bookings").insert({ spot_id: spotId, user_id: u.id, guests, date, time, note,
      guest_name: name, guest_phone: phone, source: "app" }).select().single());
  },
  async myBookings() {
    const u = await profile(); if (!u) return [];
    return ok(await client().from("bookings").select("*, spot:spots(*)").eq("user_id", u.id)
      .order("date", { ascending: false }).order("time", { ascending: false }));
  },
  async cancelBooking(id) { ok(await client().from("bookings").update({ status: "cancelled" }).eq("id", id)); },

  // ---- owner ----
  async ownerSpots() {
    const u = await need();
    let q = client().from("spots").select("*").order("name");
    if (u.role !== "admin") q = q.eq("owner_id", u.id);
    return ok(await q);
  },
  async spotBookings(spotId) {
    return ok(await client().from("bookings").select("*").eq("spot_id", spotId)
      .order("date").order("time"));
  },
  async updateBookingStatus(id, status) { ok(await client().from("bookings").update({ status }).eq("id", id)); },
  async addWalkIn(spotId, { name, phone, guests, date, time, note, source }) {
    ok(await client().from("bookings").insert({ spot_id: spotId, user_id: null, guest_name: name, guest_phone: phone,
      guests, date, time, note, source: source || "phone", status: "confirmed" }));
  },
  async updateSpot(id, patch) {
    const { id: _i, created_at, ...rest } = patch;
    ok(await client().from("spots").update(rest).eq("id", id));
  },
  async spotStats(spotId) {
    return ok(await client().rpc("spot_stats", { p_spot: spotId }))[0] || { saves: 0, bookings: 0, arrived: 0, noShows: 0 };
  },

  // ---- admin ----
  async createSpot(spot) { ok(await client().from("spots").insert(spot)); },
  async deleteSpot(id) { ok(await client().from("spots").delete().eq("id", id)); },
  async assignOwner(spotId, email) {
    ok(await client().rpc("assign_owner", { p_spot: spotId, p_email: email.trim().toLowerCase() }));
  },
  async resetDemo() {},
};

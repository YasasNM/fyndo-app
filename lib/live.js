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

// LIVE MODE: real database with Supabase (free tier).
// Used automatically when NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.
import { createClient } from "@supabase/supabase-js";

let sb = null;
const client = () =>
  sb || (sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));

// Supabase auth errors in plain words. e.code lets the login page offer the right next step.
function authError(error) {
  const m = String(error.message || "");
  const code = error.code || "";
  let e;
  if (code === "email_not_confirmed" || /email not confirmed/i.test(m)) { e = new Error("Please confirm your email first. We sent you a link when you signed up."); e.code = "unconfirmed"; }
  else if (code === "invalid_credentials" || /invalid login credentials/i.test(m)) { e = new Error("Email or password is wrong."); e.code = "invalid"; }
  else if (code === "user_already_exists" || /already registered/i.test(m)) { e = new Error("That email already has an account. Log in, or reset your password."); e.code = "exists"; }
  else if (code === "weak_password" || /password should/i.test(m)) { e = new Error("Choose a stronger password: at least 8 characters, with letters and numbers."); e.code = "weak"; }
  else if (code === "over_email_send_rate_limit" || /rate limit|too many/i.test(m)) { e = new Error("Too many emails were sent. Wait a few minutes and try again."); e.code = "rate"; }
  else if (code === "same_password" || /different from the old/i.test(m)) { e = new Error("Your new password must be different from the old one."); e.code = "same"; }
  else { e = new Error(m || "Something went wrong. Please try again."); e.code = code || "other"; }
  return e;
}

function ok({ data, error }) {
  if (error) {
    // New columns added in a later SQL file that has not been run yet.
    if (/(photo_info|website|owner_paid_until)/.test(error.message) && /column|schema cache/i.test(error.message))
      throw new Error("The database needs an update: run supabase/schema_v5.sql in the Supabase SQL Editor, then try again.");
    throw new Error(error.message);
  }
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
    const { error } = await client().auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw authError(error);
  },
  // Returns { needsConfirm: true } when Supabase sent a confirmation email (Confirm email is on).
  async signUp(email, password, name, phone) {
    const { data, error } = await client().auth.signUp({ email: email.trim(), password,
      options: { data: { name, phone }, emailRedirectTo: `${window.location.origin}/login/?confirmed=1` } });
    if (error) throw authError(error);
    // Supabase hides whether an email is already registered: an existing address comes back with no identities.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      const e = new Error("That email already has an account. Log in, or reset your password."); e.code = "exists"; throw e;
    }
    return { needsConfirm: !data.session };
  },
  async resendConfirmation(email) {
    const { error } = await client().auth.resend({ type: "signup", email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/login/?confirmed=1` } });
    if (error) throw authError(error);
  },
  async sendPasswordReset(email) {
    const { error } = await client().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password/` });
    if (error) throw authError(error);
  },
  async updatePassword(password) {
    const { error } = await client().auth.updateUser({ password });
    if (error) throw authError(error);
  },
  // Calls cb(true) once the page holds a password-recovery session from the email link, or cb(false) if it has none.
  watchRecovery(cb) {
    let done = false;
    const { data } = client().auth.onAuthStateChange((event, session) => {
      if (!done && (event === "PASSWORD_RECOVERY" || (event === "INITIAL_SESSION" && session && /type=recovery/.test(window.location.hash)))) { done = true; cb(true); }
    });
    const t = setTimeout(async () => {
      if (done) return;
      const { data: { session } } = await client().auth.getSession();
      done = true; cb(Boolean(session));
    }, 2500);
    return () => { clearTimeout(t); data.subscription.unsubscribe(); };
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
    if (extra.visit_type) row.visit_type = extra.visit_type;
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
    const rows = ok(await client().from("spots").update(rest).eq("id", id).select("id"));
    // The database quietly skips the change when an owner's yearly plan has ended.
    if (!rows || !rows.length) throw new Error("Changes were not saved. If your owner plan has ended, email fyndolk.official@gmail.com to renew it.");
  },
  async spotStats(spotId) {
    return ok(await client().rpc("spot_stats", { p_spot: spotId }))[0] || { saves: 0, bookings: 0, arrived: 0, noShows: 0 };
  },

  // ---- Fyndo's own photos (Supabase Storage, bucket "spot-photos") ----
  async addSpotPhoto(spotId, blob, current = []) {
    const path = `${spotId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await client().storage.from("spot-photos").upload(path, blob, { contentType: "image/jpeg", upsert: false, cacheControl: "31536000" });
    if (error) throw new Error(/row-level|policy|not found|bucket/i.test(error.message)
      ? "Photo upload is not allowed here. Only admins, or the verified owner of this place, can add photos." : error.message);
    const url = client().storage.from("spot-photos").getPublicUrl(path).data.publicUrl;
    const list = [...current, url];
    ok(await client().from("spots").update({ photos: list }).eq("id", spotId));
    return list;
  },
  async removeSpotPhoto(spotId, url, current = [], index = current.indexOf(url)) {
    const marker = "/spot-photos/";
    const i = url.indexOf(marker);
    if (i >= 0) await client().storage.from("spot-photos").remove([decodeURIComponent(url.slice(i + marker.length))]);
    const list = current.filter((_, k) => k !== index);
    ok(await client().from("spots").update({ photos: list }).eq("id", spotId));
    return list;
  },

  // ---- owner claims (verification + yearly fee + admin approval) ----
  async submitClaim({ spotId, contact_name, job_role, phone, business_email, reg_no, note }) {
    const u = await need();
    const { data, error } = await client().from("owner_claims").insert({ spot_id: spotId, user_id: u.id, contact_name: contact_name.trim(), job_role,
      phone: phone.trim(), business_email: (business_email || "").trim(), reg_no: (reg_no || "").trim(), note: (note || "").trim() }).select().single();
    if (error) throw new Error(/owner_claims_one_open|duplicate/i.test(error.message) ? "You already have an open claim for this place. See My claims."
      : /relation .*owner_claims|does not exist/i.test(error.message) ? "Owner claims are not switched on yet. Please try again later." : error.message);
    return data;
  },
  async uploadClaimFile(claimId, kind, file) {
    const u = await need();
    const ext = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${u.id}/${claimId}-${kind}-${Date.now()}.${ext}`;
    const { error } = await client().storage.from("owner-proofs").upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
    if (error) throw new Error(/size|large/i.test(error.message) ? "That file is too big. Use one under 5 MB." : error.message);
    ok(await client().from("owner_claims").update({ [kind === "receipt" ? "receipt_path" : "proof_path"]: path }).eq("id", claimId));
    return path;
  },
  async myClaims() {
    const u = await profile(); if (!u) return [];
    try { return ok(await client().from("owner_claims").select("*, spot:spots(id,name,area,owner_paid_until)").eq("user_id", u.id).order("created_at", { ascending: false })); }
    catch { return []; }
  },
  async cancelClaim(id) { ok(await client().from("owner_claims").update({ status: "cancelled" }).eq("id", id)); },
  async allClaims() {
    try { return ok(await client().from("owner_claims").select("*, spot:spots(id,name,area,owner_id), person:profiles(email,name)").order("created_at", { ascending: false })); }
    catch { return []; }
  },
  async claimFileUrl(path) {
    const { data, error } = await client().storage.from("owner-proofs").createSignedUrl(path, 600);
    if (error) throw new Error(error.message);
    return data.signedUrl;
  },
  async markClaimPaid(id, ref) { ok(await client().rpc("mark_claim_paid", { p_id: id, p_ref: ref || "" })); },
  async approveClaim(id, note) { ok(await client().rpc("approve_claim", { p_id: id, p_note: note || "" })); },
  async rejectClaim(id, note) { ok(await client().rpc("reject_claim", { p_id: id, p_note: note || "" })); },

  // ---- admin ----
  async createSpot(spot) { ok(await client().from("spots").insert(spot)); },
  async deleteSpot(id) { ok(await client().from("spots").delete().eq("id", id)); },
  async assignOwner(spotId, email) {
    ok(await client().rpc("assign_owner", { p_spot: spotId, p_email: email.trim().toLowerCase() }));
  },
  async resetDemo() {},
};

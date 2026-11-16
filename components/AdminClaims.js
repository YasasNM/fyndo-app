"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Ico } from "./Icon";
import { db } from "@/lib/data";
import { CONFIG } from "@/lib/config";

export const CLAIM_STATUS = {
  submitted: { label: "Waiting for payment", cls: "warn" },
  paid: { label: "Paid, ready to review", cls: "book" },
  approved: { label: "Approved", cls: "" },
  rejected: { label: "Not approved", cls: "red" },
  cancelled: { label: "Cancelled", cls: "grey" },
};
const lkr = (n) => "LKR " + Number(n || 0).toLocaleString("en-US");

// Admin: restaurant owners asking to manage their page. Check the proof, mark the bank payment, then approve.
export default function AdminClaims({ onChange }) {
  const [list, setList] = useState(null);
  const [view, setView] = useState("open");
  const [msg, setMsg] = useState("");
  const load = () => db.allClaims().then(setList).catch((e) => { setMsg(e.message); setList([]); });
  useEffect(() => { load(); }, []);

  const act = async (fn, done) => {
    setMsg("");
    try { await fn(); setMsg(done); load(); onChange && onChange(); } catch (e) { setMsg(e.message); }
  };
  const openFile = async (path) => {
    try { const url = await db.claimFileUrl(path); if (url) window.open(url, "_blank", "noopener"); } catch (e) { setMsg(e.message); }
  };

  if (!list) return <div className="loading">Loading claims...</div>;
  const open = list.filter((c) => c.status === "submitted" || c.status === "paid");
  const shown = view === "open" ? open : list;

  return (
    <>
      <p className="small muted" style={{ marginTop: 0 }}>
        Owners pay {lkr(CONFIG.owner.feeLkr)} for {CONFIG.owner.months} months by bank transfer and email {CONFIG.email}.
        Check their proof, mark the payment when it reaches the bank, then approve. Approving makes them the owner for 12 months.
      </p>
      <div className="seg" role="group" aria-label="Which claims">
        <button className={view === "open" ? "on" : ""} aria-pressed={view === "open"} onClick={() => setView("open")}>Open ({open.length})</button>
        <button className={view === "all" ? "on" : ""} aria-pressed={view === "all"} onClick={() => setView("all")}>All ({list.length})</button>
      </div>
      {msg && <div className={"alert" + (/^(Marked|Approved|Rejected)/.test(msg) ? " ok" : "")}>{msg}</div>}
      <div className="stack" style={{ marginTop: 12 }}>
        {shown.map((c) => {
          const st = CLAIM_STATUS[c.status] || { label: c.status, cls: "grey" };
          return (
            <div key={c.id} className="card pad claimcard">
              <div className="row between">
                <div>
                  <b>{c.spot ? c.spot.name : c.spot_id}</b> <span className="small muted">{c.spot && c.spot.area}</span>
                  <div className="small muted">Ref {c.ref}, sent {new Date(c.created_at).toLocaleDateString("en-GB")}</div>
                </div>
                <span className={"badge " + st.cls}>{st.label}</span>
              </div>
              <dl className="claimdl">
                <dt>Person</dt><dd>{c.contact_name} ({c.job_role}){c.person && c.person.email ? <>, account {c.person.email}</> : null}</dd>
                <dt>Phone</dt><dd><a className="linkbtn" href={`tel:${c.phone}`}>{c.phone}</a></dd>
                {c.business_email && (<><dt>Business email</dt><dd>{c.business_email}</dd></>)}
                {c.reg_no && (<><dt>Business reg. no.</dt><dd>{c.reg_no}</dd></>)}
                {c.note && (<><dt>Note</dt><dd>{c.note}</dd></>)}
                <dt>Proof</dt><dd>{c.proof_path ? <button className="linkbtn" onClick={() => openFile(c.proof_path)}>Open proof</button> : <span className="muted">Not uploaded yet</span>}</dd>
                <dt>Receipt</dt><dd>{c.receipt_path ? <button className="linkbtn" onClick={() => openFile(c.receipt_path)}>Open receipt</button> : <span className="muted">Not uploaded (may come by email)</span>}</dd>
                {c.payment_ref && (<><dt>Payment</dt><dd>{c.payment_ref}{c.paid_at ? `, ${new Date(c.paid_at).toLocaleDateString("en-GB")}` : ""}</dd></>)}
                {c.admin_note && (<><dt>Admin note</dt><dd>{c.admin_note}</dd></>)}
              </dl>
              <div className="row" style={{ gap: 8 }}>
                {c.status === "submitted" && (
                  <button className="btn sm" onClick={() => { const ref = window.prompt(`Payment of ${lkr(c.fee_lkr)} received for ${c.ref}. Bank reference or note:`, ""); if (ref !== null) act(() => db.markClaimPaid(c.id, ref), `Marked ${c.ref} as paid.`); }}>
                    <Ico n="receipt" size={16} />Payment received</button>
                )}
                {c.status === "paid" && (
                  <button className="btn sm dark" onClick={() => { if (window.confirm(`Approve ${c.contact_name} as the owner of ${c.spot ? c.spot.name : "this place"} for 12 months?`)) act(() => db.approveClaim(c.id, ""), `Approved ${c.ref}.`); }}>
                    <Ico n="check" size={16} />Approve owner</button>
                )}
                {(c.status === "submitted" || c.status === "paid") && (
                  <button className="btn sm danger" onClick={() => { const why = window.prompt(`Why is this claim not approved? The owner will see this.${c.status === "paid" ? " (They have paid: remember to refund them.)" : ""}`, "We could not confirm you run this place."); if (why) act(() => db.rejectClaim(c.id, why), `Rejected ${c.ref}.`); }}>
                    Reject</button>
                )}
                {c.spot && <Link className="linkbtn" href={`/spot?id=${c.spot.id}`}>View page</Link>}
              </div>
            </div>
          );
        })}
        {shown.length === 0 && <div className="empty"><div className="big"><Ico n="store" size={30} /></div>{view === "open" ? "No claims waiting." : "No owner claims yet."}</div>}
      </div>
    </>
  );
}

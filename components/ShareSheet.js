"use client";
import { useEffect, useRef, useState } from "react";
import { Ico } from "./Icon";

// "Share" for stories: makes the image, then offers the phone's share sheet (Instagram, Facebook, WhatsApp stories),
// saving the image, and link shares. make() returns a Promise<Blob>.
export default function ShareSheet({ label = "Share", make, title, text, url, fileName = "fyndo-story.png", className = "btn sm ghost" }) {
  const dlg = useRef(null);
  const [img, setImg] = useState(null); // { blob, href }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => () => { if (img) URL.revokeObjectURL(img.href); }, [img]);

  const open = async () => {
    setBusy(true); setMsg("");
    try {
      const blob = await make();
      setImg({ blob, href: URL.createObjectURL(blob) });
      dlg.current && dlg.current.showModal();
    } catch { setMsg("Could not make the image. Try again."); }
    setBusy(false);
  };
  const file = () => new File([img.blob], fileName, { type: "image/png" });
  const canShareFile = () => { try { return !!(navigator.canShare && navigator.canShare({ files: [file()] })); } catch { return false; } };
  const shareImage = async () => {
    try { await navigator.share({ files: [file()], title, text }); }
    catch (e) { if (e && e.name !== "AbortError") setMsg("Sharing did not work here. Save the image and post it from your gallery."); }
  };
  const fullUrl = url ? new URL(url, window.location.origin).href : window.location.href;
  const copy = async () => { try { await navigator.clipboard.writeText(fullUrl); setMsg("Link copied."); } catch { setMsg("Could not copy the link."); } };

  return (
    <>
      <button type="button" className={className} onClick={open} disabled={busy}><Ico n="share" size={16} />{busy ? "Making image..." : label}</button>
      {msg && !img && <span className="small muted" style={{ marginLeft: 8 }}>{msg}</span>}
      <dialog ref={dlg} className="sharesheet" aria-label="Share" onClose={() => setMsg("")}>
        {img && (
          <div className="sharesheet-in">
            <img src={img.href} alt={title || "Share image"} className="sharesheet-img" />
            <div className="sharesheet-actions">
              {typeof navigator !== "undefined" && navigator.share && canShareFile() && (
                <button className="btn" onClick={shareImage}><Ico n="share" size={18} />Share to stories</button>
              )}
              <a className="btn ghost" href={img.href} download={fileName}><Ico n="plus" size={18} />Save image</a>
              <div className="row small" style={{ gap: 14, justifyContent: "center" }}>
                <a className="linkbtn" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`} target="_blank" rel="noreferrer">Facebook</a>
                <a className="linkbtn" href={`https://wa.me/?text=${encodeURIComponent((text ? text + " " : "") + fullUrl)}`} target="_blank" rel="noreferrer">WhatsApp</a>
                <button className="linkbtn" onClick={copy}>Copy link</button>
              </div>
              <p className="small muted" style={{ margin: 0 }}>On your phone, choose Instagram, then Story. On a computer, save the image and post it from your phone.</p>
              {msg && <div className="small" role="status">{msg}</div>}
              <button className="btn ghost sm" onClick={() => dlg.current.close()}>Close</button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}

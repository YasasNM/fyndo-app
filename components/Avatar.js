// A person's profile photo, or the first letter of their name on a plate when there is none.
export default function Avatar({ src, name, size = 40 }) {
  const letter = String(name || "?").trim().charAt(0).toUpperCase() || "?";
  return src ? (
    <img className="avatar" src={src} alt="" width={size} height={size} style={{ width: size, height: size }} loading="lazy" referrerPolicy="no-referrer" />
  ) : (
    <span className="avatar avatar-letter" aria-hidden="true" style={{ width: size, height: size, fontSize: Math.round(size * 0.48) }}>{letter}</span>
  );
}

// Login and sign-up banner: a candlelit rooftop table over the Colombo coast at blue hour,
// with the Fyndo mark in the dark sky.
export default function AuthArt() {
  return (
    <figure className="authart">
      <img
        src="/img/login-rooftop-1600.jpg"
        srcSet="/img/login-rooftop-800.jpg 800w, /img/login-rooftop-1600.jpg 1600w"
        sizes="(max-width: 760px) 100vw, 560px"
        alt="A candlelit table for two on a rooftop above the sea, with city lights along the coast"
        decoding="async"
        fetchPriority="high"
      />
      <div className="authart-brand">
        <svg viewBox="0 0 40 48" width="26" height="31" aria-hidden="true">
          <path d="M20 47C14 39 3 30 3 19A17 17 0 0 1 37 19C37 30 26 39 20 47Z" fill="#ffffff" />
          <path d="M16.5 12.5V25.5L27.5 19Z" fill="#14181c" />
        </svg>
        <span>
          <b>Fyndo</b>
          <small>The night, planned.</small>
        </span>
      </div>
    </figure>
  );
}

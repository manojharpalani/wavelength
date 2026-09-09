// Embedded directly in the home page (see docs/DECISIONS.md) — a plain,
// visible YouTube iframe, not a hidden/autoplaying player. Nothing plays
// until a visitor presses the embed's own play control; there's no
// autoplay parameter and no imperative IFrame API.
const HOME_VIDEO_ID = "I2Do309e4YU";

export function HomeVideoEmbed() {
  return (
    <section className="video-section">
      <div className="video-embed">
        <iframe
          src={`https://www.youtube.com/embed/${HOME_VIDEO_ID}`}
          title="Wavelength"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    </section>
  );
}

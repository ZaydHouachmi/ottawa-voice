// Friendly maple-leaf mascot. The leaf silhouette itself uses the real,
// documented geometry of Canada's national flag (public reference: Wikimedia
// Commons' Flag of Canada SVG) rather than a hand-guessed approximation —
// several earlier attempts at inventing leaf coordinates by hand read as a
// starburst or a clover, not a maple leaf, until checked against the real
// shape. Recolored to the site's own navy (not flag red/white) and given a
// simple face, so it reads as "our mascot, inspired by the symbol" rather
// than a flag reproduction — deliberate, since it sits right under the
// "not an official government service" banner and that distinction matters.
//
// `leafColor`/`faceColor` default to the header's navy-on-nothing look, but
// accept overrides so the same mascot can sit inside the mic button (where
// it needs to match that button's own fill/background swap) or the done
// state (recolored to the "success" green already used for filled fields)
// instead of every context fighting the hardcoded navy.
export function Mascot({
  className,
  listening = false,
  leafColor = "var(--color-accent)",
  faceColor = "var(--color-ground)",
}: {
  className?: string;
  listening?: boolean;
  leafColor?: string;
  faceColor?: string;
}) {
  return (
    <svg viewBox="0 0 4800 4800" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        fill={leafColor}
        d="m2490 4430-45-863a95 95 0 0 1 111-98l859 151-116-320a65 65 0 0 1 20-73l941-762-212-99a65 65 0 0 1-34-79l186-572-542 115a65 65 0 0 1-73-38l-105-247-423 454a65 65 0 0 1-111-57l204-1052-327 189a65 65 0 0 1-91-27l-332-652-332 652a65 65 0 0 1-91 27l-327-189 204 1052a65 65 0 0 1-111 57l-423-454-105 247a65 65 0 0 1-73 38l-542-115 186 572a65 65 0 0 1-34 79l-212 99 941 762a65 65 0 0 1 20 73l-116 320 859-151a95 95 0 0 1 111 98l-45 863z"
      />
      <circle cx="2150" cy="1750" r="130" fill={faceColor} />
      <circle cx="2650" cy="1750" r="130" fill={faceColor} />
      {listening ? (
        // Open "o" mouth while listening/speaking, instead of the resting
        // smile - the same mascot reacting to what it's doing, not just
        // decoration.
        <circle cx="2400" cy="2130" r="110" fill={faceColor} />
      ) : (
        <path
          d="M2050 2100c150 160 550 160 700 0"
          stroke={faceColor}
          strokeWidth="120"
          strokeLinecap="round"
          fill="none"
        />
      )}
    </svg>
  );
}

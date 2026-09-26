// Friendly maple-leaf mascot. The leaf silhouette itself uses the real,
// documented geometry of Canada's national flag (public reference: Wikimedia
// Commons' Flag of Canada SVG) rather than a hand-guessed approximation —
// several earlier attempts at inventing leaf coordinates by hand read as a
// starburst or a clover, not a maple leaf, until checked against the real
// shape. Recolored to the site's own navy (not flag red/white) and given a
// simple face, so it reads as "our mascot, inspired by the symbol" rather
// than a flag reproduction — deliberate, since it sits right under the
// "not an official government service" banner and that distinction matters.
export function Mascot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 4800 4800" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        fill="var(--color-accent)"
        d="m2490 4430-45-863a95 95 0 0 1 111-98l859 151-116-320a65 65 0 0 1 20-73l941-762-212-99a65 65 0 0 1-34-79l186-572-542 115a65 65 0 0 1-73-38l-105-247-423 454a65 65 0 0 1-111-57l204-1052-327 189a65 65 0 0 1-91-27l-332-652-332 652a65 65 0 0 1-91 27l-327-189 204 1052a65 65 0 0 1-111 57l-423-454-105 247a65 65 0 0 1-73 38l-542-115 186 572a65 65 0 0 1-34 79l-212 99 941 762a65 65 0 0 1 20 73l-116 320 859-151a95 95 0 0 1 111 98l-45 863z"
      />
      <circle cx="2150" cy="1750" r="130" fill="var(--color-ground)" />
      <circle cx="2650" cy="1750" r="130" fill="var(--color-ground)" />
      <path
        d="M2050 2100c150 160 550 160 700 0"
        stroke="var(--color-ground)"
        strokeWidth="120"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

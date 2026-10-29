import type { SocialId } from "@/lib/social";

export function BrandIcon({ id, size = 24 }: { id: SocialId; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true as const,
  };

  switch (id) {
    case "instagram":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="5.5" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...common}>
          <path
            d="M14 3v9.4a4.3 4.3 0 1 1-3.6-4.25v2.4a1.95 1.95 0 1 0 1.4 1.85V3h2.2Zm0 0c.4 2.4 1.85 3.8 4.2 4.1v2.25c-1.7-.05-3.1-.6-4.2-1.6"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "youtube":
      return (
        <svg {...common}>
          <rect x="2.5" y="5" width="19" height="14" rx="4.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M10 9.3 15.5 12 10 14.7V9.3Z" fill="currentColor" />
        </svg>
      );
    case "x":
      return (
        <svg {...common}>
          <path
            d="M4 4l16 16M20 4 4 20"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
        </svg>
      );
    case "reddit":
      return (
        <svg {...common}>
          <circle cx="12" cy="13" r="7.2" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="9.4" cy="12.4" r="1.1" fill="currentColor" />
          <circle cx="14.6" cy="12.4" r="1.1" fill="currentColor" />
          <path
            d="M9.2 15.4c.8.8 1.7 1.2 2.8 1.2s2-.4 2.8-1.2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="17.4" cy="6.6" r="1.4" fill="currentColor" />
          <path d="M12.8 5.6 15 5.2l-.5 2.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...common}>
          <path
            d="M14.5 21v-7.2h2.5l.4-2.9h-2.9V9c0-.8.25-1.4 1.45-1.4h1.55V5a20 20 0 0 0-2.25-.12c-2.25 0-3.75 1.35-3.75 3.85V10.9H9v2.9h3.05V21h2.45Z"
            fill="currentColor"
          />
        </svg>
      );
    default:
      return null;
  }
}

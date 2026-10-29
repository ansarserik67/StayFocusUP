import Link from "next/link";

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className="flex-none"
    >
      <defs>
        <linearGradient id="sf-mark" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22D3EE" />
          <stop offset="0.55" stopColor="#10B981" />
          <stop offset="1" stopColor="#34D399" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="14" fill="url(#sf-mark)" opacity="0.16" />
      <rect
        x="2.75"
        y="2.75"
        width="42.5"
        height="42.5"
        rx="13.25"
        stroke="url(#sf-mark)"
        strokeWidth="1.5"
        opacity="0.7"
      />
      <path
        d="M24 11c5.5 4.2 9 9 9 14.1C33 31.6 29 36 24 36s-9-4.4-9-10.9C15 20 18.5 15.2 24 11Z"
        fill="url(#sf-mark)"
      />
      <circle cx="24" cy="26" r="4.4" fill="#08211b" />
      <circle cx="25.6" cy="24.4" r="1.35" fill="#CFFAFE" />
      <path
        d="M24 36v4"
        stroke="url(#sf-mark)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5" aria-label="StayFocus">
      <span className="transition-transform duration-300 group-hover:rotate-[-6deg]">
        <LogoMark size={36} />
      </span>
      <span className="leading-none">
        <span className="font-display block text-[16px] font-extrabold tracking-tight text-ink">
          StayFocus
        </span>
        <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-mute">
          scroll less · live more
        </span>
      </span>
    </Link>
  );
}

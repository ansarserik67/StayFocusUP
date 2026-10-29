"use client";

import { useState } from "react";

/** Brand artwork used whenever the signed-in profile has no picture. */
const DEFAULT_AVATAR = "/avatar.png";

export function Avatar({
  name,
  picture,
  size = 36,
}: {
  name: string;
  picture?: string;
  size?: number;
}) {
  const [pictureFailed, setPictureFailed] = useState(false);
  const [defaultFailed, setDefaultFailed] = useState(false);
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "SF";

  // Real profile picture → local artwork → initials, so the avatar is never
  // a broken image even when a remote avatar_url disappears.
  const source =
    picture && !pictureFailed ? picture : defaultFailed ? null : DEFAULT_AVATAR;

  if (source) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={source}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() =>
          picture && !pictureFailed ? setPictureFailed(true) : setDefaultFailed(true)
        }
        className="flex-none rounded-full object-cover ring-1 ring-line"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="font-display flex flex-none items-center justify-center rounded-full bg-gradient-to-br from-emerald to-cyan text-[11px] font-extrabold text-[#052019]"
      style={{ width: size, height: size }}
    >
      {initials}
    </span>
  );
}

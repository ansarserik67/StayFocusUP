export type SocialId =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "x"
  | "reddit"
  | "facebook";

export interface SocialApp {
  id: SocialId;
  name: string;
  url: string;
  /** Short descriptor shown under the name. */
  tagline: string;
  color: string;
  tint: string;
}

export const SOCIAL_APPS: SocialApp[] = [
  {
    id: "instagram",
    name: "Instagram",
    url: "https://www.instagram.com",
    tagline: "Reels",
    color: "#E1306C",
    tint: "linear-gradient(135deg,#F58529,#DD2A7B 55%,#8134AF)",
  },
  {
    id: "tiktok",
    name: "TikTok",
    url: "https://www.tiktok.com",
    tagline: "For You",
    color: "#25F4EE",
    tint: "linear-gradient(135deg,#111827,#25F4EE 130%)",
  },
  {
    id: "youtube",
    name: "YouTube",
    url: "https://www.youtube.com",
    tagline: "Shorts",
    color: "#FF0033",
    tint: "linear-gradient(135deg,#FF0033,#7f1d1d)",
  },
  {
    id: "x",
    name: "X",
    url: "https://x.com",
    tagline: "Timeline",
    color: "#E7E9EA",
    tint: "linear-gradient(135deg,#1f2937,#0b0f19)",
  },
  {
    id: "reddit",
    name: "Reddit",
    url: "https://www.reddit.com",
    tagline: "Home feed",
    color: "#FF4500",
    tint: "linear-gradient(135deg,#FF4500,#7c2d12)",
  },
  {
    id: "facebook",
    name: "Facebook",
    url: "https://www.facebook.com",
    tagline: "Feed",
    color: "#1877F2",
    tint: "linear-gradient(135deg,#1877F2,#1e3a8a)",
  },
];

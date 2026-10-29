import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StayFocus — scroll less, live more",
    short_name: "StayFocus",
    description:
      "One hour of social feeds a day. Earn extra minutes with camera-verified push-ups, squats and jumping jacks.",
    id: "/",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait-primary",
    background_color: "#0F172A",
    theme_color: "#0F172A",
    lang: "en",
    dir: "ltr",
    categories: ["health", "productivity", "lifestyle", "fitness"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Workout AI",
        short_name: "Workout",
        description: "Earn 30 minutes with a camera-verified set",
        url: "/workout",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Social Hub",
        short_name: "Feeds",
        description: "Open a feed with your remaining budget",
        url: "/social",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}

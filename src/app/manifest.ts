import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Finance Tracker",
    short_name: "Finance",
    description: "Track income, expenses, and investments across every currency and stream.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f1419",
    theme_color: "#0f1419",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

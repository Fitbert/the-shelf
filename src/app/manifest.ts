import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Shelf",
    short_name: "The Shelf",
    description: "Your records, spinning — a personal vinyl collection and turntable.",
    start_url: "/",
    display: "standalone",
    background_color: "#FBF9EE",
    theme_color: "#1E6B78",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/icon-512", sizes: "512x512", type: "image/png" },
    ],
  };
}

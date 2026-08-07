import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Crumbs",
    short_name: "Crumbs",
    description: "Follow a private trail of crumbs from the moments that made the trip.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f1e8",
    theme_color: "#f6f1e8",
    icons: [
      {
        src: "/icon.png",
        sizes: "1600x1600",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "1600x1600",
        type: "image/png",
      },
    ],
  };
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Crumbs",
    short_name: "Crumbs",
    description:
      "Post your trip as a map of photos and notes. Friends follow along with a 5-character code.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f4f0",
    theme_color: "#f4f4f0",
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

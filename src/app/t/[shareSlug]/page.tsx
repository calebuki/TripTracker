import type { Metadata } from "next";

import { ViewerTripScreen } from "@/components/screens/viewer-trip-screen";

export const metadata: Metadata = {
  title: "Shared Trip",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function SharedTripPage({
  params,
}: {
  params: Promise<{ shareSlug: string }>;
}) {
  const { shareSlug } = await params;

  return <ViewerTripScreen shareSlug={shareSlug} />;
}

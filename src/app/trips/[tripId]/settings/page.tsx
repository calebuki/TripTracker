import type { Metadata } from "next";

import { TripSettingsScreen } from "@/components/screens/trip-settings-screen";

export const metadata: Metadata = {
  title: "Trip Settings",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function TripSettingsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  return <TripSettingsScreen tripId={tripId} />;
}

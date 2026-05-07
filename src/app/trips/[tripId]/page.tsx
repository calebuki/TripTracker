import type { Metadata } from "next";

import { OwnerTripScreen } from "@/components/screens/owner-trip-screen";

export const metadata: Metadata = {
  title: "Traveler Trip",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function TripPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ capture?: string }>;
}) {
  const { tripId } = await params;
  const { capture } = await searchParams;

  return (
    <OwnerTripScreen
      tripId={tripId}
      autoOpenCapture={capture === "1" || capture === "true"}
    />
  );
}

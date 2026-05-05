import { OwnerTripScreen } from "@/components/screens/owner-trip-screen";

export default async function TripPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  return <OwnerTripScreen tripId={tripId} />;
}

import { TripSettingsScreen } from "@/components/screens/trip-settings-screen";

export default async function TripSettingsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  return <TripSettingsScreen tripId={tripId} />;
}

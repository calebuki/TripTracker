import { ViewerTripScreen } from "@/components/screens/viewer-trip-screen";

export default async function SharedTripPage({
  params,
}: {
  params: Promise<{ shareSlug: string }>;
}) {
  const { shareSlug } = await params;

  return <ViewerTripScreen shareSlug={shareSlug} />;
}

import type { Metadata } from "next";

import { CreateTripScreen } from "@/components/screens/create-trip-screen";

export const metadata: Metadata = {
  title: "Create Trip",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CreateTripPage() {
  return <CreateTripScreen />;
}

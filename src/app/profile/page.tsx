import type { Metadata } from "next";

import { ProfileScreen } from "@/components/screens/profile-screen";

export const metadata: Metadata = {
  title: "Traveler Profile",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProfilePage() {
  return <ProfileScreen />;
}

import type { Metadata } from "next";

import { AccountSettingsScreen } from "@/components/screens/account-settings-screen";

export const metadata: Metadata = {
  title: "Account Settings",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SettingsPage() {
  return <AccountSettingsScreen />;
}

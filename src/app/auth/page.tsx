import type { Metadata } from "next";

import { AuthScreen } from "@/components/screens/auth-screen";

export const metadata: Metadata = {
  title: "Traveler Sign-In",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthPage() {
  return <AuthScreen />;
}

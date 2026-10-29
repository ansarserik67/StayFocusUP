import type { Metadata } from "next";

import { OfflineNotice } from "@/components/pwa/OfflineNotice";

export const metadata: Metadata = {
  title: "Offline",
  description: "StayFocus keeps working without a connection.",
};

export default function OfflinePage() {
  return <OfflineNotice />;
}

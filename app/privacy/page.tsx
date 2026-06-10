import type { Metadata } from "next";
import { LegalPage } from "@/components/app/legal-page";

export const metadata: Metadata = { title: "Privacy · Effort" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy">
      <p>
        Your activity files and photos are processed in your browser — they’re
        never uploaded to a server or stored by us.
      </p>
      <p>
        Connecting Strava is optional. When you connect, the sign-in and the
        activities you pick are handled through Effort’s own server routes;
        Effort fetches only the activities you choose, and you can disconnect at
        any time.
      </p>
      <p>A full privacy policy (GDPR) will appear here before launch.</p>
    </LegalPage>
  );
}

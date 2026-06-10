import type { Metadata } from "next";
import { LegalPage } from "@/components/app/legal-page";

export const metadata: Metadata = { title: "Privacy · Effort" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy">
      <p>
        Effort runs entirely in your browser. Your activity files and photos are
        processed on your device — there’s no backend storing them.
      </p>
      <p>
        Connecting Strava is optional. It uses Strava’s official sign-in and
        only fetches the activities you pick; you can disconnect at any time.
      </p>
      <p>A full privacy policy (GDPR) will appear here before launch.</p>
    </LegalPage>
  );
}

import type { Metadata } from "next";

import { LegalPage } from "@/components/app/legal-page";

export const metadata: Metadata = { title: "Privacy · Effort" };

const PrivacyPage = () => (
  <LegalPage title="Privacy">
    <p>
      Your activity files and photos are processed in your browser — they’re
      never uploaded to a server or stored by us.
    </p>
    <p>
      Connecting Strava is optional. When you connect, the sign-in and the
      activities you pick are handled through Effort’s own server routes; Effort
      fetches only the activities you choose, and you can disconnect at any
      time.
    </p>
    <h2 className="text-foreground pt-2 font-semibold">Error reports</h2>
    <p>
      To find and fix crashes, Effort sends technical error reports to Sentry
      (Functional Software, Inc.), stored in Sentry’s EU data centre in
      Frankfurt, Germany. A report contains the error message and where in the
      code it happened, the page path, your browser, operating system, device
      type, language and time zone, the country the report came from (derived
      from the connection; the IP address itself is not stored), and — for a
      failed export — the image size and format being exported.
    </p>
    <p>
      Reports never contain your activity file, your photos, your Strava data,
      your IP address, cookies or any account details, and they are not used to
      track you across sites. Sentry deletes them after at most 90 days. The
      legal basis is our legitimate interest in a working, secure app (Art. 6
      (1)(f) GDPR). Sentry is a US company; transfers are covered by the EU
      Standard Contractual Clauses and the EU–US Data Privacy Framework.
    </p>
    <p>A full privacy policy (GDPR) will appear here before launch.</p>
  </LegalPage>
);

export default PrivacyPage;

import type { Metadata } from "next";
import { LegalPage } from "@/components/app/legal-page";

export const metadata: Metadata = { title: "Imprint · Effort" };

export default function ImprintPage() {
  return (
    <LegalPage title="Imprint">
      <p>
        Effort is an independent side project — a tool for turning endurance
        activities into share-ready cards.
      </p>
      <p>
        Made by Manuel. More at{" "}
        <a
          className="text-primary underline underline-offset-4"
          href="https://manuel.fyi"
          rel="noopener noreferrer"
          target="_blank"
        >
          manuel.fyi
        </a>
        .
      </p>
      <p>
        Full provider identification and contact details (Impressum per § 5 DDG)
        will appear here before launch.
      </p>
    </LegalPage>
  );
}

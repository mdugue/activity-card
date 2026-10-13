// Runs in the browser before the app hydrates (Next's `instrumentation-client`).
import * as Sentry from "@sentry/nextjs";

import { reportUnfinishedExport } from "@/lib/export-watch";
import { sentryOptions } from "@/lib/sentry-options";

Sentry.init(sentryOptions);
reportUnfinishedExport();

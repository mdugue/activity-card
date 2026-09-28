"use client";

import { RouteError } from "@/components/app/route-error";

const ErrorPage = ({ retry }: { retry: () => void }) => (
  <RouteError retry={retry} />
);

export default ErrorPage;

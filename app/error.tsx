"use client";

import { RouteError } from "@/components/app/route-error";

const Error = ({ retry }: { retry: () => void }) => (
  <RouteError retry={retry} />
);

export default Error;

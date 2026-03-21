"use client";

import { ReportForm } from "@/components/report/report-form";

export const dynamic = "force-dynamic";

export default function ReportPage() {
  return (
    <div className="p-4">
      <ReportForm />
    </div>
  );
}

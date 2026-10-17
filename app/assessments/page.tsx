import type { Metadata } from "next";
import { CohortDashboard } from "@/components/assessments/CohortDashboard";

export const metadata: Metadata = {
  title: "Leadership Assessment",
  description:
    "Competency, behavioural, cognitive and 360-degree leadership assessment with benchmarking, development plans and coaching.",
};

export default function AssessmentsPage() {
  return <CohortDashboard />;
}

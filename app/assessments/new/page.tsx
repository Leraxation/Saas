import type { Metadata } from "next";
import { NewAssessmentForm } from "@/components/assessments/NewAssessmentForm";

export const metadata: Metadata = {
  title: "New assessment — Leadership Assessment",
};

export default function NewAssessmentPage() {
  return <NewAssessmentForm />;
}

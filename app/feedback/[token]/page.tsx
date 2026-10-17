import type { Metadata } from "next";
import { FeedbackForm } from "@/components/assessments/FeedbackForm";

export const metadata: Metadata = {
  title: "Leadership feedback",
  description: "Confidential 360-degree feedback form.",
  robots: { index: false, follow: false },
};

/** Standalone page — a rater is not a platform user and sees no navigation. */
export default async function FeedbackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <FeedbackForm token={token} />
        <p className="text-center text-xs text-slate-400 mt-8">
          Confidential 360-degree feedback · your individual responses are never shown to the person being rated
        </p>
      </div>
    </div>
  );
}

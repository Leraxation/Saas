import type { Metadata } from "next";
import PeopleOS from "@/components/PeopleOS/PeopleOS";

export const metadata: Metadata = {
  title: "People OS — Oman Air",
  description: "The People Department command center: click into any function to talk to its AI agent.",
};

export default function PeopleOSPage() {
  const aiEnabled = Boolean(process.env.ANTHROPIC_API_KEY);
  return <PeopleOS aiEnabled={aiEnabled} />;
}

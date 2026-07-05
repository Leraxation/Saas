import { EmailsList } from "@/components/EmailsList";

export const dynamic = "force-dynamic";

export default function EmailsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Emails</h1>
        <p className="text-sm text-gray-500 mt-1">Your full inbox — search, filter, and expand messages.</p>
      </div>
      <EmailsList />
    </div>
  );
}

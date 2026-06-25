export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center flex-shrink-0">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="text-gray-400">Outlook</span>
        <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 font-medium">Dashboard</span>
      </div>
    </header>
  );
}

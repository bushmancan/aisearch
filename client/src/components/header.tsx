import { Search } from "lucide-react";
import AnalyticsModal from "./analytics-modal";

interface HeaderProps {
  compact?: boolean;
}

export default function Header({ compact = false }: HeaderProps) {
  if (compact) {
    return (
      <header className="bg-white border-b border-gray-200 py-4">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-8 h-8 bg-revenue-purple rounded-lg flex items-center justify-center">
              <Search className="text-white text-sm" size={14} />
            </div>
            <h1 className="text-lg font-bold revenue-dark">Revenue Experts AI Web Page Visibility Audit</h1>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-brand-purple rounded-lg flex items-center justify-center">
              <Search className="text-white text-sm" size={14} />
            </div>
            <h1 className="text-lg font-bold brand-gray">Revenue Experts AI Web Page Visibility Audit</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <AnalyticsModal />
            <div className="text-sm text-gray-600">
              Powered by <span className="brand-purple font-semibold">Revenue Experts AI</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

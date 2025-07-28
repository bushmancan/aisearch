import { Button } from "@/components/ui/button";
import { FileText, Files } from "lucide-react";

interface AnalysisModeToggleProps {
  mode: "single" | "multi";
  onModeChange: (mode: "single" | "multi") => void;
}

export default function AnalysisModeToggle({ mode, onModeChange }: AnalysisModeToggleProps) {
  return (
    <div className="flex items-center justify-center mb-6">
      <div className="bg-gray-100 rounded-lg p-1 flex">
        <Button
          variant={mode === "single" ? "default" : "ghost"}
          size="sm"
          onClick={() => onModeChange("single")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
            mode === "single" 
              ? "bg-white shadow-sm text-blue-600" 
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <FileText className="w-4 h-4" />
          Single Page
        </Button>
        <Button
          variant={mode === "multi" ? "default" : "ghost"}
          size="sm"
          onClick={() => onModeChange("multi")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
            mode === "multi" 
              ? "bg-white shadow-sm text-blue-600" 
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Files className="w-4 h-4" />
          Multi-Page
        </Button>
      </div>
    </div>
  );
}
import type { ActiveSection } from "../types/wildlife";
import { Upload } from "lucide-react";

interface HeaderProps {
  activeSection: ActiveSection;
  onNavigate: (section: ActiveSection) => void;
  onOpenScope: () => void;
  onTriggerUpload: () => void;
  needsReviewCount: number;
}

export function Header({
  activeSection,
  onNavigate,
  onOpenScope,
  onTriggerUpload,
  needsReviewCount,
}: HeaderProps) {
  const navLinkClass = (isActive: boolean) =>
    `relative py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
      isActive
        ? "text-[#14532D] after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:bg-[#14532D]"
        : "text-[#47594D] hover:text-[#142018]"
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-[#DCE5DD] bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-8 px-6 py-3.5">
        <a
          href="#overview"
          onClick={(e) => {
            e.preventDefault();
            onNavigate("dashboard");
          }}
          className="font-display text-lg font-bold tracking-tight text-[#14532D] whitespace-nowrap shrink-0"
        >
          Wildlife Lens
        </a>

        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7"
        >
          <button
            type="button"
            onClick={() => onNavigate("dashboard")}
            className={navLinkClass(activeSection === "dashboard")}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => onNavigate("upload")}
            className={navLinkClass(activeSection === "upload")}
          >
            Batch Upload
          </button>
          <button
            type="button"
            onClick={() => onNavigate("review")}
            className={navLinkClass(activeSection === "review")}
          >
            Review Queue{needsReviewCount > 0 ? ` (${needsReviewCount})` : ""}
          </button>
          <button
            type="button"
            onClick={onOpenScope}
            className="py-1 text-sm font-medium text-[#47594D] transition-colors hover:text-[#142018] whitespace-nowrap shrink-0 cursor-pointer"
          >
            MVP Scope
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onTriggerUpload}
            className="inline-flex items-center gap-2 rounded-lg bg-[#14532D] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#166534] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14532D] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            <span>Upload Images</span>
          </button>
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <nav
        aria-label="Mobile navigation"
        className="flex md:hidden items-center gap-5 overflow-x-auto border-t border-[#EBF0EC] px-6 py-2 text-xs font-medium"
      >
        <button
          type="button"
          onClick={() => onNavigate("dashboard")}
          className={`whitespace-nowrap shrink-0 ${
            activeSection === "dashboard" ? "text-[#14532D] font-semibold" : "text-[#47594D]"
          }`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => onNavigate("upload")}
          className={`whitespace-nowrap shrink-0 ${
            activeSection === "upload" ? "text-[#14532D] font-semibold" : "text-[#47594D]"
          }`}
        >
          Batch Upload
        </button>
        <button
          type="button"
          onClick={() => onNavigate("review")}
          className={`whitespace-nowrap shrink-0 ${
            activeSection === "review" ? "text-[#14532D] font-semibold" : "text-[#47594D]"
          }`}
        >
          Review Queue{needsReviewCount > 0 ? ` (${needsReviewCount})` : ""}
        </button>
        <button
          type="button"
          onClick={onOpenScope}
          className="whitespace-nowrap shrink-0 text-[#47594D]"
        >
          MVP Scope
        </button>
      </nav>
    </header>
  );
}

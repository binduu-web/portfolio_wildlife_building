import { Check, Clock, X } from "lucide-react";

interface MvpScopeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MvpScopeModal({ isOpen, onClose }: MvpScopeModalProps) {
  if (!isOpen) return null;

  const implementedFeatures = [
    "Summary dashboard with live counters for uploaded, animal, empty, and review-flagged frames",
    "Batch JPG, JPEG, and PNG upload with thumbnail previews and processing progress",
    "Secure server-side Gemini API classification (Animal Detected, Empty Frame, Uncertain)",
    "Candidate species identification with estimated visual confidence and explanation",
    "Human review workbench to correct predictions, add notes, mark verified, and export CSV",
    "Lightweight browser localStorage persistence without authentication overhead",
  ];

  const deferredFeatures = [
    "User accounts, login, and role-based access control (RBAC)",
    "Shared cloud database and remote object storage for multi-ranger teams",
    "Interactive GIS / wildlife sightings map across forest beats",
    "Automated EXIF GPS, camera ID, and timestamp parsing",
    "Wildlife population density estimation and individual animal re-identification",
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="scope-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl border border-[#DCE5DD] bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#EBF0EC] pb-4">
          <div>
            <h2
              id="scope-modal-title"
              className="font-display text-xl font-bold text-[#142018]"
            >
              Wildlife Lens MVP Scope & Boundaries
            </h2>
            <p className="mt-1 text-sm text-[#47594D]">
              Implemented capabilities vs. features intentionally deferred to future releases (see docs/PRD.md).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close MVP scope dialog"
            className="rounded-lg p-1.5 text-[#5B6D60] hover:bg-[#F2F6F3] hover:text-[#142018] cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h3 className="font-display text-sm font-semibold text-[#14532D]">
              Implemented in This MVP
            </h3>
            <ul className="mt-3 space-y-2.5 text-sm text-[#2A3B30]">
              {implementedFeatures.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#15803D]" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-[#47594D]">
              Not Yet Implemented (Future Scope)
            </h3>
            <ul className="mt-3 space-y-2.5 text-sm text-[#47594D]">
              {deferredFeatures.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#B45309]" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-[#EBF0EC] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#14532D] px-4 py-2 text-sm font-medium text-white hover:bg-[#166534] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

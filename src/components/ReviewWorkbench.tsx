import { useEffect, useState } from "react";
import type {
  CameraTrapImage,
  ClassificationCategory,
  FilterTab,
} from "../types/wildlife";
import {
  doesImageRequireReview,
  exportBatchToCsv,
  formatTimestamp,
  getEffectiveClassification,
  getEffectiveSpecies,
} from "../utils/imageUtils";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  EyeOff,
  HelpCircle,
  Loader2,
  PawPrint,
  RotateCw,
  Search,
  Upload,
} from "lucide-react";

interface ReviewWorkbenchProps {
  images: CameraTrapImage[];
  selectedId: string | null;
  activeFilter: FilterTab;
  isBatchRunning: boolean;
  onFilterChange: (filter: FilterTab) => void;
  onSelectImage: (id: string) => void;
  onSaveReview: (
    id: string,
    finalClassification: ClassificationCategory,
    finalSpecies: string,
    notes: string,
    verified: boolean
  ) => void;
  onRetryClassification: (id: string) => void;
  onTriggerUpload: () => void;
  onLoadSampleBatch: () => void;
}

const CATEGORY_OPTIONS: ClassificationCategory[] = [
  "Animal Detected",
  "Empty Frame",
  "Uncertain",
];

function CategoryIcon({ category }: { category: ClassificationCategory | null }) {
  if (category === "Animal Detected") {
    return <PawPrint className="h-4 w-4 text-[#15803D] shrink-0" aria-hidden="true" />;
  }
  if (category === "Empty Frame") {
    return <EyeOff className="h-4 w-4 text-[#5B6D60] shrink-0" aria-hidden="true" />;
  }
  return <HelpCircle className="h-4 w-4 text-[#B45309] shrink-0" aria-hidden="true" />;
}

export function ReviewWorkbench({
  images,
  selectedId,
  activeFilter,
  isBatchRunning,
  onFilterChange,
  onSelectImage,
  onSaveReview,
  onRetryClassification,
  onTriggerUpload,
  onLoadSampleBatch,
}: ReviewWorkbenchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [draftClassification, setDraftClassification] =
    useState<ClassificationCategory>("Animal Detected");
  const [draftSpecies, setDraftSpecies] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const filteredImages = images.filter((img) => {
    const effective = getEffectiveClassification(img);
    const species = getEffectiveSpecies(img);

    if (activeFilter === "animal" && effective !== "Animal Detected") return false;
    if (activeFilter === "empty" && effective !== "Empty Frame") return false;
    if (activeFilter === "uncertain" && effective !== "Uncertain") return false;
    if (
      activeFilter === "needs_review" &&
      !doesImageRequireReview(img) &&
      img.status !== "error"
    ) {
      return false;
    }
    if (activeFilter === "verified" && !img.humanReview?.verified) return false;

    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const matchName = img.fileName.toLowerCase().includes(q);
      const matchSpecies = species.toLowerCase().includes(q);
      const matchNotes = (img.humanReview?.notes || "").toLowerCase().includes(q);
      if (!matchName && !matchSpecies && !matchNotes) return false;
    }

    return true;
  });

  const selectedImage =
    filteredImages.find((img) => img.id === selectedId) ||
    images.find((img) => img.id === selectedId) ||
    filteredImages[0] ||
    null;

  useEffect(() => {
    if (!selectedImage) return;
    const effClass =
      getEffectiveClassification(selectedImage) ?? "Uncertain";
    setDraftClassification(effClass);
    setDraftSpecies(
      selectedImage.humanReview?.finalSpecies ??
        selectedImage.aiPrediction?.species ??
        ""
    );
    setDraftNotes(selectedImage.humanReview?.notes ?? "");
    setSaveFeedback(null);
  }, [
    selectedImage?.id,
    selectedImage?.humanReview?.finalClassification,
    selectedImage?.humanReview?.finalSpecies,
    selectedImage?.humanReview?.notes,
    selectedImage?.aiPrediction?.classification,
    selectedImage?.aiPrediction?.species,
  ]);

  const filterCounts: Record<FilterTab, number> = {
    all: images.length,
    animal: images.filter((i) => getEffectiveClassification(i) === "Animal Detected")
      .length,
    empty: images.filter((i) => getEffectiveClassification(i) === "Empty Frame")
      .length,
    uncertain: images.filter((i) => getEffectiveClassification(i) === "Uncertain")
      .length,
    needs_review: images.filter(
      (i) => doesImageRequireReview(i) || i.status === "error"
    ).length,
    verified: images.filter((i) => i.humanReview?.verified).length,
  };

  const filterTabs: Array<{ id: FilterTab; label: string }> = [
    { id: "all", label: "All" },
    { id: "animal", label: "Animal Detected" },
    { id: "empty", label: "Empty Frame" },
    { id: "uncertain", label: "Uncertain" },
    { id: "needs_review", label: "Needs Review" },
    { id: "verified", label: "Verified" },
  ];

  const handleSave = (markVerified: boolean) => {
    if (!selectedImage) return;
    const cleanedSpecies =
      draftClassification === "Empty Frame" && !draftSpecies.trim()
        ? "None"
        : draftSpecies.trim() || "Unidentified";
    onSaveReview(
      selectedImage.id,
      draftClassification,
      cleanedSpecies,
      draftNotes.trim(),
      markVerified
    );
    setSaveFeedback(
      markVerified ? "Saved and marked as verified." : "Correction saved."
    );
  };

  const handleNextUnverified = () => {
    const next = images.find(
      (img) =>
        img.id !== selectedImage?.id &&
        img.status === "classified" &&
        !img.humanReview?.verified
    );
    if (next) {
      onFilterChange("all");
      onSelectImage(next.id);
    }
  };

  const hasRemainingUnverified = images.some(
    (img) =>
      img.id !== selectedImage?.id &&
      img.status === "classified" &&
      !img.humanReview?.verified
  );

  return (
    <section
      aria-labelledby="review-heading"
      className="rounded-xl border border-[#DCE5DD] bg-white p-6"
    >
      <div className="flex flex-col gap-4 border-b border-[#EBF0EC] pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2
            id="review-heading"
            className="font-display text-lg font-semibold text-[#142018]"
          >
            Review & Correction Workbench
          </h2>
          <p className="mt-1 text-sm text-[#47594D]">
            Inspect AI predictions, review uncertain or low-confidence frames, and verify final species records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7E71]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search filename or species..."
              aria-label="Search uploaded images by filename or species"
              className="w-full rounded-lg border border-[#CBD8CE] bg-white py-2 pl-9 pr-3 text-sm text-[#142018] placeholder:text-[#788B7E] focus:border-[#14532D] focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => exportBatchToCsv(images)}
            disabled={images.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-[#CBD8CE] bg-white px-4 py-2 text-sm font-medium text-[#142018] transition-colors hover:bg-[#F2F7F3] disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="h-4 w-4 text-[#14532D]" aria-hidden="true" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Segmented filter tabs */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5 rounded-lg bg-[#F2F6F3] p-1">
        {filterTabs.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onFilterChange(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                isActive
                  ? "bg-white text-[#14532D] shadow-xs"
                  : "text-[#47594D] hover:text-[#142018]"
              }`}
            >
              {tab.label} ({filterCounts[tab.id]})
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {images.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-[#E5ECE6] bg-[#FAFDFB] px-6 py-14 text-center">
          <PawPrint className="h-9 w-9 text-[#14532D]/70" aria-hidden="true" />
          <h3 className="mt-3 font-display text-base font-semibold text-[#142018]">
            No camera-trap frames uploaded yet
          </h3>
          <p className="mt-1 max-w-md text-sm text-[#47594D]">
            Upload your own JPG or PNG trail camera images above, or load the 4-photo sample batch to test AI classification and manual verification.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onTriggerUpload}
              className="inline-flex items-center gap-2 rounded-lg bg-[#14532D] px-4 py-2 text-sm font-medium text-white hover:bg-[#166534] cursor-pointer"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              <span>Upload Images</span>
            </button>
            <button
              type="button"
              onClick={onLoadSampleBatch}
              className="inline-flex items-center gap-2 rounded-lg border border-[#CBD8CE] bg-white px-4 py-2 text-sm font-medium text-[#14532D] hover:bg-[#F2F7F3] cursor-pointer"
            >
              <span>Load Sample Trail Batch</span>
            </button>
          </div>
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="mt-6 rounded-xl border border-[#E5ECE6] bg-[#FAFDFB] px-6 py-12 text-center">
          <p className="text-sm font-medium text-[#142018]">
            No frames match the current filter or search query.
          </p>
          <button
            type="button"
            onClick={() => {
              onFilterChange("all");
              setSearchQuery("");
            }}
            className="mt-3 text-sm font-medium text-[#14532D] underline underline-offset-2 cursor-pointer"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          {/* Left: Frame list */}
          <div className="lg:col-span-6 xl:col-span-7 divide-y divide-[#EBF0EC] rounded-xl border border-[#DCE5DD]">
            {filteredImages.map((item) => {
              const effClass = getEffectiveClassification(item);
              const effSpecies = getEffectiveSpecies(item);
              const isSelected = selectedImage?.id === item.id;
              const flagged = doesImageRequireReview(item);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectImage(item.id)}
                  className={`flex w-full items-center gap-4 p-3.5 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[#EFF6F0]"
                      : "bg-white hover:bg-[#F8FBF8]"
                  }`}
                >
                  <div className="h-16 w-24 shrink-0 overflow-hidden rounded-md bg-[#EAF0EB]">
                    <img
                      src={item.previewDataUrl}
                      alt={item.fileName}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-[#142018]">
                        {item.fileName}
                      </span>
                      {item.aiPrediction && (
                        <span className="font-mono text-xs text-[#47594D] tabular-nums shrink-0">
                          {item.aiPrediction.confidence}% conf.
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#47594D]">
                      {item.status === "classified" ? (
                        <>
                          <span className="inline-flex items-center gap-1 font-medium text-[#142018]">
                            <CategoryIcon category={effClass} />
                            <span>{effClass}</span>
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate max-w-[200px]">{effSpecies}</span>
                        </>
                      ) : item.status === "processing" ? (
                        <span className="inline-flex items-center gap-1.5 text-[#14532D]">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          <span>Analyzing image...</span>
                        </span>
                      ) : item.status === "error" ? (
                        <span className="inline-flex items-center gap-1 text-[#B91C1C]">
                          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Analysis failed</span>
                        </span>
                      ) : (
                        <span>Queued for classification</span>
                      )}
                    </div>

                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[#5B6D60] tabular-nums">
                      <span>{formatTimestamp(item.uploadedAt)}</span>
                      {item.humanReview?.verified && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 font-medium text-[#15803D]">
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                            Verified
                          </span>
                        </>
                      )}
                      {item.humanReview?.corrected && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-medium text-[#14532D]">
                            Corrected by reviewer
                          </span>
                        </>
                      )}
                      {!item.humanReview?.verified && flagged && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-medium text-[#B45309]">
                            Needs review
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: Selected Frame Inspector & Verification Form */}
          {selectedImage && (
            <div className="lg:col-span-6 xl:col-span-5 lg:sticky lg:top-20 rounded-xl border border-[#DCE5DD] bg-[#FAFDFB] p-5">
              <div className="overflow-hidden rounded-lg bg-[#E9EFEA]">
                <img
                  src={selectedImage.previewDataUrl}
                  alt={`Detailed view of ${selectedImage.fileName}`}
                  referrerPolicy="no-referrer"
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>

              <div className="mt-4 flex items-start justify-between gap-3 border-b border-[#E5ECE6] pb-4">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-base font-semibold text-[#142018]">
                    {selectedImage.fileName}
                  </h3>
                  <p className="mt-0.5 text-xs text-[#5B6D60] tabular-nums">
                    Uploaded {formatTimestamp(selectedImage.uploadedAt)}
                    {selectedImage.aiPrediction
                      ? ` · Model: ${selectedImage.aiPrediction.modelUsed}`
                      : ""}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onRetryClassification(selectedImage.id)}
                  disabled={isBatchRunning || selectedImage.status === "processing"}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#CBD8CE] bg-white px-2.5 py-1.5 text-xs font-medium text-[#142018] hover:bg-[#F2F7F3] disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Re-run AI</span>
                </button>
              </div>

              {/* AI Prediction Breakdown */}
              {selectedImage.status === "error" && (
                <div className="mt-4 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] p-3.5 text-sm text-[#991B1B]">
                  <p className="font-medium">Classification Error</p>
                  <p className="mt-1 text-xs">
                    {selectedImage.errorMessage ||
                      "Unable to classify this frame. Please check server logs or API key configuration and retry."}
                  </p>
                </div>
              )}

              {selectedImage.status === "queued" && (
                <div className="mt-4 text-sm text-[#47594D]">
                  This image is queued and has not been analyzed yet. Click{" "}
                  <strong>Classify Pending</strong> or <strong>Re-run AI</strong> to run Gemini screening.
                </div>
              )}

              {selectedImage.status === "processing" && (
                <div className="mt-4 flex items-center gap-2 text-sm font-medium text-[#14532D]">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Running server-side Gemini visual analysis...</span>
                </div>
              )}

              {selectedImage.aiPrediction && (
                <div className="mt-4 space-y-3 border-b border-[#E5ECE6] pb-4 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs text-[#5B6D60]">AI Classification</span>
                      <p className="mt-0.5 flex items-center gap-1.5 font-medium text-[#142018]">
                        <CategoryIcon category={selectedImage.aiPrediction.classification} />
                        <span>{selectedImage.aiPrediction.classification}</span>
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-[#5B6D60]">Estimated Confidence</span>
                      <p className="mt-0.5 font-mono font-semibold text-[#142018] tabular-nums">
                        {selectedImage.aiPrediction.confidence}%
                        {selectedImage.aiPrediction.animalCount > 0
                          ? ` · ${selectedImage.aiPrediction.animalCount} animal${
                              selectedImage.aiPrediction.animalCount > 1 ? "s" : ""
                            }`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-[#5B6D60]">Possible Species</span>
                    <p className="mt-0.5 font-medium text-[#142018]">
                      {selectedImage.aiPrediction.species}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs text-[#5B6D60]">AI Visual Explanation</span>
                    <p className="mt-0.5 text-sm leading-relaxed text-[#334439]">
                      {selectedImage.aiPrediction.explanation}
                    </p>
                  </div>
                </div>
              )}

              {/* Human Review & Correction Controls */}
              <div className="mt-4 space-y-4">
                <div>
                  <span className="block text-xs font-medium text-[#47594D]">
                    Final Classification (Human Review)
                  </span>
                  <div className="mt-1.5 grid grid-cols-3 gap-1.5 rounded-lg bg-[#E9F0EA] p-1">
                    {CATEGORY_OPTIONS.map((option) => {
                      const active = draftClassification === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setDraftClassification(option);
                            if (option === "Empty Frame") {
                              setDraftSpecies("None");
                            }
                          }}
                          className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors whitespace-nowrap truncate cursor-pointer ${
                            active
                              ? "bg-white text-[#14532D] shadow-xs"
                              : "text-[#47594D] hover:text-[#142018]"
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="species-override"
                    className="block text-xs font-medium text-[#47594D]"
                  >
                    Verified Species Label
                  </label>
                  <input
                    id="species-override"
                    type="text"
                    value={draftSpecies}
                    onChange={(e) => setDraftSpecies(e.target.value)}
                    placeholder="e.g., Bengal Tiger (Panthera tigris) or None"
                    className="mt-1.5 w-full rounded-lg border border-[#CBD8CE] bg-white px-3 py-2 text-sm text-[#142018] placeholder:text-[#788B7E] focus:border-[#14532D] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ranger-notes"
                    className="block text-xs font-medium text-[#47594D]"
                  >
                    Field / Verification Notes (Optional)
                  </label>
                  <textarea
                    id="ranger-notes"
                    rows={2}
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                    placeholder="Add habitat note, camera angle observation, or correction reason..."
                    className="mt-1.5 w-full rounded-lg border border-[#CBD8CE] bg-white px-3 py-2 text-sm text-[#142018] placeholder:text-[#788B7E] focus:border-[#14532D] focus:outline-none"
                  />
                </div>

                {saveFeedback && (
                  <p role="status" className="text-xs font-medium text-[#15803D]">
                    {saveFeedback}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSave(true)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#14532D] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#166534] whitespace-nowrap cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    <span>
                      {selectedImage.humanReview?.verified
                        ? "Update Verification"
                        : "Mark as Verified"}
                    </span>
                  </button>

                  {hasRemainingUnverified && (
                    <button
                      type="button"
                      onClick={handleNextUnverified}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD8CE] bg-white px-3.5 py-2 text-sm font-medium text-[#142018] hover:bg-[#F2F7F3] whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>Next Unreviewed</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

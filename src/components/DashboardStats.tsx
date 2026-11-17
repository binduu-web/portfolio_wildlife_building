import type { CameraTrapImage, FilterTab } from "../types/wildlife";
import {
  doesImageRequireReview,
  getEffectiveClassification,
} from "../utils/imageUtils";
import { AlertCircle, Camera, EyeOff, PawPrint } from "lucide-react";

interface DashboardStatsProps {
  images: CameraTrapImage[];
  onSelectFilter: (filter: FilterTab) => void;
}

export function DashboardStats({ images, onSelectFilter }: DashboardStatsProps) {
  const totalUploaded = images.length;

  let animalDetected = 0;
  let emptyFrames = 0;
  let requiringReview = 0;
  let verifiedCount = 0;
  let correctedCount = 0;
  let pendingOrProcessing = 0;

  for (const img of images) {
    if (img.status === "queued" || img.status === "processing") {
      pendingOrProcessing++;
    }
    if (img.humanReview?.verified) {
      verifiedCount++;
    }
    if (img.humanReview?.corrected) {
      correctedCount++;
    }
    if (doesImageRequireReview(img) || img.status === "error") {
      requiringReview++;
    }

    const effective = getEffectiveClassification(img);
    if (effective === "Animal Detected") animalDetected++;
    else if (effective === "Empty Frame") emptyFrames++;
  }

  const classifiedCount = images.filter((i) => i.status === "classified").length;
  const emptyReductionPct =
    classifiedCount > 0 ? Math.round((emptyFrames / classifiedCount) * 100) : 0;

  const cards: Array<{
    id: string;
    label: string;
    value: number;
    helper: string;
    icon: typeof Camera;
    accentClass: string;
    filter: FilterTab;
  }> = [
    {
      id: "total",
      label: "Total Images Uploaded",
      value: totalUploaded,
      helper:
        pendingOrProcessing > 0
          ? `${pendingOrProcessing} awaiting classification`
          : `${classifiedCount} classified by AI`,
      icon: Camera,
      accentClass: "text-[#14532D]",
      filter: "all",
    },
    {
      id: "animal",
      label: "Animal Images Detected",
      value: animalDetected,
      helper:
        classifiedCount > 0
          ? `${Math.round((animalDetected / classifiedCount) * 100)}% of classified frames`
          : "Wildlife sightings identified",
      icon: PawPrint,
      accentClass: "text-[#15803D]",
      filter: "animal",
    },
    {
      id: "empty",
      label: "Empty Frames Detected",
      value: emptyFrames,
      helper:
        classifiedCount > 0
          ? `${emptyReductionPct}% false triggers filtered`
          : "Wind, foliage, or blank triggers",
      icon: EyeOff,
      accentClass: "text-[#47594D]",
      filter: "empty",
    },
    {
      id: "review",
      label: "Images Requiring Review",
      value: requiringReview,
      helper:
        requiringReview > 0
          ? "Uncertain, low-confidence, or failed"
          : "No flagged frames waiting",
      icon: AlertCircle,
      accentClass: requiringReview > 0 ? "text-[#B45309]" : "text-[#15803D]",
      filter: "needs_review",
    },
  ];

  return (
    <section aria-labelledby="dashboard-heading" className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            id="dashboard-heading"
            className="font-display text-2xl font-bold tracking-tight text-[#142018] sm:text-3xl"
          >
            Camera-Trap Triage Dashboard
          </h1>
          <p className="mt-1 text-sm text-[#47594D]">
            Sort forest camera-trap batches, separate wildlife sightings from empty triggers, and verify AI species predictions.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#47594D] tabular-nums">
          <span>Verified: {verifiedCount} / {totalUploaded}</span>
          <span aria-hidden="true">·</span>
          <span>Human corrections: {correctedCount}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelectFilter(card.filter)}
              className="group flex flex-col justify-between rounded-xl border border-[#DCE5DD] bg-white p-5 text-left transition-colors hover:border-[#14532D]/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14532D] cursor-pointer"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-[#47594D] group-hover:text-[#142018]">
                  {card.label}
                </span>
                <Icon className={`h-4 w-4 shrink-0 ${card.accentClass}`} aria-hidden="true" />
              </div>

              <div className="mt-4 flex items-baseline justify-between gap-2">
                <span className="font-mono text-3xl font-semibold tracking-tight text-[#142018] tabular-nums">
                  {card.value}
                </span>
              </div>

              <p className="mt-2 text-xs text-[#5B6D60] truncate">{card.helper}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

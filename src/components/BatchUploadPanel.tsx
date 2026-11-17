import { useRef, useState } from "react";
import type { DragEvent, ChangeEvent } from "react";
import type { CameraTrapImage } from "../types/wildlife";
import { formatBytes, getEffectiveClassification } from "../utils/imageUtils";
import {
  AlertTriangle,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Play,
  RotateCw,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";

interface BatchUploadPanelProps {
  images: CameraTrapImage[];
  isBatchRunning: boolean;
  isLoadingSamples: boolean;
  batchProgress: { current: number; total: number; currentFileName: string } | null;
  uploadNotice: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFilesAdded: (files: FileList | File[]) => void;
  onLoadSampleBatch: () => void;
  onRunClassification: () => void;
  onRetrySingle: (id: string) => void;
  onRemoveSingle: (id: string) => void;
  onClearAll: () => void;
  onInspectImage: (id: string) => void;
}

export function BatchUploadPanel({
  images,
  isBatchRunning,
  isLoadingSamples,
  batchProgress,
  uploadNotice,
  fileInputRef,
  onFilesAdded,
  onLoadSampleBatch,
  onRunClassification,
  onRetrySingle,
  onRemoveSingle,
  onClearAll,
  onInspectImage,
}: BatchUploadPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const pendingCount = images.filter(
    (img) => img.status === "queued" || img.status === "error"
  ).length;

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesAdded(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesAdded(e.target.files);
      e.target.value = "";
    }
  };

  return (
    <section
      aria-labelledby="upload-heading"
      className="rounded-xl border border-[#DCE5DD] bg-white p-6"
    >
      <div className="flex flex-col gap-4 border-b border-[#EBF0EC] pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2
            id="upload-heading"
            className="font-display text-lg font-semibold text-[#142018]"
          >
            Batch Image Upload & AI Screening
          </h2>
          <p className="mt-1 text-sm text-[#47594D]">
            Select multiple JPG, JPEG, or PNG camera-trap frames. Images are analyzed securely on the server via Gemini AI.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onLoadSampleBatch}
            disabled={isBatchRunning || isLoadingSamples}
            className="inline-flex items-center gap-2 rounded-lg border border-[#CBD8CE] bg-white px-4 py-2 text-sm font-medium text-[#14532D] transition-colors hover:bg-[#F2F7F3] disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isLoadingSamples ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
            )}
            <span>Load Sample Trail Batch</span>
          </button>

          {pendingCount > 0 && (
            <button
              type="button"
              onClick={onRunClassification}
              disabled={isBatchRunning}
              className="inline-flex items-center gap-2 rounded-lg bg-[#14532D] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#166534] disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isBatchRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Play className="h-4 w-4" aria-hidden="true" />
              )}
              <span>
                {isBatchRunning
                  ? "Classifying..."
                  : `Classify Pending (${pendingCount})`}
              </span>
            </button>
          )}

          {images.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              disabled={isBatchRunning}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8E4] px-3 py-2 text-sm font-medium text-[#5B6D60] transition-colors hover:border-[#DC2626]/40 hover:text-[#B91C1C] disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              <span>Clear Session</span>
            </button>
          )}
        </div>
      </div>

      {/* Dropzone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`mt-5 flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-8 text-center transition-colors ${
          isDragging
            ? "border-[#14532D] bg-[#ECFDF3]"
            : "border-[#C7D5CA] bg-[#F9FBF9] hover:border-[#14532D]/60"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          multiple
          onChange={handleFileChange}
          className="sr-only"
          id="camera-trap-file-input"
        />
        <UploadCloud
          className={`h-8 w-8 ${isDragging ? "text-[#14532D]" : "text-[#47594D]"}`}
          aria-hidden="true"
        />
        <p className="mt-3 text-sm font-medium text-[#142018]">
          Drag and drop camera-trap photographs here, or{" "}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="font-semibold text-[#14532D] underline underline-offset-2 hover:text-[#166534] cursor-pointer"
          >
            browse files
          </button>
        </p>
        <p className="mt-1 text-xs text-[#5B6D60]">
          Supports JPG, JPEG, and PNG · Automatically optimizes large photos for fast AI screening and browser storage
        </p>
      </div>

      {uploadNotice && (
        <div
          role="status"
          className="mt-4 rounded-lg border border-[#F59E0B]/40 bg-[#FFFBEB] px-4 py-2.5 text-sm text-[#92400E]"
        >
          {uploadNotice}
        </div>
      )}

      {/* Batch Progress Indicator */}
      {isBatchRunning && batchProgress && (
        <div className="mt-5 rounded-lg border border-[#CFE3D3] bg-[#F2F8F3] p-4">
          <div className="flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2 font-medium text-[#14532D] min-w-0">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
              <span className="truncate">
                Analyzing {batchProgress.currentFileName}
              </span>
            </div>
            <span className="font-mono text-xs font-medium text-[#14532D] tabular-nums shrink-0">
              {batchProgress.current} of {batchProgress.total}
            </span>
          </div>
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[#DCE9DF]">
            <div
              className="h-full bg-[#15803D] transition-all duration-200"
              style={{
                width: `${Math.round(
                  (batchProgress.current / Math.max(1, batchProgress.total)) * 100
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Preview Strip */}
      {images.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between text-xs font-medium text-[#5B6D60]">
            <span>Uploaded Preview Queue ({images.length} frames)</span>
            <span>Click any preview to inspect or verify</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {images.map((img) => {
              const effClass = getEffectiveClassification(img);
              return (
                <div
                  key={img.id}
                  className="group flex flex-col overflow-hidden rounded-lg border border-[#DCE5DD] bg-[#FCFEFC]"
                >
                  <button
                    type="button"
                    onClick={() => onInspectImage(img.id)}
                    className="relative aspect-[4/3] w-full overflow-hidden bg-[#EAF0EB] text-left cursor-pointer"
                  >
                    <img
                      src={img.previewDataUrl}
                      alt={`Camera-trap frame ${img.fileName}`}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                    />
                  </button>

                  <div className="flex flex-1 flex-col justify-between p-3">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onInspectImage(img.id)}
                          className="truncate text-xs font-semibold text-[#142018] hover:text-[#14532D] text-left cursor-pointer"
                          title={img.fileName}
                        >
                          {img.fileName}
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveSingle(img.id)}
                          disabled={img.status === "processing"}
                          aria-label={`Remove ${img.fileName}`}
                          className="text-[#6B7E71] hover:text-[#B91C1C] disabled:opacity-40 shrink-0 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>

                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#5B6D60] tabular-nums">
                        <span>{formatBytes(img.fileSizeBytes)}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {img.mimeType === "image/png" ? "PNG" : "JPEG"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 border-t border-[#EBF0EC] pt-2.5 text-xs">
                      {img.status === "queued" && (
                        <span className="font-medium text-[#5B6D60]">
                          Queued for AI analysis
                        </span>
                      )}

                      {img.status === "processing" && (
                        <span className="inline-flex items-center gap-1.5 font-medium text-[#14532D]">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          Analyzing frame...
                        </span>
                      )}

                      {img.status === "error" && (
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="inline-flex items-center gap-1 font-medium text-[#B91C1C] truncate"
                            title={img.errorMessage}
                          >
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">
                              {img.errorMessage || "Classification failed"}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => onRetrySingle(img.id)}
                            disabled={isBatchRunning}
                            className="inline-flex items-center gap-1 font-medium text-[#14532D] hover:underline shrink-0 cursor-pointer"
                          >
                            <RotateCw className="h-3 w-3" aria-hidden="true" />
                            Retry
                          </button>
                        </div>
                      )}

                      {img.status === "classified" && img.aiPrediction && (
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 font-medium truncate ${
                              effClass === "Animal Detected"
                                ? "text-[#15803D]"
                                : effClass === "Uncertain"
                                ? "text-[#B45309]"
                                : "text-[#47594D]"
                            }`}
                          >
                            {img.humanReview?.verified ? (
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            )}
                            <span className="truncate">{effClass}</span>
                          </span>
                          <span className="font-mono text-[11px] text-[#5B6D60] tabular-nums shrink-0">
                            {img.aiPrediction.confidence}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

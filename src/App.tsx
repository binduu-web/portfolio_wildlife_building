import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ActiveSection,
  AiPrediction,
  CameraTrapImage,
  ClassificationCategory,
  FilterTab,
} from "./types/wildlife";
import {
  clearStoredBatch,
  doesImageRequireReview,
  fileToNormalizedImage,
  loadStoredBatch,
  SAMPLE_CAMERA_TRAP_BATCH,
  saveStoredBatch,
  urlToFile,
} from "./utils/imageUtils";
import { Header } from "./components/Header";
import { DashboardStats } from "./components/DashboardStats";
import { BatchUploadPanel } from "./components/BatchUploadPanel";
import { ReviewWorkbench } from "./components/ReviewWorkbench";
import { MvpScopeModal } from "./components/MvpScopeModal";

export default function App() {
  const [images, setImages] = useState<CameraTrapImage[]>(() => loadStoredBatch());
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const initial = loadStoredBatch();
    return initial[0]?.id ?? null;
  });
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [activeSection, setActiveSection] = useState<ActiveSection>("dashboard");
  const [isScopeOpen, setIsScopeOpen] = useState(false);

  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    currentFileName: string;
  } | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const uploadRef = useRef<HTMLDivElement | null>(null);
  const reviewRef = useRef<HTMLDivElement | null>(null);
  const imagesRef = useRef<CameraTrapImage[]>(images);
  const isClassifyingRef = useRef(false);

  useEffect(() => {
    imagesRef.current = images;
    const { quotaExceeded } = saveStoredBatch(images);
    if (quotaExceeded) {
      setUploadNotice(
        "Browser storage limit reached. Newer frames remain active in this tab but may not persist after reload unless older frames are cleared."
      );
    }
  }, [images]);

  const classifySingleOnServer = async (
    item: CameraTrapImage
  ): Promise<AiPrediction> => {
    const response = await fetch("/api/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64: item.previewDataUrl,
        mimeType: item.mimeType,
        fileName: item.fileName,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        typeof data?.error === "string"
          ? data.error
          : `Classification failed (HTTP ${response.status})`
      );
    }

    return data as AiPrediction;
  };

  const runQueueClassification = useCallback(async (targetIds?: string[]) => {
    if (isClassifyingRef.current) return;

    const candidates = imagesRef.current.filter((img) =>
      targetIds
        ? targetIds.includes(img.id)
        : img.status === "queued" || img.status === "error"
    );

    if (candidates.length === 0) return;

    isClassifyingRef.current = true;
    setIsBatchRunning(true);

    try {
      for (let i = 0; i < candidates.length; i++) {
        const currentItem = imagesRef.current.find(
          (img) => img.id === candidates[i].id
        );
        if (!currentItem) continue;

        setBatchProgress({
          current: i + 1,
          total: candidates.length,
          currentFileName: currentItem.fileName,
        });

        setImages((prev) =>
          prev.map((img) =>
            img.id === currentItem.id
              ? { ...img, status: "processing", errorMessage: undefined }
              : img
          )
        );

        try {
          const prediction = await classifySingleOnServer(currentItem);
          setImages((prev) =>
            prev.map((img) => {
              if (img.id !== currentItem.id) return img;
              return {
                ...img,
                status: "classified",
                errorMessage: undefined,
                aiPrediction: prediction,
                humanReview: img.humanReview
                  ? img.humanReview
                  : {
                      finalClassification: prediction.classification,
                      finalSpecies: prediction.species,
                      verified: false,
                      corrected: false,
                      notes: "",
                    },
              };
            })
          );
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to classify image.";
          setImages((prev) =>
            prev.map((img) =>
              img.id === currentItem.id
                ? { ...img, status: "error", errorMessage }
                : img
            )
          );
        }
      }
    } finally {
      isClassifyingRef.current = false;
      setIsBatchRunning(false);
      setBatchProgress(null);
    }
  }, []);

  const ingestFiles = useCallback(
    async (fileList: FileList | File[]) => {
      setUploadNotice(null);
      const files = Array.from(fileList);
      if (files.length === 0) return;

      const accepted: CameraTrapImage[] = [];
      const rejectedReasons: string[] = [];

      for (const file of files) {
        try {
          const normalized = await fileToNormalizedImage(file);
          accepted.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            fileName: file.name,
            mimeType: normalized.mimeType,
            fileSizeBytes: file.size,
            uploadedAt: new Date().toISOString(),
            previewDataUrl: normalized.dataUrl,
            status: "queued",
          });
        } catch (err) {
          rejectedReasons.push(
            err instanceof Error ? err.message : `Skipped ${file.name}`
          );
        }
      }

      if (rejectedReasons.length > 0) {
        setUploadNotice(rejectedReasons.join(" "));
      }

      if (accepted.length > 0) {
        setImages((prev) => [...accepted, ...prev]);
        setSelectedId((prevSelected) => prevSelected ?? accepted[0].id);
        setTimeout(() => {
          void runQueueClassification(accepted.map((item) => item.id));
        }, 50);
      }
    },
    [runQueueClassification]
  );

  const handleLoadSampleBatch = async () => {
    if (isLoadingSamples || isBatchRunning) return;
    setIsLoadingSamples(true);
    setUploadNotice(null);

    try {
      const files = await Promise.all(
        SAMPLE_CAMERA_TRAP_BATCH.map((sample) =>
          urlToFile(sample.url, sample.fileName)
        )
      );
      await ingestFiles(files);
    } catch (err) {
      setUploadNotice(
        err instanceof Error
          ? err.message
          : "Unable to load sample camera-trap images."
      );
    } finally {
      setIsLoadingSamples(false);
    }
  };

  const handleSaveReview = (
    id: string,
    finalClassification: ClassificationCategory,
    finalSpecies: string,
    notes: string,
    verified: boolean
  ) => {
    setImages((prev) =>
      prev.map((img) => {
        if (img.id !== id) return img;
        const aiClass = img.aiPrediction?.classification;
        const aiSpecies = img.aiPrediction?.species;
        const corrected = Boolean(
          img.aiPrediction &&
            (aiClass !== finalClassification ||
              (aiSpecies ?? "").trim().toLowerCase() !==
                finalSpecies.trim().toLowerCase())
        );

        return {
          ...img,
          humanReview: {
            finalClassification,
            finalSpecies,
            verified,
            corrected,
            notes,
            reviewedAt: new Date().toISOString(),
          },
        };
      })
    );
  };

  const handleRemoveSingle = (id: string) => {
    setImages((prev) => {
      const next = prev.filter((img) => img.id !== id);
      if (selectedId === id) {
        setSelectedId(next[0]?.id ?? null);
      }
      return next;
    });
  };

  const handleClearAll = () => {
    if (isBatchRunning) return;
    setImages([]);
    setSelectedId(null);
    setUploadNotice(null);
    clearStoredBatch();
  };

  const handleNavigate = (section: ActiveSection) => {
    setActiveSection(section);
    const refMap = {
      dashboard: dashboardRef,
      upload: uploadRef,
      review: reviewRef,
    };
    refMap[section].current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleTriggerUpload = () => {
    handleNavigate("upload");
    fileInputRef.current?.click();
  };

  const handleSelectFilterFromDashboard = (filter: FilterTab) => {
    setActiveFilter(filter);
    handleNavigate("review");
  };

  const handleInspectImage = (id: string) => {
    setSelectedId(id);
    setActiveFilter("all");
    handleNavigate("review");
  };

  const needsReviewCount = images.filter(
    (img) => doesImageRequireReview(img) || img.status === "error"
  ).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9F7] text-[#142018]">
      <Header
        activeSection={activeSection}
        onNavigate={handleNavigate}
        onOpenScope={() => setIsScopeOpen(true)}
        onTriggerUpload={handleTriggerUpload}
        needsReviewCount={needsReviewCount}
      />

      <main className="mx-auto w-full max-w-[1360px] flex-1 space-y-8 px-6 py-8">
        <div ref={dashboardRef} className="scroll-mt-20">
          <DashboardStats
            images={images}
            onSelectFilter={handleSelectFilterFromDashboard}
          />
        </div>

        <div ref={uploadRef} className="scroll-mt-20">
          <BatchUploadPanel
            images={images}
            isBatchRunning={isBatchRunning}
            isLoadingSamples={isLoadingSamples}
            batchProgress={batchProgress}
            uploadNotice={uploadNotice}
            fileInputRef={fileInputRef}
            onFilesAdded={ingestFiles}
            onLoadSampleBatch={handleLoadSampleBatch}
            onRunClassification={() => void runQueueClassification()}
            onRetrySingle={(id) => void runQueueClassification([id])}
            onRemoveSingle={handleRemoveSingle}
            onClearAll={handleClearAll}
            onInspectImage={handleInspectImage}
          />
        </div>

        <div ref={reviewRef} className="scroll-mt-20">
          <ReviewWorkbench
            images={images}
            selectedId={selectedId}
            activeFilter={activeFilter}
            isBatchRunning={isBatchRunning}
            onFilterChange={setActiveFilter}
            onSelectImage={setSelectedId}
            onSaveReview={handleSaveReview}
            onRetryClassification={(id) => void runQueueClassification([id])}
            onTriggerUpload={handleTriggerUpload}
            onLoadSampleBatch={handleLoadSampleBatch}
          />
        </div>
      </main>

      <footer className="border-t border-[#DCE5DD] bg-white">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-2 px-6 py-5 text-xs text-[#5B6D60] sm:flex-row sm:items-center sm:justify-between">
          <p>
            Wildlife Lens – AI Camera-Trap Identifier · Built for conservation triage and human verification
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsScopeOpen(true)}
              className="font-medium text-[#14532D] hover:underline cursor-pointer"
            >
              View MVP Scope & Limitations
            </button>
          </div>
        </div>
      </footer>

      <MvpScopeModal
        isOpen={isScopeOpen}
        onClose={() => setIsScopeOpen(false)}
      />
    </div>
  );
}

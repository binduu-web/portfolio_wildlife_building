import type { CameraTrapImage, ClassificationCategory } from "../types/wildlife";

const STORAGE_KEY = "wildlife_lens_batch_v1";

export const SAMPLE_CAMERA_TRAP_BATCH: Array<{
  url: string;
  fileName: string;
}> = [
  {
    url: "/src/assets/images/sample_tiger_trail_1794909565093.jpg",
    fileName: "CAM_04_NORTH_TRAIL_0542.jpg",
  },
  {
    url: "/src/assets/images/sample_spotted_deer_1794909565676.jpg",
    fileName: "CAM_11_MEADOW_GLADE_0718.jpg",
  },
  {
    url: "/src/assets/images/sample_empty_trail_1794909566347.jpg",
    fileName: "CAM_07_RIDGE_PATH_1420.jpg",
  },
  {
    url: "/src/assets/images/sample_night_uncertain_1794909580710.jpg",
    fileName: "CAM_02_IR_NIGHT_2314.jpg",
  },
];

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export function formatTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/**
 * Normalizes and downscales large camera-trap photographs to <= 1280px longest edge
 * so AI classification stays fast and browser localStorage stays well within quota.
 */
export async function fileToNormalizedImage(
  file: File
): Promise<{ dataUrl: string; mimeType: "image/jpeg" | "image/png" }> {
  const allowed = ["image/jpeg", "image/jpg", "image/png"];
  const rawMime = file.type.toLowerCase();
  if (!allowed.includes(rawMime)) {
    throw new Error(`Unsupported format "${file.name}". Only JPG, JPEG, and PNG are allowed.`);
  }

  const targetMime: "image/jpeg" | "image/png" =
    rawMime === "image/png" ? "image/png" : "image/jpeg";

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Could not decode image "${file.name}".`));
      image.src = objectUrl;
    });

    const maxDim = 1200;
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas context unavailable in browser.");
    }
    ctx.drawImage(img, 0, 0, width, height);

    const outputMime = targetMime === "image/png" && scale === 1 && file.size < 450_000
      ? "image/png"
      : "image/jpeg";

    const dataUrl = canvas.toDataURL(
      outputMime,
      outputMime === "image/jpeg" ? 0.82 : undefined
    );

    return {
      dataUrl,
      mimeType: outputMime,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function urlToFile(url: string, fileName: string): Promise<File> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load sample image ${fileName}`);
  }
  const blob = await response.blob();
  return new File([blob], fileName, { type: blob.type || "image/jpeg" });
}

export function getEffectiveClassification(
  item: CameraTrapImage
): ClassificationCategory | null {
  if (item.humanReview) return item.humanReview.finalClassification;
  if (item.aiPrediction) return item.aiPrediction.classification;
  return null;
}

export function getEffectiveSpecies(item: CameraTrapImage): string {
  if (item.humanReview) return item.humanReview.finalSpecies;
  if (item.aiPrediction) return item.aiPrediction.species;
  return "Pending analysis";
}

export function doesImageRequireReview(item: CameraTrapImage): boolean {
  if (item.status !== "classified" || !item.aiPrediction) return false;
  if (item.humanReview?.verified) return false;
  const eff = getEffectiveClassification(item);
  return (
    eff === "Uncertain" ||
    item.aiPrediction.requiresReview ||
    item.aiPrediction.confidence < 75
  );
}

export function loadStoredBatch(): CameraTrapImage[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Reset any interrupted "processing" states back to "queued" on reload
    return parsed.map((item: CameraTrapImage) =>
      item.status === "processing" ? { ...item, status: "queued" } : item
    );
  } catch {
    return [];
  }
}

export function saveStoredBatch(items: CameraTrapImage[]): {
  saved: boolean;
  quotaExceeded: boolean;
} {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return { saved: true, quotaExceeded: false };
  } catch {
    return { saved: false, quotaExceeded: true };
  }
}

export function clearStoredBatch(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage removal errors
  }
}

export function exportBatchToCsv(items: CameraTrapImage[]): void {
  const headers = [
    "Filename",
    "Status",
    "Effective Classification",
    "Effective Species",
    "AI Classification",
    "AI Species",
    "AI Confidence (%)",
    "Animal Count",
    "AI Explanation",
    "Human Verified",
    "Human Corrected",
    "Ranger Notes",
    "Uploaded At",
  ];

  const escapeCsv = (val: string | number | boolean | undefined) => {
    const str = String(val ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replaceAll('"', '""')}"`;
    }
    return str;
  };

  const rows = items.map((item) => [
    item.fileName,
    item.status,
    getEffectiveClassification(item) ?? "Pending",
    getEffectiveSpecies(item),
    item.aiPrediction?.classification ?? "",
    item.aiPrediction?.species ?? "",
    item.aiPrediction?.confidence ?? "",
    item.aiPrediction?.animalCount ?? "",
    item.aiPrediction?.explanation ?? "",
    item.humanReview?.verified ? "Yes" : "No",
    item.humanReview?.corrected ? "Yes" : "No",
    item.humanReview?.notes ?? "",
    item.uploadedAt,
  ]);

  const csvContent = [
    headers.map(escapeCsv).join(","),
    ...rows.map((r) => r.map(escapeCsv).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `wildlife-lens-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

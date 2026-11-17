export type ClassificationCategory =
  | "Animal Detected"
  | "Empty Frame"
  | "Uncertain";

export type ProcessingStatus = "queued" | "processing" | "classified" | "error";

export interface AiPrediction {
  classification: ClassificationCategory;
  species: string;
  animalCount: number;
  confidence: number;
  explanation: string;
  requiresReview: boolean;
  modelUsed: string;
  classifiedAt: string;
}

export interface HumanReview {
  finalClassification: ClassificationCategory;
  finalSpecies: string;
  verified: boolean;
  corrected: boolean;
  notes: string;
  reviewedAt?: string;
}

export interface CameraTrapImage {
  id: string;
  fileName: string;
  mimeType: "image/jpeg" | "image/png";
  fileSizeBytes: number;
  uploadedAt: string;
  previewDataUrl: string;
  status: ProcessingStatus;
  errorMessage?: string;
  aiPrediction?: AiPrediction;
  humanReview?: HumanReview;
}

export type FilterTab =
  | "all"
  | "animal"
  | "empty"
  | "uncertain"
  | "needs_review"
  | "verified";

export type ActiveSection = "dashboard" | "upload" | "review";

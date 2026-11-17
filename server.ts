import "dotenv/config";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const PRIMARY_MODEL = "gemini-4-hydrogen";
const FALLBACK_MODEL = "gemini-3.1-flash-lite";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png"]);

type ClassificationLabel = "Animal Detected" | "Empty Frame" | "Uncertain";

interface ClassifyRequestBody {
  imageBase64?: string;
  mimeType?: string;
  fileName?: string;
}

interface RawGeminiPrediction {
  classification?: string;
  species?: string;
  animalCount?: number;
  confidence?: number;
  explanation?: string;
  requiresReview?: boolean;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error(
      "GEMINI_API_KEY is not configured on the server. Set a valid Gemini API key in environment secrets."
    );
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function normalizeClassification(value: string | undefined): ClassificationLabel {
  if (value === "Animal Detected" || value === "Empty Frame" || value === "Uncertain") {
    return value;
  }
  return "Uncertain";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractReadableError(rawMessage: string): {
  statusCode: number;
  userMessage: string;
} {
  let parsedMessage = rawMessage;
  let parsedCode: number | undefined;

  try {
    const obj = JSON.parse(rawMessage) as {
      error?: { code?: number; message?: string; status?: string };
    };
    if (obj?.error?.message) {
      parsedMessage = obj.error.message;
      parsedCode = obj.error.code;
    }
  } catch {
    // Keep rawMessage when not JSON
  }

  if (parsedCode === 400 || rawMessage.includes("API_KEY_INVALID")) {
    return {
      statusCode: 400,
      userMessage:
        "The configured Gemini API key appears invalid. Verify GEMINI_API_KEY in Secrets.",
    };
  }
  if (parsedCode === 403 || rawMessage.includes("PERMISSION_DENIED")) {
    return {
      statusCode: 403,
      userMessage:
        "Permission denied by Gemini API. Check that your GEMINI_API_KEY is active in Secrets.",
    };
  }
  if (parsedCode === 429 || rawMessage.includes("RESOURCE_EXHAUSTED")) {
    return {
      statusCode: 429,
      userMessage:
        "Gemini API rate limit reached. Please wait a moment and retry remaining images.",
    };
  }
  if (parsedCode === 503 || rawMessage.includes("UNAVAILABLE")) {
    return {
      statusCode: 503,
      userMessage:
        "Gemini AI service is experiencing temporary high demand. Please retry in a few seconds.",
    };
  }

  return {
    statusCode: 500,
    userMessage: parsedMessage,
  };
}

async function callGeminiVision(
  ai: GoogleGenAI,
  modelName: string,
  base64Data: string,
  mimeType: string,
  fileName: string
) {
  const response = await ai.models.generateContent({
    model: modelName,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType === "image/jpg" ? "image/jpeg" : mimeType,
            data: base64Data,
          },
        },
        {
          text: [
            `Analyze this wildlife camera-trap photograph (filename: "${fileName}").`,
            "Classify the frame strictly into one of three categories:",
            '1. "Animal Detected" — one or more wild or domestic animals/birds are clearly or reasonably visible.',
            '2. "Empty Frame" — no animal is visible (only vegetation, terrain, sunlight, shadows, or weather).',
            '3. "Uncertain" — motion blur, extreme darkness, heavy foliage obstruction, or ambiguous shapes make presence or species unclear.',
            "Provide the most specific plausible species name (Common Name and Scientific Name when identifiable, e.g., 'Bengal Tiger (Panthera tigris)'), or 'None' if Empty Frame, or 'Unidentified' if Uncertain.",
            "Estimate animalCount (0 if empty or unknown), confidence as an integer 0-100 reflecting visual certainty, and a concise 1-2 sentence explanation citing visible features.",
          ].join(" "),
        },
      ],
    },
    config: {
      systemInstruction:
        "You are a wildlife ecology assistant supporting forest department camera-trap sorting. Be conservative and honest: if an animal is heavily obscured, blurred, or ambiguous, mark it as 'Uncertain' with lower confidence rather than guessing recklessly.",
      thinkingConfig: {
        thinkingLevel:
          modelName === PRIMARY_MODEL ? ThinkingLevel.LOW : ThinkingLevel.MINIMAL,
      },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          classification: {
            type: Type.STRING,
            enum: ["Animal Detected", "Empty Frame", "Uncertain"],
            description: "Primary camera-trap classification outcome.",
          },
          species: {
            type: Type.STRING,
            description:
              "Identified or candidate species name, 'None' for Empty Frame, or 'Unidentified' if unclear.",
          },
          animalCount: {
            type: Type.INTEGER,
            description: "Estimated number of visible animals in the frame.",
          },
          confidence: {
            type: Type.INTEGER,
            description: "Estimated visual confidence percentage from 0 to 100.",
          },
          explanation: {
            type: Type.STRING,
            description:
              "Concise 1-2 sentence explanation referencing visible visual evidence.",
          },
          requiresReview: {
            type: Type.BOOLEAN,
            description:
              "True when the frame is Uncertain, partially obscured, or confidence is below 75.",
          },
        },
        required: [
          "classification",
          "species",
          "animalCount",
          "confidence",
          "explanation",
          "requiresReview",
        ],
      },
    },
  });

  const rawText = response.text?.trim();
  if (!rawText) {
    throw new Error("Gemini returned an empty classification payload.");
  }

  const parsed = JSON.parse(rawText) as RawGeminiPrediction;
  const classification = normalizeClassification(parsed.classification);
  const confidence = Math.max(
    0,
    Math.min(100, Math.round(Number(parsed.confidence ?? 0)))
  );
  const animalCount = Math.max(0, Math.round(Number(parsed.animalCount ?? 0)));
  const species =
    typeof parsed.species === "string" && parsed.species.trim().length > 0
      ? parsed.species.trim()
      : classification === "Empty Frame"
      ? "None"
      : "Unidentified";
  const explanation =
    typeof parsed.explanation === "string" && parsed.explanation.trim().length > 0
      ? parsed.explanation.trim()
      : "Visual analysis completed.";
  const requiresReview =
    Boolean(parsed.requiresReview) ||
    classification === "Uncertain" ||
    confidence < 75;

  return {
    classification,
    species,
    animalCount,
    confidence,
    explanation,
    requiresReview,
    modelUsed: modelName,
    classifiedAt: new Date().toISOString(),
  };
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`UNAVAILABLE: ${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function classifyWithRetry(
  ai: GoogleGenAI,
  base64Data: string,
  mimeType: string,
  fileName: string
) {
  const modelsToTry = [
    { model: PRIMARY_MODEL, timeoutMs: 12000 },
    { model: FALLBACK_MODEL, timeoutMs: 25000 },
  ];
  let lastError: unknown;

  for (let i = 0; i < modelsToTry.length; i++) {
    const { model: modelName, timeoutMs } = modelsToTry[i];
    try {
      return await withTimeout(
        callGeminiVision(ai, modelName, base64Data, mimeType, fileName),
        timeoutMs,
        modelName
      );
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const isTransient =
        message.includes("429") ||
        message.includes("503") ||
        message.includes("UNAVAILABLE") ||
        message.includes("RESOURCE_EXHAUSTED");

      if (!isTransient || i === modelsToTry.length - 1) {
        throw error;
      }
      await sleep(250);
    }
  }

  throw lastError;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "25mb" }));

  app.get("/api/health", (_req, res) => {
    const hasKey = Boolean(
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"
    );
    res.json({
      ok: true,
      model: PRIMARY_MODEL,
      geminiConfigured: hasKey,
    });
  });

  app.post("/api/classify", async (req, res) => {
    try {
      const body = (req.body ?? {}) as ClassifyRequestBody;
      const { imageBase64, mimeType, fileName } = body;

      if (!imageBase64 || typeof imageBase64 !== "string") {
        res.status(400).json({ error: "Missing required imageBase64 payload." });
        return;
      }

      const normalizedMime = (mimeType || "").toLowerCase().trim();
      if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
        res.status(400).json({
          error: "Unsupported image format. Please upload JPG, JPEG, or PNG files.",
        });
        return;
      }

      const cleanBase64 = imageBase64.includes(",")
        ? imageBase64.split(",")[1] || ""
        : imageBase64;

      if (!cleanBase64) {
        res.status(400).json({ error: "Uploaded image payload is empty." });
        return;
      }

      const safeFileName =
        typeof fileName === "string" && fileName.trim().length > 0
          ? fileName.trim().slice(0, 120)
          : "camera_trap_frame.jpg";

      const ai = getGeminiClient();
      const result = await classifyWithRetry(
        ai,
        cleanBase64,
        normalizedMime,
        safeFileName
      );

      res.json(result);
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Unknown server error";
      console.error("[/api/classify] Error:", rawMessage);
      const { statusCode, userMessage } = extractReadableError(rawMessage);
      res.status(statusCode).json({ error: userMessage });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Wildlife Lens server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start Wildlife Lens server:", err);
  process.exit(1);
});

# Wildlife Lens – AI Camera-Trap Identifier

**Wildlife Lens** is a beginner-friendly, full-stack MVP web application built to help forest departments, rangers, and wildlife researchers sort camera-trap photographs faster. It uses server-side Google Gemini multimodal AI (`gemini-4-hydrogen`) to classify frames into **Animal Detected**, **Empty Frame**, or **Uncertain**, suggest likely species with visual explanations and confidence estimates, and let human reviewers verify or correct every prediction.

---

## Key Features

- **Summary Dashboard:** Live counters for total uploaded images, animal detections, empty frames, and images requiring human review—plus verification progress.
- **Batch Image Upload:** Drag-and-drop or select multiple `.jpg`, `.jpeg`, and `.png` photographs with instant thumbnail previews, processing progress tracking, and a built-in 4-photo sample camera-trap batch for testing.
- **Secure Server-Side AI Classification:** Calls the Gemini API exclusively from the Node.js/Express backend (`POST /api/classify`) using structured JSON outputs—never exposing API keys to the browser and never returning fake or random predictions.
- **Review & Correction Workbench:** Inspect full-size camera-trap images alongside AI explanations and estimated confidence, filter by classification or review status, override misclassifications, edit species names, add field notes, mark frames as **Verified**, and export curated results to CSV.
- **Lightweight Browser Persistence:** Saves uploaded previews (automatically resized for storage efficiency) and review decisions in browser `localStorage` with zero login setup.

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React
- **Backend:** Node.js, Express (`server.ts` via `tsx`)
- **AI Integration:** `@google/genai` SDK (`gemini-4-hydrogen`)
- **Documentation:** Product Requirements Document in [`docs/PRD.md`](docs/PRD.md)

---

## Setup Instructions

### 1. Prerequisites
- **Node.js** v20+ recommended
- A valid **Gemini API Key** from Google AI Studio

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and add your Gemini API key:
```bash
cp .env.example .env
```
Edit `.env`:
```env
GEMINI_API_KEY="your_actual_gemini_api_key_here"
PORT="3000"
```
> **Security Note:** Never commit `.env` to GitHub. `.gitignore` is configured to exclude all `.env*` files while keeping `.env.example` tracked.

### 4. Run the Application (Development)
```bash
npm run dev
```
This starts the Express server with Vite middleware on `http://localhost:3000`.

### 5. Build for Production
```bash
npm run build
npm run lint
```

---

## Project Structure

```text
├── docs/
│   └── PRD.md                 # Complete Product Requirements Document
├── src/
│   ├── assets/images/         # Sample camera-trap images for quick testing
│   ├── components/            # DashboardStats, BatchUploadPanel, ReviewWorkbench, Header, ScopeModal
│   ├── types/wildlife.ts      # Shared TypeScript interfaces
│   ├── utils/                 # Image compression, browser storage, CSV export helpers
│   ├── App.tsx                # Main application state and AI batch queue orchestration
│   ├── index.css              # Tailwind CSS v4 theme and typography tokens
│   └── main.tsx               # React entry point
├── server.ts                  # Express backend with /api/classify and Vite integration
├── .env.example               # Environment variable template (no real secrets)
├── .gitignore                 # Excludes node_modules, dist, logs, and .env secrets
└── README.md                  # Project overview and setup guide
```

---

## MVP Scope & Features Not Yet Implemented

To keep this MVP focused, reliable, and beginner-friendly, the following features are **not yet implemented** and are documented as future enhancements in [`docs/PRD.md`](docs/PRD.md):
- User authentication and role-based access control (RBAC)
- Cloud database / multi-user object storage (currently uses browser `localStorage`)
- Interactive wildlife sightings map (GIS / GPS coordinates)
- EXIF metadata extraction (camera ID and timestamp parsing)
- Advanced ecological analytics or wildlife population prediction models

---

## Screenshots & Core Views

After starting the app at `http://localhost:3000`, the workspace includes four main views:

1. **Dashboard Overview:** Four KPI cards (`Total Images Uploaded`, `Animal Images Detected`, `Empty Frames Detected`, `Images Requiring Review`) and overall verification progress.
2. **Batch Upload & Processing Queue:** Multi-file dropzone (`.jpg`, `.jpeg`, `.png`), sample field batch loader, image thumbnail previews, and live AI classification status.
3. **Review & Correction Workbench:** Filterable image grid paired with a detail inspector showing the AI's classification, candidate species, confidence percentage, visual explanation, and manual correction/verification controls.
4. **MVP Scope & Limitations Dialog:** Accessible from the navigation bar to review implemented capabilities versus planned future work.

*(Tip for GitHub submission: capture screenshots of the populated Dashboard, Batch Upload queue, and Review Inspector in `docs/screenshots/` and embed them here.)*

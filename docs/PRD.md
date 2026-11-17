# Product Requirements Document (PRD)
## Wildlife Lens – AI Camera-Trap Identifier

**Document Version:** 1.0 (MVP)  
**Date:** November 2026  
**Project Type:** Academic / Conservation Technology MVP  

---

## 1. Project Overview

**Wildlife Lens – AI Camera-Trap Identifier** is a beginner-friendly, full-stack web application designed to help forest departments, wildlife biologists, and conservation researchers rapidly sort and verify camera-trap photographs. Using multimodal AI vision capabilities via the Google Gemini API (`gemini-4-hydrogen`), the system automatically screens uploaded image batches, separates genuine wildlife sightings from empty false-trigger frames, proposes candidate species identifications with visual explanations and confidence estimates, and provides an interactive review workbench where human reviewers can correct and verify every result.

---

## 2. Problem Statement

Motion-activated camera traps are one of the most widely used tools in modern wildlife monitoring. However, field deployments across forest ranges generate thousands of images per survey cycle—and a significant percentage (often 50%–80%) are **"empty frames"** triggered by swaying vegetation, shifting shadows, rain, or passing insects.

Currently, forest staff and field researchers must manually open and inspect thousands of images one by one:
- **High manual workload:** Reviewing thousands of false-trigger photographs consumes weeks of valuable ranger and biologist time.
- **Delayed conservation insights:** Species presence reports are delayed due to sorting bottlenecks.
- **Human fatigue and error:** Repetitive manual screening increases the risk of overlooking faint, partially obscured, or nocturnal animals in infrared images.

---

## 3. Problem Objectives

1. **Automate initial frame triage:** Automatically categorize uploaded camera-trap images into **Animal Detected**, **Empty Frame**, or **Uncertain**.
2. **Accelerate species identification:** Suggest probable common/scientific animal names and provide plain-language visual reasoning for each detection.
3. **Keep humans in the loop:** Route low-confidence or ambiguous frames to a review queue and allow rangers to override, annotate, and verify predictions.
4. **Preserve API security and simplicity:** Keep all AI API keys strictly on the Node.js backend while keeping the MVP lightweight with zero login friction and local browser persistence.

---

## 4. Target Users

| User Persona | Role & Context | Primary Need |
| :--- | :--- | :--- |
| **Forest Range Officer / Ranger** | Collects SD cards from field camera traps and performs initial sorting | Quickly filter out empty wind-triggered frames and flag wildlife sightings |
| **Wildlife Biologist / Researcher** | Conducts biodiversity surveys and species checklists | Accurate candidate species identification, confidence cues, and CSV export |
| **Student / Conservation Volunteer** | Assists forest departments or academic field projects | An intuitive, zero-setup interface to upload batches and verify sightings |

---

## 5. Proposed Solution

Wildlife Lens provides a three-stage operational workflow inside a single responsive web workspace:

1. **Batch Ingestion:** Users drag and drop multiple `.jpg`, `.jpeg`, or `.png` camera-trap photographs (or load an included 4-image sample field batch for immediate evaluation).
2. **Server-Side AI Classification:** Each image is transmitted to a Node.js/Express backend endpoint (`/api/classify`), which securely invokes the Gemini API (`gemini-4-hydrogen`) with a structured JSON schema. The model returns:
   - Category (`Animal Detected`, `Empty Frame`, or `Uncertain`)
   - Candidate species name (or `"None"` / `"Unidentified"`)
   - Estimated animal count
   - Estimated visual confidence (`0–100%`)
   - Concise visual explanation
3. **Human Review & Verification:** Results appear in a live Dashboard and Review Queue where reviewers can inspect full-size frames, filter by classification or review status, correct species or category labels, add field notes, mark items as **Verified**, and export the curated log as CSV.

---

## 6. Functional Requirements

### FR-1: Summary Dashboard
- **FR-1.1:** Display real-time metric totals for:
  - Total images uploaded
  - Animal images detected
  - Empty frames detected
  - Images requiring review (unverified `Uncertain` frames or predictions below 75% confidence)
- **FR-1.2:** Update dashboard counts dynamically when new images are classified or when a human reviewer corrects a classification.

### FR-2: Batch Image Upload
- **FR-2.1:** Support multi-file drag-and-drop and file picker selection for `JPG`, `JPEG`, and `PNG` formats.
- **FR-2.2:** Render thumbnail previews for every queued, processing, classified, and failed image.
- **FR-2.3:** Display real-time upload/processing progress (e.g., `"Processing 2 of 4"`) and individual item status.
- **FR-2.4:** Provide a one-click sample field batch loader so evaluators can test the complete pipeline without external files.

### FR-3: Secure AI Image Classification
- **FR-3.1:** Process all Gemini API calls exclusively on the Node.js server; never expose `GEMINI_API_KEY` to the browser.
- **FR-3.2:** Classify every frame strictly into `Animal Detected`, `Empty Frame`, or `Uncertain`.
- **FR-3.3:** Identify possible animal species when visible, accompanied by an explanation and estimated confidence score (`0–100`).
- **FR-3.4:** Never fabricate, mock, or randomize AI predictions; surface genuine upstream API errors clearly with retry capability.

### FR-4: Review, Correction, and Export
- **FR-4.1:** Display uploaded images alongside AI predictions and explanations.
- **FR-4.2:** Allow users to filter the queue (`All`, `Animal Detected`, `Empty Frame`, `Uncertain`, `Needs Review`, `Verified`) and search by filename or species.
- **FR-4.3:** Allow users to modify the classification category, edit the species name, add field notes, and mark frames as **Verified**.
- **FR-4.4:** Persist session workspace data in browser local/session storage so page refreshes retain uploaded previews and review decisions.
- **FR-4.5:** Allow exporting the sorted and verified dataset as a CSV report.

---

## 7. Non-Functional Requirements

- **Security:** API keys stored exclusively in server environment variables (`process.env.GEMINI_API_KEY`). File MIME type and payload size validation enforced on both client and server.
- **Reliability & Honesty:** Transient rate-limit or network failures trigger controlled retries with backoff; persistent errors are surfaced clearly to the user without fallback fake predictions.
- **Usability & Accessibility:** Forest-green and crisp white editorial dashboard theme, WCAG AA text contrast, single-line controls, keyboard-accessible buttons, and responsive layout across desktop and mobile viewports.
- **Performance:** Client-side image normalization (resizing oversized multi-megabyte photos prior to upload/persistence) ensures fast API turnaround and prevents browser `localStorage` quota overflow.
- **Maintainability:** Modular React components, strongly typed TypeScript interfaces shared by intent across frontend and backend, and clean separation between Express API routes and UI views.

---

## 8. MVP Scope

### Included in MVP (v1.0)
- Single-session responsive web application (no login required).
- Multi-image JPG/JPEG/PNG batch upload with preview cards and progress tracking.
- Server-side Gemini API classification (`Animal Detected`, `Empty Frame`, `Uncertain`), species suggestion, confidence estimate, and explanation.
- Interactive Review & Correction workbench with manual override, verification toggle, field notes, and CSV export.
- Lightweight browser storage persistence (`localStorage` with quota-safe thumbnail compression).

### Explicitly Out of Scope for MVP
- User authentication, multi-user accounts, or role-based access control (RBAC).
- Centralized cloud database (PostgreSQL, Firestore, or S3 object storage).
- Interactive GIS / wildlife sightings map or GPS heatmap visualization.
- Automated wildlife population density estimation, mark-recapture modeling, or individual animal re-identification.
- Offline desktop edge inference (running local PyTorch/YOLO models without internet).

---

## 9. Technology Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite | Component-based UI with fast bundling and strict type safety |
| **Styling** | Tailwind CSS v4, Lucide Icons | Clean forest-green and white theme with responsive utilities |
| **Backend** | Node.js, Express, `tsx` | Lightweight HTTP server hosting `/api/classify` and serving the SPA |
| **AI Model** | `@google/genai` (`gemini-4-hydrogen`) | Multimodal image reasoning with structured JSON schema output |
| **Persistence** | Browser `localStorage` | Zero-configuration MVP persistence without database overhead |

---

## 10. User Workflow

```text
[1. Open Workspace]
        │
        ▼
[2. Upload JPG/PNG Camera-Trap Batch] ──(or Load 4 Sample Trail Photos)──┐
        │                                                                │
        ▼                                                                │
[3. Preview Batch & Trigger AI Classification] ◄─────────────────────────┘
        │  (POST /api/classify -> Server calls Gemini API)
        ▼
[4. View Updated Dashboard Metrics]
        │  (Total · Animal Detected · Empty Frame · Needs Review)
        ▼
[5. Open Review & Correction Workbench]
        │  ├─ Filter by "Needs Review" or "Uncertain"
        │  ├─ Inspect full image + AI explanation & confidence
        │  ├─ Correct category or species label if needed
        │  └─ Click "Mark as Verified"
        ▼
[6. Export Sorted Batch CSV for Forest Department Records]
```

---

## 11. Limitations and Future Enhancements

### Current MVP Limitations
1. **Browser Storage Capacity:** Storing image previews in browser `localStorage` limits large batches (~30–50 compressed images per browser session depending on browser limits).
2. **Internet Dependency:** Gemini API classification requires active internet connectivity; field stations without connectivity cannot classify offline.
3. **Single-Frame Context:** Each frame is evaluated independently without cross-frame burst sequence grouping or EXIF timestamp/camera-ID parsing.
4. **No Geographic Mapping:** Sightings are not plotted onto reserve beat maps or spatial layers.

### Planned Future Enhancements
1. **Cloud Storage & Multi-User Database:** Store high-resolution camera-trap archives in cloud object storage with PostgreSQL/Firestore metadata and range-officer authentication.
2. **EXIF Metadata Extraction:** Automatically parse camera ID, capture date/time, moon phase, and GPS coordinates from image headers.
3. **Interactive Wildlife Sightings Map:** Plot verified species detections across forest beats and protected area corridors.
4. **Burst-Sequence Grouping & Analytics:** Group rapid motion-triggered photo bursts into single sighting events and generate species activity-by-hour charts.
5. **Hybrid Edge + Cloud Triage:** Run lightweight on-device empty-frame filtering at remote forest check-posts before syncing confirmed sightings to the cloud.

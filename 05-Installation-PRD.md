# Installation PRD
## Income Certificate (IC) Verification System — Setting Up on a New Computer

**Version:** 1.0
**Applies to:** `ic-verify-system` (React + Vite frontend, Node/Express backend)
**Audience:** Anyone installing this project on a different laptop/PC — no coding background assumed
**Goal:** Get the exact same app, with the exact same features, running on a new machine

---

## 1. Purpose

This app currently runs on one computer. This document explains, in plain steps, how to copy it onto another computer and get it working there — installing the right software, restoring the project files, connecting it to Google (Drive/Sheets) and Gemini again, and confirming it runs correctly.

## 2. What You're Installing

A two-part web app that runs locally:
- **Frontend** — the dashboard staff use in the browser (built with React + Vite).
- **Backend** — a Node.js server that talks to Google Drive, Google Sheets, and the Gemini AI model to read and verify Income Certificates.

Both parts run at the same time on the new computer and talk to each other on `localhost`.

## 3. What You Need Before You Start

| Item | Why you need it | Where to get it |
|---|---|---|
| The project folder (`Geetha`) | This is the actual app code | Copy it from the old computer (USB drive, shared Drive, or the `.7z`/`.zip` file) |
| **Node.js** version 18 or newer (20 LTS recommended) | Runs both the frontend and backend | [nodejs.org](https://nodejs.org) — download the LTS installer |
| A **Gemini API key** | Powers the OCR/document-reading feature | [aistudio.google.com](https://aistudio.google.com/) — free tier |
| A **Google Cloud Service Account credentials file** (a `.json` key) | Lets the app read the Drive folder of ICs and write to the Google Sheet database | Google Cloud Console, under the same project the app was originally set up with (see §7) |
| Internet connection | Needed for Drive, Sheets, and Gemini calls | — |
| Windows, macOS, or Linux | The app is OS-independent | — |

You do **not** need to reinstall anything else manually — all other libraries the app needs (React, Express, etc.) get installed automatically in Step 2.

## 4. Step-by-Step Installation

### Step 1 — Copy the project folder to the new computer

1. Copy the entire `Geetha` project folder onto the new computer (any location is fine, e.g. `Desktop\Geetha` or `Documents\Geetha`).
2. **Do not** copy the `node_modules` folder if you can avoid it — it's large (300+ MB) and gets rebuilt automatically in Step 2. If it's already included, that's fine too, it just wastes time; you can delete it and let Step 2 recreate it.

### Step 2 — Install Node.js

1. Go to [nodejs.org](https://nodejs.org) and download the **LTS** version for your operating system.
2. Run the installer and accept the defaults.
3. Confirm it installed correctly — open a terminal (Command Prompt on Windows, Terminal on Mac) and type:
   ```
   node -v
   npm -v
   ```
   Both should print a version number. If you see "command not found," restart your computer and try again.

### Step 3 — Install the app's dependencies

1. Open a terminal **inside** the `Geetha` folder.
   - Windows: open the folder in File Explorer, click the address bar, type `cmd`, press Enter.
   - Mac/Linux: right-click the folder → "Open Terminal here," or `cd` into it manually.
2. Run:
   ```
   npm install
   ```
3. Wait for it to finish (a few minutes). This downloads everything the app needs (React, Express, the Gemini SDK, etc.) into a fresh `node_modules` folder.

### Step 4 — Set up the environment file (`.env`)

This file holds the app's private keys. It is **not** copied automatically for security reasons — you set it up fresh on each computer.

1. In the `Geetha` folder, find `.env.example`. Make a copy of it and rename the copy to `.env`.
2. Open `.env` in any text editor and fill in:
   ```
   OMNIROUTE_API_KEY=sk-545c40e7280411e8-ef49f8-a406343b
   PORT=5000
   GOOGLE_APPLICATION_CREDENTIALS=server/config/google_credentials.json
   ```
3. Set your OmniRoute API key in place of `OMNIROUTE_API_KEY`.

### Step 5 — Add the Google service account credentials file

The app uses a Google "service account" (not a personal login) to access the Drive folder and Sheet.

1. Get the `google_credentials.json` file — either copied securely from the old computer, or freshly generated in Google Cloud Console (see §7 for how, if you don't have the original).
2. Place it at exactly this path inside the project:
   ```
   Geetha/server/config/google_credentials.json
   ```
3. **Treat this file like a password** — never email it unencrypted, upload it to Drive/GitHub, or share it outside the college's own accounts. Anyone with this file can access the same Drive folder and Sheet the app uses.

### Step 6 — Start the app

**Easiest way (Windows):** Double-click `Start_App.bat` inside the `Geetha` folder. It opens two windows — one for the backend, one for the frontend — and your browser should open automatically.

**Manual way (any OS):** Open two terminal windows, both inside the `Geetha` folder:
- Terminal 1 — start the backend:
  ```
  npm run server
  ```
- Terminal 2 — start the frontend:
  ```
  npm run dev
  ```
  This opens the app in your browser automatically (usually at `http://localhost:5173`).

### Step 7 — Confirm it works

1. The dashboard should load in the browser with the Upload screen.
2. Try uploading the sample Excel file and a test Drive folder URL (or the same demo data used originally).
3. Run a verification on 1–2 records and confirm you get a result back (VERIFIED/REJECTED/REVIEW) — this confirms Gemini, Drive, and Sheets are all connected correctly.
4. If it fails, check §8 (Troubleshooting) below.

## 5. Configuration Already Built Into the App (No Setup Needed)

These don't need to be reconfigured — they're already part of the project code:
- State validity rules (Telangana: 1 yr, Andhra Pradesh: 4 yr, Tamil Nadu: 1 yr, Karnataka: 5 yr) — stored in `server/config/validity_rules.json`.
- Name-matching thresholds and confidence rules.
- The Upload / Results / Review screens.

## 6. What Is *Not* Copied Automatically (Must Be Redone Per Machine)

| Item | Why |
|---|---|
| `.env` file | Contains a private API key — excluded on purpose so it's never shared by accident |
| `google_credentials.json` | Contains a private security key — same reason |
| `node_modules` folder | Machine-specific build files; regenerated fresh by `npm install` |

## 7. If You Don't Have the Original Google Credentials

If the original `.env` and `google_credentials.json` aren't available (e.g. the old computer is gone), you'll need to create new ones:

1. Go to [console.cloud.google.com](https://console.cloud.google.com/), open the same Google Cloud project used originally (or create a new one).
2. Enable the **Google Drive API** and **Google Sheets API** for that project.
3. Go to **IAM & Admin → Service Accounts → Create Service Account**, give it a name (e.g. `ic-verify-service`).
4. Under that service account, go to **Keys → Add Key → Create new key → JSON**. This downloads the credentials `.json` file — save it as `google_credentials.json` in `server/config/`.
5. Share the Google Drive folder (containing the ICs) and the Google Sheet (used as the database) with the service account's email address (it looks like `ic-verify-service@your-project.iam.gserviceaccount.com`) — give it **Editor** access.
6. Get a Gemini API key from [aistudio.google.com](https://aistudio.google.com/) and add it to `.env` as in Step 4.

## 8. Troubleshooting

| Problem | Likely Cause | Fix |
|---|---|---|
| `npm install` fails or hangs | No internet, or an old Node.js version | Check internet connection; confirm `node -v` shows 18+ |
| Blank page / app won't load in browser | Frontend server not running | Confirm the `npm run dev` window shows no errors and is still open |
| "Service Account credentials not configured" error | `.env` or `google_credentials.json` missing/misplaced | Recheck Step 4 and Step 5 — the file path must match exactly |
| Drive folder can't be read | Folder not shared with the service account email | Re-share the folder as in §7 Step 5 |
| Gemini extraction fails / returns errors | Invalid or missing `GEMINI_API_KEY` | Double-check the key in `.env`, generate a new one if needed |
| Port 5000 already in use | Another app is using that port | Change `PORT=5000` in `.env` to another number, e.g. `5050` |

## 9. Security Notes

- Never commit `.env` or `google_credentials.json` to GitHub or any shared/public repository.
- If this project folder is ever shared with someone else, delete both files first and let them follow §4–§5 to set up their own.
- Since the app handles student income data, keep the Drive folder and Sheet restricted to the college's own Google accounts only — do not make them publicly link-shareable.

## 10. Quick Checklist (Print/Save This)

- [ ] Node.js 18+ installed (`node -v` works)
- [ ] Project folder copied over
- [ ] `npm install` run successfully inside the folder
- [ ] `.env` created with `GEMINI_API_KEY`, `PORT`, and `GOOGLE_APPLICATION_CREDENTIALS`
- [ ] `google_credentials.json` placed in `server/config/`
- [ ] Drive folder + Google Sheet shared with the service account email
- [ ] App started (`Start_App.bat` or `npm run server` + `npm run dev`)
- [ ] Test verification run completed successfully

Project: CloudAudio PWA (MVP)

1. Vision & Strategy

A high-performance, mobile-first Progressive Web App (PWA) for streaming and offline management of audio files stored in Google Drive. It allows users to "import" specific Drive folders and navigate them as persistent playlists.

Target User: Personal use + sharing with trusted individuals via direct folder links.

2. Functional Requirements (Constraints)

R1: Data & Discovery

Folder-Centric: Users import a Google Drive Folder ID. The app crawls this folder recursively (up to 10 levels deep).

Infinite Nesting: Support for complex folder structures; sub-folders act as sub-playlists.

Multi-Account/Multi-Folder: Ability to add/save multiple root folders from different sources.

R2: Playback & State

Playlist Logic: All files in a folder are queued alphabetically.

Controls: Shuffle and Loop (single/folder) must be available.

Resume System: The app must track folder_id, file_id, and timestamp (playtime). Switching folders preserves the last known position of the previous folder.

Hardware Integration: Use Media Session API for Lock Screen controls and background playback.

R3: Offline & Sync

Manual Caching: Toggle switches for individual tracks and "Download All" for folders.

Visual Feedback: Unavailable (non-cached) files are greyed out when offline.

Storage Guard: Display "Space Required" before downloads. Prevent download if storage is insufficient.

Network Policy: Downloads are restricted to Wi-Fi by default. Manual override required for Cellular.

R4: User Interface (UI)

Theming: Follow system settings (Light/Dark), with a manual override toggle.

Mini-Player: Persistent playback bar at the bottom during navigation.

Drive Mode: A high-contrast, large-button interface for simplified control.

3. Technical Architecture & Decisions

Decision Log

Component

Choice

Justification

Auth

Google Identity (GSI)

Persistent login. Required for private folder access.

Sharing

URL-based Import

Since there is no backend, sharing is handled via URL parameters (e.g., ?folderId=XYZ).

Storage

Cache API + IndexedDB

Cache API for MP3 binary data; IndexedDB for "Resume State" and metadata.

State Mgmt

Vanilla JS State

Keep it lightweight. Use localStorage for settings/last-played folder.

4. Constraint Checklist for Gemini Code Assist

When generating code for this project, always adhere to the following:

Pure Frontend: No Node.js/Python. Use Service Workers for all "server-like" behavior.

Library Names: Do not guess variable names. If using GSI or Workbox, ask for current implementation details if unsure.

Connectivity Handling: Monitor navigator.onLine. If signal is lost, stop playback and show "Connection Lost" rather than skipping.

Media Session: Every "Play" action must update navigator.mediaSession.metadata.

iOS Compatibility: Use -webkit-overflow-scrolling: touch and specific PWA meta tags for Safari.

5. Development Roadmap

[ ] Phase 1: Google Cloud Console (OAuth & API Key).

[ ] Phase 2: App Shell & Persistent Auth (GSI).

[ ] Phase 3: Folder Crawler (Drive API v3) with URL-param support for sharing.

[ ] Phase 4: Audio Player & "Resume State" (IndexedDB).

[ ] Phase 5: Workbox Service Worker (Offline caching & WiFi-only logic).
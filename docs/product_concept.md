# AriaScore Product Concept Document

## 1. Product Overview
**Name:** AriaScore  
**Type:** Mobile App (iOS & Android)  
**Concept:** A hands-free PDF reader optimized for musicians, allowing users to turn pages via facial gestures like blinking or head turns. It also supports organizing sheet music into collections and includes performance-specific modes (singing/playing).

---

## 2. Problem Statement
Musicians often need to turn pages while playing instruments or singing — a task that interrupts performance flow. Traditional page-turning methods (e.g. foot pedals, touch gestures) are not always practical or accessible. Musicians also need a lightweight, organized digital library tailored to performance settings.

---

## 3. Target Users
- Professional and amateur musicians
- Music students and educators
- Choir members, ensemble players, solo performers
- Accessibility-conscious users needing hands-free interaction

---

## 4. Key Features

### A. Core Reading Experience
- PDF rendering optimized for scores
- Fast page-turning via gestures (blink, wink, head turn)
- Manual page navigation (tap or swipe fallback)

### B. Gesture Control
- Blink left/right for page turns
- Head turn detection
- Configurable gesture sensitivity

### C. Performance Modes
- **Singing Mode**: Larger lyrics, slower gesture scroll
- **Playing Mode**: Compact view, faster gestures
- Mode-specific customization (stored per user)

### D. Library Management
- Import PDFs from device, cloud
- Sort, search, and rename scores
- Persistent local storage (SQLite)

### E. Collections
- Group PDFs into named sets (e.g., “St. Mary’s Concert”)
- PDFs can belong to multiple collections
- Launch a collection for uninterrupted performance flow

### F. Future Enhancements (MVP+)
- Auto-scroll / tempo-based page turns
- Audio playback / accompaniment
- QR code sheet importing
- MIDI input integration
- Cloud sync / backup
- Night mode and color filters for low-light performance

---

## 5. Platform & Tech Stack
- **Frontend**: React Native (Expo or bare)
- **Gesture Detection**: MediaPipe or ML Kit + Vision Camera
- **PDF Viewing**: `react-native-pdf` or custom renderer
- **Database**: SQLite via `expo-sqlite` or `react-native-sqlite-storage`
- **Storage**: Secure file system (possibly encrypted)

---

## 6. Success Criteria
- Reliable gesture recognition in live conditions
- Low latency in page turns
- Positive feedback from musicians in rehearsals
- Smooth library navigation and grouping
- Battery and performance efficiency

---

## 7. MVP Scope

**Included:**
- PDF import and viewing  
- Gesture-based page turn (blink, head turn)  
- Basic library with search  
- Collection grouping  
- Singing/playing mode toggle  

**Excluded (for now):**
- Cloud sync  
- Cross-device sync  
- MIDI/audio detection  
- Accessibility voice commands  

---

## 8. Visual Identity (Optional)
**Logo idea:** A floating music note with wings or air lines  
**Colors:** Soft blue, black, white (high contrast for performance use)  
**Typography:** Clear, sans-serif fonts (Fira Sans, Montserrat)

---

## 9. Monetization (Optional)
- Free basic version with core features  
- Paid Pro: advanced gesture config, unlimited collections, cloud sync  
- Institutional licenses (music schools, choirs)

---

## 10. Roadmap (3 Phases Example)

| Phase | Features |
|-------|----------|
| MVP   | PDF view, gesture page turn, library, collections, modes |
| v1.1  | UI polish, bug fixes, collection export, advanced gesture tuning |
| v1.2+ | Auto-scroll, MIDI/audio cues, cloud sync, multi-user profiles |

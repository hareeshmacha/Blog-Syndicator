# AI-Powered Omni-Channel Tech Blog Syndicator 

An advanced, full-stack blog publishing platform designed for developer advocates, technical writers, and software engineers. Write your markdown once, tailor the tone per-platform using Google Gemini AI, and publish simultaneously to Dev.to, Hashnode, and Blogger without ever copy-pasting.

##  Features

-  **Dual-Pane Markdown Editor:** Write natively in Markdown with real-time preview parsing.
-  **Semantic Differential Syndication:** Use the AI sidebar to assign a unique tone (e.g., *Beginner Friendly*, *Executive Summary*) to specific platforms. 
-  **Absolute Markdown Fidelity:** The Gemini agent is strictly locked down to ensure programming `<code/>` blocks, tables, and headers are perfectly preserved while the narrative prose is rewritten for the audience.
-  **Multi-Platform Dispatch:** Publish your generated variants simultaneously using native REST and GraphQL APIs.
-  **Media Library:** Unified Supabase storage bucket allowing you to upload images and instantly get markdown-compliant permanent URLs.
-  **Cloud Draft Auto-saving:** Never lose your work. Your local layout and text state is automatically synced to the PostgreSQL backend.
-  **Canonical URL Protection:** The syndicator automatically waits for high-priority sites (like Dev.to) to publish, retrieves their live URL, and injects it into lower-priority payloads to prevent Google indexing penalties.

## 🛠️ Technology Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Vite, Lucide Icons, UIW Markdown Editor.
- **Backend:** Node.js, Express, dotenv, CORS.
- **Database & Auth:** Supabase (PostgreSQL, Row-Level-Security Auth, Storage Buckets).
- **AI Core:** Google Generative AI (`gemini-flash-latest` REST deployment).
- **Publishing Integrations:** Dev.to API (REST), Hashnode API (GraphQL), Blogger API (OAuth).

##  Getting Started

### Prerequisites
- Node.js (v18+)
- A [Supabase](https://supabase.com/) Project ID and Anon Key
- A Google [Gemini API Key](https://aistudio.google.com/)

### 1. Database Setup
Execute the `supabase_schema.sql` file within your Supabase project's SQL Editor to set up your Auth, Profiles, Drafts, and Storage buckets.

### 2. Environment Variables
You'll need to create two `.env` files.

**`server/.env`**
```env
PORT=5000
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_google_gemini_key
```

**`client/.env`**
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Installation & Booting
Open two terminal instances.

**Terminal 1 (Backend):**
```bash
cd server
npm install
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd client
npm install
npm run dev
```

The application will now be running at `http://localhost:5173`. 

##  App Configuration
Upon creating an account in the UI, navigate to the **Settings** modal. Enter your respective Dev.to API Key, Hashnode API Key, and Blogger credentials. The backend securely saves these into your isolated Supabase profile to authorize your programmatic syndication bursts.

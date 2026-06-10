# Xeno Mini CRM - AI-First Campaign Manager

This is a chat-first marketing CRM where a marketer describes campaign criteria in plain English (e.g. *"customers in Mumbai who bought beauty products at least twice"*), and the system extracts database segment filters, drafts a personalized message template, previews target contacts, dispatches message campaigns, and monitors deliverability metrics in real time via an asynchronous callback simulator loop.

---

## System Architecture & Flow

1. **Marketer (Next.js Frontend)**: Interacts with the chatbot, previews matching customer listings, modifies message templates, launches campaigns, and tracks stats on the Campaign Performance Dashboard.
2. **CRM Backend (Node.js Express + Prisma ORM)**: Integrates with Gemini API to detect intent and parse segment parameters. Builds and executes PostgreSQL queries. Compiles personalized templates per customer and sends dispatch batches.
3. **Channel Stub Service (Node.js Express)**: Receives campaign dispatches and enqueues them. Simulates message gateway outcomes (Delivered, Opened, Clicked, Failed) with realistic randomized network delays, and posts callbacks to the CRM Webhook.
4. **PostgreSQL Database**: Configured via Docker Compose. Stores customers, orders, campaigns, messages, and raw callback receipt logs.

---

## Setup & Running Guide

Ensure **Docker Desktop** and **Node.js (v18+)** are installed.

### Step 1: Start the Database Container
Spin up the PostgreSQL database in the background. Port `5532` is used to prevent port clashes with local Windows services:
```bash
docker compose up -d
```

### Step 2: Initialize the CRM Backend
1. Open a terminal in the `backend/` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the database migrations to set up the tables:
   ```bash
   npx prisma migrate dev --name init
   ```
4. Seed the database with 500 customers, 1,200 orders, and 3 completed demo campaigns:
   ```bash
   npm run seed
   ```
5. Start the backend development server on port `5000`:
   ```bash
   npm run dev
   ```

*Note: To connect real AI segment generation, paste your API key in `backend/.env` under `GEMINI_API_KEY`. If empty, the system automatically falls back to an offline rule-based parser.*

### Step 3: Run the Channel Stub Simulator
1. Open a terminal in the `channel-stub/` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the simulator service on port `5001`:
   ```bash
   npm run dev
   ```

### Step 4: Launch the Next.js Frontend
1. Open a terminal in the `frontend/` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server on port `3000`:
   ```bash
   npm run dev
   ```
4. Access the CRM UI by browsing to [http://localhost:3000](http://localhost:3000).

---

## Verification Flow & Features
1. **AI Chat Segment Creation**: Type *"customers who spent 1000+ total in Mumbai"* in the chat.
2. **Interactive Preview**: Inspect the matching count and the real-time sample customer grid.
3. **Message Variables**: Verify curly braces templates like `{name}` and `{city}`.
4. **Live Dashboard**: Watch the progress bars and CTRs update in real-time as callbacks fire.

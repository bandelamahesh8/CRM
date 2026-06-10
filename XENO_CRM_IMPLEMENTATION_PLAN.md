# Xeno Mini CRM — Complete Implementation Plan
**Candidate:** Bandela Mahesh | Reg. No. 12311419 | Lovely Professional University  
**Deadline:** June 15, 2026 — 12:00 PM  
**Role:** SDE Internship

---

## 1. Product Vision & Bet

**Core bet:** A chat-first AI agent CRM where a marketer types intent in plain English → Gemini segments the audience, drafts the message, picks the channel, fires the campaign, and surfaces insights — all from one chat interface.

**Why this wins:**
- Genuinely AI-native, not a dashboard with an AI button bolted on
- Opinionated and differentiated from standard form-based submissions
- Demonstrates system design (callback loop) + AI integration + product thinking
- Scoped tightly — nothing shallow, everything works end-to-end

**What this IS:** A marketing engagement tool for a D2C brand  
**What this is NOT:** A sales CRM, support ticket system, or lead pipeline

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────┐
│              Marketer (Browser)                  │
│         Chat UI  +  Insights Dashboard           │
└─────────────────┬───────────────────────────────┘
                  │ HTTP
┌─────────────────▼───────────────────────────────┐
│           CRM Backend (Node.js / Express)        │
│                                                  │
│  POST /api/chat          ← AI conversation       │
│  POST /api/campaigns     ← fire a campaign       │
│  GET  /api/campaigns     ← list campaigns        │
│  GET  /api/campaigns/:id ← campaign insights     │
│  POST /api/receipts      ← receive callbacks     │
│  GET  /api/segments/preview ← preview audience   │
│                                                  │
│  ┌────────────┐   ┌──────────────────────────┐  │
│  │ Gemini API │   │   PostgreSQL (Supabase)   │  │
│  │ (AI brain) │   │ customers, orders,        │  │
│  └────────────┘   │ campaigns, messages,      │  │
│                   │ receipts                  │  │
│                   └──────────────────────────┘  │
└─────────────────┬───────────────────────────────┘
                  │ HTTP (send campaign)
┌─────────────────▼───────────────────────────────┐
│        Channel Stub Service (Node.js)            │
│                                                  │
│  POST /send   ← receives messages from CRM       │
│               → simulates delay (1–5s)           │
│               → POSTs callback to CRM            │
│                  with status: delivered/         │
│                  failed/opened/clicked           │
└─────────────────────────────────────────────────┘
```

**Two-service design is intentional** — mirrors how real channel providers (Twilio, WhatsApp BSP) work with webhooks.

---

## 3. Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | Next.js 14 + Tailwind CSS | Fast deploy on Vercel, App Router |
| Backend | Node.js + Express | Lightweight, easy to structure |
| Database | PostgreSQL via Supabase | Free tier, SQL, instant setup |
| AI | Gemini API (gemini-2.5-flash) | Segmentation + message drafting |
| Channel Stub | Separate Node.js + Express service | Required by assignment |
| Frontend Deploy | Vercel | Free, instant |
| Backend Deploy | Railway | Free tier, supports two services |
| ORM | Prisma | Clean schema, auto migrations |

---

## 4. Database Schema

```sql
-- customers
id, name, email, phone, city, gender, age, created_at

-- orders
id, customer_id, amount, product_name, product_category, ordered_at

-- campaigns
id, name, segment_query (JSON), message_template, channel,
status (draft/running/completed), created_at, total_sent,
total_delivered, total_failed, total_opened, total_clicked

-- messages
id, campaign_id, customer_id, personalized_message, channel,
status (pending/sent/delivered/failed/opened/clicked), sent_at, updated_at

-- receipts (raw callback log)
id, message_id, event (delivered/opened/clicked/failed), received_at
```

---

## 5. AI Agent Design (Gemini Integration)

The AI handles these tasks inside the chat:

### 5.1 Intent Detection
Gemini reads the marketer's message and returns a structured JSON:
```json
{
  "intent": "create_campaign",
  "segment": {
    "description": "customers who bought 2+ times but not in last 60 days",
    "filters": { "min_orders": 2, "inactive_days": 60 }
  },
  "suggested_message": "Hey {name}, we miss you! Here's 15% off your next order.",
  "channel": "whatsapp"
}
```

### 5.2 Segment Builder
Filters supported:
- `min_orders`, `max_orders` — purchase frequency
- `inactive_days` — last order older than N days
- `min_spent`, `max_spent` — total spend range
- `city` — location filter
- `product_category` — purchased a specific category

### 5.3 Message Personalisation
Gemini drafts the message. At send time, backend replaces `{name}`, `{last_product}`, `{city}` with real customer data per recipient.

### 5.4 Insight Summarisation
After a campaign completes, Gemini reads the stats and gives a plain-English summary:
_"Your campaign reached 340 customers. 78% were delivered, 32% opened it. Engagement was highest in Delhi."_

---

## 6. Channel Stub Service — Full Lifecycle

```
CRM Backend
  POST http://channel-stub/send
  Body: { messageId, recipientPhone, text, channel }
        ↓
Channel Stub receives it
  → queues for random delay: 1000–5000ms
  → picks a random outcome:
       60% → delivered
       10% → failed
       (of delivered) 40% → opened
       (of opened)    25% → clicked
  → POSTs back to CRM:
       POST http://crm-backend/api/receipts
       Body: { messageId, event: "delivered", timestamp }
  → if delivered, waits another 2–8s, fires "opened" callback
  → if opened, waits another 3–10s, fires "clicked" callback
```

**Error handling:**
- CRM receipt endpoint is idempotent (duplicate callbacks safely ignored)
- Channel stub retries failed CRM callbacks up to 3 times with exponential backoff
- All callbacks logged to `receipts` table regardless of outcome

---

## 7. Frontend — Pages & Components

### 7.1 Chat Page (`/`) — Primary Interface
```
┌──────────────────────────────────────────┐
│  XENO CRM                    [Insights →]│
├──────────────────────────────────────────┤
│                                          │
│  [AI message bubble]                     │
│  "Hi! I'm your campaign assistant.       │
│   Who do you want to reach today?"       │
│                                          │
│        [User bubble]                     │
│        "Reach customers who haven't      │
│         bought in 2 months"              │
│                                          │
│  [AI message bubble]                     │
│  "Found 287 customers matching that.     │
│   Here's a draft message: ..."           │
│  [Segment Preview Card]                  │
│  [Message Draft Card]  [Edit] [Launch →] │
│                                          │
├──────────────────────────────────────────┤
│  [Type your message...]        [Send]    │
└──────────────────────────────────────────┘
```

### 7.2 Insights Page (`/insights`)
```
┌──────────────────────────────────────────┐
│  Campaign Performance                    │
├──────────────────────────────────────────┤
│  [Campaign Card]                         │
│  "Win-Back Campaign" — Jun 10            │
│  Sent: 287 | Delivered: 201 | Open: 89  │
│  [Progress bars per metric]              │
│  [AI Summary text]                       │
└──────────────────────────────────────────┘
```

### 7.3 Components to Build
- `ChatWindow` — message bubbles, auto-scroll to bottom
- `SegmentPreviewCard` — shows count + filter summary
- `MessageDraftCard` — editable message with personalisation tags
- `CampaignLaunchButton` — fires campaign, shows loading state
- `CampaignCard` — insights per campaign with live-updating stats
- `MetricBar` — sent / delivered / opened / clicked progress bars

---

## 8. API Contracts

### POST `/api/chat`
```json
Request:  { "message": "...", "history": [...] }
Response: { "reply": "...", "action": { "type": "preview_segment", "data": {...} } }
```

### POST `/api/campaigns`
```json
Request:  { "name": "...", "segmentFilters": {...}, "messageTemplate": "...", "channel": "whatsapp" }
Response: { "campaignId": "...", "totalRecipients": 287 }
```

### GET `/api/campaigns/:id`
```json
Response: {
  "id": "...", "name": "...",
  "stats": { "sent": 287, "delivered": 201, "opened": 89, "clicked": 22, "failed": 12 }
}
```

### POST `/api/receipts`
```json
Request:  { "messageId": "...", "event": "delivered", "timestamp": "..." }
Response: { "ok": true }
```

### Channel Stub — POST `/send`
```json
Request:  { "messageId": "...", "recipientPhone": "...", "text": "...", "channel": "whatsapp" }
Response: { "accepted": true }
```

### GET `/api/segments/preview`
```json
Request (query params): ?min_orders=2&inactive_days=60
Response: { "count": 287, "sample": [{ "name": "Priya S.", "city": "Mumbai" }, ...] }
```

---

## 9. Seed Data

Realistic fake data to be seeded at startup:

- **500 customers** — Indian names, emails, phones, cities (Mumbai, Delhi, Bengaluru, Hyderabad, Chennai, Pune), age 18–55
- **1,200 orders** — spanning last 6 months, product categories: Fashion, Beauty, Electronics, Food & Beverage
- **3 pre-built demo campaigns** — already completed, with full receipt data so insights page shows real stats on first open

Seed script: `npm run seed` via Prisma + `@faker-js/faker`

---

## 10. Folder Structure

```
xeno-crm/
├── frontend/                    (Next.js — deploy to Vercel)
│   ├── app/
│   │   ├── page.tsx             ← Chat interface (primary)
│   │   └── insights/page.tsx    ← Campaign insights
│   ├── components/
│   │   ├── ChatWindow.tsx
│   │   ├── SegmentPreviewCard.tsx
│   │   ├── MessageDraftCard.tsx
│   │   ├── CampaignCard.tsx
│   │   └── MetricBar.tsx
│   └── lib/
│       └── api.ts               ← fetch wrappers for backend
│
├── backend/                     (Node.js + Express — deploy to Railway)
│   ├── src/
│   │   ├── index.ts             ← app entry point
│   │   ├── routes/
│   │   │   ├── chat.ts          ← POST /api/chat
│   │   │   ├── campaigns.ts     ← POST/GET /api/campaigns
│   │   │   ├── receipts.ts      ← POST /api/receipts
│   │   │   └── segments.ts      ← GET /api/segments/preview
│   │   ├── services/
│   │   │   ├── gemini.ts        ← AI: intent detection, drafting, insights
│   │   │   ├── segmenter.ts     ← SQL filter builder from segment JSON
│   │   │   ├── sender.ts        ← calls channel stub per recipient
│   │   │   └── personalizer.ts  ← replaces {name}, {city} in messages
│   │   └── lib/
│   │       └── prisma.ts        ← Prisma client singleton
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── .env
│
└── channel-stub/                (Node.js — deploy to Railway, separate service)
    ├── src/
    │   ├── index.ts             ← Express app, POST /send
    │   └── simulator.ts         ← async callback logic with retries
    └── .env
```

---

## 11. Day-by-Day Build Plan

| Day | Date | Tasks | Done When |
|---|---|---|---|
| **Day 1** | Jun 10 | Prisma schema + Supabase setup + seed script (500 customers, 1200 orders) + Express scaffold + CRUD routes skeleton | `npm run seed` works, `/api/campaigns` returns `[]` |
| **Day 2** | Jun 11 | Channel stub `/send` endpoint + async simulator + `/api/receipts` handler + message status updates in DB | End-to-end: send 1 message → see callback update in DB |
| **Day 3** | Jun 12 | Gemini integration: system prompt design, intent detection, segment builder, message drafter, insight summariser | Chat returns structured JSON action correctly |
| **Day 4** | Jun 13 | Next.js frontend: ChatWindow, SegmentPreviewCard, MessageDraftCard, Launch button, Insights page with polling | Full flow works in browser locally |
| **Day 5** | Jun 14 | Deploy all 3 services + env vars + CORS + end-to-end smoke test + record walkthrough video | All URLs live, video uploaded |
| **Buffer** | Jun 15 | Fix anything broken, submit form by 12 PM | ✅ Submitted |

---

## 12. Deployment Plan

| Service | Platform | Environment |
|---|---|---|
| Frontend | Vercel | `NEXT_PUBLIC_API_URL=https://xeno-crm-backend.up.railway.app` |
| CRM Backend | Railway | `DATABASE_URL`, `ANTHROPIC_API_KEY`, `CHANNEL_STUB_URL` |
| Channel Stub | Railway (2nd service) | `CRM_RECEIPT_URL=https://xeno-crm-backend.up.railway.app/api/receipts` |
| Database | Supabase | Managed PostgreSQL, connection string in backend env |

---

## 13. Explicit Tradeoffs (For Interview)

| Decision | What I built | What I'd do at scale |
|---|---|---|
| No auth | Skip login entirely | JWT auth + org-scoped data |
| setTimeout for async | Simple delay in channel stub | Redis + BullMQ job queue |
| No real channels | Stub all as one service | Per-channel services with real API keys |
| SQL on every segment | Direct Prisma queries | Pre-computed segments, invalidated on new orders |
| Polling for live stats | `setInterval` every 3s | Server-Sent Events or WebSocket |
| Single DB | One Supabase instance | Read replicas + PgBouncer connection pooling |
| Gemini call per chat turn | Sequential, no streaming | Streaming responses, prompt caching |

---

## 14. Walkthrough Video Structure (5–6 min)

| Section | Time | What to Say |
|---|---|---|
| Product intro | 0:30 | "I built a chat-first AI CRM. The marketer just types what they want — Gemini figures out who to reach, writes the message, and fires the campaign." |
| Functional demo | 1:30 | Type prompt → show segment preview → edit message → launch → switch to insights, watch numbers update live |
| Architecture | 1:00 | Show architecture diagram. Explain the two-service design and why callbacks matter for real-world accuracy |
| Code walkthrough | 1:00 | Show `gemini.ts` system prompt, `simulator.ts` callback logic, Prisma schema |
| AI-native workflow | 1:00 | "I used Gemini to design the intent detection prompt, write the seed script, and debug a race condition in the callback loop" |

---

## 15. Differentiators vs. Typical Submissions

| Factor | Typical submission | This submission |
|---|---|---|
| UX | Form-based campaign builder | Chat-first, AI-driven |
| AI role | Message generator button | Core product brain |
| System design | Single service | Two services, async callback loop |
| Insights | Static numbers | Live-updating as callbacks arrive |
| Scope | Many features, shallow | Few features, deep and working |
| Code | Mixed concerns | Single-responsibility services |

---

*Plan v1.0 — Bandela Mahesh — June 10, 2026*

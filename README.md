## Chat with your PDFs (Next.js + S3 + Pinecone + LLaMA Server)

This app lets users upload a PDF, chunk it, embed it with your own LLaMA server, and query it through a simple chat UI. Storage uses AWS S3, vector search uses Pinecone, and auth uses Clerk. The app is built on Next.js App Router with TypeScript and Drizzle for database access (Neon Postgres).

### High-level flow

1) Upload PDF → stored in S3
2) Server downloads PDF → splits into chunks
3) Embeddings generated via your LLaMA server (OpenAI-compatible or custom endpoints)
4) Upsert vectors to Pinecone (namespace = the file_key)
5) Chat → API sends the user question to your LLaMA server (can be extended with RAG retrieval)

---

## Tech stack

- Next.js (App Router) + TypeScript
- Clerk (auth), Drizzle ORM + Neon serverless Postgres
- AWS S3 (file storage)
- Pinecone (vector DB)
- LLaMA server for LLM + embeddings
- UI: TailwindCSS, lucide-react icons, @ai-sdk/react for chat transport

---

## Prerequisites

- Node.js 18+ and npm/pnpm/yarn
- AWS account + S3 bucket
- Pinecone account + index (dimension must match your embedding model)
- Neon (or any Postgres) for app data
- Clerk account (if you use the built-in auth)
- A running LLaMA server exposing endpoints for:
	- Embeddings (default path: `/embed`)
	- Chat/summary (default path: `/summarize`)

---

## Environment variables

Create a `.env.local` in the project root. Below is a minimal template:

```env
# App / Next.js
NODE_ENV=development

# Database (Neon)
DATABASE_URL="<your-neon-postgres-connection-string>"

# Clerk (optional if you keep the auth)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="<your-publishable-key>"
CLERK_SECRET_KEY="<your-secret-key>"

# AWS S3 (used both client and server side in this project)
NEXT_PUBLIC_S3_ACCESS_KEY_ID="<aws-access-key>"
NEXT_PUBLIC_S3_SECRET_ACCESS_KEY="<aws-secret>"
NEXT_PUBLIC_S3_BUCKET_NAME="<bucket-name>"
NEXT_PUBLIC_S3_REGION="<region>"

# Pinecone
PINECONE_API_KEY="<your-pinecone-api-key>"
# The index name is hard-coded to "cht-pdf" in code; create it or change in src/lib/pinecone.ts

# LLaMA server (embeddings & chat)
# Base URL for both endpoints (HTTP is supported in node runtime)
LLAMA_API_BASE_URL="http://<host>:<port>"   # e.g. http://164.90.147.3:3001
LLAMA_API_KEY=""                            # optional, if your server requires auth

# Chat endpoint (defaults to /summarize). The server should accept { text, chatId? } and return { response } or { text }.
LLAMA_CHAT_PATH="/summarize"

# Embedding endpoint (defaults to /embed)
# The server should accept { [LLAMA_REQUEST_FIELD]: string } and return { [LLAMA_RESPONSE_KEY]: number[] }
LLAMA_EMBED_PATH="/embed"
LLAMA_REQUEST_FIELD="text"
LLAMA_RESPONSE_KEY="embedding"
```

Notes:
- We use nodejs runtime for the chat API to allow HTTP to your LLaMA server. If you switch to Edge, ensure the server is HTTPS and CORS/headers are compatible.
- Keep your keys secret. Some current code references `NEXT_PUBLIC_*` for S3. Consider migrating to server-only secrets when you harden security.

---

## Install & run

```bash
# install deps
npm install

# dev
npm run dev

# open the app
# http://localhost:3000
```

---

## Key features & endpoints

### 1) Upload PDF and create a chat

- Component: `src/components/file-upload.tsx`
- API: `POST /api/create-chat`
- Flow:
	1. Client uploads to S3 (via `uploadToS3`), gets `file_key` and `file_name`.
	2. Client calls `/api/create-chat` with `{ file_key, file_name }`.
	3. Server downloads PDF, splits, embeds using LLaMA server, upserts to Pinecone, creates a chat row.

Example request body:

```json
{
	"file_key": "1761405562769-sample.pdf",
	"file_name": "sample.pdf"
}
```

Successful response:

```json
{ "chat_id": 123 }
```

### 2) Chat with the document

- UI: `src/components/chat-component.tsx` (uses `useChat` from `@ai-sdk/react`)
- API: `POST /api/chat` implemented in `src/app/api/chat/route.ts`
- Request shape (simplified – the hook sends a list of messages):

```json
{
	"messages": [
		{ "role": "user", "content": [{ "type": "text", "text": "hi" }] }
	],
	"chatId": 123
}
```

The route extracts the latest user text from multiple possible shapes and calls your LLaMA server at:

```
POST ${LLAMA_API_BASE_URL}${LLAMA_CHAT_PATH}
Body: { "text": "<user text>", "chatId": 123 }
```

Expected response from your server (any of these fields will be used):

```json
{ "response": "..." }
{ "text": "..." }
{ "summary": "..." }
{ "result": "..." }
{ "answer": "..." }
```

### 3) Embeddings

- Function: `src/lib/embeddings.ts` → `getEmbedding(text)`
- Calls your LLaMA server at:

```
POST ${LLAMA_API_BASE_URL}${LLAMA_EMBED_PATH}
Body: { [LLAMA_REQUEST_FIELD]: "<text>" }
```

Expected response:

```json
{ "embedding": [0.01, -0.02, ...] }
```

If your server uses different keys, set `LLAMA_REQUEST_FIELD` and `LLAMA_RESPONSE_KEY` accordingly.

---

## Pinecone index

- The code uses index name `cht-pdf` (see `src/lib/pinecone.ts`). Create it in Pinecone with dimension matching your embedding model (e.g., 768, 1024, 1536). If you see upsert errors, the route logs the first vector dimension to help you diagnose mismatches.

---

## Troubleshooting

- LLaMA server error: Missing text
	- The API now validates input and returns 400 with `Missing text` if no text can be parsed from the request. Ensure the client sends a message or that `messages[last].parts[].text` contains content.

- No assistant response in UI
	- We return assistant messages with `parts: [{ type: 'text', text: "..." }]`. Ensure your `MessageList` reads `msg.parts` (it does by default).

- HTTP to LLaMA server blocked
	- Chat route uses `export const runtime = 'nodejs'` to allow HTTP. If you switch to Edge, use HTTPS and make sure the endpoint supports Edge fetch.

- Pinecone upsert failed (dimension mismatch)
	- Check your index dimension vs. the embedding vector length. The server logs the first vector dimension to help you pick the right value.

- S3 write failed (ENOENT)
	- The server ensures a tmp directory exists and writes into `os.tmpdir()/pdf`. This works on serverless and local.

---

## Project structure (highlights)

```
src/
	app/
		api/
			create-chat/route.ts   # ingest PDF → embed → Pinecone → create chat row
			chat/route.ts          # chat API → calls LLaMA server
	components/
		file-upload.tsx          # client upload + create chat
		chat-component.tsx       # chat UI using useChat
		massage-list.tsx         # renders msg.parts
	lib/
		s3.ts / s3-server.ts     # client/server S3 helpers
		pinecone.ts              # load PDF, split, embed, upsert
		embeddings.ts            # calls LLaMA /embed endpoint
		db/                      # Drizzle + Neon
```

---

## Development tips

- Start your LLaMA server and verify manually:

```bash
curl "$LLAMA_API_BASE_URL$LLAMA_CHAT_PATH" \
	-X POST \
	-H "Content-Type: application/json" \
	-d '{"text":"Hello, how are you?"}'

curl "$LLAMA_API_BASE_URL$LLAMA_EMBED_PATH" \
	-X POST \
	-H "Content-Type: application/json" \
	-d '{"text":"some text to embed"}'
```

- Keep an eye on the server logs in `/api/chat` and `/api/create-chat` for actionable messages.

---

## License

MIT – feel free to use and modify. Contributions welcome!

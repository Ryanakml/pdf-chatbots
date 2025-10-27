// Embeddings via your LLaMA server
// Configure in env.local:
// - LLAMA_API_BASE_URL (e.g., http://localhost:3001)
// - LLAMA_EMBED_PATH (default: /embed)
// - LLAMA_API_KEY (optional; sent as Bearer token)
// - LLAMA_REQUEST_FIELD (default: text)
// - LLAMA_RESPONSE_KEY (default: embedding)
export async function getEmbedding(text: string): Promise<number[]> {
  const base = process.env.LLAMA_API_BASE_URL || process.env.LLM_API_BASE_URL || process.env.OPENAI_BASE_URL;
  const path = process.env.LLAMA_EMBED_PATH || "/embed";
  const url = `${base?.replace(/\/$/, "")}${path.startsWith("/") ? path : "/" + path}`;
  const apiKey = process.env.LLAMA_API_KEY || process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  const requestField = process.env.LLAMA_REQUEST_FIELD || "text";
  const responseKey = process.env.LLAMA_RESPONSE_KEY || "embedding";

  if (!base) {
    throw new Error("LLAMA_API_BASE_URL is not set. Please configure your LLaMA server URL in env.local");
  }

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const payload: Record<string, unknown> = { [requestField]: text.replace(/\n/g, " ") };

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`LLaMA server ${response.status} ${response.statusText}: ${errText}`);
    }

    const data = await response.json();
    const vector = data?.[responseKey] as number[] | undefined;
    if (!Array.isArray(vector)) {
      throw new Error(`LLaMA embed response missing '${responseKey}' array`);
    }
    return vector;
  } catch (error) {
    console.error("Error getting embeddings from LLaMA server:", error);
    throw error;
  }
}
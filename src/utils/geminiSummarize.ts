import type { SummaryResult } from "../types/SummaryResult";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

export async function geminiSummarize(
  input: string,
  apiKey: string,
  prompt?: string
): Promise<SummaryResult> {
  const systemPrompt = prompt || "Summarize the following code or text in clear, concise language for a developer:";
  const body = {
    contents: [
      { role: "user", parts: [{ text: `${systemPrompt}\n\n${input}` }] }
    ]
  };

  const url = `${GEMINI_API_URL}?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  // Gemini's response structure
  const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return {
    summary,
    model: data?.candidates?.[0]?.model ?? "gemini-pro",
    rawResponse: data
  };
}

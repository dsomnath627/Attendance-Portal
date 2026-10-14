import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─────────────────────────────────────────────────────────────────────────────
// Tell Next.js / Netlify this function may run up to 25 s.
// ─────────────────────────────────────────────────────────────────────────────
export const maxDuration = 25; // seconds

// ─────────────────────────────────────────────────────────────────────────────
// Primary: gemini-3.5-flash  |  Fallback: gemini-3.5-flash-lite
// ─────────────────────────────────────────────────────────────────────────────
const MODELS_TO_TRY: string[] = (
  process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : []
).concat([
  "gemini-3.5-flash",      // 🥇 primary — latest & most capable
  "gemini-3.5-flash-lite", // 🥈 fallback — lightweight and current
  "gemini-2.0-flash",      // 🥉 last resort — stable & reliable
]);

/** Max ms to wait for one model call before giving up and trying the next. */
const PER_MODEL_TIMEOUT_MS = 12_000;

/** Wrap a promise so it rejects after `ms` milliseconds. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms (${label})`)), ms)
    ),
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const primaryKey = process.env.GEMINI_API_KEY;
  const fallbackKey = process.env.GEMINI_API_KEY_FALLBACK;

  if (!primaryKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  // Primary key first; if every model fails with it, retry all with fallback key.
  const apiKeysToTry = fallbackKey ? [primaryKey, fallbackKey] : [primaryKey];

  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }

    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = imageFile.type || "image/jpeg";

    const prompt = `You are an OCR assistant for an academic attendance system.
Your task is to extract ALL 4-digit numeric codes written on this attendance sheet image.

Rules:
- Look for handwritten or printed 4-digit numbers (e.g., 1234, 5678, 0023).
- These codes represent the last 4 digits of student enrollment IDs.
- Common OCR confusions to correct: O→0, o→0, I→1, l→1, Z→2, S→5, G→6, B→8.
- Ignore any 4-digit number that looks like a year (1900–2100).
- Ignore single isolated letters, names, or non-numeric content.

Return ONLY a JSON object with a single key "codes" containing an array of 4-digit string codes.
Example response format: {"codes": ["1234", "5678", "0042"]}

If no codes are found, return: {"codes": []}

Do not include any explanation, markdown, or extra text — only valid JSON.`;

    let responseText = "";
    let usedModel = "";
    let lastError: unknown = null;

    // ── Try every model with each key in turn ──────────────────────────────
    outer:
    for (const apiKey of apiKeysToTry) {
      const genAI = new GoogleGenerativeAI(apiKey);

      for (const modelName of MODELS_TO_TRY) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { responseMimeType: "application/json" },
          });

          const result = await withTimeout(
            model.generateContent([
              prompt,
              { inlineData: { mimeType, data: base64Image } },
            ]),
            PER_MODEL_TIMEOUT_MS,
            modelName
          );

          responseText = result.response.text().trim();
          usedModel = modelName;
          lastError = null;
          break outer; // ✅ success — stop all loops
        } catch (err: unknown) {
          lastError = err;
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(
            `[OCR] model=${modelName} key=…${apiKey.slice(-6)} failed: ${msg}`
          );
        }
      }
    }

    if (!responseText) {
      // All attempts exhausted
      const msg =
        lastError instanceof Error ? lastError.message : "All Gemini models failed.";
      console.error("[OCR] All models/keys exhausted. Last error:", msg);
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    // ── Strip markdown fences if the model wrapped the JSON ────────────────
    const jsonText = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    let parsed: { codes: string[] };
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      console.error("[OCR] Response was not valid JSON:", responseText);
      return NextResponse.json(
        { error: "Gemini returned an unexpected format.", raw: responseText, codes: [], model: usedModel },
        { status: 200 }
      );
    }

    const codes: string[] = (parsed.codes ?? [])
      .map((c: string) => String(c).trim())
      .filter((c: string) => /^\d{4}$/.test(c));

    return NextResponse.json({ codes, raw: responseText, model: usedModel });
  } catch (err) {
    console.error("[OCR] Unhandled error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Use Gemini 2.5 Flash as the primary vision model, with resilient fallbacks
const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const FALLBACK_MODELS = [
  "gemini-flash-latest",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return NextResponse.json(
        { error: "No image file provided." },
        { status: 400 }
      );
    }

    // Convert the uploaded file to a base64 string for the Gemini API.
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = imageFile.type || "image/jpeg";

    const genAI = new GoogleGenerativeAI(apiKey);

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

    const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS.filter((m) => m !== PRIMARY_MODEL)];
    let responseText = "";
    let usedModel = PRIMARY_MODEL;
    let lastError: any = null;

    for (const modelCandidate of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelCandidate,
          generationConfig: {
            responseMimeType: "application/json",
          },
        });

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              mimeType,
              data: base64Image,
            },
          },
        ]);

        responseText = result.response.text().trim();
        usedModel = modelCandidate;
        lastError = null;
        break; // Successfully generated content
      } catch (err: any) {
        lastError = err;
        console.warn(`Gemini OCR with model ${modelCandidate} failed, trying fallback:`, err?.message || err);
      }
    }

    if (!responseText && lastError) {
      throw lastError;
    }

    // Strip markdown code fences if the model wrapped the JSON.
    const jsonText = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    let parsed: { codes: string[] };
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      console.error("Gemini response was not valid JSON:", responseText);
      return NextResponse.json(
        {
          error: "Gemini returned an unexpected format.",
          raw: responseText,
          codes: [],
          model: usedModel,
        },
        { status: 200 }
      );
    }

    const codes: string[] = (parsed.codes ?? [])
      .map((c: string) => String(c).trim())
      .filter((c: string) => /^\d{4}$/.test(c));

    return NextResponse.json({ codes, raw: responseText, model: usedModel });
  } catch (err) {
    console.error("Gemini OCR error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Auth: require a token cookie (the proxy validates it against the backend
  // for protected routes; here we just gate on presence to keep this cheap).
  const token = req.cookies.get("accessToken")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prompt, context, type, stream } = await req.json();

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const systemPrompts: Record<string, string> = {
    "study-planner":
      "You are an AI study planner for Filipino college students. Generate a personalized study schedule as JSON with this format: { \"schedule\": [{ \"day\": string, \"time\": string, \"subject\": string, \"topic\": string, \"duration\": string, \"priority\": \"high\"|\"medium\"|\"low\" }], \"breaks\": [{ \"time\": string, \"duration\": string, \"type\": string }], \"tips\": [string] }. Respond ONLY with valid JSON, no markdown.",
    "notes":
      "You are an AI notes assistant for Filipino college students. Analyze the provided notes and return JSON: { \"summary\": string, \"keyConcepts\": [string], \"topics\": [{ \"title\": string, \"explanation\": string }] }. Respond ONLY with valid JSON, no markdown.",
    quiz:
      "You are an AI quiz generator for Filipino college students. Generate quiz questions as JSON: { \"questions\": [{ \"id\": number, \"type\": \"Multiple Choice\"|\"True or False\"|\"Identification\", \"question\": string, \"options\"?: [string], \"correct\": number|string, \"explanation\": string }] }. Respond ONLY with valid JSON, no markdown.",
    "budget-advisor":
      "You are an AI budget advisor for Filipino college students. Analyze the spending data and return JSON: { \"recommendations\": [{ \"title\": string, \"insight\": string, \"impact\": string }], \"insights\": [string] }. The \"title\" must be a short label (max 6 words). The \"insight\" is a concise explanation (1-2 sentences). The \"impact\" must be a SHORT tag of 1-3 words only (e.g. \"High\", \"Save ₱500\", \"Low Priority\") — never a full sentence. Respond ONLY with valid JSON, no markdown.",
    "dashboard-nudge":
      "You are an AI student life assistant embedded in a dashboard. Given a data summary, return a SINGLE short actionable nudge (max 15 words) as plain text. Be specific, encouraging, and practical. No JSON, no markdown, no quotes.",
    "reviewer":
      "You are an AI reviewer generator for Filipino college students. Given notes, generate a concise reviewer as plain text with clear headings, key terms, and quick-recall questions. No JSON, no markdown code fences.",
    "career":
      "You are an AI career assistant for Filipino college students. Help with career guidance, interview prep, and resume feedback. Be practical, specific, and encouraging. Stream plain text responses.",
    "general":
      "You are a helpful AI assistant for Filipino college students. Respond clearly and practically. If JSON is requested, return ONLY valid JSON, no markdown. Otherwise respond in plain text.",
  };

  const systemPrompt = systemPrompts[type] || systemPrompts["general"];
  const fullPrompt = `${systemPrompt}\n\n${context ? `Context: ${context}\n\n` : ""}User request: ${prompt}`;

  try {
    if (stream) {
      const result = await ai.models.generateContentStream({
        model: "gemini-3.5-flash-lite",
        contents: fullPrompt,
      });
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of result) {
              const text = chunk.text ?? "";
              if (text) controller.enqueue(encoder.encode(text));
            }
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        },
      });
      return new Response(readable, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
        },
      });
    }

    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: fullPrompt,
    });
    const response = result.text ?? "";
    return NextResponse.json({ response });
  } catch (error) {
    console.error("AI API error:", error);
    const message = error instanceof Error ? error.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

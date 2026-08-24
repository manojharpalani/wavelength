import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { NextResponse } from "next/server";

export const maxDuration = 30;

const SYSTEM_PROMPT = `You help someone fill out a short, first-person field in a personal "how I work" manual for their teammates. You are given the field's label and a rough note from the person. Turn the rough note into a clear, natural, first-person answer of 1-3 sentences that keeps their meaning and voice — don't invent facts, credentials, or specifics they didn't mention. Return ONLY the improved answer text, with no quotes, labels, or preamble.`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI assist isn't configured yet (missing ANTHROPIC_API_KEY)." },
      { status: 501 }
    );
  }

  let body: { label?: string; draft?: string; context?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const label = (body.label || "").trim();
  const draft = (body.draft || "").trim();
  const context = body.context || {};

  if (!label || !draft) {
    return NextResponse.json(
      { error: "Add a rough note first, then ask for help polishing it." },
      { status: 400 }
    );
  }

  const contextLines = Object.entries(context)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `${k}: ${v.trim()}`)
    .join("\n");

  const prompt = [
    `Field: "${label}"`,
    contextLines ? `About this person:\n${contextLines}` : "",
    `Their rough note:\n"""\n${draft}\n"""`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const { text } = await generateText({
      model: anthropic("claude-sonnet-5"),
      system: SYSTEM_PROMPT,
      prompt,
    });
    return NextResponse.json({ text: text.trim() });
  } catch (err) {
    console.error("assist error", err);
    return NextResponse.json(
      { error: "Couldn't reach the AI assistant. Try again in a moment." },
      { status: 502 }
    );
  }
}

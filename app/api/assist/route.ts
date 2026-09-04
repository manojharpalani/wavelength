import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { NextResponse } from "next/server";

export const maxDuration = 30;

const PERSONAL_SYSTEM_PROMPT = `You help someone fill out a short, first-person field in a personal "how I work" manual for their teammates. You are given the field's label and a rough note from the person. Turn the rough note into a clear, natural, first-person answer of 1-3 sentences that keeps their meaning and voice — don't invent facts, credentials, or specifics they didn't mention. Return ONLY the improved answer text, with no quotes, labels, or preamble.`;

const TEAM_SYSTEM_PROMPT = `You help a software engineering team turn individual answers into one shared "team working agreement" statement. You are given a question about how the team wants to work, and each team member's individual answer to it. Write a single, cohesive 2-4 sentence team-wide answer in "we" voice that fairly represents what people said — if there's a clear consensus, state it plainly; if people differ, propose a reasonable middle ground or note the main approaches so the team can pick. Don't invent norms nobody mentioned, and don't just list everyone's answer back. Return ONLY the proposed team answer text, with no quotes, labels, or preamble.`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI assist isn't configured yet (missing ANTHROPIC_API_KEY)." },
      { status: 501 }
    );
  }

  let body: {
    mode?: "team-synthesis";
    label?: string;
    draft?: string;
    context?: Record<string, string>;
    question?: string;
    answers?: { email: string; answer: string }[];
    currentDraft?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (body.mode === "team-synthesis") {
    const question = (body.question || "").trim();
    const answers = (body.answers || []).filter((a) => a.answer && a.answer.trim());

    if (!question || answers.length === 0) {
      return NextResponse.json(
        { error: "Need at least one teammate's answer before drafting a shared one." },
        { status: 400 }
      );
    }

    const answerLines = answers.map((a) => `- ${a.email || "a teammate"}: ${a.answer.trim()}`).join("\n");
    const currentDraft = (body.currentDraft || "").trim();

    const prompt = [
      `Question: "${question}"`,
      `Team members' individual answers:\n${answerLines}`,
      currentDraft ? `Current draft (if any), for reference — improve on it rather than ignoring it:\n"""\n${currentDraft}\n"""` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      const { text } = await generateText({
        model: anthropic("claude-sonnet-5"),
        system: TEAM_SYSTEM_PROMPT,
        prompt,
      });
      return NextResponse.json({ text: text.trim() });
    } catch (err) {
      console.error("assist team-synthesis error", err);
      return NextResponse.json(
        { error: "Couldn't reach the AI assistant. Try again in a moment." },
        { status: 502 }
      );
    }
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
      system: PERSONAL_SYSTEM_PROMPT,
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

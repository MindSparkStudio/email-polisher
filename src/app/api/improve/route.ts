import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Tone =
  | "Calm"
  | "Understanding"
  | "Apologetic"
  | "Flirty"
  | "Honest"
  | "Boundary"
  | "Comforting";

function toneGuidance(tone: Tone) {
  switch (tone) {
    case "Calm":
      return "De-escalate conflict. Stay calm, relaxed, and non-emotional.";
    case "Understanding":
      return "Empathetic reply. Validate feelings, be warm and considerate.";
    case "Apologetic":
      return "Apologize properly: take responsibility, acknowledge impact, and keep it sincere without overexplaining.";
    case "Flirty":
      return "Playful/romantic. Light, charming, and respectful; avoid being creepy or explicit.";
    case "Honest":
      return "Real and direct. Say what you mean clearly, without being harsh.";
    case "Boundary":
      return "Set limits clearly. Firm, respectful boundaries with a clear ask or next step.";
    case "Comforting":
      return "Support someone emotionally. Gentle, reassuring, and kind; keep it concise.";
  }
}

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error("[/api/improve] Missing OPENAI_API_KEY on server.");
      return Response.json({ result: "Server misconfiguration: OPENAI_API_KEY is not set." }, { status: 500 });
    }

    const body = (await req.json().catch((err) => {
      console.error("[/api/improve] Failed to parse JSON body:", err);
      return null;
    })) as { email?: unknown; tone?: unknown } | null;
    const email = typeof body?.email === "string" ? body.email : "";
    const tone = (body?.tone as Tone) || "Calm";

    if (!email.trim()) {
      return Response.json({ result: "Please paste the message you received." }, { status: 400 });
    }

    if (
      tone !== "Calm" &&
      tone !== "Understanding" &&
      tone !== "Apologetic" &&
      tone !== "Flirty" &&
      tone !== "Honest" &&
      tone !== "Boundary" &&
      tone !== "Comforting"
    ) {
      return Response.json(
        { result: "Invalid tone selection. Choose one of the available tones." },
        { status: 400 },
      );
    }

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      temperature: 0.4,
      input: [
        {
          role: "system",
          content:
            "You are helping someone reply to a personal message.\n\nWrite a reply in a requested style.\n\nMake it sound natural, realistic, and emotionally appropriate.\n\nDo not over-explain. Do not sound like AI.\n\nOutput ONLY the reply text (no quotes, no markdown).",
        },
        {
          role: "user",
          content: `Write a reply in a ${tone} style.\n\nMake it sound natural, realistic, and emotionally appropriate.\n\nDo not over-explain. Do not sound like AI.\n\nMessage:\n${email}\n\nMode guidance:\n${toneGuidance(tone)}`,
        },
      ],
    });

    // 1) Prefer the unified output_text field when available
    let improved =
      typeof response.output_text === "string"
        ? response.output_text.trim()
        : undefined;


if (!improved) {
  const textBlock = (response.output as any)?.[0]?.content?.[0]?.text;
  improved = typeof textBlock === "string" ? textBlock.trim() : undefined;
}

    // 3) If still nothing, log the full response for debugging and return a safe message
    if (!improved) {
      console.error(
        "[/api/improve] Unable to extract text from OpenAI response. Full response:",
        response,
      );
      improved =
        "The AI did not return any text. Please try again or slightly rephrase your email.";
    }

    // 4) Always return a valid result string (no 502s from parsing failures)
    return Response.json({ result: improved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/improve] Unexpected server error:", err);
    return Response.json(
      { result: `Unexpected server error: ${message}. Please try again later.` },
      { status: 500 },
    );
  }
}

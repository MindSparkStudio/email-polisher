import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Tone =
  | "Calm"
  | "Funny"
  | "Angry"
  | "Sad"
  | "Confident"
  | "Professional"
  | "Assertive";

function toneGuidance(tone: Tone) {
  switch (tone) {
    case "Calm":
      return "Relaxed, non-emotional.";
    case "Funny":
      return "Light humor.";
    case "Angry":
      return "Direct, frustrated but controlled.";
    case "Sad":
      return "Emotional, softer tone.";
    case "Confident":
      return "Direct, self-assured.";
    case "Professional":
      return "Polite and formal.";
    case "Assertive":
      return "Firm boundaries.";
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
    const tone = (body?.tone as Tone) || "Professional";

    if (!email.trim()) {
      return Response.json({ result: "Please paste the message you received." }, { status: 400 });
    }

    if (
      tone !== "Calm" &&
      tone !== "Funny" &&
      tone !== "Angry" &&
      tone !== "Sad" &&
      tone !== "Confident" &&
      tone !== "Professional" &&
      tone !== "Assertive"
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
            "You are an assistant that writes replies to messages. Write a reply that matches the requested tone. Keep it natural, human-like, and concise. Do not over-explain. Output ONLY the reply text (no quotes, no markdown).",
        },
        {
          role: "user",
          content: `Write a reply to the following message in a ${tone} tone.\n\nKeep it natural, clear, and appropriate. Keep it concise.\n\nMessage:\n${email}\n\nAdditional guidance:\n${toneGuidance(tone)}`,
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

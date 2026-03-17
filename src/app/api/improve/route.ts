import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Tone = "Professional" | "Friendly" | "Short";

function toneGuidance(tone: Tone) {
  switch (tone) {
    case "Professional":
      return "Make it clear, polished, and professional. Keep the sender's intent. Preserve important specifics (dates, names, numbers).";
    case "Friendly":
      return "Make it warm, approachable, and friendly while staying clear. Keep it natural and not overly casual.";
    case "Short":
      return "Make it concise and direct. Remove fluff, keep key details and a clear call-to-action if present.";
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
      return Response.json({ result: "Please paste an email before improving it." }, { status: 400 });
    }

    if (tone !== "Professional" && tone !== "Friendly" && tone !== "Short") {
      return Response.json({ result: "Invalid tone selection. Choose Professional, Friendly, or Short." }, { status: 400 });
    }

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      temperature: tone === "Short" ? 0.2 : 0.4,
      input: [
        {
          role: "system",
          content:
            "You improve drafts of emails. Output ONLY the improved email body text. Do not add subject lines unless the user already included one. Do not add quotes or markdown.",
        },
        {
          role: "user",
          content: `Tone: ${tone}\nGuidance: ${toneGuidance(tone)}\n\nEmail:\n${email}`,
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

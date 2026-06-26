import { NextResponse } from "next/server";

type QuoteEmailRequest = {
  vendorEmail?: string;
  vendorName?: string;
  coupleName?: string;
  coupleEmail?: string;
  message?: string;
};

function isValidEmail(value?: string) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | QuoteEmailRequest
    | null;

  if (!body || !isValidEmail(body.vendorEmail)) {
    return NextResponse.json(
      { error: "A vendor email is required." },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.QUOTE_EMAIL_FROM;

  if (!apiKey || !from) {
    console.warn(
      "Quote email skipped: RESEND_API_KEY or QUOTE_EMAIL_FROM missing.",
    );
    return NextResponse.json({
      skipped: true,
      reason: "Email service is not configured.",
    });
  }

  const vendorName = body.vendorName || "there";
  const coupleName = body.coupleName || "A couple";
  const replyTo = isValidEmail(body.coupleEmail) ? body.coupleEmail : undefined;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    "https://vowdise.com";
  const messagesUrl = appUrl.startsWith("http")
    ? `${appUrl.replace(/\/$/, "")}/messages`
    : `https://${appUrl.replace(/\/$/, "")}/messages`;
  const text = [
    `Hi ${vendorName},`,
    "",
    `${coupleName} sent you a new quote request on Vowdise:`,
    "",
    body.message || "Open Vowdise Messages to reply.",
    "",
    "Reply in your Vowdise Messages inbox to keep the conversation in one place:",
    messagesUrl,
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [body.vendorEmail],
      subject: `New quote request from ${coupleName}`,
      text,
      html: [
        `<p>Hi ${vendorName},</p>`,
        `<p>${coupleName} sent you a new quote request on Vowdise:</p>`,
        `<pre style="white-space:pre-wrap;font-family:inherit;background:#fbf7ef;border:1px solid #eadfce;border-radius:8px;padding:12px;">${body.message || "Open Vowdise Messages to reply."}</pre>`,
        `<p><a href="${messagesUrl}" style="display:inline-block;background:#2d2a27;color:#ffffff;text-decoration:none;border-radius:999px;padding:10px 16px;font-weight:700;">Open Vowdise Messages</a></p>`,
        `<p>Reply in Vowdise to keep the conversation in one place.</p>`,
      ].join(""),
      reply_to: replyTo,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Quote email failed:", errorText);
    return NextResponse.json(
      {
        error: "Quote email could not be sent.",
        detail: errorText,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}

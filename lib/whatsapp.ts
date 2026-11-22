export type WhatsAppSendResult =
  | { status: "sent" }
  | { status: "skipped"; reason: "not_configured" | "opt_out" | "phone_missing"; link?: string }
  | { status: "failed"; reason: string };

export async function sendVerifiedAttendanceWhatsapp(input: {
  employeeName: string;
  phone?: string;
  whatsappOptIn: boolean;
  eventType: "check_in" | "check_out";
  occurredAt: Date;
}) : Promise<WhatsAppSendResult> {
  const accessToken = process.env.WHATSAPP_CLOUD_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId) return { status: "skipped", reason: "not_configured" };
  if (!input.whatsappOptIn) return { status: "skipped", reason: "opt_out" };

  const digits = (input.phone || "").replace(/\D/g, "");
  if (!digits) return { status: "skipped", reason: "phone_missing" };
  const to = digits.length === 10 ? `91${digits}` : digits;
  const time = input.occurredAt.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const action = input.eventType === "check_in" ? "Check-in" : "Check-out";
  const message = `Jain Sales Corporation\n\nDear ${input.employeeName},\n\nYour ${action} was successfully verified at ${time}.\n\nStatus: PRESENT\n\nRegards,\nJain Sales Corporation`;
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";

  try {
    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body: message },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      const body = await response.text();
      return { status: "failed", reason: `WhatsApp API returned ${response.status}${body ? `: ${body.slice(0, 300)}` : ""}` };
    }
    return { status: "sent" };
  } catch (error) {
    return { status: "failed", reason: error instanceof Error ? error.message : "WhatsApp API unavailable" };
  }
}

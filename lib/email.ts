// Email service for MeetMatt using Resend
// Gracefully degrades when RESEND_API_KEY is not configured

import { Resend } from "resend";

const FROM_ADDRESS = "Matt <noreply@meetmatt.xyz>";

let resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

// ─── Core send function ─────────────────────────────────────────────────────

interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<SendEmailResult> {
  const client = getResendClient();

  if (!client) {
    console.log("[Email] RESEND_API_KEY not set — skipping email to:", to, "subject:", subject);
    return { success: false, error: "Email service not configured" };
  }

  try {
    const { data, error } = await client.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("[Email] Resend error:", error);
      return { success: false, error: error.message };
    }

    console.log("[Email] Sent successfully:", data?.id, "to:", to);
    return { success: true, id: data?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Email] Send failed:", message);
    return { success: false, error: message };
  }
}

// ─── Email templates ────────────────────────────────────────────────────────

interface EmailTemplate {
  subject: string;
  html: string;
}

function wrapTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#07080f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="margin-bottom:28px;">
      <div style="display:inline-flex;align-items:center;gap:12px;padding:10px 16px;border-radius:999px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);">
        <div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:12px;background:linear-gradient(135deg,#FF6B35,#FFAA44);color:#07080f;font-size:20px;font-weight:700;">M</div>
        <div>
          <div style="color:#F0EEE8;font-size:18px;font-weight:700;letter-spacing:-0.02em;">Meet Matt</div>
          <div style="color:#A8A8B8;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">Operator layer</div>
        </div>
      </div>
    </div>
    <div style="background:linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04));border:1px solid rgba(255,255,255,0.12);border-radius:22px;padding:32px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.08);">
      <div style="height:1px;width:100%;background:linear-gradient(90deg,transparent,rgba(255,170,68,0.7),transparent);margin-bottom:24px;"></div>
      <h2 style="color:#F0EEE8;font-size:24px;margin:0 0 16px 0;letter-spacing:-0.04em;">${title}</h2>
      ${body}
    </div>
    <div style="text-align:center;margin-top:24px;">
      <p style="color:#7C8192;font-size:12px;margin:0;">
        Meet Matt · Deploy AI agents in minutes
      </p>
      <p style="color:#7C8192;font-size:12px;margin:4px 0 0 0;">
        <a href="https://meetmatt.xyz" style="color:#C8B38E;text-decoration:none;">meetmatt.xyz</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

export function paymentConfirmedEmail(agentName: string, amount: number): EmailTemplate {
  return {
    subject: `Payment confirmed for ${agentName}`,
    html: wrapTemplate(
      "Payment Confirmed",
      `<p style="color:#D3D5DD;font-size:15px;line-height:1.6;margin:0 0 16px 0;">
        Your payment of <strong style="color:#F0EEE8;">$${amount.toFixed(2)}</strong> for
        <strong style="color:#F0EEE8;">${agentName}</strong> has been confirmed.
      </p>
      <p style="color:#D3D5DD;font-size:15px;line-height:1.6;margin:0 0 16px 0;">
        Matt has started deployment. You will receive another email once the agent is live.
      </p>
      <div style="text-align:center;margin-top:24px;">
        <a href="https://meetmatt.xyz/dashboard"
           style="display:inline-block;padding:12px 24px;background-color:#FF6B35;color:#ffffff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:600;">
          View Dashboard
        </a>
      </div>`
    ),
  };
}

export function deploymentCompleteEmail(agentName: string, telegramLink: string): EmailTemplate {
  return {
    subject: `${agentName} is live!`,
    html: wrapTemplate(
      "Your Agent is Live",
      `<p style="color:#D3D5DD;font-size:15px;line-height:1.6;margin:0 0 16px 0;">
        <strong style="color:#F0EEE8;">${agentName}</strong> has been deployed successfully
        and is ready to use.
      </p>
      <div style="text-align:center;margin-top:24px;">
        <a href="${telegramLink}"
           style="display:inline-block;padding:12px 24px;background-color:#FF6B35;color:#ffffff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:600;">
          Open in Telegram
        </a>
      </div>
      <div style="text-align:center;margin-top:12px;">
        <a href="https://meetmatt.xyz/dashboard"
           style="color:#FFAA44;font-size:13px;text-decoration:none;">
          View Dashboard
        </a>
      </div>`
    ),
  };
}

export function subscriptionExpiringEmail(agentName: string, daysLeft: number): EmailTemplate {
  const dayWord = daysLeft === 1 ? "day" : "days";
  return {
    subject: `${agentName} subscription expires in ${daysLeft} ${dayWord}`,
    html: wrapTemplate(
      "Subscription Expiring Soon",
      `<p style="color:#D3D5DD;font-size:15px;line-height:1.6;margin:0 0 16px 0;">
        Your subscription for <strong style="color:#F0EEE8;">${agentName}</strong> will expire
        in <strong style="color:#FFAA44;">${daysLeft} ${dayWord}</strong>.
      </p>
      <p style="color:#D3D5DD;font-size:15px;line-height:1.6;margin:0 0 16px 0;">
        Renew now to keep your agent running without interruption.
      </p>
      <div style="text-align:center;margin-top:24px;">
        <a href="https://meetmatt.xyz/billing"
           style="display:inline-block;padding:12px 24px;background-color:#FF6B35;color:#ffffff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:600;">
          Renew Subscription
        </a>
      </div>`
    ),
  };
}

export function deploymentFailedEmail(agentName: string): EmailTemplate {
  return {
    subject: `Deployment failed for ${agentName}`,
    html: wrapTemplate(
      "Deployment Failed",
      `<p style="color:#D3D5DD;font-size:15px;line-height:1.6;margin:0 0 16px 0;">
        We were unable to deploy <strong style="color:#F0EEE8;">${agentName}</strong>.
        Our team has been notified and is looking into it.
      </p>
      <p style="color:#D3D5DD;font-size:15px;line-height:1.6;margin:0 0 16px 0;">
        If this issue persists, please contact support.
      </p>
      <div style="text-align:center;margin-top:24px;">
        <a href="https://meetmatt.xyz/dashboard"
           style="display:inline-block;padding:12px 24px;background-color:#FF6B35;color:#ffffff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:600;">
          View Dashboard
        </a>
      </div>`
    ),
  };
}

// Analytics utility

export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;

  // Google Analytics 4
  if ((window as unknown as { gtag?: unknown }).gtag) {
    (window as unknown as { gtag: (type: string, name: string, params?: Record<string, unknown>) => void }).gtag("event", eventName, params);
  }

  // Custom analytics endpoint
  if (process.env.NODE_ENV === "production") {
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: eventName,
        params,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        referrer: document.referrer,
      }),
    }).catch(() => {
      // Silent fail for analytics
    });
  }
}

export function trackPageView(pagePath?: string): void {
  const path = pagePath || window.location.pathname;
  trackEvent("page_view", { page_path: path });
}

export function trackAgentDeployment(agentType: string): void {
  trackEvent("agent_deployed", { agent_type: agentType });
}

export function trackPaymentStarted(amount: number, currency: string): void {
  trackEvent("payment_started", { amount, currency });
}

export function trackPaymentCompleted(amount: number, currency: string): void {
  trackEvent("payment_completed", { amount, currency });
}

export function trackFeatureSelected(feature: string): void {
  trackEvent("feature_selected", { feature });
}

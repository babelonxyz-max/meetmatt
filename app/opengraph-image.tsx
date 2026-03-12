import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background:
            "radial-gradient(circle at 18% 22%, rgba(255,107,53,0.22), transparent 28%), radial-gradient(circle at 82% 16%, rgba(255,170,68,0.14), transparent 22%), linear-gradient(135deg, #05060c 0%, #101321 42%, #131829 66%, #07080f 100%)",
          color: "#f0eee8",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 34,
            borderRadius: 42,
            border: "1px solid rgba(255,255,255,0.12)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.12), 0 30px 90px rgba(0,0,0,0.42)",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            padding: "76px 80px",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 700 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                marginBottom: 34,
              }}
            >
              <svg
                width="72"
                height="58"
                viewBox="0 0 80 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ filter: "drop-shadow(0 0 24px rgba(255,107,53,0.44))" }}
              >
                <defs>
                  <linearGradient id="og-gradient" x1="18" y1="14" x2="62" y2="54" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FF6B35" />
                    <stop offset="1" stopColor="#FFAA44" />
                  </linearGradient>
                </defs>
                <path
                  d="M18 54V18c0-4.16 4.77-6.61 8.17-4.18L40 25.24l13.83-11.42C57.23 11.39 62 13.84 62 18v36"
                  stroke="url(#og-gradient)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M18 54V24l22 17.5L62 24v30"
                  stroke="url(#og-gradient)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div
                style={{
                  display: "flex",
                  fontSize: 48,
                  fontWeight: 700,
                  letterSpacing: "-0.06em",
                }}
              >
                Meet Matt
              </div>
            </div>

            <div
              style={{
                display: "flex",
                marginBottom: 18,
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "#ffd6b2",
              }}
            >
              Telegram-native operator layer
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 78,
                lineHeight: 0.98,
                fontWeight: 700,
                letterSpacing: "-0.06em",
                marginBottom: 24,
                maxWidth: 680,
              }}
            >
              Deploy AI agents in minutes.
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 28,
                lineHeight: 1.35,
                color: "rgba(240,238,232,0.74)",
                maxWidth: 620,
              }}
            >
              Matt handles onboarding, payment, activation, and follow-through so the relationship doesn&apos;t end at deployment.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "flex-end",
              width: 320,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                padding: 24,
                borderRadius: 28,
                border: "1px solid rgba(255,255,255,0.12)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.1), 0 24px 80px rgba(0,0,0,0.4)",
              }}
            >
              {["15-minute setup", "Card or crypto checkout", "Matt stays on the thread"].map((line) => (
                <div
                  key={line}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    fontSize: 22,
                    color: "rgba(240,238,232,0.88)",
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: "linear-gradient(135deg,#FF6B35,#FFAA44)",
                      boxShadow: "0 0 16px rgba(255,107,53,0.45)",
                    }}
                  />
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}

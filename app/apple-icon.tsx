import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background:
            "radial-gradient(circle at 24% 24%, rgba(255,107,53,0.26), transparent 34%), linear-gradient(135deg, #06070d 0%, #111424 45%, #07080f 100%)",
          borderRadius: 40,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 12,
            borderRadius: 32,
            border: "1px solid rgba(255,255,255,0.12)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
          }}
        />
        <svg
          width="112"
          height="90"
          viewBox="0 0 80 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ filter: "drop-shadow(0 0 18px rgba(255,107,53,0.42))" }}
        >
          <defs>
            <linearGradient id="apple-gradient" x1="18" y1="14" x2="62" y2="54" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FF6B35" />
              <stop offset="1" stopColor="#FFAA44" />
            </linearGradient>
          </defs>
          <path
            d="M18 54V18c0-4.16 4.77-6.61 8.17-4.18L40 25.24l13.83-11.42C57.23 11.39 62 13.84 62 18v36"
            stroke="url(#apple-gradient)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18 54V24l22 17.5L62 24v30"
            stroke="url(#apple-gradient)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    size
  );
}

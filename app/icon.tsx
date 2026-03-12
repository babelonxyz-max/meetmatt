import { ImageResponse } from "next/og";

export const size = {
  width: 1024,
  height: 1024,
};

export const contentType = "image/png";

export default function Icon() {
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
            "radial-gradient(circle at 28% 24%, rgba(255,107,53,0.28), transparent 34%), radial-gradient(circle at 75% 18%, rgba(255,170,68,0.16), transparent 24%), linear-gradient(135deg, #06070d 0%, #111424 42%, #121726 65%, #07080f 100%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 64,
            borderRadius: 220,
            border: "2px solid rgba(255,255,255,0.12)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.12), 0 40px 120px rgba(0,0,0,0.45)",
          }}
        />
        <svg
          width="640"
          height="512"
          viewBox="0 0 80 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ filter: "drop-shadow(0 0 42px rgba(255,107,53,0.42))" }}
        >
          <defs>
            <linearGradient id="icon-gradient" x1="18" y1="14" x2="62" y2="54" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FF6B35" />
              <stop offset="1" stopColor="#FFAA44" />
            </linearGradient>
          </defs>
          <path
            d="M18 54V18c0-4.16 4.77-6.61 8.17-4.18L40 25.24l13.83-11.42C57.23 11.39 62 13.84 62 18v36"
            stroke="url(#icon-gradient)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18 54V24l22 17.5L62 24v30"
            stroke="url(#icon-gradient)"
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

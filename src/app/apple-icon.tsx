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
          background:
            "linear-gradient(180deg, rgba(248,244,235,1) 0%, rgba(239,231,218,1) 100%)",
          borderRadius: 40,
          position: "relative",
        }}
      >
        <div
          style={{
            width: 126,
            height: 126,
            borderRadius: 36,
            background: "rgba(255, 253, 249, 0.97)",
            boxShadow: "0 16px 36px rgba(29, 39, 54, 0.16)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 62,
              height: 62,
              borderRadius: "50%",
              border: "10px solid #1d2736",
              top: 24,
              left: 21,
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 48,
              height: 10,
              background: "#e6c98f",
              borderRadius: 999,
              transform: "rotate(-38deg)",
              top: 83,
              left: 66,
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "#1d2736",
              top: 81,
              left: 86,
              border: "4px solid #fffdf9",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 18,
              right: 20,
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.08em",
              color: "#1d2736",
            }}
          >
            T
          </div>
        </div>
      </div>
    ),
    size,
  );
}

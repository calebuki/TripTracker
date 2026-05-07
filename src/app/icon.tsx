import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
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
          background:
            "linear-gradient(180deg, rgba(248,244,235,1) 0%, rgba(239,231,218,1) 100%)",
          position: "relative",
        }}
      >
        <div
          style={{
            width: 360,
            height: 360,
            borderRadius: 120,
            background: "rgba(255, 253, 249, 0.96)",
            boxShadow: "0 36px 96px rgba(29, 39, 54, 0.14)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 190,
              height: 190,
              borderRadius: "50%",
              border: "22px solid #1d2736",
              top: 66,
              left: 84,
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 140,
              height: 22,
              background: "#e6c98f",
              borderRadius: 999,
              transform: "rotate(-38deg)",
              top: 244,
              left: 194,
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#1d2736",
              top: 238,
              left: 248,
              border: "10px solid #fffdf9",
            }}
          />
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              letterSpacing: "-0.08em",
              color: "#1d2736",
              position: "absolute",
              bottom: 58,
              right: 74,
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

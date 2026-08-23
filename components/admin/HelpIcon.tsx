"use client";

/** Small circled "?" that shows `text` on hover / focus. */
export default function HelpIcon({ text }: { text: string }) {
  return (
    <span
      tabIndex={0}
      title={text}
      aria-label={text}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 16,
        height: 16,
        marginLeft: 4,
        borderRadius: "50%",
        background: "#6c757d",
        color: "white",
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1,
        cursor: "help",
        verticalAlign: "middle",
      }}
    >
      ?
    </span>
  );
}

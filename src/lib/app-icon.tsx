// Shared glyph for all generated app icons — a simple vinyl-on-platter mark
// in brand colors. No text/fonts, so it renders identically everywhere
// Satori (next/og) runs without needing to fetch a font file.
export function AppIconGlyph() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1E6B78",
      }}
    >
      <div
        style={{
          width: "62%",
          height: "62%",
          borderRadius: "50%",
          background: "#241C15",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "28%",
            height: "28%",
            borderRadius: "50%",
            background: "#F2A34B",
          }}
        />
      </div>
    </div>
  );
}

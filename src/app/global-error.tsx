"use client";

// Last-resort error page for failures in the root layout itself.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en-IN">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#fbf6ec", color: "#1f1a17", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 24 }}>कुछ गड़बड़ हो गई · Something went wrong</h1>
          <p style={{ color: "#6e655c" }}>फिर कोशिश करें · Please try again.</p>
          <button onClick={reset} style={{ marginTop: 16, padding: "12px 20px", borderRadius: 12, border: 0, background: "#805821", color: "white", fontWeight: 600 }}>
            फिर कोशिश करें / Try again
          </button>
        </div>
      </body>
    </html>
  );
}

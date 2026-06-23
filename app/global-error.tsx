"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f9fafb" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            gap: "16px",
            textAlign: "center",
            padding: "24px",
          }}
        >
          <h2 style={{ fontSize: "20px", fontWeight: 600, color: "#111827", margin: 0 }}>
            Error crítico de la aplicación
          </h2>
          <p style={{ fontSize: "14px", color: "#6b7280", maxWidth: "400px", margin: 0 }}>
            {error.message || "La aplicación encontró un error grave. Por favor recarga la página."}
          </p>
          {error.digest && (
            <p style={{ fontSize: "12px", color: "#9ca3af", fontFamily: "monospace" }}>
              Código: {error.digest}
            </p>
          )}
          <button
            onClick={unstable_retry}
            style={{
              padding: "8px 20px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              background: "white",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Recargar
          </button>
        </div>
      </body>
    </html>
  );
}

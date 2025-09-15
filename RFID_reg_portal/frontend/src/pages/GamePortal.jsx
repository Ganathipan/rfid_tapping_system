import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function GamePortal({ selectedPortal, onBack }) {
  const [status, setStatus] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  // Poll backend for team score every 2 seconds
  useEffect(() => {
    if (!selectedPortal) return;

    const interval = setInterval(async () => {
      try {
        const data = await api(`/api/tags/teamScore/${selectedPortal}`);
        setStatus(data);
      } catch (err) {
        console.error("Error fetching team score:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [selectedPortal]);

  // Auto-close modal after 5 seconds when shown
  useEffect(() => {
    if (showModal) {
      const timer = setTimeout(() => setShowModal(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showModal, tapCount]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#fff",
        fontSize: "2rem",
        color: "#2d3748",
        flexDirection: "column",
        position: "relative",
      }}
    >
  {/* Modal popup for eligibility */}
  {status && showModal && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "#f9fafb",
            borderRadius: "18px",
            boxShadow: "0 8px 32px rgba(60,60,120,0.18)",
            padding: "40px 32px",
            minWidth: "320px",
            zIndex: 10,
            textAlign: "center",
          }}
        >
          {status.error ? (
            <p style={{ fontSize: "2rem", color: "#e53e3e" }}>⚠️ {status.error}</p>
          ) : status.eligible ? (
            <>
              <div style={{ fontSize: "3rem" }}>🎉✅</div>
              <h3 style={{ fontWeight: 700, fontSize: "2rem", margin: "16px 0 8px" }}>
                Eligible to play!
              </h3>
              <p style={{ fontSize: "1.2rem", marginBottom: "12px" }}>
                You have earned{" "}
                <span style={{ fontWeight: 700 }}>{status.points || 0}</span> points! 🏅
              </p>
              <p style={{ fontSize: "1.1rem", color: "#4a5568" }}>
                Good luck and have fun! 😊
              </p>
            </>
          ) : (
            <>
              <div style={{ fontSize: "3rem" }}>😔❌</div>
              <h3 style={{ fontWeight: 700, fontSize: "2rem", margin: "16px 0 8px" }}>
                Not eligible
              </h3>
              <p style={{ fontSize: "1.2rem", marginBottom: "12px" }}>
                Sorry, you can't play at this time.
              </p>
              <p style={{ fontSize: "1.1rem", color: "#4a5568" }}>
                Please try again later! 🙏
              </p>
            </>
          )}
          <button
            style={{
              marginTop: "24px",
              padding: "10px 28px",
              fontSize: "1.1rem",
              borderRadius: "8px",
              border: "1px solid #6366f1",
              background: "#6366f1",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(60,60,120,0.08)",
            }}
            onClick={() => setShowModal(false)}
          >
            Close
          </button>
          <p style={{ fontSize: "0.9rem", color: "#888", marginTop: "8px" }}>
            This popup will close automatically in 5 seconds.
          </p>
        </div>
      )}

      {/* Main content (dimmed when modal is open) */}
      <div
        style={{
          opacity: showModal ? 0.3 : 1,
          pointerEvents: showModal ? "none" : "auto",
          width: "100%",
        }}
      >
        {/* Tap to check eligibility again */}
        <button
          style={{
            marginTop: "32px",
            padding: "12px 32px",
            fontSize: "1.2rem",
            borderRadius: "8px",
            border: "1px solid #6366f1",
            background: "#6366f1",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
            marginRight: "16px",
          }}
          onClick={() => {
            setShowModal(true);
            setTapCount(tapCount + 1);
          }}
        >
          Tap to Check Eligibility
        </button>
        <button
          style={{
            marginTop: "32px",
            padding: "12px 32px",
            fontSize: "1.2rem",
            borderRadius: "8px",
            border: "1px solid #2d3748",
            background: "#f3f4f6",
            color: "#2d3748",
            fontWeight: 500,
            cursor: "pointer",
          }}
          onClick={onBack}
        >
          Back
        </button>
      </div>
    </div>
  );
}

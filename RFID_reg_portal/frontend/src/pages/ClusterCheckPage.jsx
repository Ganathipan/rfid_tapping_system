import React, { useState } from "react";
import GamePortal from "./GamePortal";

export default function ClusterCheckPage({ selectedCluster, onBack }) {
  const [showStatus, setShowStatus] = useState(false);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "70vh",
      background: "linear-gradient(135deg, #2d3748 0%, #2d3748 100%)",
      boxShadow: "0 8px 32px rgba(60,60,120,0.12)",
      borderRadius: "24px",
      maxWidth: "500px",
      margin: "40px auto",
      padding: "48px 32px",
    }}>
      <h2 style={{
        fontSize: "2.5rem",
        fontWeight: 700,
        marginBottom: "32px",
        color: "#fff",
        letterSpacing: "0.02em",
        textShadow: "0 2px 8px rgba(60,60,120,0.08)"
      }}>
        Cluster: {selectedCluster}
      </h2>
      {!showStatus ? (
        <button
          style={{
            padding: "18px 32px",
            fontSize: "1.5rem",
            borderRadius: "12px",
            border: "2px solid #fff",
            background: "#6366f1",
            color: "#fff",
            fontWeight: 600,
            boxShadow: "0 2px 8px rgba(60,60,120,0.08)",
            marginBottom: "32px",
            outline: "none",
            cursor: "pointer",
            transition: "background 0.2s, border-color 0.2s",
          }}
          onClick={() => setShowStatus(true)}
        >
          Tap to Check
        </button>
      ) : (
        <div style={{ width: "100%" }}>
          <GamePortal selectedPortal={selectedCluster} />
        </div>
      )}
      <button
        style={{
          marginTop: "24px",
          padding: "10px 24px",
          fontSize: "1rem",
          borderRadius: "8px",
          border: "1px solid #fff",
          background: "#fff",
          color: "#2d3748",
          fontWeight: 500,
          cursor: "pointer",
        }}
        onClick={onBack}
      >
        Back
      </button>
    </div>
  );
}

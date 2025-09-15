import React, { useState, useEffect } from "react";
import { api } from "../api";

export default function GamePortal() {
  const [selectedPortal, setSelectedPortal] = useState(
    localStorage.getItem("cluster") || ""
  );
  const [status, setStatus] = useState(null);

  // Save cluster selection
  function handleClusterSelect(e) {
    const portal = e.target.value;
    setSelectedPortal(portal);
    localStorage.setItem("cluster", portal);
  }

  // Poll backend for team score every 2 seconds
  useEffect(() => {
    if (!selectedPortal) return;

    const interval = setInterval(async () => {
      try {
        const data = await api(`/api/tags/teamScore/${selectedPortal}`);
        setStatus(data);
      } catch (err) {
        setStatus({ error: "⚠️ Server not reachable" });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [selectedPortal]);

  if (!selectedPortal) {
    return (
      <div style={{ textAlign: "center" }}>
        <h2>Select Cluster</h2>
        <select onChange={handleClusterSelect} defaultValue="">
          <option value="" disabled>
            -- Choose Cluster --
          </option>
          <option value="Cluster1">Cluster 1</option>
          <option value="Cluster2">Cluster 2</option>
          <option value="Cluster3">Cluster 3</option>
          <option value="Cluster4">Cluster 4</option>
          {/* add more if needed */}
        </select>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center" }}>
      <h2>Cluster: {selectedPortal}</h2>
      {status ? (
        status.error ? (
          <p>{status.error}</p>
        ) : status.message ? (
          <p>{status.message}</p>
        ) : (
          <div style={{ marginTop: "20px", fontSize: "22px" }}>
            <p>Team ID: {status.teamId}</p>
            <p>Total Points: {status.points}</p>
            <p style={{ fontSize: "28px" }}>
              {status.eligible ? "✅ Team can play!" : "❌ Not enough points"}
            </p>
          </div>
        )
      ) : null}
    </div>
  );
}
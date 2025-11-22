// src/App.jsx
import React from "react";
import Dashboard from "./pages/Dashboard.jsx";

// Optional: Show backend URL in dev mode (helps debugging)
if (import.meta.env.DEV) {
  console.log("Backend URL:", import.meta.env.VITE_BACKEND_URL || "http://localhost:5000");
}

export default function App() {
  return (
    <>
      <Dashboard />
    </>
  );
}
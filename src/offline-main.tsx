import React from "react";
import { createRoot } from "react-dom/client";
import OfflineApp from "./offline/OfflineApp";
import "./styles.css";
import "./hr-feedback.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <OfflineApp />
  </React.StrictMode>,
);

import React from "react";
import ReactDOM from "react-dom/client";
import { initializeIcons } from "@fluentui/react";
import App from "./App";
import "./App.css";

initializeIcons();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

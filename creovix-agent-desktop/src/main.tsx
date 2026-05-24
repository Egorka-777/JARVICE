import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";

function showBootError(message: string) {
  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML = `<pre style="color:#fecaca;background:#1a1d27;padding:16px;white-space:pre-wrap;font-family:Segoe UI,sans-serif">${message}</pre>`;
}

window.addEventListener("error", (event) => {
  showBootError(event.message || "Неизвестная ошибка загрузки");
});

window.addEventListener("unhandledrejection", (event) => {
  showBootError(String(event.reason ?? "Неизвестная ошибка"));
});

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("root element not found");
}

try {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </React.StrictMode>,
  );
} catch (error) {
  showBootError(error instanceof Error ? error.message : String(error));
}

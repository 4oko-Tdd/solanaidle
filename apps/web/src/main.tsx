import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WalletProvider } from "./providers/WalletProvider";
import { ToastProvider } from "./components/ToastProvider";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WalletProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </WalletProvider>
  </StrictMode>,
);

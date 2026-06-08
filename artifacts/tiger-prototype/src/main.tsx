import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CallSessionProvider } from "@/context/CallSessionContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <CallSessionProvider>
      <App />
    </CallSessionProvider>
  </ErrorBoundary>,
);

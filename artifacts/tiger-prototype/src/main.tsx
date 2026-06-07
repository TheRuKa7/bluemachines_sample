/**
 * main.tsx — Application entry point.
 *
 * Mounts the React root onto the `#root` DOM node defined in index.html.
 * Global CSS (Tailwind base + custom keyframe animations) is imported here
 * so it is bundled and available to every component in the tree.
 */
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

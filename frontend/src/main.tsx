import { createRoot } from "react-dom/client";
import { MotionConfig } from "framer-motion";
import App from "./App.tsx";
import "./index.css";

// Skip entrance animations for people who ask their OS to reduce motion.
createRoot(document.getElementById("root")!).render(
  <MotionConfig reducedMotion="user">
    <App />
  </MotionConfig>,
);

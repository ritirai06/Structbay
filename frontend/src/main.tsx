import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@shared/styles/index.css";
import "@shared/styles/storefront.css";
import "@shared/styles/storefront-square.css";

createRoot(document.getElementById("root")!).render(<App />);

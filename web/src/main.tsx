import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import Landing from "./pages/Landing";
import Playground from "./pages/Playground";
import Docs from "./pages/Docs";
import Tests from "./pages/Tests";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/playground" element={<Playground />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/tests" element={<Tests />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);

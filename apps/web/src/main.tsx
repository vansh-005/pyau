import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import { LangProvider } from "./i18n/lang";
import { ThemeProvider } from "./theme";
import Landing from "./pages/Landing";
import Engineering from "./pages/Engineering";
import Demo from "./pages/Demo";
import Ride from "./pages/Ride";
import Host from "./pages/Host";
import ReplayPage from "./pages/Replay";
import Coordinate from "./pages/Coordinate";

const qc = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <ThemeProvider>
      <LangProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/engineering" element={<Engineering />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/ride" element={<Ride />} />
          <Route path="/host" element={<Host />} />
          <Route path="/replay/:id" element={<ReplayPage />} />
          <Route path="/coordinate/:zoneId" element={<Coordinate />} />
        </Routes>
      </BrowserRouter>
      </LangProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);

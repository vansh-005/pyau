import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import Landing from "./pages/Landing";
import Demo from "./pages/Demo";
import Ride from "./pages/Ride";
import Host from "./pages/Host";
import ReplayPage from "./pages/Replay";
import Coordinate from "./pages/Coordinate";

const qc = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/ride" element={<Ride />} />
          <Route path="/host" element={<Host />} />
          <Route path="/replay/:id" element={<ReplayPage />} />
          <Route path="/coordinate/:zoneId" element={<Coordinate />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);

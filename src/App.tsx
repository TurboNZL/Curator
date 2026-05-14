import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import Index from "./pages/Index";
import Artists from "./pages/Artists";
import ArtistDetail from "./pages/ArtistDetail";
import Albums from "./pages/Albums";
import AlbumDetail from "./pages/AlbumDetail";
import Tracks from "./pages/Tracks";
import Releases from "./pages/Releases";
import Playlists from "./pages/Playlists";
import Stats from "./pages/Stats";
import Cleanup from "./pages/Cleanup";
import Queue from "./pages/Queue";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster position="bottom-right" />
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Index />} />
            <Route path="/artists" element={<Artists />} />
            <Route path="/artists/:id" element={<ArtistDetail />} />
            <Route path="/albums" element={<Albums />} />
            <Route path="/albums/:id" element={<AlbumDetail />} />
            <Route path="/tracks" element={<Tracks />} />
            <Route path="/releases" element={<Releases />} />
            <Route path="/playlists" element={<Playlists />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/cleanup" element={<Cleanup />} />
            <Route path="/queue" element={<Queue />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
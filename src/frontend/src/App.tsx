import { Toaster } from "@/components/ui/sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { backendInterface as backendInterfaceExtended } from "./backend.d";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import { loadConfig } from "./config";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import CatalogUpload from "./pages/CatalogUpload";
import Inventory from "./pages/Inventory";
import LoginPage from "./pages/LoginPage";
import { StorageClient } from "./utils/StorageClient";

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const { actor, isFetching } = useActor();
  const qc = useQueryClient();
  const [currentPage, setCurrentPage] = useState<"inventory" | "catalog">(
    "inventory",
  );

  useQuery<StorageClient | null>({
    queryKey: ["storageClient"],
    queryFn: async () => {
      const config = await loadConfig();
      const { HttpAgent } = await import("@icp-sdk/core/agent");
      const agent = new HttpAgent({
        identity: identity ?? undefined,
        host: config.backend_host,
      });
      if (config.backend_host?.includes("localhost")) {
        await agent.fetchRootKey().catch(console.warn);
      }
      return new StorageClient(
        config.bucket_name,
        config.storage_gateway_url,
        config.backend_canister_id,
        config.project_id,
        agent,
      );
    },
    staleTime: Number.POSITIVE_INFINITY,
    enabled: !isInitializing,
  });

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!identity) {
    return <LoginPage />;
  }

  const renderPage = () => {
    if (!actor || isFetching) return null;
    const storageClient =
      qc.getQueryData<StorageClient | null>(["storageClient"]) ?? null;
    if (currentPage === "catalog") {
      return (
        <CatalogUpload
          actor={actor as unknown as backendInterfaceExtended}
          storageClient={storageClient}
        />
      );
    }
    return <Inventory actor={actor as unknown as backendInterfaceExtended} />;
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{renderPage()}</main>
      </div>
      <Toaster />
    </div>
  );
}

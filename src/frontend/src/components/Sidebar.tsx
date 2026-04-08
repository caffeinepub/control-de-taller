import { BookImage, Package, Wrench } from "lucide-react";

interface SidebarProps {
  currentPage: "inventory" | "catalog";
  onNavigate: (page: "inventory" | "catalog") => void;
}

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside
      className="w-64 flex-shrink-0 flex flex-col"
      style={{
        background:
          "linear-gradient(180deg, oklch(0.22 0.04 230) 0%, oklch(0.17 0.035 230) 100%)",
      }}
    >
      <div className="px-6 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="bg-sidebar-primary rounded-lg p-2">
            <Wrench className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">
              Mi Almacén
            </p>
            <p className="text-sidebar-foreground/60 text-xs">Registro</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <button
          type="button"
          data-ocid="nav.inventory.link"
          onClick={() => onNavigate("inventory")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            currentPage === "inventory"
              ? "bg-sidebar-accent text-white"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white"
          }`}
        >
          <Package className="w-4 h-4 flex-shrink-0" />
          Almacén
        </button>

        <button
          type="button"
          data-ocid="nav.catalog.link"
          onClick={() => onNavigate("catalog")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            currentPage === "catalog"
              ? "bg-sidebar-accent text-white"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white"
          }`}
        >
          <BookImage className="w-4 h-4 flex-shrink-0" />
          Catálogo
        </button>
      </nav>
    </aside>
  );
}

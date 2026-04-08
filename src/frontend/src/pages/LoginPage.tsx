import { Button } from "@/components/ui/button";
import { Wrench } from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function LoginPage() {
  const { login, isLoggingIn } = useInternetIdentity();

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.22 0.04 230), oklch(0.17 0.035 230))",
      }}
    >
      <div className="bg-card rounded-2xl shadow-2xl p-10 w-full max-w-md flex flex-col items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="bg-primary rounded-xl p-3">
            <Wrench className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mi Taller</h1>
            <p className="text-muted-foreground text-sm">Sistema de Control</p>
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Bienvenido
          </h2>
          <p className="text-muted-foreground text-sm">
            Inicia sesión con tu identidad digital para acceder al sistema de
            control de tu taller.
          </p>
        </div>
        <Button
          onClick={login}
          disabled={isLoggingIn}
          className="w-full h-12 text-base font-semibold"
        >
          {isLoggingIn ? "Conectando..." : "Iniciar Sesión"}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Protegido con Internet Identity en ICP
        </p>
      </div>
    </div>
  );
}

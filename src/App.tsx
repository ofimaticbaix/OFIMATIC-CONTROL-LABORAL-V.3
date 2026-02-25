import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import WorkerLogin from "./pages/WorkerLogin";
import AdminLogin from "./pages/AdminLogin";
import NotFound from "./pages/NotFound";
import UpdatePassword from "./pages/UpdatePassword";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ErrorBoundary>
            
            {/* 👇 ENVOLTORIO GLOBAL GLASSMORPHISM 👇 */}
            <div className="min-h-screen relative font-sans text-slate-900 dark:text-slate-100 selection:bg-blue-200 dark:selection:bg-blue-900/50 z-0">
              
              {/* FONDO DE IMAGEN TIPO macOS */}
              <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
                <img 
                  src="/background.png" 
                  alt="Fondo de pantalla" 
                  className="w-full h-full object-cover scale-105" // scale-105 evita bordes blancos
                />
                {/* Capa de contraste: una fina capa oscura para que los paneles blancos resalten más */}
                <div className="absolute inset-0 bg-slate-900/10 dark:bg-black/50" />
              </div>

              {/* El enrutador de las páginas renderiza la UI por encima de la imagen */}
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<WorkerLogin />} />
                <Route path="/auth/admin" element={<AdminLogin />} />
                <Route path="/update-password" element={<UpdatePassword />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              
            </div>
            
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

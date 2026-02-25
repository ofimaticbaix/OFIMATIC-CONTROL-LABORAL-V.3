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
// 👇 IMPORTAMOS LA PÁGINA NUEVA
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
            
            {/* 👇 ENVOLTORIO GLOBAL GLASSMORPHISM (Estilo Apple) 👇 */}
            <div className="min-h-screen relative font-sans text-slate-900 dark:text-slate-100 selection:bg-blue-200 dark:selection:bg-blue-900/50 z-0">
              
              {/* FONDO DINÁMICO CON ORBES DESENFOCADOS */}
              <div className="fixed inset-0 z-[-1] bg-[#f8fafc] dark:bg-slate-950 overflow-hidden pointer-events-none">
                {/* Orbe azul superior izquierdo */}
                <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vh] rounded-full bg-blue-500/30 dark:bg-blue-600/40 blur-[100px]" />
                
                {/* Orbe morado inferior derecho */}
                <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vh] rounded-full bg-purple-500/30 dark:bg-purple-600/40 blur-[100px]" />
                
                {/* Orbe esmeralda central para dar riqueza tonal */}
                <div className="absolute top-[30%] left-[30%] w-[40vw] h-[40vh] rounded-full bg-emerald-400/20 dark:bg-emerald-500/20 blur-[120px]" />
              </div>

              {/* El enrutador de las páginas renderiza el contenido por encima del fondo */}
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<WorkerLogin />} />
                <Route path="/auth/admin" element={<AdminLogin />} />
                
                {/* 👇 RUTA PARA RESTABLECER CONTRASEÑA */}
                <Route path="/update-password" element={<UpdatePassword />} />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
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

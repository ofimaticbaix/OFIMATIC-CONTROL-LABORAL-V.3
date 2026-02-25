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
            <div className="min-h-screen relative font-sans text-slate-900 dark:text-slate-100 selection:bg-blue-200 dark:selection:bg-blue-900/50">
              
              {/* Fondo base con "manchas" de color difuminadas (El secreto del cristal) */}
              <div className="fixed inset-0 z-[-1] bg-slate-50/50 dark:bg-slate-950 overflow-hidden pointer-events-none">
                {/* Gradiente superior izquierdo (Azul suave) */}
                <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-400/10 dark:bg-blue-600/10 blur-[120px]" />
                {/* Gradiente inferior derecho (Índigo/Morado muy suave) */}
                <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-indigo-400/10 dark:bg-indigo-600/10 blur-[100px]" />
              </div>

              {/* El enrutador de las páginas irá por encima de este fondo mágico */}
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

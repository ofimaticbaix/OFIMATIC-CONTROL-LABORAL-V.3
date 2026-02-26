import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Clock, LogIn, LogOut, Loader2, History as HistoryIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ClockInOut = ({ profile }: { profile: any }) => {
  const [punches, setPunches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => { fetchTodayPunches(); }, []);

  const fetchTodayPunches = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('punches')
      .select('*')
      .eq('user_id', profile.id)
      .eq('date', today)
      .order('timestamp', { ascending: true });
    
    setPunches(data || []);
    setLoading(false);
  };

  const handlePunch = async () => {
    setActionLoading(true);
    const { error } = await supabase
      .from('punches')
      .insert([{ user_id: profile.id }]);

    if (error) {
      toast({ variant: "destructive", title: "Error al fichar", description: error.message });
    } else {
      toast({ title: "¡Fichaje registrado!", description: "Se ha guardado tu marca de tiempo correctamente." });
      fetchTodayPunches();
    }
    setActionLoading(false);
  };

  const isEntry = punches.length % 2 === 0; // Par = Siguiente es Entrada, Impar = Siguiente es Salida

  if (loading) return <Loader2 className="animate-spin mx-auto text-blue-500" />;

  return (
    <div className="flex flex-col items-center justify-center space-y-10 py-10 animate-in fade-in duration-700">
      
      {/* Reloj Digital Minimalista */}
      <div className="text-center space-y-2">
        <h1 className="text-6xl font-black tracking-tighter text-slate-900 dark:text-white">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </h1>
        <p className="text-slate-500 uppercase tracking-[0.3em] text-[10px] font-bold">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* BOTÓN ÚNICO DE CRISTAL */}
      <div className="relative group">
        <div className={cn(
          "absolute -inset-4 rounded-full blur-2xl opacity-20 transition-all duration-500 group-hover:opacity-40",
          isEntry ? "bg-emerald-500" : "bg-rose-500"
        )} />
        
        <Button
          onClick={handlePunch}
          disabled={actionLoading}
          className={cn(
            "relative h-48 w-48 rounded-full border-4 shadow-2xl transition-all duration-500 active:scale-95 flex flex-col gap-2 overflow-hidden",
            isEntry 
              ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/20" 
              : "bg-rose-500/10 border-rose-500/50 text-rose-600 hover:bg-rose-500/20"
          )}
        >
          {actionLoading ? (
            <Loader2 className="h-10 w-10 animate-spin" />
          ) : (
            <>
              {isEntry ? <LogIn className="h-12 w-12" /> : <LogOut className="h-12 w-12" />}
              <span className="font-black uppercase tracking-widest text-sm">
                {isEntry ? "Entrar" : "Salir"}
              </span>
            </>
          )}
        </Button>
      </div>

      {/* Mini historial del día */}
      <div className="w-full max-w-xs space-y-4">
        <div className="flex items-center gap-2 text-slate-400 px-2">
          <HistoryIcon className="h-4 w-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Actividad de hoy</span>
        </div>
        
        <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-white/50 dark:border-slate-800 p-4 space-y-3">
          {punches.length === 0 ? (
            <p className="text-[10px] text-center text-slate-400 uppercase py-4">No hay marcajes todavía</p>
          ) : (
            punches.map((p, i) => (
              <div key={p.id} className="flex justify-between items-center px-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {i % 2 === 0 ? "Entrada" : "Salida"}
                </span>
                <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-200">
                  {new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

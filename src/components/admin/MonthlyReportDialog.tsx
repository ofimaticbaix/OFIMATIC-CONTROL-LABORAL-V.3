import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, X, Calendar, Printer, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface ExtendedProfile extends Profile {
  daily_hours?: number;
  work_schedule?: any;
}

interface MonthlyReportDialogProps {
  profile: ExtendedProfile; 
}

export const MonthlyReportDialog = ({ profile }: MonthlyReportDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); 
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totals, setTotals] = useState({ ordinarias: 0, extras: 0 });
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && profile.id) {
      generateReport();
    }
  }, [isOpen, selectedMonth, profile]);

  const formatDecimalToTime = (decimal: number) => {
    if (decimal <= 0) return "-";
    const hours = Math.floor(decimal);
    const minutes = Math.round((decimal - hours) * 60);
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  };

  const generateReport = async () => {
    setLoading(true);
    const [year, month] = selectedMonth.split('-');
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${month}-${lastDay}`;

    const { data: entries, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', profile.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Error al obtener registros.' });
      setLoading(false);
      return;
    }

    const processedDays = [];
    let totalOrd = 0;
    let totalExt = 0;

    for (let day = 1; day <= lastDay; day++) {
      const currentDayStr = `${year}-${month}-${day.toString().padStart(2, '0')}`;
      const dayEntries = entries?.filter(e => e.date === currentDayStr) || [];
      
      let dayTotal = 0;
      let entrada = "";
      let salida = "";

      if (dayEntries.length > 0) {
        if (dayEntries[0].clock_in) entrada = new Date(dayEntries[0].clock_in).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const last = dayEntries[dayEntries.length - 1];
        if (last.clock_out) salida = new Date(last.clock_out).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        dayEntries.forEach(e => { if (e.hours_worked) dayTotal += e.hours_worked; });
      }

      const dateObj = new Date(parseInt(year), parseInt(month) - 1, day);
      const contractHours = profile.daily_hours || 8;
      const ordinarias = dayTotal > 0 ? Math.min(dayTotal, contractHours) : 0;
      const extras = dayTotal > contractHours ? dayTotal - contractHours : 0;

      processedDays.push({
        fecha: `${day}/${parseInt(month)}/${year}`,
        dia: dateObj.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase(),
        entrada,
        salida,
        ordinarias,
        extras
      });

      totalOrd += ordinarias;
      totalExt += extras;
    }

    setReportData(processedDays);
    setTotals({ ordinarias: totalOrd, extras: totalExt });
    setLoading(false);
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Registro Jornada - ${profile.full_name}</title>
            <style>
              @page { size: A4; margin: 15mm; }
              body { font-family: 'Helvetica', sans-serif; color: #000 !important; background: #fff !important; padding: 0; margin: 0; }
              .report-body { color: #000 !important; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; color: #000 !important; }
              th, td { border: 1px solid #000 !important; padding: 8px; text-align: center; color: #000 !important; }
              th { background-color: #f2f2f2 !important; font-weight: bold; }
              .header-title { font-size: 18pt; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 5px; }
              .info-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 40px; border: 1px solid #000; padding: 15px; margin: 20px 0; }
              .label { font-size: 8pt; color: #666; font-weight: bold; }
              .value { font-size: 11pt; font-weight: bold; margin-bottom: 10px; }
              .signature-area { display: flex; justify-content: space-between; margin-top: 50px; }
              .sig-box { width: 40%; border-top: 1px solid #000; text-align: center; padding-top: 5px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="report-body">${content.innerHTML}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600 transition-all rounded-xl h-9 w-9"
          title="Generar informe mensual"
        >
          <FileText className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      
      {/* Contenedor Modal Estilo Apple (Glassmorphism) */}
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 rounded-[2rem] border-white/40 dark:border-slate-800 bg-white/80 dark:bg-slate-900/90 backdrop-blur-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
        
        {/* Barra superior de control (Estilo Safari/Finder) */}
        <div className="p-4 border-b border-slate-200/50 dark:border-slate-800 flex justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white tracking-tight">Registro Mensual</h3>
              <p className="text-xs text-slate-500">{profile.full_name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 transition-all focus-within:ring-2 focus-within:ring-blue-500/30">
               <Calendar className="h-4 w-4 text-slate-500" />
               <input 
                 type="month" 
                 value={selectedMonth} 
                 onChange={(e) => setSelectedMonth(e.target.value)} 
                 className="text-sm font-semibold bg-transparent text-slate-700 dark:text-slate-200 outline-none cursor-pointer" 
               />
            </div>
            
            <Button 
              onClick={handlePrint} 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl h-9 px-4 shadow-md shadow-blue-500/20 transition-transform active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Printer className="h-4 w-4 mr-2" />}
              Imprimir
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsOpen(false)} 
              className="rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Contenedor del documento (Fondo gris suave para contrastar con el papel blanco) */}
        <div className="flex-1 overflow-auto p-4 md:p-8 bg-slate-100/50 dark:bg-slate-950/50 flex justify-center">
          
          {loading ? (
             <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-50">
               <Loader2 className="animate-spin h-10 w-10 text-blue-500" />
               <p className="text-xs font-bold tracking-widest uppercase">Calculando registros...</p>
             </div>
          ) : (
            /* Papel A4 Virtual (Este div es el que se imprime, mantenemos su estilo corporativo/legal intacto) */
            <div 
              ref={printRef} 
              className="bg-white p-[15mm] md:p-[20mm] shadow-2xl rounded-sm text-black relative" 
              style={{ width: '100%', maxWidth: '210mm', minHeight: '297mm' }}
            >
              <div style={{ borderBottom: '2px solid black', paddingBottom: '5px', marginBottom: '5px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: '900', margin: 0, color: 'black' }}>REGISTRO DE JORNADA LABORAL</h1>
              </div>
              <p style={{ fontSize: '10px', color: '#333', marginBottom: '25px', fontWeight: 'bold' }}>Conforme al Art. 34.9 del Estatuto de los Trabajadores</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', border: '1px solid black', padding: '15px', marginBottom: '25px', borderRadius: '4px' }}>
                <div>
                  <p style={{ fontSize: '8px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>Empresa</p>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '2px 0', color: 'black' }}>OFIMATIC BAIX S.L.</p>
                  <p style={{ fontSize: '8px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase', margin: '8px 0 0 0' }}>NIF / CIF</p>
                  <p style={{ fontSize: '12px', fontWeight: 'bold', color: 'black' }}>B-65836512</p>
                </div>
                <div>
                  <p style={{ fontSize: '8px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>Trabajador/a</p>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '2px 0', textTransform: 'uppercase', color: 'black' }}>{profile.full_name}</p>
                  <p style={{ fontSize: '8px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase', margin: '8px 0 0 0' }}>DNI / NIE</p>
                  <p style={{ fontSize: '12px', fontWeight: 'bold', color: 'black' }}>{profile.dni || '---'}</p>
                  <p style={{ fontSize: '11px', marginTop: '10px', color: 'black' }}>Periodo: <strong>{selectedMonth}</strong></p>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: 'black' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f3f3' }}>
                    <th style={{ border: '1px solid #e5e5e5', borderBottom: '2px solid black', padding: '8px' }}>Fecha</th>
                    <th style={{ border: '1px solid #e5e5e5', borderBottom: '2px solid black', padding: '8px' }}>Día</th>
                    <th style={{ border: '1px solid #e5e5e5', borderBottom: '2px solid black', padding: '8px' }}>Entrada</th>
                    <th style={{ border: '1px solid #e5e5e5', borderBottom: '2px solid black', padding: '8px' }}>Salida</th>
                    <th style={{ border: '1px solid #e5e5e5', borderBottom: '2px solid black', padding: '8px' }}>Ordinarias</th>
                    <th style={{ border: '1px solid #e5e5e5', borderBottom: '2px solid black', padding: '8px' }}>Extras</th>
                    <th style={{ border: '1px solid #e5e5e5', borderBottom: '2px solid black', padding: '8px', width: '80px' }}>Firma</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((day, i) => (
                    <tr key={i} style={{ textAlign: 'center', backgroundColor: i % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                      <td style={{ border: '1px solid #e5e5e5', padding: '6px' }}>{day.fecha}</td>
                      <td style={{ border: '1px solid #e5e5e5', padding: '6px', fontWeight: 'bold' }}>{day.dia}</td>
                      <td style={{ border: '1px solid #e5e5e5', padding: '6px', color: day.entrada ? 'black' : '#ccc' }}>{day.entrada || '-'}</td>
                      <td style={{ border: '1px solid #e5e5e5', padding: '6px', color: day.salida ? 'black' : '#ccc' }}>{day.salida || '-'}</td>
                      <td style={{ border: '1px solid #e5e5e5', padding: '6px', fontWeight: 'bold' }}>{formatDecimalToTime(day.ordinarias)}</td>
                      <td style={{ border: '1px solid #e5e5e5', padding: '6px' }}>{formatDecimalToTime(day.extras)}</td>
                      <td style={{ border: '1px solid #e5e5e5', padding: '6px' }}></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f3f3f3', fontWeight: 'bold', textAlign: 'center' }}>
                    <td colSpan={4} style={{ border: '1px solid black', padding: '10px', textAlign: 'right' }}>TOTALES MENSUALES</td>
                    <td style={{ border: '1px solid black', padding: '10px' }}>{formatDecimalToTime(totals.ordinarias)}</td>
                    <td style={{ border: '1px solid black', padding: '10px' }}>{formatDecimalToTime(totals.extras)}</td>
                    <td style={{ border: '1px solid black', padding: '10px' }}></td>
                  </tr>
                </tfoot>
              </table>

              <div style={{ fontSize: '10px', color: '#444', marginTop: '25px', textAlign: 'justify' }}>
                El trabajador/a declara haber recibido copia de este registro y estar conforme con las horas reflejadas, cumpliendo con el Art. 34.9 del Estatuto de los Trabajadores.
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px', padding: '0 20px' }}>
                <div style={{ width: '35%', borderTop: '1px solid black', textAlign: 'center', paddingTop: '5px', fontWeight: 'bold', color: 'black', fontSize: '12px' }}>FIRMA EMPRESA</div>
                <div style={{ width: '35%', borderTop: '1px solid black', textAlign: 'center', paddingTop: '5px', fontWeight: 'bold', color: 'black', fontSize: '12px' }}>FIRMA TRABAJADOR/A</div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

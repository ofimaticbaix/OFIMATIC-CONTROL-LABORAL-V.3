import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Printer, X, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types';
import { useToast } from '@/hooks/use-toast';

// Extendemos el perfil para incluir las horas semanales de la base de datos
interface ExtendedProfile extends Profile {
  weekly_hours?: number;
}

interface MonthlyReportDialogProps {
  profile: ExtendedProfile; 
}

export const MonthlyReportDialog = ({ profile }: MonthlyReportDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); 
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalMonthlyHours, setTotalMonthlyHours] = useState(0);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // --- 📏 CÁLCULO DE JORNADA PERSONALIZADA ---
  // Si no tiene horas definidas, usamos 40h (8h/día) por defecto
  const contractWeeklyHours = profile.weekly_hours || 40;
  const theoreticalDailyHours = contractWeeklyHours / 5; 

  useEffect(() => {
    if (isOpen && profile.id) {
      generateReport();
    }
  }, [isOpen, selectedMonth, profile]);

  const formatDecimalHours = (decimal: number) => {
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
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos.' });
      setLoading(false);
      return;
    }

    const processedDays = [];
    let monthlyTotal = 0;

    for (let day = 1; day <= lastDay; day++) {
      const currentDayStr = `${year}-${month}-${day.toString().padStart(2, '0')}`;
      const dayEntries = entries?.filter(e => e.date === currentDayStr) || [];

      let dayTotalHours = 0;
      let firstEntry = '-';
      let lastExit = '-';

      if (dayEntries.length > 0) {
        if (dayEntries[0].clock_in) {
            firstEntry = new Date(dayEntries[0].clock_in).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        }
        const lastEntry = dayEntries[dayEntries.length - 1];
        if (lastEntry.clock_out) {
            lastExit = new Date(lastEntry.clock_out).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        }
        dayEntries.forEach(e => {
            if (e.hours_worked) dayTotalHours += e.hours_worked;
        });
      }

      monthlyTotal += dayTotalHours;

      const dateObj = new Date(parseInt(year), parseInt(month) - 1, day);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

      processedDays.push({
        date: currentDayStr,
        dayNum: day,
        dayName: dateObj.toLocaleDateString('es-ES', { weekday: 'short' }),
        firstEntry,
        lastExit,
        totalHours: dayTotalHours,
        isWeekend,
        // Usamos la media diaria según su contrato semanal para el cálculo de extras
        contractHours: theoreticalDailyHours 
      });
    }

    setReportData(processedDays);
    setTotalMonthlyHours(monthlyTotal);
    setLoading(false);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>Informe - ${profile.full_name}</title>
            <style>
              body { font-family: Arial, sans-serif; font-size: 11px; color: #000; margin: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #000; padding: 4px; text-align: center; }
              th { background-color: #eee; font-weight: bold; }
              .header { margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 5px; }
              .info-grid { display: flex; justify-content: space-between; margin-top: 10px; border: 1px solid #000; padding: 10px; }
              .weekend { background-color: #f3f3f3; }
              .footer { margin-top: 30px; display: flex; justify-content: space-between; }
              .signature-box { width: 40%; border-top: 1px solid #000; padding-top: 5px; text-align: center; }
            </style>
          </head>
          <body>${printContent.innerHTML}</body>
        </html>
      `);
      doc.close();
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => { document.body.removeChild(iframe); }, 1000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileText className="h-4 w-4" /> Informe
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0 bg-white text-black">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-4">
             <h3 className="font-bold text-lg text-black">Vista Previa del Informe</h3>
             <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="border rounded p-1 text-sm text-black bg-white" />
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" /> Imprimir / PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-black"><X className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 bg-gray-200">
           <div ref={printRef} className="bg-white shadow-lg p-10 max-w-[21cm] mx-auto text-black">
              <div className="header">
                 <div className="flex justify-between items-end">
                    <div>
                      <h1 className="text-xl font-bold">REGISTRO DE JORNADA LABORAL</h1>
                      <p className="text-[10px]">Conforme al Art. 34.9 del Estatuto de los Trabajadores</p>
                    </div>
                    <div className="text-right">
                      <h2 className="text-lg font-bold">{selectedMonth}</h2>
                    </div>
                 </div>

                 <div className="info-grid text-sm">
                    <div className="space-y-1">
                       <p><strong>EMPRESA:</strong> AN STILE UNISEX S.L.</p> 
                       <p><strong>CIF:</strong> B-12345678</p> 
                       <p><strong>CENTRO:</strong> CORNELLÀ DE LLOBREGAT</p>
                    </div>
                    <div className="space-y-1 text-right">
                       <p><strong>TRABAJADOR:</strong> {profile.full_name?.toUpperCase()}</p>
                       <p><strong>DNI/NIE:</strong> {profile.dni || '---'}</p>
                       <p><strong>CONTRATO:</strong> {contractWeeklyHours}h Semanales</p>
                    </div>
                 </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Día</th>
                    <th>Entrada</th>
                    <th>Salida</th>
                    <th>Ordinarias</th>
                    <th>Extras</th>
                    <th>Firma</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="py-10">Generando...</td></tr>
                  ) : (
                    reportData.map((day) => (
                      <tr key={day.date} className={day.isWeekend ? 'weekend' : ''}>
                        <td>{new Date(day.date).toLocaleDateString('es-ES')}</td>
                        <td className="uppercase text-[9px] font-bold">{day.dayName}</td>
                        <td className="font-mono text-xs">{day.firstEntry}</td>
                        <td className="font-mono text-xs">{day.lastExit}</td>
                        <td className="font-bold">
                           {day.totalHours > 0 ? formatDecimalHours(Math.min(day.totalHours, theoreticalDailyHours)) : '-'}
                        </td>
                        <td className="text-gray-600">
                           {day.totalHours > theoreticalDailyHours ? formatDecimalHours(day.totalHours - theoreticalDailyHours) : '-'}
                        </td>
                        <td></td> 
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                   <tr className="bg-gray-100 font-bold">
                      <td colSpan={4} className="text-right px-4">TOTAL MENSUAL</td>
                      <td>{formatDecimalHours(totalMonthlyHours)}</td>
                      <td>
                        {formatDecimalHours(reportData.reduce((acc, day) => acc + (day.totalHours > theoreticalDailyHours ? day.totalHours - theoreticalDailyHours : 0), 0))}
                      </td>
                      <td></td>
                   </tr>
                </tfoot>
              </table>

              <div className="mt-8 text-[9px] text-justify leading-tight">
                 <p>El presente registro de jornada laboral cumple con lo estipulado en el Real Decreto-ley 8/2019. El trabajador/a confirma la veracidad de los datos aquí reflejados, incluyendo las horas ordinarias y, en su caso, extraordinarias realizadas durante el periodo indicado.</p>
              </div>

              <div className="footer">
                 <div className="signature-box"><p className="text-[10px] font-bold mb-12">Sello y Firma de la Empresa</p></div>
                 <div className="signature-box"><p className="text-[10px] font-bold mb-12">Firma del Trabajador/a</p></div>
              </div>
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Printer, X, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface ExtendedProfile extends Profile {
  daily_hours?: number;
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

  useEffect(() => {
    if (isOpen && profile.id) {
      generateReport();
    }
  }, [isOpen, selectedMonth, profile]);

  // --- 🔥 FUNCIÓN MÁGICA: DE DECIMAL A HORAS Y MINUTOS ---
  const formatDecimalHours = (decimal: number) => {
    const hours = Math.floor(decimal);
    const minutes = Math.round((decimal - hours) * 60);
    // Si son 0 minutos, ponemos 00. Si es una sola cifra, le ponemos un 0 delante.
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
      .order('created_at', { ascending: true });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos.' });
      setLoading(false);
      return;
    }

    const processedDays = [];
    let monthlyTotal = 0;
    const contractHours = profile.daily_hours || 8;

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
        entriesCount: dayEntries.length,
        isWeekend,
        contractHours
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
              body { font-family: Arial, sans-serif; font-size: 12px; color: #000; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ccc; padding: 6px; text-align: center; }
              th { background-color: #f3f4f6; font-weight: bold; }
              .header { margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
              .header h1 { margin: 0; font-size: 18px; text-transform: uppercase; }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 10px; }
              .weekend { background-color: #f9fafb; color: #9ca3af; }
              .footer { margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid; }
              .signature-box { width: 45%; border-top: 1px solid #000; padding-top: 10px; text-align: center; }
              .legal { margin-top: 20px; font-size: 10px; color: #666; text-align: justify; }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      doc.close();
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => { document.body.removeChild(iframe); }, 1000);
    }
  };

  const contractHours = profile.daily_hours || 8;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileText className="h-4 w-4" />
          Informe
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0 bg-white text-black">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-4">
             <h3 className="font-bold text-lg">Vista Previa del Informe</h3>
             <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="border rounded p-1 text-sm" />
             </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" /> Imprimir / PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}><X className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 bg-gray-100">
           <div ref={printRef} className="bg-white shadow-lg p-10 max-w-[21cm] mx-auto min-h-[29.7cm] text-black">
              
              <div className="header">
                 <div className="flex justify-between items-end">
                    <div>
                      <h1>Registro de Jornada Laboral</h1>
                      <p className="text-xs mt-1 text-gray-500">Conforme al Art. 34.9 del Estatuto de los Trabajadores</p>
                    </div>
                    <div className="text-right">
                      <h2 className="text-xl font-bold">{selectedMonth}</h2>
                    </div>
                 </div>

                 <div className="info-grid mt-6 border p-4 rounded-sm">
                    <div>
                       <p className="text-xs uppercase text-gray-500 font-bold">Empresa</p>
                       {/* 👇 AQUÍ ESTÁ EL CAMBIO DE NOMBRE */}
                       <p className="font-bold">AN STILE UNISEX S.L.</p> 
                       <p className="text-sm">CIF: B-12345678</p> 
                    </div>
                    <div>
                       <p className="text-xs uppercase text-gray-500 font-bold">Trabajador/a</p>
                       <p className="font-bold uppercase">{profile.full_name}</p>
                       <p className="text-sm">DNI/NIE: {profile.dni || 'PENDIENTE'}</p>
                       <p className="text-sm">Puesto: {profile.position || 'General'}</p>
                       <p className="text-sm">Jornada Contrato: <strong>{contractHours}h / día</strong></p>
                    </div>
                 </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th className="w-20">Fecha</th>
                    <th className="w-16">Día</th>
                    <th>Entrada</th>
                    <th>Salida</th>
                    <th>Ordinarias</th>
                    <th>Extras</th>
                    <th>Firma</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="py-10">Generando informe...</td></tr>
                  ) : (
                    reportData.map((day) => (
                      <tr key={day.date} className={day.isWeekend ? 'weekend' : ''}>
                        <td>{new Date(day.date).toLocaleDateString('es-ES')}</td>
                        <td className="uppercase text-xs font-bold">{day.dayName}</td>
                        <td className="font-mono">{day.firstEntry}</td>
                        <td className="font-mono">{day.lastExit}</td>
                        
                        {/* 👇 AQUÍ USAMOS EL FORMATO NUEVO HH MM */}
                        <td className="font-bold">
                           {day.totalHours > 0 ? formatDecimalHours(Math.min(day.totalHours, contractHours)) : '-'}
                        </td>
                        <td className="text-gray-500 text-xs">
                           {day.totalHours > contractHours ? formatDecimalHours(day.totalHours - contractHours) : '-'}
                        </td>
                        <td></td> 
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                   <tr className="bg-gray-100 font-bold">
                      <td colSpan={4} className="text-right px-4">TOTALES MENSUALES</td>
                      <td>{formatDecimalHours(totalMonthlyHours)}</td>
                      <td>
                        {formatDecimalHours(reportData.reduce((acc, day) => acc + (day.totalHours > contractHours ? day.totalHours - contractHours : 0), 0))}
                      </td>
                      <td></td>
                   </tr>
                </tfoot>
              </table>

              <div className="legal">
                 <p>El trabajador/a declara haber recibido copia de este registro...</p>
              </div>

              <div className="footer">
                 <div className="signature-box"><p className="text-xs uppercase font-bold mb-8">Firma de la Empresa</p></div>
                 <div className="signature-box"><p className="text-xs uppercase font-bold mb-8">Firma del Trabajador/a</p></div>
              </div>

           </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

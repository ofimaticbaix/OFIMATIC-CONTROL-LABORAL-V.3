import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Printer, X, Calendar, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Profile, WeeklySchedule } from '@/types';
import { useToast } from '@/hooks/use-toast';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface ExtendedProfile extends Profile {
  daily_hours?: number;
  work_schedule?: WeeklySchedule | null;
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

  const formatDecimalHours = (decimal: number) => {
    const hours = Math.floor(decimal);
    const minutes = Math.round((decimal - hours) * 60);
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  };

  const getExpectedHoursForDate = (date: Date): number => {
    // 1. Si no hay horario personalizado, usamos el fijo
    if (!profile.work_schedule) {
        const day = date.getDay();
        if (day === 0 || day === 6) return 0; // Fines de semana 0h
        return profile.daily_hours || 8;
    }

    // 2. Si HAY horario personalizado
    const dayIndex = date.getDay();
    // Forzamos a TS a saber que existe con el signo !
    const schedule = profile.work_schedule!; 
    
    // Usamos claves genéricas para evitar errores de tipado estricto
    const keys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayKey = keys[dayIndex];
    
    // Accedemos como 'any' para evitar que TS se queje si las claves no coinciden perfecto
    const daySchedule = (schedule as any)[dayKey];

    return daySchedule?.active ? daySchedule.totalHours : 0;
  };

  const generateReport = async () => {
    setLoading(true);
    const [year, month] = selectedMonth.split('-');
    
    // Calcular fechas inicio y fin
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
      
      const dailyContractHours = getExpectedHoursForDate(dateObj);

      processedDays.push({
        date: currentDayStr,
        dayNum: day,
        dayName: dateObj.toLocaleDateString('es-ES', { weekday: 'short' }),
        firstEntry,
        lastExit,
        totalHours: dayTotalHours,
        entriesCount: dayEntries.length,
        isWeekend,
        contractHours: dailyContractHours
      });
    }

    setReportData(processedDays);
    setTotalMonthlyHours(monthlyTotal);
    setLoading(false);
  };

  const handleDownloadPDF = () => {
    const element = printRef.current;
    if (!element) return;

    // Configuración del PDF
    const opt = {
      margin:       10,
      filename:     `Informe_${profile.full_name}_${selectedMonth}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true }, // useCORS ayuda si hay imágenes externas
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Llamada segura a la librería
    if (html2pdf) {
        html2pdf().set(opt).from(element).save().catch((err: any) => {
            console.error("Error al generar PDF:", err);
            toast({ variant: "destructive", title: "Error", description: "Fallo al generar el PDF" });
        });
        
        toast({
            title: "PDF Generado",
            description: "El informe se ha descargado correctamente."
        });
    } else {
        toast({ variant: "destructive", title: "Error", description: "Librería PDF no cargada" });
    }
  };

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
            <Button onClick={handleDownloadPDF} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Download className="h-4 w-4" /> Descargar PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}><X className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 bg-gray-100">
           <div id="report-content" ref={printRef} className="bg-white shadow-lg p-10 max-w-[21cm] mx-auto min-h-[29.7cm] text-black">
              
              <div className="header border-b-2 border-black pb-4 mb-6">
                 <div className="flex justify-between items-end">
                    <div>
                      <h1 className="text-xl font-bold uppercase">Registro de Jornada Laboral</h1>
                      <p className="text-xs mt-1 text-gray-500">Conforme al Art. 34.9 del Estatuto de los Trabajadores</p>
                    </div>
                    <div className="text-right">
                      <h2 className="text-xl font-bold">{selectedMonth}</h2>
                    </div>
                 </div>

                 <div className="info-grid grid grid-cols-2 gap-8 mt-6 border p-4 rounded-sm">
                    <div>
                        <p className="text-xs uppercase text-gray-500 font-bold">Empresa</p>
                        <p className="font-bold text-lg">AN STILE UNISEX S.L.</p> 
                        <p className="text-sm">DNI: 47611686-F</p> 
                    </div>
                    <div>
                        <p className="text-xs uppercase text-gray-500 font-bold">Trabajador/a</p>
                        <p className="font-bold uppercase text-lg">{profile.full_name}</p>
                        <p className="text-sm">DNI/NIE: {profile.dni || 'PENDIENTE'}</p>
                        <p className="text-sm">Puesto: {profile.position || 'General'}</p>
                        <p className="text-sm mt-1">
                            Jornada: <strong>
                                {profile.work_schedule ? 'Según Cuadrante' : `${profile.daily_hours || 8}h / día`}
                            </strong>
                        </p>
                    </div>
                 </div>
              </div>

              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 w-24">Fecha</th>
                    <th className="border p-2 w-16">Día</th>
                    <th className="border p-2">Entrada</th>
                    <th className="border p-2">Salida</th>
                    <th className="border p-2">Ordinarias</th>
                    <th className="border p-2">Extras</th>
                    <th className="border p-2">Firma</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="py-10 text-center">Generando informe...</td></tr>
                  ) : (
                    reportData.map((day) => (
                      <tr key={day.date} className={`text-center ${day.isWeekend ? 'bg-gray-50' : ''}`}>
                        <td className="border p-2">{new Date(day.date).toLocaleDateString('es-ES')}</td>
                        <td className="border p-2 uppercase text-xs font-bold">{day.dayName}</td>
                        <td className="border p-2 font-mono">{day.firstEntry}</td>
                        <td className="border p-2 font-mono">{day.lastExit}</td>
                        <td className="border p-2 font-bold">
                           {day.totalHours > 0 ? formatDecimalHours(Math.min(day.totalHours, day.contractHours)) : '-'}
                        </td>
                        <td className="border p-2 text-gray-500 text-xs">
                           {day.totalHours > day.contractHours ? formatDecimalHours(day.totalHours - day.contractHours) : '-'}
                        </td>
                        <td className="border p-2"></td> 
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                    <tr className="bg-gray-100 font-bold text-center">
                      <td colSpan={4} className="border p-2 text-right px-4">TOTALES</td>
                      <td className="border p-2">{formatDecimalHours(totalMonthlyHours)}</td>
                      <td className="border p-2">
                        {formatDecimalHours(reportData.reduce((acc, day) => acc + (day.totalHours > day.contractHours ? day.totalHours - day.contractHours : 0), 0))}
                      </td>
                      <td className="border p-2"></td>
                    </tr>
                </tfoot>
              </table>

              <div className="legal mt-8 text-xs text-justify text-gray-500">
                 <p>El trabajador/a declara haber recibido copia de este registro y estar conforme con las horas reflejadas.</p>
              </div>

              <div className="footer mt-16 flex justify-between">
                 <div className="w-[45%] border-t border-black pt-2 text-center">
                    <p className="text-xs uppercase font-bold">Firma de la Empresa</p>
                 </div>
                 <div className="w-[45%] border-t border-black pt-2 text-center">
                    <p className="text-xs uppercase font-bold">Firma del Trabajador/a</p>
                 </div>
              </div>

            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

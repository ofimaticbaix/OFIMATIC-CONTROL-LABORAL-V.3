import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Printer, X, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types';
import { useToast } from '@/hooks/use-toast';

// Interfaces locales para garantizar compatibilidad
interface WeeklySchedule {
  monday: { active: boolean; totalHours: number };
  tuesday: { active: boolean; totalHours: number };
  wednesday: { active: boolean; totalHours: number };
  thursday: { active: boolean; totalHours: number };
  friday: { active: boolean; totalHours: number };
  saturday: { active: boolean; totalHours: number };
  sunday: { active: boolean; totalHours: number };
}

interface ExtendedProfile extends Profile {
  daily_hours?: number;
  weekly_hours?: number;
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
    if (profile.work_schedule) {
        const dayIndex = date.getDay();
        const keys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayKey = keys[dayIndex];
        const daySchedule = (profile.work_schedule as any)[dayKey];
        return daySchedule?.active ? daySchedule.totalHours : 0;
    }

    if (profile.weekly_hours) {
        const day = date.getDay();
        if (day === 0 || day === 6) return 0;
        return profile.weekly_hours / 5;
    }

    const day = date.getDay();
    if (day === 0 || day === 6) return 0;
    return profile.daily_hours || 8;
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
        dayEntries.forEach(e => { if (e.hours_worked) dayTotalHours += e.hours_worked; });
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
        isWeekend,
        contractHours: dailyContractHours
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
              body { font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #000; padding: 5px; text-align: center; }
              th { background-color: #eee; font-weight: bold; }
              .header { margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 5px; }
              .info-grid { display: flex; justify-content: space-between; margin-top: 10px; border: 1px solid #000; padding: 10px; }
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
             <h3 className="font-bold text-lg text-black text-left">Vista Previa</h3>
             <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="border rounded p-1 text-sm bg-white text-black" />
          </div>
          <div className="flex gap-2 text-black">
            <Button onClick={handlePrint} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Printer className="h-4 w-4" /> Imprimir / PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-black"><X className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 bg-gray-200">
           <div id="report-content" ref={printRef} className="bg-white shadow-lg p-10 max-w-[21cm] mx-auto min-h-[29.7cm] text-black">
              <div className="header border-b-2 border-black pb-4 mb-6">
                 <div className="flex justify-between items-end">
                    <div className="text-left">
                      <h1 className="text-xl font-bold uppercase">Registro de Jornada Laboral</h1>
                      <p className="text-[10px] mt-1 text-gray-500">Conforme al Art. 34.9 del Estatuto de los Trabajadores</p>
                    </div>
                    <div className="text-right">
                      <h2 className="text-xl font-bold">{selectedMonth}</h2>
                    </div>
                 </div>

                 <div className="info-grid text-sm text-left">
                    <div className="space-y-1">
                        <p className="text-xs uppercase text-gray-500 font-bold">Empresa</p>
                        <p className="font-bold text-lg">AN STILE UNISEX S.L.</p> 
                        <p className="text-sm">CIF: B-12345678</p> 
                    </div>
                    <div className="space-y-1 text-right">
                        <p className="text-xs uppercase text-gray-500 font-bold">Trabajador/a</p>
                        <p className="font-bold uppercase text-lg">{profile.full_name}</p>
                        <p className="text-sm">DNI/NIE: {profile.dni || '---'}</p>
                        <p className="text-sm">Jornada: <strong>{profile.work_schedule ? 'Según Cuadrante' : `${profile.weekly_hours || 40}h Semanales`}</strong></p>
                    </div>
                 </div>
              </div>

              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black p-2">Fecha</th>
                    <th className="border border-black p-2">Día</th>
                    <th className="border border-black p-2">Entrada</th>
                    <th className="border border-black p-2">Salida</th>
                    <th className="border border-black p-2">Ordinarias</th>
                    <th className="border border-black p-2">Extras</th>
                    <th className="border border-black p-2 w-20">Firma</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="py-10 text-center">Generando...</td></tr>
                  ) : (
                    reportData.map((day) => (
                      <tr key={day.date} className={`text-center ${day.isWeekend ? 'bg-gray-50' : ''}`}>
                        <td className="border border-black p-2">{new Date(day.date).toLocaleDateString('es-ES')}</td>
                        <td className="border border-black p-2 uppercase text-[10px] font-bold">{day.dayName}</td>
                        <td className="border border-black p-2 font-mono">{day.firstEntry}</td>
                        <td className="border border-black p-2 font-mono">{day.lastExit}</td>
                        <td className="border border-black p-2 font-bold">
                           {day.totalHours > 0 ? formatDecimalHours(Math.min(day.totalHours, day.contractHours)) : '-'}
                        </td>
                        <td className="border border-black p-2 text-gray-500">
                           {day.totalHours > day.contractHours ? formatDecimalHours(day.totalHours - day.contractHours) : '-'}
                        </td>
                        <td className="border border-black p-2"></td> 
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                    <tr className="bg-gray-100 font-bold text-center">
                      <td colSpan={4} className="border border-black p-2 text-right px-4">TOTAL MENSUAL</td>
                      <td className="border border-black p-2">{formatDecimalHours(totalMonthlyHours)}</td>
                      <td className="border border-black p-2">
                        {formatDecimalHours(reportData.reduce((acc, day) => acc + (day.totalHours > day.contractHours ? day.totalHours - day.contractHours : 0), 0))}
                      </td>
                      <td className="border border-black p-2"></td>
                    </tr>
                </tfoot>
              </table>

              <div className="footer mt-12 flex justify-between">
                 <div className="w-[40%] border-t border-black pt-2 text-center">
                    <p className="text-[10px] uppercase font-bold">Firma Empresa</p>
                 </div>
                 <div className="w-[40%] border-t border-black pt-2 text-center">
                    <p className="text-[10px] uppercase font-bold">Firma Trabajador/a</p>
                 </div>
              </div>
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

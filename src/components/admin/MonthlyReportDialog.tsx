import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, X, Calendar, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types';
import { useToast } from '@/hooks/use-toast';

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
    const day = date.getDay();
    if (day === 0 || day === 6) return 0;
    if (profile.weekly_hours) return profile.weekly_hours / 5;
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

  // Función de impresión nativa sin librerías externas para evitar errores de Vercel
  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Informe - ${profile.full_name}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px; }
              th, td { border: 1px solid #000; padding: 6px; text-align: center; }
              th { background-color: #f3f4f6; }
              .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
              .info-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; border: 1px solid #000; padding: 15px; margin-bottom: 20px; }
              .footer { margin-top: 40px; display: flex; justify-content: space-between; }
              .signature { width: 40%; border-top: 1px solid #000; text-align: center; padding-top: 5px; font-weight: bold; font-size: 10px; }
              @media print { .no-print { display: none; } }
            </style>
          </head>
          <body>${content.innerHTML}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
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
             <input 
               type="month" 
               value={selectedMonth} 
               onChange={(e) => setSelectedMonth(e.target.value)} 
               className="border rounded p-1 text-sm bg-white text-black" 
             />
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Printer className="h-4 w-4" /> Imprimir / PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-black hover:bg-gray-200">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 bg-gray-200">
            <div ref={printRef} className="bg-white shadow-lg p-10 max-w-[21cm] mx-auto min-h-[29.7cm] text-black text-left">
              <div className="header">
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <h1 style={{ fontSize: '20px', margin: 0 }}>REGISTRO DE JORNADA LABORAL</h1>
                      <p style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>Art. 34.9 del Estatuto de los Trabajadores</p>
                    </div>
                    <h2 style={{ fontSize: '20px', margin: 0 }}>{selectedMonth}</h2>
                 </div>

                 <div className="info-grid" style={{ marginTop: '20px' }}>
                    <div>
                        <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase', margin: 0 }}>Empresa</p>
                        <p style={{ fontSize: '16px', fontWeight: 'bold', margin: '5px 0' }}>OFIMATIC BAIX S.L.</p> 
                        <p style={{ fontSize: '12px', margin: 0 }}>NIF: B-65836512</p> 
                    </div>
                    <div>
                        <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase', margin: 0 }}>Trabajador/a</p>
                        <p style={{ fontSize: '16px', fontWeight: 'bold', margin: '5px 0', textTransform: 'uppercase' }}>{profile.full_name}</p>
                        <p style={{ fontSize: '12px', margin: 0 }}>DNI/NIE: {profile.dni || '---'}</p>
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
                    <th style={{ width: '80px' }}>Firma</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ padding: '40px' }}>Cargando datos...</td></tr>
                  ) : (
                    reportData.map((day) => (
                      <tr key={day.date} style={{ backgroundColor: day.isWeekend ? '#f9fafb' : 'transparent' }}>
                        <td>{new Date(day.date).toLocaleDateString('es-ES')}</td>
                        <td style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '9px' }}>{day.dayName}</td>
                        <td style={{ fontFamily: 'monospace' }}>{day.firstEntry}</td>
                        <td style={{ fontFamily: 'monospace' }}>{day.lastExit}</td>
                        <td style={{ fontWeight: 'bold' }}>
                           {day.totalHours > 0 ? formatDecimalHours(Math.min(day.totalHours, day.contractHours)) : '-'}
                        </td>
                        <td style={{ color: '#666' }}>
                           {day.totalHours > day.contractHours ? formatDecimalHours(day.totalHours - day.contractHours) : '-'}
                        </td>
                        <td></td> 
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                    <tr style={{ backgroundColor: '#f3f4f6', fontWeight: 'bold' }}>
                      <td colSpan={4} style={{ textAlign: 'right', paddingRight: '15px' }}>TOTAL MENSUAL</td>
                      <td>{formatDecimalHours(totalMonthlyHours)}</td>
                      <td>
                        {formatDecimalHours(reportData.reduce((acc, day) => acc + (day.totalHours > day.contractHours ? day.totalHours - day.contractHours : 0), 0))}
                      </td>
                      <td></td>
                    </tr>
                </tfoot>
              </table>

              <div className="footer">
                 <div className="signature">Firma Empresa</div>
                 <div className="signature">Firma Trabajador/a</div>
              </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

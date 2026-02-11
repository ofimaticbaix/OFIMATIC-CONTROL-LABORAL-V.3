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
      toast({ variant: 'destructive', title: 'Error', description: 'Error al cargar datos de Supabase.' });
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
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Informe Laboral - ${profile.full_name}</title>
            <style>
              body { font-family: Helvetica, Arial, sans-serif; padding: 30px; color: #000; line-height: 1.4; }
              .header { border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
              .info-box { border: 1px solid #000; padding: 15px; display: grid; grid-template-cols: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
              table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 40px; }
              th, td { border: 1px solid #000; padding: 8px 4px; text-align: center; }
              th { background-color: #f0f0f0; text-transform: uppercase; font-weight: bold; }
              .totals { background-color: #f0f0f0; font-weight: bold; }
              .footer-signatures { display: flex; justify-content: space-between; margin-top: 60px; }
              .signature-line { width: 40%; border-top: 1px solid #000; text-align: center; padding-top: 8px; font-weight: bold; font-size: 12px; }
            </style>
          </head>
          <body>${content.innerHTML}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      // Pequeño retardo para asegurar que el DOM se cargue antes de imprimir
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-slate-700 hover:bg-slate-800 text-white">
          <FileText className="h-4 w-4" /> Informe
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0 bg-white text-black">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-4">
             <h3 className="font-bold text-lg text-black">Vista Previa: {profile.full_name}</h3>
             <input 
               type="month" 
               value={selectedMonth} 
               onChange={(e) => setSelectedMonth(e.target.value)} 
               className="border border-slate-300 rounded p-1 text-sm bg-white text-black" 
             />
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold">
              <Printer className="h-4 w-4" /> Imprimir / Guardar PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-black">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 bg-slate-200">
            <div ref={printRef} className="bg-white shadow-2xl p-12 max-w-[21cm] mx-auto min-h-[29.7cm] text-black">
              <div className="header">
                 <div style={{ textAlign: 'left' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: '900', margin: 0 }}>REGISTRO DE JORNADA LABORAL</h1>
                    <p style={{ fontSize: '10px', color: '#666', marginTop: '4px', fontWeight: 'bold' }}>CONFORME AL ART. 34.9 DEL ESTATUTO DE LOS TRABAJADORES</p>
                 </div>
                 <h2 style={{ fontSize: '24px', fontWeight: '900', margin: 0 }}>{selectedMonth}</h2>
              </div>

              <div className="info-box">
                  <div style={{ textAlign: 'left' }}>
                      <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#999', textTransform: 'uppercase', margin: 0 }}>Empresa Responsable</p>
                      <p style={{ fontSize: '18px', fontWeight: 'bold', margin: '4px 0' }}>OFIMATIC BAIX S.L.</p>
                      <p style={{ fontSize: '12px', margin: 0 }}>NIF: B-65836512</p>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                      <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#999', textTransform: 'uppercase', margin: 0 }}>Datos del Trabajador/a</p>
                      <p style={{ fontSize: '18px', fontWeight: 'bold', margin: '4px 0', textTransform: 'uppercase' }}>{profile.full_name}</p>
                      <p style={{ fontSize: '12px', margin: 0 }}>DNI/NIE: {profile.dni || '---'}</p>
                      <p style={{ fontSize: '12px', margin: '4px 0 0 0' }}>Jornada: <strong>{profile.work_schedule ? 'Cuadrante Personalizado' : `${profile.daily_hours || 8}h / día`}</strong></p>
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
                    <th style={{ width: '90px' }}>Firma</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ padding: '60px' }}>Generando informe detallado...</td></tr>
                  ) : reportData.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: '60px' }}>Sin registros para este mes.</td></tr>
                  ) : (
                    reportData.map((day) => (
                      <tr key={day.date} style={{ backgroundColor: day.isWeekend ? '#fafafa' : 'transparent' }}>
                        <td>{new Date(day.date).toLocaleDateString('es-ES')}</td>
                        <td style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '10px' }}>{day.dayName}</td>
                        <td style={{ fontFamily: 'Courier, monospace' }}>{day.firstEntry}</td>
                        <td style={{ fontFamily: 'Courier, monospace' }}>{day.lastExit}</td>
                        <td style={{ fontWeight: 'bold' }}>
                           {day.totalHours > 0 ? formatDecimalHours(Math.min(day.totalHours, day.contractHours)) : '-'}
                        </td>
                        <td style={{ color: '#888' }}>
                           {day.totalHours > day.contractHours ? formatDecimalHours(day.totalHours - day.contractHours) : '-'}
                        </td>
                        <td></td> 
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                    <tr className="totals">
                      <td colSpan={4} style={{ textAlign: 'right', paddingRight: '20px' }}>TOTAL ACUMULADO MENSUAL</td>
                      <td>{formatDecimalHours(totalMonthlyHours)}</td>
                      <td>
                        {formatDecimalHours(reportData.reduce((acc, day) => acc + (day.totalHours > day.contractHours ? day.totalHours - day.contractHours : 0), 0))}
                      </td>
                      <td></td>
                    </tr>
                </tfoot>
              </table>

              <div style={{ fontSize: '9px', color: '#777', textAlign: 'justify', marginTop: '20px' }}>
                <p>El presente registro de jornada cumple con la normativa vigente. El trabajador/a confirma la veracidad de los datos reflejados, incluyendo las horas ordinarias y extraordinarias, así como el disfrute de los descansos legales pertinentes entre jornadas.</p>
              </div>

              <div className="footer-signatures">
                 <div className="signature-line">Firma y Sello Empresa</div>
                 <div className="signature-line">Firma del Trabajador/a</div>
              </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, X, Calendar, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface ExtendedProfile extends Profile {
  daily_hours?: number;
  weekly_hours?: number;
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
  const [totalMonthlyHours, setTotalMonthlyHours] = useState(0);
  const [totalExtras, setTotalExtras] = useState(0);
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
    let extrasTotal = 0;

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

      const dateObj = new Date(parseInt(year), parseInt(month) - 1, day);
      const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase();
      const contractHours = profile.daily_hours || 8;
      const extras = dayTotalHours > contractHours ? dayTotalHours - contractHours : 0;

      processedDays.push({
        date: currentDayStr,
        dayName,
        firstEntry,
        lastExit,
        ordinarias: dayTotalHours > 0 ? Math.min(dayTotalHours, contractHours) : 0,
        extras: extras
      });

      monthlyTotal += dayTotalHours;
      extrasTotal += extras;
    }

    setReportData(processedDays);
    setTotalMonthlyHours(monthlyTotal);
    setTotalExtras(extrasTotal);
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
              body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
              .report-container { max-width: 800px; margin: 0 auto; }
              .header-table { width: 100%; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
              .info-grid { display: flex; justify-content: space-between; border: 1px solid #000; padding: 10px; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; font-size: 10px; }
              th, td { border: 1px solid #000; padding: 4px; text-align: center; }
              th { background-color: #f0f0f0; }
              .footer-signatures { display: flex; justify-content: space-between; margin-top: 50px; }
              .signature-box { width: 40%; border-top: 1px solid #000; text-align: center; padding-top: 5px; font-weight: bold; }
              @media print { .no-print { display: none; } }
            </style>
          </head>
          <body>${content.innerHTML}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-slate-700 text-white">
          <FileText className="h-4 w-4" /> Informe
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 bg-white text-black">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50 no-print">
          <div className="flex items-center gap-4">
             <h3 className="font-bold text-black">Vista Previa del Informe</h3>
             <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="border p-1 text-sm bg-white" />
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Printer className="h-4 w-4 mr-2" /> Imprimir / PDF
            </Button>
            <Button variant="ghost" onClick={() => setIsOpen(false)}><X className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 bg-slate-200">
          <div ref={printRef} className="bg-white p-10 mx-auto shadow-lg text-left" style={{ width: '210mm', minHeight: '297mm' }}>
            
            {/* CABECERA [cite: 1, 10] */}
            <div className="header-table">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 'bold' }}>REGISTRO DE JORNADA LABORAL</h1>
                  <p style={{ fontSize: '10px', margin: 0 }}>Conforme al Art. 34.9 del Estatuto de los Trabajadores</p>
                </div>
                <h2 style={{ fontSize: '18px', margin: 0 }}>{selectedMonth}</h2>
              </div>
            </div>

            {/* INFO EMPRESA Y TRABAJADOR [cite: 2, 3, 5, 6] */}
            <div className="info-grid">
              <div style={{ width: '50%' }}>
                <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#666', margin: 0 }}>EMPRESA</p>
                <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '2px 0' }}>OFIMATIC BAIX S.L.</p>
                <p style={{ fontSize: '11px', margin: 0 }}>NIF: B-65836512</p>
              </div>
              <div style={{ width: '50%' }}>
                <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#666', margin: 0 }}>TRABAJADOR/A</p>
                <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '2px 0', textTransform: 'uppercase' }}>{profile.full_name}</p>
                <p style={{ fontSize: '11px', margin: 0 }}>DNI/NIE: {profile.dni || '---'}</p>
                <p style={{ fontSize: '11px', margin: 0 }}>Puesto: {profile.position || '---'}</p>
              </div>
            </div>

            {/* TABLA DE REGISTROS [cite: 11] */}
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
                {reportData.map((day) => (
                  <tr key={day.date}>
                    <td>{new Date(day.date).toLocaleDateString('es-ES')}</td>
                    <td style={{ fontWeight: 'bold' }}>{day.dayName}</td>
                    <td>{day.firstEntry}</td>
                    <td>{day.lastExit}</td>
                    <td style={{ fontWeight: 'bold' }}>{day.ordinarias > 0 ? formatDecimalHours(day.ordinarias) : ''}</td>
                    <td style={{ color: '#666' }}>{day.extras > 0 ? formatDecimalHours(day.extras) : ''}</td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold' }}>
                  <td colSpan={4} style={{ textAlign: 'right', paddingRight: '10px' }}>TOTALES</td>
                  <td>{formatDecimalHours(reportData.reduce((acc, d) => acc + d.ordinarias, 0))}</td>
                  <td>{formatDecimalHours(totalExtras)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>

            <p style={{ fontSize: '9px', marginTop: '20px', color: '#444' }}>
              El trabajador/a declara haber recibido copia de este registro y estar conforme con las horas reflejadas[cite: 13].
            </p>

            {/* FIRMAS [cite: 14, 15] */}
            <div className="footer-signatures">
              <div className="signature-box">FIRMA DE LA EMPRESA</div>
              <div className="signature-box">FIRMA DEL TRABAJADOR/A</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

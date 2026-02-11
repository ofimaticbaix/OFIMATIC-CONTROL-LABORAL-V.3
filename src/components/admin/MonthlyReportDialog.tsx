import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, X, Calendar, Printer } from 'lucide-react';
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
              body { font-family: 'Helvetica', 'Arial', sans-serif; color: #000; line-height: 1.2; }
              .page-container { width: 100%; }
              .header-title { font-size: 18pt; font-weight: 900; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 5px; }
              .header-subtitle { font-size: 8pt; text-transform: uppercase; color: #333; margin-bottom: 25px; font-weight: bold; }
              .info-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 40px; border: 1px solid #000; padding: 15px; margin-bottom: 25px; }
              .info-label { font-size: 7pt; font-weight: 900; color: #666; text-transform: uppercase; margin-bottom: 2px; }
              .info-value { font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; }
              table { width: 100%; border-collapse: collapse; font-size: 9pt; }
              th, td { border: 1px solid #000; padding: 6px 4px; text-align: center; }
              th { background-color: #f3f3f3; font-weight: 900; text-transform: uppercase; font-size: 8pt; }
              .day-name { font-weight: bold; font-size: 8pt; }
              .time-val { font-family: 'Courier New', monospace; font-size: 10pt; }
              .total-row { background-color: #f3f3f3; font-weight: 900; }
              .footer-notice { font-size: 8pt; color: #444; margin-top: 20px; text-align: justify; }
              .signature-area { display: flex; justify-content: space-between; margin-top: 50px; }
              .sig-box { width: 42%; border-top: 1.5px solid #000; text-align: center; padding-top: 5px; font-size: 9pt; font-weight: bold; text-transform: uppercase; }
            </style>
          </head>
          <body>${content.innerHTML}</body>
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
        <Button variant="outline" size="sm" className="gap-2 border-slate-700 text-white hover:bg-slate-800">
          <FileText className="h-4 w-4" /> Informe
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl h-[92vh] flex flex-col p-0 bg-white overflow-hidden shadow-2xl">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50 sticky top-0 z-10">
          <div className="flex items-center gap-6">
             <h3 className="font-black text-slate-900 uppercase tracking-tighter">Vista Previa del Registro</h3>
             <div className="flex items-center gap-2 bg-white border rounded px-2 py-1">
                <Calendar className="h-4 w-4 text-slate-400" />
                <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="text-sm font-bold bg-transparent outline-none text-slate-900" />
             </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest px-6 h-9">
              <Printer className="h-3.5 w-3.5 mr-2" /> Imprimir / PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-900"><X className="h-5 w-5" /></Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-12 bg-slate-200/50">
          <div ref={printRef} className="bg-white p-[20mm] mx-auto shadow-sm print:shadow-none" style={{ width: '210mm', minHeight: '297mm' }}>
            
            <div className="header-title">REGISTRO DE JORNADA LABORAL</div>
            <div className="header-subtitle">Conforme al Art. 34.9 del Estatuto de los Trabajadores </div>

            <div className="info-grid">
              <div>
                <div className="info-label">Empresa</div>
                <div className="info-value">OFIMATIC BAIX S.L. [cite: 3]</div>
                <div className="info-label">NIF / CIF</div>
                <div className="info-value">B-65836512 [cite: 4]</div>
              </div>
              <div>
                <div className="info-label">Trabajador/a</div>
                <div className="info-value">{profile.full_name} [cite: 6]</div>
                <div className="info-label">DNI / NIE</div>
                <div className="info-value">{profile.dni || '---'} [cite: 7]</div>
                <div className="info-label">Mes de Registro</div>
                <div className="info-value">{selectedMonth} [cite: 10]</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th className="w-[15%]">Fecha</th>
                  <th className="w-[10%]">Día</th>
                  <th className="w-[15%]">Entrada</th>
                  <th className="w-[15%]">Salida</th>
                  <th className="w-[15%]">Ordinarias</th>
                  <th className="w-[15%]">Extras</th>
                  <th className="w-[15%]">Firma</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((day, i) => (
                  <tr key={i} className={day.dia === 'SÁB' || day.dia === 'DOM' ? 'bg-slate-50/50' : ''}>
                    <td className="time-val">{day.fecha} </td>
                    <td className="day-name">{day.dia} </td>
                    <td className="time-val">{day.entrada} </td>
                    <td className="time-val">{day.salida} </td>
                    <td className="font-bold text-slate-900">{formatDecimalToTime(day.ordinarias)} </td>
                    <td className="text-slate-400">{formatDecimalToTime(day.extras)} </td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td colSpan={4} className="text-right px-6 py-3 font-black">TOTALES MENSUALES</td>
                  <td className="text-slate-900 py-3">{formatDecimalToTime(totals.ordinarias)} [cite: 12]</td>
                  <td className="text-slate-900 py-3">{formatDecimalToTime(totals.extras)} [cite: 12]</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>

            <div className="footer-notice">
              El trabajador/a declara haber recibido copia de este registro y estar conforme con las horas reflejadas, declarando asimismo que ha disfrutado de los descansos diarios y semanales establecidos legalmente. [cite: 13]
            </div>

            <div className="signature-area">
              <div className="sig-box">Firma de la Empresa [cite: 14]</div>
              <div className="sig-box">Firma del Trabajador/a [cite: 15]</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

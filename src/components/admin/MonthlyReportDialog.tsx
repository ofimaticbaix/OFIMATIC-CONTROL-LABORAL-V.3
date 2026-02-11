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
    if (decimal <= 0) return "0h 00m";
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
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los registros.' });
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
        ordinarias: ordinarias > 0 ? formatDecimalToTime(ordinarias) : "",
        extras: extras > 0 ? formatDecimalToTime(extras) : ""
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
              body { font-family: sans-serif; padding: 20mm; color: #000; }
              .header { font-weight: bold; font-size: 14pt; margin-bottom: 10pt; }
              .sub-header { font-size: 9pt; color: #444; margin-bottom: 20pt; }
              .info-section { display: flex; justify-content: space-between; margin-bottom: 20pt; font-size: 10pt; }
              .info-block { width: 48%; }
              .label { font-weight: bold; color: #666; font-size: 8pt; text-transform: uppercase; }
              .value { font-weight: bold; font-size: 11pt; margin-bottom: 8pt; }
              table { width: 100%; border-collapse: collapse; font-size: 9pt; }
              th, td { border: 0.5pt solid #000; padding: 6pt; text-align: center; }
              th { background-color: #f2f2f2; font-weight: bold; }
              .footer { margin-top: 40pt; display: flex; justify-content: space-between; }
              .signature { width: 45%; border-top: 1px solid #000; text-align: center; padding-top: 5pt; font-size: 9pt; font-weight: bold; }
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
        <Button variant="outline" size="sm" className="gap-2 border-slate-700 text-white">
          <FileText className="h-4 w-4" /> Informe
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 bg-white text-black">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-4">
             <h3 className="font-bold text-black text-lg">Informe de Registro de Jornada</h3>
             <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="border p-1 text-sm bg-white" />
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
              <Printer className="h-4 w-4 mr-2" /> Imprimir / PDF
            </Button>
            <Button variant="ghost" onClick={() => setIsOpen(false)}><X className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 bg-slate-200">
          <div ref={printRef} className="bg-white p-16 mx-auto shadow-lg" style={{ width: '210mm', minHeight: '297mm' }}>
            
            <div className="header">REGISTRO DE JORNADA LABORAL</div>
            <div className="sub-header">Conforme al Art. 34.9 del Estatuto de los Trabajadores</div>

            <div className="info-section">
              <div className="info-block">
                <div className="label">EMPRESA</div>
                <div className="value">OFIMATIC BAIX S.L.</div>
                <div className="label">NIF</div>
                <div className="value">B-65836512</div>
              </div>
              <div className="info-block">
                <div className="label">TRABAJADOR/A</div>
                <div className="value" style={{ textTransform: 'uppercase' }}>{profile.full_name}</div>
                <div className="label">DNI/NIE: {profile.dni || '---'}</div>
                <div className="value" style={{ fontSize: '10pt', marginTop: '4pt' }}>Puesto: {profile.position || '---'}</div>
                <div className="label">Periodo: {selectedMonth}</div>
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
                  <th style={{ width: '70px' }}>Firma</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((day, i) => (
                  <tr key={i}>
                    <td>{day.fecha}</td>
                    <td style={{ fontWeight: 'bold' }}>{day.dia}</td>
                    <td>{day.entrada}</td>
                    <td>{day.salida}</td>
                    <td style={{ fontWeight: 'bold' }}>{day.ordinarias}</td>
                    <td style={{ color: '#444' }}>{day.extras}</td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#f2f2f2', fontWeight: 'bold' }}>
                  <td colSpan={4} style={{ textAlign: 'right', paddingRight: '15px' }}>TOTALES</td>
                  <td>{formatDecimalToTime(totals.ordinarias)}</td>
                  <td>{formatDecimalToTime(totals.extras)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>

            <div style={{ fontSize: '8pt', marginTop: '20pt', color: '#444', textAlign: 'justify' }}>
              El trabajador/a declara haber recibido copia de este registro y estar conforme con las horas reflejadas[cite: 13].
            </div>

            <div className="footer">
              <div className="signature">FIRMA DE LA EMPRESA [cite: 14]</div>
              <div className="signature">FIRMA DEL TRABAJADOR/A [cite: 15]</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

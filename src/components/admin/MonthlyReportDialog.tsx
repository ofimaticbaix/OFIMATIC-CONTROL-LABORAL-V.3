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
  const [totalOrdinary, setTotalOrdinary] = useState(0);
  const [totalExtras, setTotalExtras] = useState(0);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && profile.id) {
      generateReport();
    }
  }, [isOpen, selectedMonth, profile]);

  const formatDecimalHours = (decimal: number) => {
    if (decimal === 0) return '';
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
    let accOrdinary = 0;
    let accExtras = 0;

    // Determinar jornada contratada
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

      const dateObj = new Date(parseInt(year), parseInt(month) - 1, day);
      const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase();
      
      const ordinarias = dayTotalHours > 0 ? Math.min(dayTotalHours, contractHours) : 0;
      const extras = dayTotalHours > contractHours ? dayTotalHours - contractHours : 0;

      processedDays.push({
        date: currentDayStr,
        dayName,
        firstEntry,
        lastExit,
        ordinarias,
        extras
      });

      accOrdinary += ordinarias;
      accExtras += extras;
    }

    setReportData(processedDays);
    setTotalOrdinary(accOrdinary);
    setTotalExtras(accExtras);
    setLoading(false);
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Registro Jornada - ${profile.full_name}</title>
            <style>
              @page { 
                size: A4; 
                margin: 15mm; 
              }
              * { 
                margin: 0; 
                padding: 0; 
                box-sizing: border-box; 
              }
              body { 
                font-family: Arial, Helvetica, sans-serif;
                font-size: 10pt;
                color: #000;
                background: white;
              }
              .report-container {
                width: 100%;
                max-width: 210mm;
                margin: 0 auto;
                background: white;
              }
              .header {
                border-bottom: 2px solid #000;
                padding-bottom: 8px;
                margin-bottom: 15px;
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
              }
              .header h1 {
                font-size: 14pt;
                font-weight: bold;
                margin: 0;
                text-transform: uppercase;
              }
              .header .subtitle {
                font-size: 8pt;
                color: #666;
                margin-top: 2px;
              }
              .header .month {
                font-size: 16pt;
                font-weight: bold;
              }
              .info-box {
                border: 1px solid #000;
                padding: 10px;
                margin-bottom: 15px;
                display: flex;
                justify-content: space-between;
              }
              .info-section {
                width: 48%;
              }
              .info-label {
                font-size: 8pt;
                color: #666;
                font-weight: bold;
                text-transform: uppercase;
                margin-bottom: 3px;
              }
              .info-value {
                font-size: 11pt;
                font-weight: bold;
                margin-bottom: 2px;
              }
              .info-detail {
                font-size: 9pt;
                margin-bottom: 1px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                font-size: 9pt;
              }
              th {
                background-color: #f0f0f0;
                border: 1px solid #000;
                padding: 6px 4px;
                text-align: center;
                font-weight: bold;
                font-size: 9pt;
              }
              td {
                border: 1px solid #000;
                padding: 4px;
                text-align: center;
                font-size: 9pt;
              }
              tfoot td {
                background-color: #f0f0f0;
                font-weight: bold;
                font-size: 10pt;
              }
              .legal-text {
                margin-top: 20px;
                font-size: 8pt;
                color: #444;
                line-height: 1.4;
              }
              .signatures {
                margin-top: 50px;
                display: flex;
                justify-content: space-between;
                page-break-inside: avoid;
              }
              .signature-box {
                width: 45%;
                text-align: center;
              }
              .signature-line {
                border-top: 1px solid #000;
                padding-top: 8px;
                font-weight: bold;
                font-size: 9pt;
                text-transform: uppercase;
              }
              @media print {
                .no-print { display: none !important; }
                body { background: white; }
                .report-container { 
                  width: 100%;
                  max-width: none;
                }
              }
            </style>
          </head>
          <body>
            ${content.innerHTML}
          </body>
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

  // Formatear mes-año para el título
  const getMonthYearTitle = () => {
    const [year, month] = selectedMonth.split('-');
    return `${year}-${month}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-slate-700 text-white hover:bg-slate-800">
          <FileText className="h-4 w-4" /> Informe
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-5xl h-[95vh] flex flex-col p-0 bg-slate-900 border-slate-800">
        {/* BARRA SUPERIOR - NO SE IMPRIME */}
        <div className="no-print p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-white text-lg">Vista Previa del Informe</h3>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)} 
                className="border border-slate-700 bg-slate-900 text-white rounded px-3 py-1 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Printer className="h-4 w-4" /> Imprimir / PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ÁREA DE SCROLL CON VISTA PREVIA */}
        <div className="flex-1 overflow-auto bg-slate-800 p-8">
          <div 
            ref={printRef} 
            className="report-container bg-white shadow-2xl mx-auto"
            style={{ 
              width: '210mm', 
              minHeight: '297mm',
              padding: '20mm'
            }}
          >
            {/* CABECERA */}
            <div className="header">
              <div>
                <h1>REGISTRO DE JORNADA LABORAL</h1>
                <div className="subtitle">Conforme al Art. 34.9 del Estatuto de los Trabajadores</div>
              </div>
              <div className="month">{getMonthYearTitle()}</div>
            </div>

            {/* INFO EMPRESA Y TRABAJADOR */}
            <div className="info-box">
              <div className="info-section">
                <div className="info-label">Empresa</div>
                <div className="info-value">OFIMATIC BAIX S.L.</div>
                <div className="info-detail">NIF: B-65836512</div>
              </div>
              <div className="info-section">
                <div className="info-label">Trabajador/a</div>
                <div className="info-value" style={{ textTransform: 'uppercase' }}>
                  {profile.full_name}
                </div>
                <div className="info-detail">DNI/NIE: {profile.dni || '---'}</div>
                <div className="info-detail">Puesto: {profile.position || '---'}</div>
                {profile.work_schedule ? (
                  <div className="info-detail">Jornada: Según Cuadrante</div>
                ) : (
                  <div className="info-detail">Jornada: {profile.daily_hours || 8}h/día</div>
                )}
              </div>
            </div>

            {/* TABLA DE REGISTROS */}
            <table>
              <thead>
                <tr>
                  <th style={{ width: '12%' }}>Fecha</th>
                  <th style={{ width: '8%' }}>Día</th>
                  <th style={{ width: '12%' }}>Entrada</th>
                  <th style={{ width: '12%' }}>Salida</th>
                  <th style={{ width: '15%' }}>Ordinarias</th>
                  <th style={{ width: '15%' }}>Extras</th>
                  <th style={{ width: '16%' }}>Firma</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                      Generando informe...
                    </td>
                  </tr>
                ) : (
                  reportData.map((day) => (
                    <tr key={day.date}>
                      <td>{new Date(day.date + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                      <td style={{ fontWeight: 'bold' }}>{day.dayName}</td>
                      <td>{day.firstEntry}</td>
                      <td>{day.lastExit}</td>
                      <td style={{ fontWeight: 'bold' }}>{formatDecimalHours(day.ordinarias)}</td>
                      <td style={{ color: '#666' }}>{formatDecimalHours(day.extras)}</td>
                      <td></td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} style={{ textAlign: 'right', paddingRight: '10px' }}>
                    TOTALES
                  </td>
                  <td>{formatDecimalHours(totalOrdinary)}</td>
                  <td>{formatDecimalHours(totalExtras)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>

            {/* TEXTO LEGAL */}
            <div className="legal-text">
              El trabajador/a declara haber recibido copia de este registro y estar conforme con las horas reflejadas.
            </div>

            {/* FIRMAS */}
            <div className="signatures">
              <div className="signature-box">
                <div className="signature-line">FIRMA DE LA EMPRESA</div>
              </div>
              <div className="signature-box">
                <div className="signature-line">FIRMA DEL TRABAJADOR/A</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

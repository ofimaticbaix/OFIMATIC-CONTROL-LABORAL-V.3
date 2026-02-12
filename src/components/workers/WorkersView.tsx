// ... (mismas importaciones de antes)

export const WorkersView = () => {
  // ... (mismo estado y lógica de carga de datos)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black uppercase italic text-foreground tracking-tighter">Gestión de Trabajadores</h2>
        <Button onClick={() => handleOpenDialog()} className="bg-primary text-primary-foreground font-bold uppercase text-[10px] px-6">
          <Plus className="h-4 w-4 mr-2" /> Nuevo Alta
        </Button>
      </div>

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] h-12">Nombre</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] h-12">PIN de Acceso</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] h-12">Puesto / Jornada</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase text-[10px] h-12 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((p, index) => {
              const pin = workerCredentials.find(c => c.user_id === p.id)?.access_code || '----';
              return (
                <TableRow 
                  key={p.id} 
                  className="transition-colors border-b last:border-0 hover:bg-muted/30 animate-in fade-in slide-in-from-left-2"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <TableCell className="font-bold text-foreground py-5">{p.full_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md border w-fit">
                      <span className="font-mono font-bold text-primary text-sm">{visibleCodes[p.id] ? pin : '••••'}</span>
                      <button onClick={() => setVisibleCodes(prev => ({...prev, [p.id]: !prev[p.id]}))} className="text-muted-foreground hover:text-foreground transition-colors">
                        {visibleCodes[p.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-[10px] font-bold uppercase space-y-0.5 text-foreground">
                      <p className="opacity-80">{p.position || '---'}</p>
                      <p className="text-muted-foreground font-medium">{p.work_day_type === 'Estándar' ? `⏱️ ${p.daily_hours}h diarias` : '📅 Personalizada'}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-3 items-center">
                      {/* BOTÓN INFORME: Forzamos fondo azul y texto blanco para evitar invisibilidad en light mode */}
                      <div className="bg-blue-600 text-white rounded-md px-4 py-2 text-xs font-bold shadow-sm hover:bg-blue-700 transition-colors">
                        <MonthlyReportDialog profile={p} />
                      </div>

                      {/* Botón Editar adaptativo pero siempre visible */}
                      <button 
                        onClick={() => handleOpenDialog(p)} 
                        className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-muted transition-all"
                        title="Editar trabajador"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* ...resto del componente (Dialog de edición) */}
    </div>
  );
};

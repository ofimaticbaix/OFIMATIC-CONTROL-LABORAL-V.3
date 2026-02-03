import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

export const SettingsView = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Ajustes</h2>
        <p className="text-muted-foreground">
          Configuración general de la aplicación
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Fichajes</CardTitle>
            <CardDescription>
              Configuración del sistema de control de presencia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Geolocalización obligatoria</Label>
                <p className="text-sm text-muted-foreground">
                  Requiere ubicación GPS al fichar
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Trabajo remoto permitido</Label>
                <p className="text-sm text-muted-foreground">
                  Permite fichajes desde fuera de la oficina
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notificaciones</CardTitle>
            <CardDescription>
              Configuración de alertas y avisos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Recordatorio de fichaje</Label>
                <p className="text-sm text-muted-foreground">
                  Aviso si no se ha fichado entrada
                </p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Alertas de incidencias</Label>
                <p className="text-sm text-muted-foreground">
                  Notificar al admin sobre nuevas incidencias
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seguridad</CardTitle>
            <CardDescription>
              Configuración de acceso y privacidad
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Registro de auditoría</Label>
                <p className="text-sm text-muted-foreground">
                  Registrar todos los accesos y cambios
                </p>
              </div>
              <Switch defaultChecked disabled />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Bloqueo tras intentos fallidos</Label>
                <p className="text-sm text-muted-foreground">
                  Bloquear cuenta tras 5 intentos incorrectos
                </p>
              </div>
              <Switch defaultChecked disabled />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información legal</CardTitle>
            <CardDescription>
              Cumplimiento normativo RD-ley 8/2019
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Los registros de jornada se conservan durante 4 años</p>
              <p>• Los datos se procesan conforme al RGPD</p>
              <p>• Se garantiza la inmutabilidad de los registros</p>
              <p>• El sistema cumple con la normativa de control horario</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

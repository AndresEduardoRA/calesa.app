import { leerPoliticaDeLaCola, leerSinAsignar, leerTableroDeLaCola } from '@/modules/web'
import {
  AvisosDeLaPolitica,
  ErrorDeLectura,
  RuedaDeLaCola,
  SinAsignar,
} from '@/modules/web/pantallas/cola'
import { puede, type Permisos } from '@/shared/lib/permisos'

// El cuerpo de Configuración › Cola web (8.04-2): tres lecturas en paralelo —la política, la primera página de «Sin asignar» y el tablero— y cada parte
// con su error si no llegó, sin tapar las otras. «Actualizar» y volver a la pestaña repiten las tres (`router.refresh()`).
export async function TableroDeLaCola({ permisos }: { permisos: Permisos }) {
  const [politica, sinAsignar, tablero] = await Promise.all([
    leerPoliticaDeLaCola(),
    leerSinAsignar(null),
    leerTableroDeLaCola(),
  ])
  return (
    <div className="grid gap-6">
      {politica.ok ? (
        <AvisosDeLaPolitica
          politica={politica.data}
          puedeEditarElSitio={puede(permisos, 'web.ajustes.gestionar')}
        />
      ) : (
        <ErrorDeLectura
          titulo="No pudimos leer la política de la cola"
          mensaje={politica.error.mensaje}
        />
      )}
      {sinAsignar.ok ? (
        <SinAsignar primera={sinAsignar.data} />
      ) : (
        <ErrorDeLectura
          titulo="No pudimos leer las solicitudes sin asignar"
          mensaje={sinAsignar.error.mensaje}
        />
      )}
      {tablero.ok ? (
        <RuedaDeLaCola
          tablero={tablero.data}
          puedeVerRoles={
            puede(permisos, 'equipo.roles.ver') || puede(permisos, 'equipo.roles.gestionar')
          }
        />
      ) : (
        <ErrorDeLectura titulo="No pudimos leer la rueda" mensaje={tablero.error.mensaje} />
      )}
    </div>
  )
}

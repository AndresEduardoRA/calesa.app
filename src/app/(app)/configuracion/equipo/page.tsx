import type { Metadata } from 'next'
import {
  filtroDelEquipoDesde,
  idDePersona,
  leerEquipo,
  leerMatriz,
  leerPersona,
  leerSoloYo,
  leerVistaPreviaDeBaja,
  puede,
  requerirSesion,
} from '@/modules/equipo'
import { ListaEquipo } from '@/modules/equipo/pantallas/equipo'
import { datosO } from '@/shared/lib/errores'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'

export const metadata: Metadata = { title: 'Equipo' }

// Las personas del equipo. Verlas pide `equipo.usuarios.ver`; invitar, cambiar roles, bloquear y
// dar de baja, `equipo.usuarios.gestionar` (y la base lo vuelve a comprobar en cada RPC).
export default async function PaginaEquipo({ searchParams }: PageProps<'/configuracion/equipo'>) {
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  const puedeGestionar = puede(sesion.permisos, 'equipo.usuarios.gestionar')
  if (!puedeGestionar && !puede(sesion.permisos, 'equipo.usuarios.ver')) {
    return <EstadoSinPermiso />
  }
  // El texto y el estado se resuelven en la base (`?q=&estado=`): la página trae las primeras personas por nombre que los cumplen, no el equipo entero.
  const filtro = filtroDelEquipoDesde({
    q: unParametro(parametros['q']),
    estado: unParametro(parametros['estado']),
  })
  // El panel de roles y el diálogo de baja tienen su URL: la persona se lee por su id aunque no esté en la página, y cuántos leads irían al limbo se
  // cuenta acá, antes de que el botón de confirmar exista.
  const baja = puedeGestionar ? idDePersona(unParametro(parametros['baja'])) : null
  const delPanel = puedeGestionar ? idDePersona(unParametro(parametros['persona'])) : null
  const [equipo, matriz, soloYo, vistaPrevia, personaDeLaBaja, personaDelPanel] = await Promise.all(
    [
      leerEquipo(filtro),
      leerMatriz(),
      leerSoloYo(),
      baja ? leerVistaPreviaDeBaja(baja) : null,
      baja ? leerPersona(baja) : null,
      delPanel ? leerPersona(delPanel) : null,
    ],
  )
  const { personas, hayMas } = datosO(equipo)
  return (
    <ListaEquipo
      personas={personas}
      hayMas={hayMas}
      soloYo={datosO(soloYo)}
      personaDelPanel={personaDelPanel ? datosO(personaDelPanel) : null}
      personaDeLaBaja={personaDeLaBaja ? datosO(personaDeLaBaja) : null}
      roles={datosO(matriz).roles}
      misPermisos={sesion.permisos}
      yoId={sesion.usuarioId}
      puedeGestionar={puedeGestionar}
      vistaPreviaDeBaja={baja && vistaPrevia ? { personaId: baja, ...datosO(vistaPrevia) } : null}
    />
  )
}

import { EstadoVacio } from '@/shared/ui/estados'
import {
  CLASES_DE_AGENDA,
  entradasDeAgenda,
  type AgendaDeRango,
  type ClaveDeClase,
} from '../../../entities/agenda'
import { tituloDelRango, type Vista } from '../../../entities/calendario'
import { enlaceDeDia, extraDeEnlaces } from '../enlace-de-dia'
import { TareasSinFecha } from '../../tareas/components/tareas-sin-fecha'
import { enlaceDePanel } from '../enlace-de-panel'
import { AvisosDeTopeDelCalendario } from './avisos-de-tope-del-calendario'
import { BarraDelCalendario } from './barra-del-calendario'
import { VistaDeDia } from './vista-de-dia'
import { VistaDeMes } from './vista-de-mes'
import { VistaDeSemana } from './vista-de-semana'

type Props = {
  agenda: AgendaDeRango
  vista: Vista
  // El día que ancla la vista, `YYYY-MM-DD`, y el de hoy: ambos en la zona de la empresa (nunca un `Date`).
  fecha: string
  hoy: string
  zona: string
  clases: readonly ClaveDeClase[]
  puedeVerTodo: boolean
  deTodos: boolean
}

// El calendario de la agenda: barra, la vista elegida, al pie los avisos de tope y, si se ven las tareas, «Tareas sin fecha». Un Server Component: la barra y las vistas son las islas de cliente.
export function CalendarioDeAgenda({
  agenda,
  vista,
  fecha,
  hoy,
  zona,
  clases,
  puedeVerTodo,
  deTodos,
}: Props) {
  const extra = extraDeEnlaces(clases, deTodos)
  // El evento, la tarea y el recordatorio abren su panel en esta misma vista y fecha (la subasta lleva a su vehículo).
  const entradas = entradasDeAgenda(agenda, clases, (clave, id) =>
    clave === 'subasta' ? null : enlaceDePanel({ vista, fecha, extra }, clave, id),
  )
  const hayMas = clases.some((clave) => agenda.hayMas[clave])
  const hayAlgo =
    entradasDeAgenda(
      agenda,
      CLASES_DE_AGENDA.map((clase) => clase.clave),
    ).length > 0
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <BarraDelCalendario
        vista={vista}
        fecha={fecha}
        titulo={tituloDelRango(vista, fecha)}
        clases={clases}
        puedeVerTodo={puedeVerTodo}
        deTodos={deTodos}
      />
      {entradas.length === 0 ? (
        <EstadoVacio
          titulo="Nada agendado en este rango."
          descripcion={
            hayAlgo
              ? 'Ninguna clase seleccionada tiene cosas en este rango.'
              : 'Cambia la vista o las clases del filtro.'
          }
        />
      ) : vista === 'mes' ? (
        <VistaDeMes
          fecha={fecha}
          entradas={entradas}
          zona={zona}
          hoy={hoy}
          hayMas={hayMas}
          extra={extra}
        />
      ) : vista === 'semana' ? (
        <VistaDeSemana
          fecha={fecha}
          entradas={entradas}
          zona={zona}
          hoy={hoy}
          hayMas={hayMas}
          extra={extra}
        />
      ) : (
        <VistaDeDia fecha={fecha} entradas={entradas} zona={zona} hoy={hoy} />
      )}
      <AvisosDeTopeDelCalendario
        hayMas={agenda.hayMas}
        clases={clases}
        enlaceDelDia={vista === 'dia' ? null : enlaceDeDia(extra, fecha)}
      />
      {clases.includes('tarea') ? <TareasSinFecha base={{ vista, fecha, extra }} /> : null}
    </div>
  )
}

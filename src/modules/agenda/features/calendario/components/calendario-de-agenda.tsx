import type { Route } from 'next'
import Link from 'next/link'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { EstadoVacio } from '@/shared/ui/estados'
import {
  CLASES_DE_AGENDA,
  claseDe,
  entradasDeAgenda,
  type AgendaDeRango,
  type ClaveDeClase,
} from '../../../entities/agenda'
import { tituloDelRango, type Vista } from '../../../entities/calendario'
import { enlaceDeDia } from '../enlace-de-dia'
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

// Lo que ya eligió la persona y un enlace a otro día debe conservar (`?ver=`, `?de=`); la vista y la fecha las pone el enlace.
function extraDeEnlaces(clases: readonly ClaveDeClase[], deTodos: boolean): string {
  const partes: string[] = []
  if (clases.length < CLASES_DE_AGENDA.length) {
    partes.push(`ver=${clases.join(',')}`)
  }
  if (deTodos) {
    partes.push('de=todos')
  }
  return partes.join('&')
}

// El calendario de la agenda: barra, la vista elegida y, al pie, los avisos de tope. Un Server Component: la barra y las vistas son las islas de cliente.
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
  const entradas = entradasDeAgenda(agenda, clases)
  const extra = extraDeEnlaces(clases, deTodos)
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
      {clases
        .filter((clave) => agenda.hayMas[clave])
        .map((clave) => (
          <AvisoDeTope
            key={clave}
            texto={`Hay más ${claseDe(clave).plural} de las que se muestran. Acorta el rango o quita clases del filtro.`}
            camino={
              vista === 'dia' ? undefined : (
                <Link href={enlaceDeDia(extra, fecha) as Route} className="underline">
                  Ver el día
                </Link>
              )
            }
          />
        ))}
    </div>
  )
}

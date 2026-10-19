'use client'

import { PlusIcon, TargetIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import type { Embudo } from '../../../entities/embudo'
import { CLAVE_DE_SECCION } from '../../../entities/ficha'
import {
  CLAVE_DE_TODAS_LAS_OPORTUNIDADES,
  OPORTUNIDADES_VISIBLES_DEL_LEAD,
  TOPE_DE_OPORTUNIDADES_DEL_LEAD,
  type OportunidadDelLead,
} from '../../../entities/oportunidad'
import { RefrescarAlVolver } from '../../ficha/components/refrescar-al-volver'
import { useOportunidades } from '../hooks/use-oportunidades'
import { usePanelDeMovida } from '../hooks/use-panel-de-movida'
import { usePanelDeOportunidad } from '../hooks/use-panel-de-oportunidad'
import { ItemDeOportunidad } from './item-de-oportunidad'
import { MovidaDeLaFicha } from './movida-de-la-ficha'
import { PanelDeOportunidad } from './panel-de-oportunidad'

// El pie de la lista: lo que se ve y el camino a lo demás. Con más de 10 se muestran las 10 más recientes y «Ver todas» trae las que la
// lectura entrega (hasta 100: el aviso de siempre, sin camino más allá). Es un enlace con su URL (`?todas=1`): «atrás» vuelve a las 10.
function PieDeOportunidades({
  leadId,
  cantidad,
  recortada,
  todas,
  hayMas,
}: {
  leadId: string
  cantidad: number
  recortada: boolean
  todas: boolean
  hayMas: boolean
}) {
  const enlace = (texto: string, conTodas: boolean) => (
    <Link
      href={hrefDeLaSeccion(leadId, conTodas)}
      className="inline-flex min-h-11 items-center text-(--color-primario) underline underline-offset-2 md:min-h-8"
    >
      {texto}
    </Link>
  )
  if (recortada) {
    return (
      <AvisoDeTope
        texto={`Mostrando las ${String(OPORTUNIDADES_VISIBLES_DEL_LEAD)} más recientes, las abiertas primero.`}
        camino={enlace('Ver todas', true)}
      />
    )
  }
  if (todas && cantidad > OPORTUNIDADES_VISIBLES_DEL_LEAD) {
    return (
      <AvisoDeTope
        texto={
          hayMas
            ? `Mostrando las ${String(TOPE_DE_OPORTUNIDADES_DEL_LEAD)} más recientes, las abiertas primero.`
            : `Mostrando las ${String(cantidad)}, las abiertas primero.`
        }
        camino={enlace(
          `Ver sólo las ${String(OPORTUNIDADES_VISIBLES_DEL_LEAD)} más recientes`,
          false,
        )}
      />
    )
  }
  return null
}

const hrefDeLaSeccion = (leadId: string, conTodas: boolean) =>
  `${RUTAS.leads}/${leadId}?${CLAVE_DE_SECCION}=oportunidades${conTodas ? `&${CLAVE_DE_TODAS_LAS_OPORTUNIDADES}=1` : ''}` as Route

// Con un panel o un modal abierto la sección no se vuelve a leer sola (reiniciaría lo escrito).
const hayPanelAbierto = (nueva: boolean, editando: unknown, movida: boolean) =>
  nueva || editando !== null || movida

type Props = {
  leadId: string
  inicial: readonly OportunidadDelLead[]
  embudos: readonly Embudo[]
  // Cartera y `leads.editar` (lo dice la base).
  puedoCrear: boolean
  // Tiene más de las 100 que trae la lectura.
  hayMas: boolean
  // Quedaron afuera algunas de las que trajo la lectura: se muestran las 10 más recientes y «Ver todas» trae el resto.
  recortada: boolean
  // Está en «Ver todas» (`?todas=1`).
  todas: boolean
}

// La sección «Oportunidades»: las de quien mira sobre el lead (abiertas primero) y «Nueva oportunidad».
export function OportunidadesDelLead(props: Props) {
  const { leadId, inicial, embudos, puedoCrear } = props
  const panel = usePanelDeOportunidad()
  const movida = usePanelDeMovida()
  const { lista, moverA, quitar, ocupada } = useOportunidades(inicial)
  const editando = panel.editando ? (lista.find((o) => o.id === panel.editando) ?? null) : null
  const nueva = puedoCrear ? (
    <Button className="min-h-11 md:min-h-8" onClick={panel.abrirNueva}>
      <PlusIcon aria-hidden className="size-4" />
      Nueva oportunidad
    </Button>
  ) : null
  return (
    <section aria-labelledby="titulo-oportunidades" className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="titulo-oportunidades" className="text-(length:--text-lg) font-medium">
          Tus oportunidades
        </h2>
        {lista.length > 0 ? nueva : null}
      </div>
      {lista.length === 0 ? (
        <EstadoVacio
          Icono={TargetIcon}
          titulo="Todavía no tienes oportunidades con este lead"
          descripcion="Una oportunidad es un negocio que sigues en tu embudo. Sólo tú la ves."
          accion={nueva}
        />
      ) : (
        <ul className="grid gap-3">
          {lista.map((o) => (
            <li key={o.id}>
              <ItemDeOportunidad
                oportunidad={o}
                etapas={embudos.find((e) => e.id === o.embudoId)?.etapas ?? []}
                nombrarEmbudo={embudos.length > 1}
                puedeEditar={puedoCrear}
                ocupada={ocupada === o.id}
                alMover={(etapa, motivo) => moverA(o, etapa, motivo)}
                alPedirMotivo={(etapa) => {
                  movida.pedir(o, etapa)
                }}
                alEditar={() => {
                  panel.abrirEdicion(o.id)
                }}
                alEliminar={() => void quitar(o)}
              />
            </li>
          ))}
        </ul>
      )}
      <PieDeOportunidades
        leadId={leadId}
        cantidad={lista.length}
        recortada={props.recortada}
        todas={props.todas}
        hayMas={props.hayMas}
      />
      {puedoCrear && (panel.nueva || editando) ? (
        <PanelDeOportunidad
          key={editando?.actualizadoEn ?? 'nueva'}
          leadId={leadId}
          oportunidad={editando}
          embudos={embudos}
          alCerrar={panel.cerrar}
        />
      ) : null}
      <MovidaDeLaFicha
        activa={puedoCrear}
        panel={movida}
        lista={lista}
        embudos={embudos}
        moverA={moverA}
      />
      <RefrescarAlVolver activo={!hayPanelAbierto(panel.nueva, editando, movida.abierto)} />
    </section>
  )
}

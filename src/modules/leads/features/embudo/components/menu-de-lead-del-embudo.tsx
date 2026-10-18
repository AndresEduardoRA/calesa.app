'use client'

import { createContext, use, useState, type ReactNode } from 'react'
import { leerLeadRapido } from '../../../composicion.client'
import type { AccionDeFila } from '../../../entities/acciones-de-fila'
import { MENSAJE_DE_LEAD_NO_DISPONIBLE } from '../../../entities/ficha'
import type { FilaDeLead } from '../../../entities/listado'
import { SIN_MARCAS } from '../../../entities/marcas'
import { puedeEnviarConAlcance } from '../../../entities/papelera'
import type { LeadDeTarjeta } from '../../../entities/tablero'
import type { Etiquetas } from '../../etiquetas/hooks/use-etiquetas'
import { useEtiquetas } from '../../etiquetas/hooks/use-etiquetas'
import { usePanelDeEtiquetas } from '../../etiquetas/hooks/use-panel-de-etiquetas'
import { useAccionDeFila } from '../../listado/hooks/use-accion-de-fila'
import { MenuDeLead } from '../../marcas/components/menu-de-lead'
import type { ParaElMenuDelEmbudo } from '../lecturas'

// Lo que toda tarjeta del kanban necesita para su «⋯»: lo mismo que la fila del listado (las etiquetas de quien mira, «Gestionar» y abrir el
// modal de anotar o agendar) más lo que decide quién puede qué, que llega del servidor. Se arma una vez en la vista del embudo.
export type ValorDelMenuDelEmbudo = Pick<
  ParaElMenuDelEmbudo,
  'editar' | 'eliminar' | 'usuarioId'
> & {
  etiquetas: Etiquetas
  alGestionar: () => void
  alAccion: (accion: AccionDeFila, leadId: string) => void
  // Un lead leído al abrir su «⋯»: el modal de anotar o agendar lo busca ahí (el kanban no tiene la fila de la página).
  alLeer: (fila: FilaDeLead) => void
}

// Lo que la vista del embudo monta una vez para todos los «⋯» de sus tarjetas: la lista de etiquetas (con crear), «Gestionar», el modal de
// anotar o agendar (`?panel=…&para=<id>`, el de la fila del listado) y los leads que las tarjetas fueron leyendo, que ese modal busca.
export function useMenuDelEmbudo(para: ParaElMenuDelEmbudo) {
  const etiquetas = useEtiquetas(para.etiquetas)
  const gestionar = usePanelDeEtiquetas()
  const accionDeFila = useAccionDeFila()
  const [leidos, setLeidos] = useState<readonly FilaDeLead[]>([])
  const valor: ValorDelMenuDelEmbudo = {
    etiquetas,
    alGestionar: gestionar.abrir,
    editar: para.editar,
    eliminar: para.eliminar,
    usuarioId: para.usuarioId,
    alAccion: accionDeFila.abrir,
    alLeer: (fila) => {
      setLeidos((antes) => [...antes.filter((uno) => uno.id !== fila.id), fila])
    },
  }
  // Con un panel abierto la vista no se relee sola (reiniciaría lo escrito).
  return { valor, etiquetas, leidos, hayPanel: gestionar.abierto || accionDeFila.accion !== null }
}

const ContextoDelMenu = createContext<ValorDelMenuDelEmbudo | null>(null)

export function ProveedorDelMenuDelEmbudo({
  valor,
  children,
}: {
  valor: ValorDelMenuDelEmbudo
  children: ReactNode
}) {
  return <ContextoDelMenu value={valor}>{children}</ContextoDelMenu>
}

type Lectura =
  | { tipo: 'sin_pedir' }
  | { tipo: 'leyendo' }
  | { tipo: 'listo'; fila: FilaDeLead }
  | { tipo: 'no_disponible' }
  | { tipo: 'fallo' }

const MENSAJE_DE_FALLO = 'No se pudo cargar. Cierra el menú y vuelve a abrirlo.'

// El «⋯» del lead de una tarjeta del kanban, con la lista de siempre. La tarjeta no trae las marcas ni la cartera del lead, y leerlos de cada
// tarjeta sería una consulta por tarjeta: se lee uno (`leads_vista` por su id, un pedido) al abrir el menú. Mientras llega dice «Cargando…»;
// si el lead ya no se ve o no se pudo leer, lo dice en el menú. Lo ya leído se muestra enseguida al abrir otra vez, y se vuelve a leer.
export function MenuDeLeadDeLaTarjeta({ lead }: { lead: LeadDeTarjeta }) {
  const menu = use(ContextoDelMenu)
  const [lectura, setLectura] = useState<Lectura>({ tipo: 'sin_pedir' })
  if (menu === null) {
    return null
  }
  const fila = lectura.tipo === 'listo' ? lectura.fila : null

  async function leer() {
    setLectura((anterior) => (anterior.tipo === 'listo' ? anterior : { tipo: 'leyendo' }))
    try {
      const leido = await leerLeadRapido(lead.id)
      if (!leido.ok) {
        setLectura((anterior) => (anterior.tipo === 'listo' ? anterior : { tipo: 'fallo' }))
      } else if (leido.data === null) {
        setLectura({ tipo: 'no_disponible' })
      } else {
        menu?.alLeer(leido.data)
        setLectura({ tipo: 'listo', fila: leido.data })
      }
    } catch {
      setLectura((anterior) => (anterior.tipo === 'listo' ? anterior : { tipo: 'fallo' }))
    }
  }

  const aviso =
    lectura.tipo === 'no_disponible'
      ? MENSAJE_DE_LEAD_NO_DISPONIBLE
      : lectura.tipo === 'fallo'
        ? MENSAJE_DE_FALLO
        : null
  return (
    <MenuDeLead
      leadId={lead.id}
      nombre={lead.nombre}
      marcas={fila?.marcas ?? SIN_MARCAS}
      etiquetas={menu.etiquetas}
      alGestionar={menu.alGestionar}
      puedeEnviar={
        fila ? puedeEnviarConAlcance(menu.eliminar, fila.duenoId, menu.usuarioId) : false
      }
      acciones={
        fila && menu.editar && fila.enCartera
          ? {
              alAnotar: () => {
                menu.alAccion('anotar', lead.id)
              },
              alAgendar: () => {
                menu.alAccion('agendar', lead.id)
              },
            }
          : undefined
      }
      alAbrir={() => void leer()}
      carga={fila ? undefined : { cargando: aviso === null, aviso }}
    />
  )
}

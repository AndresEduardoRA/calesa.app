'use client'

import type { AccionDeMenu } from '@/shared/ui/lista'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import type { FilaDeStock } from '../../../entities/stock/listado'
import { TEXTO_DEL_MOTIVO } from '../../../entities/stock/motivos'
import { MENSAJE_YA_NO_ESTA_EN_STOCK } from '../../../entities/stock/vista'
import type {
  AccionesDeStockPorUrl,
  PanelDeStockPorUrl,
} from '../hooks/use-acciones-de-stock-por-url'
import type { MotivoDeSalida } from '../hooks/use-salida-de-stock'
import { DrawerDeReasignarDiferido, DrawerDeSalidaDiferido } from './diferidos'
import type { CampoDeProyectoDestino } from './drawer-de-reasignar'

// El panel busca su ítem en la página vigente: uno que ya no está (salió del stock, o es de otra página) no abre; se avisa y la URL se limpia, una vez (D7). Mientras se
// va, conserva la última fila que vio. Se monta la primera vez que se abre.
export function useFilaDelPanel(url: PanelDeStockPorUrl, filas: readonly FilaDeStock[]) {
  const encontrada = filas.find((f) => f.id === url.itemId) ?? null
  const rechazada = useRevisionAlAbrir(
    url.abierto ? `${String(url.apertura)}:${url.itemId ?? ''}` : null,
    url.abierto && encontrada === null ? MENSAJE_YA_NO_ESTA_EN_STOCK : null,
    url.cerrar,
  )
  const abierto = url.abierto && !rechazada && encontrada !== null
  const fila = useUltimo(abierto ? encontrada : null)
  const montar = useAbiertoAlgunaVez(abierto)
  return { abierto, fila, montar }
}

// Al cerrar, el foco vuelve al «⋯» de esa fila (el menú lo abrió y la fila pudo redibujarse).
export function focoDelMenu(fila: FilaDeStock | null): HTMLElement | true {
  return (fila && document.querySelector<HTMLElement>(`[data-mas-acciones="${fila.id}"]`)) ?? true
}

function PanelDeSalida({
  url,
  motivo,
  filas,
}: {
  url: PanelDeStockPorUrl
  motivo: MotivoDeSalida
  filas: readonly FilaDeStock[]
}) {
  const { abierto, fila, montar } = useFilaDelPanel(url, filas)
  if (!montar) return null
  return (
    <DrawerDeSalidaDiferido
      abierto={abierto}
      alCerrar={url.cerrar}
      apertura={url.apertura}
      motivo={motivo}
      fila={fila}
      focoAlCerrar={() => focoDelMenu(fila)}
    />
  )
}

type PropsDeReasignar = {
  url: PanelDeStockPorUrl
  filas: readonly FilaDeStock[]
  campoDeProyecto: CampoDeProyectoDestino
}

function PanelDeReasignar({ url, filas, campoDeProyecto }: PropsDeReasignar) {
  const { abierto, fila, montar } = useFilaDelPanel(url, filas)
  if (!montar) return null
  return (
    <DrawerDeReasignarDiferido
      abierto={abierto}
      alCerrar={url.cerrar}
      apertura={url.apertura}
      fila={fila}
      campoDeProyecto={campoDeProyecto}
      focoAlCerrar={() => focoDelMenu(fila)}
    />
  )
}

type Props = {
  url: AccionesDeStockPorUrl
  filas: readonly FilaDeStock[]
  campoDeProyecto: CampoDeProyectoDestino
}

// Los paneles de las acciones de la vista «Stock» (8.10-3, C11): a lo sumo uno abierto, por la URL.
export function AccionesDeStock({ url, filas, campoDeProyecto }: Props) {
  return (
    <>
      <PanelDeReasignar url={url.reasignar} filas={filas} campoDeProyecto={campoDeProyecto} />
      <PanelDeSalida url={url.vender} motivo="vendido" filas={filas} />
      <PanelDeSalida url={url.devolver} motivo="devuelto" filas={filas} />
    </>
  )
}

/** El «⋯» de una fila (D6), en su orden; cada línea abre su panel cuando el menú terminó de cerrarse. */
export function menuDeStock(fila: FilaDeStock, url: AccionesDeStockPorUrl): AccionDeMenu[] {
  return [
    {
      tipo: 'accion',
      clave: 'reasignar',
      etiqueta: 'Reasignar a un proyecto',
      despuesDeCerrar: true,
      alElegir: () => {
        url.reasignar.abrir(fila.id)
      },
    },
    {
      tipo: 'accion',
      clave: 'vender',
      etiqueta: TEXTO_DEL_MOTIVO.vendido,
      despuesDeCerrar: true,
      alElegir: () => {
        url.vender.abrir(fila.id)
      },
    },
    {
      tipo: 'accion',
      clave: 'devolver',
      etiqueta: TEXTO_DEL_MOTIVO.devuelto,
      despuesDeCerrar: true,
      alElegir: () => {
        url.devolver.abrir(fila.id)
      },
    },
  ]
}

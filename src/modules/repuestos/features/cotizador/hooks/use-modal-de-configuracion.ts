'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { useMemo } from 'react'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { useApertura } from '@/shared/ui/use-apertura'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import type {
  CajaConfigurada,
  TramoConfigurado,
} from '../../../entities/cotizador/filas-de-configuracion'

// Los modales de tramo y de caja en la URL (8.12-2, C9): `?panel=tramo&tramo=<id|nuevo>&moneda=<código>` y lo mismo con `caja`. Abrir suma al
// historial («atrás» lo cierra) y cerrar quita las cuatro claves (la pestaña, `?seccion=`, queda). Uno nuevo pide una moneda activa; uno que se edita,
// estar en lo leído: si no, no abre. Si el que se edita desaparece con el modal abierto, sigue a la vista y dice por qué ya no se guarda.
export const PANEL_TRAMO = 'tramo'
export const PANEL_CAJA = 'caja'
const NUEVO = 'nuevo'
const YA_NO_ESTA = 'Ya no está: otra persona lo cambió. Cierra y recarga para ver lo nuevo.'

const PARAMETROS = {
  [CLAVE_DE_PANEL]: parseAsString,
  [PANEL_TRAMO]: parseAsString,
  [PANEL_CAJA]: parseAsString,
  moneda: parseAsString,
}
const SIN_PANEL = { [CLAVE_DE_PANEL]: null, [PANEL_TRAMO]: null, [PANEL_CAJA]: null, moneda: null }

export type TipoDeModal = typeof PANEL_TRAMO | typeof PANEL_CAJA

type Abierto =
  | { tipo: 'tramo'; moneda: string; tramo: TramoConfigurado | null }
  | { tipo: 'caja'; moneda: string; caja: CajaConfigurada | null }

type Datos = {
  activas: readonly string[]
  tramos: readonly TramoConfigurado[]
  cajas: readonly CajaConfigurada[]
}

// Una fila nueva (`nuevo`) pide una moneda activa; una que se edita, estar en lo leído.
function filaDe<Fila extends { id: string; moneda: string }>(
  pedido: string,
  moneda: string | null,
  activas: readonly string[],
  filas: readonly Fila[],
): { moneda: string; fila: Fila | null } | null {
  if (pedido === NUEVO) {
    return moneda && activas.includes(moneda) ? { moneda, fila: null } : null
  }
  const fila = filas.find((f) => f.id === pedido)
  return fila ? { moneda: fila.moneda, fila } : null
}

function abiertoDe(
  url: { panel: string | null; tramo: string | null; caja: string | null; moneda: string | null },
  datos: Datos,
): Abierto | null {
  if (url.panel === PANEL_TRAMO && url.tramo) {
    const r = filaDe(url.tramo, url.moneda, datos.activas, datos.tramos)
    return r && { tipo: 'tramo', moneda: r.moneda, tramo: r.fila }
  }
  if (url.panel === PANEL_CAJA && url.caja) {
    const r = filaDe(url.caja, url.moneda, datos.activas, datos.cajas)
    return r && { tipo: 'caja', moneda: r.moneda, caja: r.fila }
  }
  return null
}

export function useModalDeConfiguracion(datos: Datos) {
  const [url, setUrl] = useQueryStates(PARAMETROS)
  const pedido = url[CLAVE_DE_PANEL] === PANEL_TRAMO || url[CLAVE_DE_PANEL] === PANEL_CAJA
  const panel = url[CLAVE_DE_PANEL]
  const tramo = url[PANEL_TRAMO]
  const caja = url[PANEL_CAJA]
  const { moneda } = url
  const { activas, tramos, cajas } = datos
  // Estable entre renders (`useUltimo` lo exige): sólo cambia con la URL o con lo leído.
  const abierto = useMemo(
    () => abiertoDe({ panel, tramo, caja, moneda }, { activas, tramos, cajas }),
    [panel, tramo, caja, moneda, activas, tramos, cajas],
  )
  useVueltaDelFoco(CLAVE_DE_PANEL, pedido)
  const apertura = useApertura(pedido)
  const ultimo = useUltimo(abierto)
  // Se editaba una fila que ya no está en lo leído: el modal sigue con lo último que mostró.
  const sigue = pedido && abierto === null && ultimo !== null
  const abrir = (tipo: TipoDeModal, moneda: string, id: string | null) => {
    abrirConVuelta(CLAVE_DE_PANEL, () =>
      setUrl(
        { ...SIN_PANEL, [CLAVE_DE_PANEL]: tipo, [tipo]: id ?? NUEVO, moneda: id ? null : moneda },
        { history: 'push' },
      ),
    )
  }
  return {
    abierto: abierto !== null || sigue,
    apertura,
    modal: abierto ?? ultimo,
    noDisponible: sigue ? YA_NO_ESTA : null,
    abrir,
    cerrar: () => {
      void setUrl(SIN_PANEL)
    },
  }
}

'use client'

import { debounce, parseAsString, useQueryStates } from 'nuqs'
import { useTransition } from 'react'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import {
  CLAVE_DE_BUSQUEDA_EN_LA_RUEDA,
  PANEL_AGREGAR_A_LA_RUEDA,
} from '../../../../entities/cola/paneles'

const PARAMETROS = {
  [CLAVE_DE_PANEL]: parseAsString,
  [CLAVE_DE_BUSQUEDA_EN_LA_RUEDA]: parseAsString,
}
const SIN_PANEL = { [CLAVE_DE_PANEL]: null, [CLAVE_DE_BUSQUEDA_EN_LA_RUEDA]: null }

// «Agregar a la rueda» en la URL: `?panel=agregar-a-la-rueda&q=`. La búsqueda la resuelve la página en el servidor (una página de `equipo_lista`), así que
// cambiar la URL vuelve a pedirla (`shallow: false`), con una pausa al tipear. Abrir suma al historial («atrás» lo cierra); cerrar quita las dos claves.
export function usePanelAgregarALaRueda() {
  const [buscando, startTransition] = useTransition()
  const [url, setUrl] = useQueryStates(PARAMETROS, { shallow: false, startTransition })
  const abierto = url[CLAVE_DE_PANEL] === PANEL_AGREGAR_A_LA_RUEDA
  useVueltaDelFoco(CLAVE_DE_PANEL, abierto)
  return {
    abierto,
    busqueda: url[CLAVE_DE_BUSQUEDA_EN_LA_RUEDA] ?? '',
    buscando,
    abrir: () => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          setUrl({ ...SIN_PANEL, [CLAVE_DE_PANEL]: PANEL_AGREGAR_A_LA_RUEDA }, { history: 'push' }),
        abierto,
      )
    },
    buscar: (texto: string) => {
      void setUrl(
        { [CLAVE_DE_BUSQUEDA_EN_LA_RUEDA]: texto.trim() === '' ? null : texto },
        { limitUrlUpdates: debounce(300) },
      )
    },
    cerrar: () => {
      void setUrl(SIN_PANEL)
    },
  }
}

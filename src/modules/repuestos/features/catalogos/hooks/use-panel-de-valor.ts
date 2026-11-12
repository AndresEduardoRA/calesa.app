'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import {
  CLAVE_DE_CATALOGO,
  CLAVE_DE_VALOR,
  PANEL_EDITAR_VALOR,
  PANEL_NUEVO_VALOR,
} from '../../../entities/catalogos/paneles'

const PARAMETROS = {
  [CLAVE_DE_PANEL]: parseAsString,
  [CLAVE_DE_VALOR]: parseAsString,
  [CLAVE_DE_CATALOGO]: parseAsString,
}

const SIN_PANEL = { [CLAVE_DE_PANEL]: null, [CLAVE_DE_VALOR]: null, [CLAVE_DE_CATALOGO]: null }

// El modal de un valor de catálogo en la URL: `?panel=nuevo-valor&catalogo=<clave>` o `?panel=editar-valor&valor=<id>`. Abrir suma al historial («atrás» lo
// cierra) y cerrar quita las tres claves.
export function usePanelDeValor() {
  const [url, setUrl] = useQueryStates(PARAMETROS)
  const panel = url[CLAVE_DE_PANEL]
  const nuevo = panel === PANEL_NUEVO_VALOR
  const hayEdicion = panel === PANEL_EDITAR_VALOR
  const catalogo = nuevo ? url[CLAVE_DE_CATALOGO] : null
  const editando = hayEdicion ? url[CLAVE_DE_VALOR] : null
  useVueltaDelFoco(CLAVE_DE_PANEL, nuevo || hayEdicion)
  return {
    nuevo,
    hayEdicion,
    catalogo,
    editando,
    abrirNuevo: (clave: string) => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          setUrl(
            { ...SIN_PANEL, [CLAVE_DE_PANEL]: PANEL_NUEVO_VALOR, [CLAVE_DE_CATALOGO]: clave },
            { history: 'push' },
          ),
        nuevo && catalogo === clave,
      )
    },
    abrirEdicion: (id: string) => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          setUrl(
            { ...SIN_PANEL, [CLAVE_DE_PANEL]: PANEL_EDITAR_VALOR, [CLAVE_DE_VALOR]: id },
            { history: 'push' },
          ),
        editando === id,
      )
    },
    cerrar: () => {
      void setUrl(SIN_PANEL)
    },
  }
}

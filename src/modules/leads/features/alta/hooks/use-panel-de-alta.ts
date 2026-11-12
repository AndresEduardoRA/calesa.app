'use client'

import { parseAsString, useQueryStates, type UseQueryStatesKeysMap } from 'nuqs'
import { useMemo } from 'react'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { CLAVE_DE_ELEGIR, claveParaElegir } from '../../../entities/elegir-al-crear'
import { adelantarElAlta } from '../components/diferidos'

// El valor de `?panel=` que abre «Nuevo lead». Distinto de `nuevo` (el de un vehículo) y de
// `filtros`: cada pantalla tiene su `?panel=` y éste puede abrirse desde cualquiera.
export const PANEL_NUEVO_LEAD = 'nuevo-lead'

const PARSERS = { [CLAVE_DE_PANEL]: parseAsString, [CLAVE_DE_ELEGIR]: parseAsString }

// Si «Nuevo lead» está abierto, en la URL. Abrir suma al historial («atrás» lo cierra; tras recargar, devuelve el foco a quien lo abrió:
// `vuelta-del-foco.ts`). Sin `shallow: false`: abrirlo no necesita al servidor.
// `paraElegir`: con `?elegir=<clave>` (lo escribe el «+» del panel del cliente de la hoja de cotizar), la clave de la URL donde la pantalla lleva su lead; sólo cuenta con el
// panel abierto. Cerrar quita las dos en una escritura que reemplaza la entrada; `elegirElCreado(id)` es lo mismo, pero deja el lead creado en esa clave y va al servidor.
export function usePanelDeAlta() {
  const [url, escribir] = useQueryStates(PARSERS)
  const abierto = url[CLAVE_DE_PANEL] === PANEL_NUEVO_LEAD
  const paraElegir = abierto ? claveParaElegir(url[CLAVE_DE_ELEGIR]) : null
  // Para escribir el lead creado en la clave de la pantalla, que sólo se sabe leyendo la URL.
  const parsersDelCreado = useMemo<UseQueryStatesKeysMap>(
    () => (paraElegir === null ? PARSERS : { ...PARSERS, [paraElegir]: parseAsString }),
    [paraElegir],
  )
  const [, escribirElCreado] = useQueryStates(parsersDelCreado)
  useVueltaDelFoco(CLAVE_DE_PANEL, abierto)
  return {
    abierto,
    paraElegir,
    abrir: () => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () => escribir({ [CLAVE_DE_PANEL]: PANEL_NUEVO_LEAD }, { history: 'push' }),
        abierto,
      )
    },
    cerrar: () => {
      void escribir({ [CLAVE_DE_PANEL]: null, [CLAVE_DE_ELEGIR]: null }, { history: 'replace' })
    },
    elegirElCreado: (id: string) => {
      if (paraElegir === null) {
        return
      }
      void escribirElCreado(
        { [CLAVE_DE_PANEL]: null, [CLAVE_DE_ELEGIR]: null, [paraElegir]: id },
        { history: 'replace', shallow: false },
      )
    },
  }
}

// Abrir «Nuevo lead» desde fuera del panel (la paleta de la barra). No es `usePanelDeAlta()`: ese hook registra la vuelta del foco del panel y `<AltaDeLead>` ya lo usa;
// montarlo otra vez en el hueco la registraría dos veces. Éste sólo lee la clave `panel` (para no volver a abrir lo abierto) y escribe la misma entrada.
export function useAbrirNuevoLead(): () => void {
  const [url, escribir] = useQueryStates({ [CLAVE_DE_PANEL]: parseAsString })
  const abierto = url[CLAVE_DE_PANEL] === PANEL_NUEVO_LEAD
  return () => {
    adelantarElAlta()
    abrirConVuelta(
      CLAVE_DE_PANEL,
      () => escribir({ [CLAVE_DE_PANEL]: PANEL_NUEVO_LEAD }, { history: 'push' }),
      abierto,
    )
  }
}

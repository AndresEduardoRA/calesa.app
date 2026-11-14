'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { CLAVE_DE_EXTRA_EN_PANEL, VALOR_DE_EXTRA_NUEVO } from '../../../entities/telefonos'

// «Agregar teléfono» desde el panel de edición o el resumen del listado: un modal con su URL (`?extra=nuevo`). `?panel=` ya lo ocupa la
// edición del lead, así que va en su propia clave, como un diálogo dentro de un panel (`?eliminar=`): abrirlo no cierra el panel. Tiene la
// forma de `usePanelDeLead().extra`. `activo` es falso cuando otro `TelefonosExtra` de la misma pantalla es el que responde a la URL (el
// resumen, mientras el panel de edición está abierto encima): nunca se montan dos modales.
export function useAgregarExtraEnPanel({ activo = true }: { activo?: boolean } = {}) {
  const panel = usePanelPorUrl(VALOR_DE_EXTRA_NUEVO, [], { clave: CLAVE_DE_EXTRA_EN_PANEL })
  return {
    abierto: activo && panel.abierto,
    abrir: () => {
      panel.abrir()
    },
    cerrar: panel.cerrar,
  }
}

export type AperturaDeExtra = ReturnType<typeof useAgregarExtraEnPanel>

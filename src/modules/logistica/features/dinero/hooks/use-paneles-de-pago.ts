'use client'

import { recordarQuienAbre } from '@/shared/ui/foco-de-quien-abre'
import type { Pago } from '../../../entities/dinero/pago'
import { useAnularPagoPorUrl } from './use-anular-pago-por-url'
import { useConfirmarElPago } from './use-confirmar-el-pago'
import { useConfirmarPagoPorUrl } from './use-confirmar-pago-por-url'
import { useEliminarElPago } from './use-eliminar-el-pago'
import { useEliminarPagoPorUrl } from './use-eliminar-pago-por-url'
import { usePanelDePago } from './use-panel-de-pago'

type Claves = { puedeEditar: boolean | null; puedeConfirmar: boolean | null }

// Los cuatro paneles del hueco «Pagos» por URL (formulario, confirmar, eliminar y anular) con lo que hace cada uno al elegirlo (6.11-2).
export function usePanelesDePago(unidadId: string, pagos: readonly Pago[] | null, claves: Claves) {
  const formulario = usePanelDePago(pagos, claves)
  const confirmar = useConfirmarPagoPorUrl(pagos, claves)
  const eliminar = useEliminarPagoPorUrl(pagos, claves)
  const anular = useAnularPagoPorUrl(pagos, claves)
  // Quien abre un panel lo recuerda: al cerrarlo, el foco vuelve a su botón.
  const recordando = <A extends unknown[]>(abrir: (...args: A) => void) => {
    return (...args: A) => {
      recordarQuienAbre()
      abrir(...args)
    }
  }
  return {
    formulario,
    confirmar,
    eliminar,
    anular,
    confirmarElPago: useConfirmarElPago(unidadId),
    eliminarElPago: useEliminarElPago(unidadId),
    abrirNuevo: recordando(formulario.abrirNuevo),
    abrirEdicion: recordando(formulario.abrirEdicion),
    abrirConfirmar: recordando(confirmar.abrir),
    abrirEliminar: recordando(eliminar.abrir),
    abrirAnular: recordando(anular.abrir),
  }
}

export type PanelesDePago = ReturnType<typeof usePanelesDePago>

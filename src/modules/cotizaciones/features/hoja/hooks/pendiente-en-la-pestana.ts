'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'
import {
  leerPendiente,
  leerPendienteDeEdicion,
  serializarPendiente,
  serializarPendienteDeEdicion,
} from '../../../entities/intento-de-guardado'
import type { PedidoDeEdicion } from '../../../entities/pedido-de-edicion'
import type { PedidoDeGuardado } from '../../../entities/pedido-de-guardado'

// El pedido pendiente de una hoja (4-21) vive en la pestaña (`sessionStorage`, con la clave de la hoja): una recarga tras perder la respuesta reenvía el mismo intento en
// vez de crear otra cotización. Sin almacenamiento (modo privado, sin lugar) queda en memoria. Se lee con `useSyncExternalStore`: en el servidor no hay pendiente, y el
// navegador lo dibuja al hidratar sin desfasar el HTML.
const enMemoria = new Map<string, string>()
const oyentes = new Set<() => void>()

function leer(clave: string): string | null {
  try {
    return window.sessionStorage.getItem(clave) ?? enMemoria.get(clave) ?? null
  } catch {
    return enMemoria.get(clave) ?? null
  }
}

function escribir(clave: string, valor: string | null): void {
  if (valor === null) {
    enMemoria.delete(clave)
  } else {
    enMemoria.set(clave, valor)
  }
  try {
    if (valor === null) {
      window.sessionStorage.removeItem(clave)
    } else {
      window.sessionStorage.setItem(clave, valor)
    }
  } catch {
    // Queda en memoria: una recarga lo pierde.
  }
  for (const oyente of oyentes) {
    oyente()
  }
}

const suscribir = (oyente: () => void) => {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

// Cómo se lee y se escribe el pedido de cada hoja (la nueva, una guardada). Constantes del módulo: el hook los compara por identidad.
export type CodecDelPendiente<P> = {
  leer: (texto: string | null) => P | null
  serializar: (pedido: P) => string
}
export const CODEC_DE_LA_NUEVA: CodecDelPendiente<PedidoDeGuardado> = {
  leer: leerPendiente,
  serializar: serializarPendiente,
}
export const CODEC_DE_UNA_GUARDADA: CodecDelPendiente<PedidoDeEdicion> = {
  leer: leerPendienteDeEdicion,
  serializar: serializarPendienteDeEdicion,
}

export function usePendienteEnLaPestana<P>(clave: string, codec: CodecDelPendiente<P>) {
  const texto = useSyncExternalStore(
    suscribir,
    () => leer(clave),
    () => null,
  )
  // Estable entre renders mientras el texto no cambie: el reintento al volver la red lo compara.
  const pendiente = useMemo(() => codec.leer(texto), [codec, texto])
  return {
    pendiente,
    // Al mandar: el pedido queda guardado antes de salir, por si la respuesta no vuelve.
    anotar: useCallback(
      (pedido: P) => {
        escribir(clave, codec.serializar(pedido))
      },
      [clave, codec],
    ),
    soltar: useCallback(() => {
      escribir(clave, null)
    }, [clave]),
    // Lo de este momento, sin esperar a que React dibuje (dos guardados seguidos).
    actual: useCallback(() => codec.leer(leer(clave)), [clave, codec]),
  }
}

'use client'

import { useCallback } from 'react'
import { memoriaDeLectura, type MemoriaDeLectura } from '@/shared/lib/memoria-de-lectura'
import { leerTablaDeAyuda } from '../../../composicion.client'
import {
  leerOpcionesCon,
  type OpcionesDelDato,
  type TablaDelDato,
} from '../../../entities/dato-del-vehiculo'
import type { TablaDeAyuda } from '../../../entities/tabla-de-ayuda'
import type { Resultado } from '@/shared/lib/errores'

// Una tabla vale 5 minutos con la misma hoja abierta: volver a abrir el panel del vehículo no la vuelve a leer. Guardar el dato trae otra hoja abierta y la lee de nuevo.
const VIDA_MS = 5 * 60 * 1000
const memorias = new Map<string, MemoriaDeLectura<TablaDeAyuda>>()

function memoriaDe(origenId: string, abierta: string, tabla: string) {
  const clave = `${abierta}\u0000${tabla}`
  let memoria = memorias.get(clave)
  if (!memoria) {
    memoria = memoriaDeLectura(() => leerTablaDeAyuda({ tabla, origenId, abierta }), VIDA_MS)
    memorias.set(clave, memoria)
  }
  return memoria
}

export type LectorDeOpciones = (
  tablas: readonly TablaDelDato[],
) => Promise<Resultado<OpcionesDelDato>>

// Las opciones de un dato del vehículo (las filas de sus tablas en `cotizacion_tabla` con la hoja abierta: lo que el nivel de quien mira ve). No lee nada al montarse: lee quien
// llama, al abrir el panel. Lo usa la página de cotizar para armar el grupo del panel del vehículo (`vehiculos` no conoce `cotizaciones`).
export function useLectorDeOpciones({
  origenId,
  abierta,
}: {
  origenId: string
  abierta: string
}): LectorDeOpciones {
  return useCallback(
    (tablas) => leerOpcionesCon((tabla) => memoriaDe(origenId, abierta, tabla).leer(), tablas),
    [origenId, abierta],
  )
}

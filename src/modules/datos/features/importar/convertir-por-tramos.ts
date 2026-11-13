// Convertir el archivo de la importación total por tramos (9.06-4b, D45): 20.000 filas de leads pasan por `validarAlta()` en ≈ 1,6 s, así que
// se convierten de a 500 (≈ 40 ms cada tramo) y entre tramos se le devuelve el hilo al navegador, con el avance para «Preparando el
// archivo…». El resultado es **idéntico** al de una pasada: los tramos van en orden y sin saltos, y en leads lo visto de teléfonos cruza los
// tramos (`preparadorDeFilas`). Salir de la pantalla corta la conversión (`senal`). Sin React y sin I/O.
import {
  preparadorDeFilas,
  type EntradaDePreparacion,
  type ObjetivoDeImportacion,
} from '@/modules/leads/client'
import type { FilaNormalizada } from '../../entities/plantillas'
import { filaNormalizadaDeLead } from './convertir-leads'
import { prepararVehiculos, type EntradaDeVehiculos } from './convertir-vehiculos'

export const TAMANO_DE_TRAMO = 500

// Las filas normalizadas de `[desde, hasta)` del archivo de la persona.
export type Tramo = (desde: number, hasta: number) => FilaNormalizada[]

export type ConversionPorTramos = {
  total: number
  tramo: Tramo
  tamano?: number
  ceder?: () => Promise<void>
  senal?: AbortSignal
  alAvanzar?: (hechas: number, total: number) => void
}

const cederAlNavegador = () => new Promise<void>((resolver) => setTimeout(resolver, 0))

// Todas las filas, en orden, o `null` si se canceló.
export async function convertirPorTramos({
  total,
  tramo,
  tamano = TAMANO_DE_TRAMO,
  ceder = cederAlNavegador,
  senal,
  alAvanzar,
}: ConversionPorTramos): Promise<FilaNormalizada[] | null> {
  const filas: FilaNormalizada[] = []
  for (let desde = 0; desde < total; desde += tamano) {
    if (senal?.aborted) {
      return null
    }
    if (desde > 0) {
      await ceder()
      if (senal?.aborted) {
        return null
      }
    }
    const hasta = Math.min(desde + tamano, total)
    filas.push(...tramo(desde, hasta))
    alAvanzar?.(hasta, total)
  }
  return senal?.aborted ? null : filas
}

export type EntradaDeLeads = Omit<EntradaDePreparacion, 'filas'> & {
  filas: EntradaDePreparacion['filas']
  objetivos: readonly ObjetivoDeImportacion[]
}

// Un preparador **nuevo por conversión** (la vista previa arma el suyo): lo visto de teléfonos es de esta pasada.
export function tramoDeLeads({ filas, objetivos, ...entrada }: EntradaDeLeads): Tramo {
  const preparar = preparadorDeFilas(entrada)
  return (desde, hasta) =>
    preparar(filas.slice(desde, hasta), desde).map((fila) => filaNormalizadaDeLead(fila, objetivos))
}

// Cada fila de vehículos vale por sí misma: no hay estado entre tramos.
export function tramoDeVehiculos(entrada: EntradaDeVehiculos): Tramo {
  return (desde, hasta) =>
    prepararVehiculos({ ...entrada, filas: entrada.filas.slice(desde, hasta) })
}

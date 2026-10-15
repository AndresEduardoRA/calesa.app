// Los lotes de una importación: cómo se parte el archivo, qué contesta la base por fila y cómo se
// resume. Sin I/O.
import { z } from 'zod'
import type { PedidoDeFila } from './filas'

// Lo que pesa un lote como máximo (el cuerpo de una Server Action admite 1 MB por defecto): un lote de
// 50 filas con celdas largas se parte antes de salir.
export const BYTES_POR_LOTE = 600_000

// Los lotes de la importación: hasta `filasPorLote` filas y hasta `bytesPorLote` de JSON. Una fila sola
// siempre cabe (tiene como mucho 60 celdas de 2.000 caracteres).
export function lotesDeImportacion(
  pedidos: readonly PedidoDeFila[],
  filasPorLote: number,
  bytesPorLote: number = BYTES_POR_LOTE,
): PedidoDeFila[][] {
  const lotes: PedidoDeFila[][] = []
  let actual: PedidoDeFila[] = []
  let peso = 0
  for (const pedido of pedidos) {
    const bytes = JSON.stringify(pedido).length
    if (actual.length > 0 && (actual.length >= filasPorLote || peso + bytes > bytesPorLote)) {
      lotes.push(actual)
      actual = []
      peso = 0
    }
    actual.push(pedido)
    peso += bytes
  }
  if (actual.length > 0) {
    lotes.push(actual)
  }
  return lotes
}

export const RESULTADOS_DE_FILA = ['creado', 'ya_existe', 'error'] as const

export type ResultadoDeFila = {
  id: string
  fila: number
  resultado: (typeof RESULTADOS_DE_FILA)[number]
  // Sólo en `creado`: es un reintento de una fila que ya había entrado.
  repetido: boolean
  numero: number | null
  // Sólo en `error`: el dato (su clave en el formulario) y el motivo ya escrito.
  campo: string | null
  motivo: string | null
}

const esquemaDeLote = z.object({
  importacion: z.guid(),
  filas: z.array(
    z.object({
      id: z.string(),
      fila: z.number().int(),
      resultado: z.enum(RESULTADOS_DE_FILA),
      repetido: z.boolean().optional(),
      numero: z.number().nullable().optional(),
      campo: z.string().nullable().optional(),
      motivo: z.string().nullable().optional(),
    }),
  ),
})

// Lo que contesta `leads_importar_lote()`. Una forma rota es `null`: no se da por importado.
export function loteImportadoDesde(crudo: unknown): ResultadoDeFila[] | null {
  const leido = esquemaDeLote.safeParse(crudo)
  if (!leido.success) {
    return null
  }
  return leido.data.filas.map((fila) => ({
    id: fila.id,
    fila: fila.fila,
    resultado: fila.resultado,
    repetido: fila.repetido ?? false,
    numero: fila.numero ?? null,
    campo: fila.campo ?? null,
    motivo: fila.motivo ?? null,
  }))
}

export type ResumenDeImportacion = {
  // Las que entraron.
  creadas: number
  // Las que ya estaban (en la base o repetidas dentro del archivo no: esas son rechazadas).
  yaExistian: number
  // Las que no pasaron la vista previa o que la base rechazó.
  rechazadas: number
  // Las válidas que todavía no tienen respuesta (se canceló o se cortó).
  pendientes: number
}

export function resumirImportacion(
  validas: readonly PedidoDeFila[],
  rechazadasEnLaVistaPrevia: number,
  resultados: ReadonlyMap<string, ResultadoDeFila>,
): ResumenDeImportacion {
  let creadas = 0
  let yaExistian = 0
  let conError = 0
  let pendientes = 0
  for (const pedido of validas) {
    const resultado = resultados.get(pedido.id)?.resultado
    if (resultado === 'creado') {
      creadas += 1
    } else if (resultado === 'ya_existe') {
      yaExistian += 1
    } else if (resultado === 'error') {
      conError += 1
    } else {
      pendientes += 1
    }
  }
  return {
    creadas,
    yaExistian,
    rechazadas: rechazadasEnLaVistaPrevia + conError,
    pendientes,
  }
}

// Cuánto lleva hecho: el resumen y cuántos lotes ya tienen todas sus respuestas.
export function avanceDeImportacion(
  lotes: readonly (readonly PedidoDeFila[])[],
  rechazadasEnLaVistaPrevia: number,
  resultados: ReadonlyMap<string, ResultadoDeFila>,
): { resumen: ResumenDeImportacion; lotesHechos: number } {
  const validas = lotes.flat()
  return {
    resumen: resumirImportacion(validas, rechazadasEnLaVistaPrevia, resultados),
    lotesHechos: lotes.filter((lote) => lote.every((pedido) => resultados.has(pedido.id))).length,
  }
}

// «Ya existía» cuenta como una cuenta aparte, pero igual se explica en el archivo de errores.
export function hayAlgoQueCorregir(resumen: ResumenDeImportacion): boolean {
  return resumen.rechazadas > 0 || resumen.yaExistian > 0
}

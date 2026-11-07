// Lo que la pestaña «Tarjeta» le pasa al editor (4.19-3b), calculado en el servidor: la plantilla de la que nace, su procedencia y sus avisos, y el contexto reducido.
// Nunca la lectura entera ni la definición de la fórmula. Puro: la sección es un Server Component async y Vitest no lo monta, así que lo que decide se prueba aquí.
import type { Plantilla } from './forma-de-plantilla'
import { plantillaParaEditar, type DeDondeNace } from './borrador-de-la-plantilla'
import { contextoParaElNavegador } from './contexto-para-el-navegador'
import type { PlantillaDelOrigen, TonoDelCatalogo } from './lectura-de-la-plantilla'
import type { ContextoDePlantilla } from './validar-plantilla'

export type PropsDelEditor = {
  readonly origen: { readonly id: string; readonly nombre: string }
  // La versión esperada de guardar: el `actualizadoEn` del borrador tal cual (texto), nulo sin borrador.
  readonly esperada: string | null
  readonly inicial: Plantilla
  readonly de: DeDondeNace
  readonly avisos: readonly string[]
  readonly contexto: ContextoDePlantilla
  readonly tonos: readonly TonoDelCatalogo[]
  readonly publicada: {
    readonly version: number | null
    readonly nota: string | null
    readonly publicadoEn: string | null
  } | null
  // Lo guardado en el borrador (para saber si hay cambios); nulo sin borrador o si no se pudo leer.
  readonly guardada: Plantilla | null
}

// Sin fórmula publicada no hay editor (nulo).
export function propsDelEditor(
  lectura: PlantillaDelOrigen,
  origen: { id: string; nombre: string },
): PropsDelEditor | null {
  if (lectura.formula === null || lectura.contexto === null) return null
  const nace = plantillaParaEditar({
    borrador: lectura.borrador,
    publicada: lectura.publicada,
    contexto: lectura.contexto,
  })
  const { publicada } = lectura
  return {
    origen: { id: origen.id, nombre: origen.nombre },
    esperada: lectura.borrador?.actualizadoEn ?? null,
    inicial: nace.plantilla,
    de: nace.de,
    avisos: nace.avisos,
    contexto: contextoParaElNavegador(lectura.contexto),
    tonos: lectura.tonos,
    publicada:
      publicada === null
        ? null
        : { version: publicada.version, nota: publicada.nota, publicadoEn: publicada.publicadoEn },
    guardada: lectura.borrador?.plantilla ?? null,
  }
}

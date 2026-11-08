// Lo que lee el editor de la plantilla de la tarjeta de un origen (4.19-3a): el borrador y la publicada ya leídos con `formaDePlantilla()`, y el contexto con el que
// `validarPlantilla()` las juzga (la fórmula publicada del origen y el catálogo de tonos). Reglas puras, sin I/O: las consultas están en `infra/plantilla/`.
import { z } from 'zod'
import { formaDePlantilla, type Plantilla } from './forma-de-plantilla'
import type { DefinicionParaPlantilla, DisenoParaPlantilla } from './nodos-de-plantilla'
import type { ContextoDePlantilla } from './validar-plantilla'

// El catálogo de tonos tiene un tope en la base (`_tonos_tope()`, 24): no deja crear el 25.º, así que se lee entero y no hay «Ver más» ni aviso de tope.
export const TOPE_DE_TONOS = 24

// Los colores (4.19-4) son los de `tonos` en claro y en oscuro, como texto: la vista previa los pasa a `<EstiloDeTonos>`, que descarta un tono con un color inválido.
export type ColoresDelTonoDelCatalogo = {
  readonly fondo: string
  readonly borde: string
  readonly tinta: string
}
export type TonoDelCatalogo = {
  readonly clave: string
  readonly nombre: string
  readonly claro?: ColoresDelTonoDelCatalogo
  readonly oscuro?: ColoresDelTonoDelCatalogo
}

// Una plantilla del origen (el borrador o la publicada). Las dos horas son el texto que da la base, con sus microsegundos: la versión esperada de guardar, publicar y
// descartar es ese texto y nunca pasa por `Date`. `plantilla` es nula si lo guardado ya no tiene la forma (el editor no la dibuja a medias) y `motivo` dice por qué.
export type VersionDePlantilla = {
  readonly id: string
  readonly version: number | null
  readonly nota: string | null
  readonly actualizadoEn: string
  readonly publicadoEn: string | null
  readonly plantilla: Plantilla | null
  readonly motivo: string | null
}

export type FilaDeVersionDePlantilla = {
  readonly id: string
  readonly version: number | null
  readonly nota: string | null
  readonly actualizadoEn: string
  readonly publicadoEn: string | null
  readonly definicion: unknown
}

// De la fórmula publicada se lee sólo lo que mira `validarPlantilla()` (los nodos con su grupo y su salida, los buckets, los grupos, y del diseño los modos y los secundarios
// de la tarjeta): ya la validó la base al publicarla, y leerla con el Zod entero de la fórmula ataría la plantilla a cada cambio de la fórmula.
export const esquemaDefinicionParaPlantilla = z.looseObject({
  nodos: z.array(
    z.looseObject({
      id: z.string(),
      grupo: z.string().nullish(),
      salida: z.string().nullish(),
      etiqueta: z.string().nullish(),
    }),
  ),
  buckets: z.record(z.string(), z.string()).optional(),
  grupos: z
    .array(
      z.looseObject({
        id: z.string(),
        bucket: z.string().nullish(),
        etiqueta: z.string().nullish(),
        tono: z.string().nullish(),
        plazo: z.unknown().optional(),
      }),
    )
    .optional(),
})
export const esquemaDisenoParaPlantilla = z.looseObject({
  cabecera: z
    .looseObject({
      modos: z.array(
        z.looseObject({
          buckets: z.array(z.looseObject({ bucket: z.string(), nodo: z.string() })),
        }),
      ),
    })
    .optional(),
  tarjeta_total: z.looseObject({ secundarios: z.array(z.string()) }).optional(),
})

export type FormulaParaLaPlantilla = {
  readonly id: string
  readonly version: number
  readonly definicion: DefinicionParaPlantilla
  readonly diseno: DisenoParaPlantilla | null
  readonly visibilidad: Readonly<Record<string, unknown>> | null
}

export type PlantillaDelOrigen = {
  readonly publicada: VersionDePlantilla | null
  readonly borrador: VersionDePlantilla | null
  // La fórmula publicada del origen: sin ella no hay contra qué validar (la base lo dice igual al publicar: `formula_sin_publicar`).
  readonly formula: { readonly id: string; readonly version: number } | null
  // Lo que se le pasa tal cual a `validarPlantilla()`; nulo sin fórmula.
  readonly contexto: ContextoDePlantilla | null
  readonly tonos: readonly TonoDelCatalogo[]
}

// Nunca lanza: lo guardado que no pasa la forma es `plantilla: null` con el mensaje del rechazo.
export function versionDePlantilla(fila: FilaDeVersionDePlantilla): VersionDePlantilla {
  const forma = formaDePlantilla(fila.definicion)
  return {
    id: fila.id,
    version: fila.version,
    nota: fila.nota,
    actualizadoEn: fila.actualizadoEn,
    publicadoEn: fila.publicadoEn,
    plantilla: forma.ok ? forma.plantilla : null,
    motivo: forma.ok ? null : forma.error.mensaje,
  }
}

export function contextoDeValidacion(
  formula: FormulaParaLaPlantilla | null,
  tonos: readonly TonoDelCatalogo[],
): ContextoDePlantilla | null {
  if (formula === null) return null
  return {
    definicion: formula.definicion,
    diseno: formula.diseno,
    visibilidad: formula.visibilidad,
    tonos: tonos.map((t) => t.clave),
  }
}

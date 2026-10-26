import { z } from 'zod'

// Lo que devuelve `cotizacion_evaluar()` a quien cotiza (paso 4.13-2): el resultado del motor RECORTADO al nivel de quien mira. Las listas cerradas se repiten acá y no
// se importan de `motor-contexto.ts`: este archivo viaja al navegador (el recálculo se hace desde allá) y aquél arrastra el esquema entero de los nodos. Una prueba
// las compara con las del motor. El esquema no es estricto: lo que no nombra se cae.
export const ESTADOS_DE_RECALCULO = ['activo', 'fuera_de_variante', 'condicion_apagada'] as const
export const FUENTES_DE_RECALCULO = ['default', 'sugerido', 'override', 'input'] as const
export const FALTANTES_DE_RECALCULO = [
  'campo_sin_valor',
  'tabla_sin_filas',
  'fila_sin_coincidencia',
  'celda_sin_valor',
  'division_por_cero',
  'tipo_de_cambio_sin_valor',
  'fuera_de_rango',
  'requerido_sin_valor',
] as const
export const DESCARTES_DE_RECALCULO = [
  'nodo_inexistente',
  'fuera_de_variante',
  'condicion_apagada',
  'no_sobrescribible',
] as const

const numero = z.number().nullable()

export const esquemaRecalculo = z.object({
  valores: z.record(z.string(), z.union([z.number(), z.string(), z.null()])),
  estados: z.record(z.string(), z.enum(ESTADOS_DE_RECALCULO)),
  fuentes: z.record(z.string(), z.enum(FUENTES_DE_RECALCULO)),
  totales: z.object({ usd: numero, bs: numero, suma_usd: numero }),
  faltantes: z.array(
    z.object({
      codigo: z.enum(FALTANTES_DE_RECALCULO),
      donde: z.string(),
      ref: z.string().optional(),
    }),
  ),
  overrides_descartados: z
    .array(z.object({ id: z.string(), motivo: z.enum(DESCARTES_DE_RECALCULO) }))
    .optional(),
  // Algo faltó en un nodo que quien mira no ve: se dice que falta, sin decir qué.
  hay_faltantes_ocultos: z.boolean().optional(),
})

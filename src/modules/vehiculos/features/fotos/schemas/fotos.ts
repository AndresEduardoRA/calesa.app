import { z } from 'zod'
import { MAXIMO_DE_FOTOS, esRutaDeFoto } from '../../../entities/foto'

const hash = z.string().regex(/^[0-9a-f]{64}$/)
const medida = z.number().int().min(1).max(20_000)

// Una foto cuyos dos objetos ya están en Storage. El tope de peso es el del bucket.
const fotoSubida = z.object({
  hash,
  ruta: z.string().max(120),
  rutaMiniatura: z.string().max(120),
  ancho: medida,
  alto: medida,
  bytes: z
    .number()
    .int()
    .min(1)
    .max(5 * 1024 * 1024),
  // De dónde se bajó, si vino de apibara.
  origenUrl: z
    .url({ protocol: /^https$/ })
    .max(1000)
    .optional(),
})

type ConRutas = { ruta: string; rutaMiniatura: string }

// Una fila no apunta a la carpeta de otro vehículo. La base lo vuelve a comprobar.
const enSuCarpeta = (vehiculoId: string, fotos: readonly ConRutas[]) =>
  fotos.every(
    (foto) => esRutaDeFoto(vehiculoId, foto.ruta) && esRutaDeFoto(vehiculoId, foto.rutaMiniatura),
  )

const MAL_SUBIDAS = 'Las fotos no se subieron bien. Vuelve a elegirlas.'

export const esquemaAgregarFotos = z
  .object({
    vehiculoId: z.guid(),
    fotos: z
      .array(
        fotoSubida.extend({
          // Con su lugar y, si lo es, de portada: lo que trae apibara (la primera es la portada).
          orden: z.number().int().min(1).max(MAXIMO_DE_FOTOS).optional(),
          esPortada: z.boolean().optional(),
        }),
      )
      .min(1)
      .max(MAXIMO_DE_FOTOS),
  })
  .refine((pedido) => enSuCarpeta(pedido.vehiculoId, pedido.fotos), { error: MAL_SUBIDAS })

// Deshacer un eliminar: la foto vuelve con su lugar y, si lo era, de portada.
export const esquemaRestaurarFoto = z
  .object({
    vehiculoId: z.guid(),
    foto: fotoSubida.extend({
      orden: z.number().int().min(1).max(MAXIMO_DE_FOTOS),
      esPortada: z.boolean(),
    }),
  })
  .refine((pedido) => enSuCarpeta(pedido.vehiculoId, [pedido.foto]), { error: MAL_SUBIDAS })

const edicion = {
  vehiculoId: z.guid(),
  // La versión de las fotos que tenía en pantalla quien edita.
  actualizadoEnEsperado: z.string().min(1),
  fotoId: z.guid(),
}

export const esquemaMoverFoto = z.object({
  ...edicion,
  // «Después de» esta foto; null = primera.
  despuesDe: z.guid().nullable(),
})
export const esquemaFijarPortada = z.object(edicion)
export const esquemaEliminarFoto = z.object(edicion)

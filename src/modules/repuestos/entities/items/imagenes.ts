// Las imágenes de un ítem de repuestos (8.09-3, C8). Puro: el tope, la forma de la ruta, qué entra y qué no, y los avisos. Un ítem lleva hasta 8 (un repuesto no es un vehículo, que lleva 24);
// la base lo impone igual bajo un candado por ítem (`repuestos_imagen_integridad`, la migración `repuestos_imagenes`): este número y el de SQL son el mismo.
import { z } from 'zod'

export const MAXIMO_DE_IMAGENES_POR_ITEM = 8

export type ImagenDeItem = { id: string; ruta: string; orden: number }

// Las columnas que pide el panel; sostiene la consulta `repuestos_items_imagenes_item_id_idx`.
export const COLUMNAS_DE_IMAGEN = 'id, item_id, ruta, orden'

export const MENSAJE_IMAGEN_YA_NO_ESTA = 'Esa imagen ya no está.'
export const MENSAJE_ITEM_LLENO = 'Este ítem ya tiene 8 imágenes. Quita alguna para subir otra.'
export const SIN_PERMISO_PARA_EDITAR_IMAGENES =
  'No tienes permiso para cambiar las imágenes de los ítems.'
export const NO_SE_LEYERON_LAS_IMAGENES = 'No se pudieron cargar las imágenes.'

/** Cuántas imágenes más caben dado lo que ya hay. Nunca negativo. */
export function lugarPara(n: number, maximo: number = MAXIMO_DE_IMAGENES_POR_ITEM): number {
  return Math.max(0, maximo - n)
}

/** La ruta de un objeto del bucket `repuestos`: la carpeta es el ítem, el nombre el SHA-256 del contenido (hex en minúscula) y `webp` (o `jpg` sin WebP). */
export function rutaDeImagenValida(itemId: string, ruta: string): boolean {
  return new RegExp(`^${itemId}/[0-9a-f]{64}\\.(webp|jpg)$`).test(ruta)
}

export type PlanDeAgregado = { aGuardar: string[]; repetidas: string[]; sinLugar: string[] }

/** Qué rutas se guardan: las repetidas (ya están, o vienen dos veces) salen sin error y las que no caben van a `sinLugar`, respetando el orden pedido. */
export function planDeAgregado({
  existentes,
  pedidas,
  maximo = MAXIMO_DE_IMAGENES_POR_ITEM,
}: {
  existentes: readonly string[]
  pedidas: readonly string[]
  maximo?: number
}): PlanDeAgregado {
  const vistas = new Set(existentes)
  const aGuardar: string[] = []
  const repetidas: string[] = []
  const sinLugar: string[] = []
  let lugar = lugarPara(existentes.length, maximo)
  for (const ruta of pedidas) {
    if (vistas.has(ruta)) {
      repetidas.push(ruta)
    } else if (lugar <= 0) {
      sinLugar.push(ruta)
    } else {
      vistas.add(ruta)
      aGuardar.push(ruta)
      lugar -= 1
    }
  }
  return { aGuardar, repetidas, sinLugar }
}

const esquemaDeImagenDeLaBase = z.object({
  id: z.guid(),
  ruta: z.string().min(1),
  orden: z.number().int(),
})

/** Las filas de la base como imágenes, por su orden; lo que no cuadra se descarta (no rompe el panel). */
export function imagenesDesde(filas: unknown): ImagenDeItem[] {
  if (!Array.isArray(filas)) {
    return []
  }
  const imagenes: ImagenDeItem[] = []
  for (const fila of filas) {
    const leida = esquemaDeImagenDeLaBase.safeParse(fila)
    if (leida.success) {
      imagenes.push(leida.data)
    }
  }
  return imagenes.sort((a, b) => a.orden - b.orden)
}

/** El resultado de agregar, dicho para la persona: lo que entró, lo que ya estaba y lo que no cupo. */
export function avisoDeAgregado({
  agregadas,
  repetidas,
  sinLugar,
}: {
  agregadas: number
  repetidas: number
  sinLugar: number
}): string {
  const partes: string[] = []
  if (agregadas > 0) {
    partes.push(agregadas === 1 ? 'Se subió 1 imagen' : `Se subieron ${agregadas} imágenes`)
  }
  if (repetidas > 0) {
    partes.push(repetidas === 1 ? 'Una ya estaba' : `${repetidas} ya estaban`)
  }
  if (sinLugar > 0) {
    partes.push(
      sinLugar === 1 ? 'Una no cupo (el tope es 8)' : `${sinLugar} no cupieron (el tope es 8)`,
    )
  }
  return partes.length === 0 ? 'No había nada que subir.' : `${partes.join('. ')}.`
}

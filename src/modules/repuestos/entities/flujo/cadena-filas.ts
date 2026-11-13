import { z } from 'zod'
import { fallo, MENSAJE_INESPERADO, ok, type Resultado } from '@/shared/lib/errores'
import type { ColumnaDeRepuestos, PaginaDeLaColumnaDeRepuestos, TarjetaDeRepuesto } from './cadena'
import { TOPE_DE_FASES_DE_LA_CADENA } from './cadena'

// Las filas de la base de la Cadena de repuestos (8.13-3) como lo que dibuja la pantalla. Puro: valida y arma; la lectura es de `infra/flujo/cadena.ts`.

/** Las columnas de un ítem de la Cadena, con el proyecto embebido (sin N+1). */
export const COLUMNAS_DE_LA_TARJETA =
  'id, descripcion, cantidad, fase_desde, proyecto:repuestos_proyectos!inner(id, numero, vehiculo_etiqueta)'

const esquemaDeTarjeta = z.object({
  id: z.guid(),
  descripcion: z.string(),
  cantidad: z.number(),
  fase_desde: z.string().nullable(),
  proyecto: z.object({
    id: z.guid(),
    numero: z.number().int().min(0),
    vehiculo_etiqueta: z.string().nullable(),
  }),
})

/** Las filas de ítems como tarjetas, en el orden en que llegan; una fila que no cumple la forma es un error visible, no una tarjeta a medias. */
export function tarjetasDesde(filas: unknown): Resultado<TarjetaDeRepuesto[]> {
  const leidas = z.array(esquemaDeTarjeta).safeParse(filas)
  if (!leidas.success) return fallo('inesperado', MENSAJE_INESPERADO)
  return ok(
    leidas.data.map((f) => ({
      id: f.id,
      descripcion: f.descripcion,
      cantidad: f.cantidad,
      faseDesde: f.fase_desde,
      proyecto: {
        id: f.proyecto.id,
        numero: f.proyecto.numero,
        etiqueta: f.proyecto.vehiculo_etiqueta,
      },
    })),
  )
}

/** Las columnas de las fases del flujo. */
export const COLUMNAS_DE_LA_FASE = 'id, nombre, color, orden, activa, es_final'

const esquemaDeFase = z.object({
  id: z.guid(),
  nombre: z.string(),
  color: z.string(),
  activa: z.boolean(),
  es_final: z.boolean(),
})

export type FaseDeLaCadena = {
  id: string
  nombre: string
  color: string
  activa: boolean
  esFinal: boolean
}

/** Las fases leídas con `limit TOPE_DE_FASES_DE_LA_CADENA + 1`: más que el tope es un error visible. */
export function fasesDesde(filas: unknown): Resultado<FaseDeLaCadena[]> {
  const leidas = z.array(esquemaDeFase).safeParse(filas)
  if (!leidas.success || leidas.data.length > TOPE_DE_FASES_DE_LA_CADENA) {
    return fallo('inesperado', MENSAJE_INESPERADO)
  }
  return ok(
    leidas.data.map((f) => ({
      id: f.id,
      nombre: f.nombre,
      color: f.color,
      activa: f.activa,
      esFinal: f.es_final,
    })),
  )
}

/**
 * Arma las columnas: «Sin fase» primera si tiene ítems; una por fase en el orden de la base; se descarta la de una fase jubilada sin ítems. Las demás se dibujan aunque estén vacías.
 */
export function columnasDe(
  fases: readonly FaseDeLaCadena[],
  paginas: {
    sinFase: PaginaDeLaColumnaDeRepuestos
    porFase: ReadonlyMap<string, PaginaDeLaColumnaDeRepuestos>
  },
): ColumnaDeRepuestos[] {
  const columnas: ColumnaDeRepuestos[] = []
  if (paginas.sinFase.tarjetas.length > 0) {
    columnas.push({
      faseId: null,
      nombre: null,
      color: null,
      activa: true,
      esFinal: false,
      ...paginas.sinFase,
    })
  }
  for (const fase of fases) {
    const pagina = paginas.porFase.get(fase.id) ?? { tarjetas: [], hayMas: false }
    if (!fase.activa && pagina.tarjetas.length === 0) continue
    columnas.push({
      faseId: fase.id,
      nombre: fase.nombre,
      color: fase.color,
      activa: fase.activa,
      esFinal: fase.esFinal,
      ...pagina,
    })
  }
  return columnas
}

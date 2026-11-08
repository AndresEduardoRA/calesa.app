// Lo que lee y devuelve el catálogo de tonos (4.22-4): la fila de la tabla `tonos`, la `lista` que entrega cada una de las tres RPC (`_tonos_lista()`) y la forma del
// repositorio de escritura. La hora es el texto de la base, con sus microsegundos: es la versión que guardar y eliminar mandan, nunca pasa por `Date`.
import { z } from 'zod'
import type { ErrorApp } from '@/shared/lib/errores'
import type { CambiosDeUnTono, ColoresDeUnTono, ListaDeTonos, Tono } from './tonos'

const hex = z.string().regex(/^#[0-9a-f]{6}$/)
const tema = z.strictObject({ fondo: hex, borde: hex, tinta: hex })

const filaDeLaLista = z.strictObject({
  id: z.guid(),
  clave: z.string().min(1),
  nombre: z.string().min(1),
  actualizado_en: z.string().min(1),
  claro: tema,
  oscuro: tema,
})

// La fila de la tabla `tonos` tal cual la lee PostgREST (columnas planas).
export const esquemaDeLaFilaDeTonos = z.object({
  id: z.guid(),
  clave: z.string().min(1),
  nombre: z.string().min(1),
  actualizado_en: z.string().min(1),
  claro_fondo: hex,
  claro_borde: hex,
  claro_tinta: hex,
  oscuro_fondo: hex,
  oscuro_borde: hex,
  oscuro_tinta: hex,
})

const comoTono = (f: z.infer<typeof filaDeLaLista>): Tono => ({
  id: f.id,
  clave: f.clave,
  nombre: f.nombre,
  actualizadoEn: f.actualizado_en,
  colores: { claro: f.claro, oscuro: f.oscuro },
})

export function tonoDesdeLaFila(fila: z.infer<typeof esquemaDeLaFilaDeTonos>): Tono {
  return {
    id: fila.id,
    clave: fila.clave,
    nombre: fila.nombre,
    actualizadoEn: fila.actualizado_en,
    colores: {
      claro: { fondo: fila.claro_fondo, borde: fila.claro_borde, tinta: fila.claro_tinta },
      oscuro: { fondo: fila.oscuro_fondo, borde: fila.oscuro_borde, tinta: fila.oscuro_tinta },
    },
  }
}

const esquemaDeLaLista = z.strictObject({
  tope: z.number().int().positive(),
  tonos: z.array(filaDeLaLista),
})

// Lo que responden las tres escrituras: el tono tocado (nulo al eliminar), si el pedido ya estaba hecho (sólo crear) y la lista entera con las versiones nuevas.
export type RespuestaDeTonos = {
  id: string | null
  actualizadoEn: string | null
  repetido: boolean
  lista: ListaDeTonos
}

const esquemaDeLaRespuesta = z.object({
  id: z.guid().optional(),
  actualizado_en: z.string().min(1).optional(),
  repetido: z.boolean().optional(),
  lista: esquemaDeLaLista,
})

export function respuestaDeTonosDesde(crudo: unknown): RespuestaDeTonos | null {
  const leida = esquemaDeLaRespuesta.safeParse(crudo)
  if (!leida.success) return null
  const { id, actualizado_en, repetido, lista } = leida.data
  return {
    id: id ?? null,
    actualizadoEn: actualizado_en ?? null,
    repetido: repetido ?? false,
    lista: { tope: lista.tope, tonos: lista.tonos.map(comoTono) },
  }
}

// Un rechazo con el campo del formulario que lo causó (el `hint` de la base), si lo hay.
export type FalloDeTono = { ok: false; error: ErrorApp; campo?: string }

type Respuesta = Promise<{ ok: true; data: RespuestaDeTonos } | FalloDeTono>

// Crear lleva el id del intento (repetirlo devuelve el mismo tono); guardar y eliminar, la versión que se tenía en pantalla.
export type RepositorioDeTonos = {
  crear: (pedido: { id: string; nombre: string; colores: ColoresDeUnTono }) => Respuesta
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    cambios: CambiosDeUnTono
  }) => Respuesta
  eliminar: (pedido: { id: string; actualizadoEnEsperado: string }) => Respuesta
}

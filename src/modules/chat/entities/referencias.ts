// Lo que una mención o una ficha apunta, tal como lo ve quien lee el hilo (7.10-1). Las filas llegan de lecturas con la sesión de quien mira: lo que no
// llegó, no se ve (la RLS no distingue «no existe» de «no es tuyo»). Nunca teléfono, campos privados ni montos. Puro, sin I/O.
import { z } from 'zod'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { claveDeReferencia, type ClaseDeMencion, type Referencia } from './menciones'

// Lo que se ve de cada clase, ya validado.
export type DatosDeReferencia =
  | { clase: 'lead'; nombre: string | null; numeroVisible: number | null }
  | { clase: 'vehiculo'; titulo: string; vin: string | null; lote: string | null }
  | {
      clase: 'cotizacion'
      numero: number
      titulo: string | null
      claseDeCotizacion: string
      estadoDeCotizacion: string
    }
  | { clase: 'usuario'; nombre: string | null }

// `sin_acceso`: la fila no llegó (no se ve, o se purgó: no se distingue sin filtrar existencia). `eliminado`: llegó con `eliminado_en`, o es una
// ficha cuya FK quedó nula. Lo que aún no se leyó no está en el mapa: se dibuja «Cargando…».
export type EstadoDeReferencia =
  | { situacion: 'visible'; id: string; datos: DatosDeReferencia }
  | { situacion: 'sin_acceso' }
  | { situacion: 'eliminado' }

export type MapaDeReferencias = ReadonlyMap<string, EstadoDeReferencia>

// Lo que se pide a cada tabla: las columnas con grant que bastan para dibujar un chip y el drawer.
export const COLUMNAS_DE_REFERENCIA = {
  lead: 'id, nombre, numero_visible',
  vehiculo: 'id, titulo, vin, lote, eliminado_en',
  cotizacion: 'id, numero, titulo, clase, estado, eliminado_en',
  usuario: 'id, nombre, activo',
} as const satisfies Record<ClaseDeMencion, string>

const esquemas = {
  lead: z.array(
    z.object({
      id: z.guid(),
      nombre: z.string().nullable(),
      numero_visible: z.number().int().nullable(),
    }),
  ),
  vehiculo: z.array(
    z.object({
      id: z.guid(),
      titulo: z.string(),
      vin: z.string().nullable(),
      lote: z.string().nullable(),
      eliminado_en: z.string().nullable(),
    }),
  ),
  cotizacion: z.array(
    z.object({
      id: z.guid(),
      numero: z.number().int(),
      titulo: z.string().nullable(),
      clase: z.string(),
      estado: z.string(),
      eliminado_en: z.string().nullable(),
    }),
  ),
  usuario: z.array(z.object({ id: z.guid(), nombre: z.string().nullable(), activo: z.boolean() })),
}

type Fila = { id: string; datos: DatosDeReferencia; oculta: 'eliminado' | 'sin_acceso' | null }

function filasDe(clase: ClaseDeMencion, crudas: unknown): Fila[] | null {
  switch (clase) {
    case 'lead': {
      const leidas = esquemas.lead.safeParse(crudas)
      return leidas.success
        ? leidas.data.map((f) => ({
            id: f.id.toLowerCase(),
            oculta: null,
            datos: { clase, nombre: f.nombre, numeroVisible: f.numero_visible },
          }))
        : null
    }
    case 'vehiculo': {
      const leidas = esquemas.vehiculo.safeParse(crudas)
      return leidas.success
        ? leidas.data.map((f) => ({
            id: f.id.toLowerCase(),
            oculta: f.eliminado_en !== null ? 'eliminado' : null,
            datos: { clase, titulo: f.titulo, vin: f.vin, lote: f.lote },
          }))
        : null
    }
    case 'cotizacion': {
      const leidas = esquemas.cotizacion.safeParse(crudas)
      return leidas.success
        ? leidas.data.map((f) => ({
            id: f.id.toLowerCase(),
            oculta: f.eliminado_en !== null ? 'eliminado' : null,
            datos: {
              clase,
              numero: f.numero,
              titulo: f.titulo,
              claseDeCotizacion: f.clase,
              estadoDeCotizacion: f.estado,
            },
          }))
        : null
    }
    case 'usuario': {
      const leidas = esquemas.usuario.safeParse(crudas)
      return leidas.success
        ? leidas.data.map((f) => ({
            id: f.id.toLowerCase(),
            // Quien dejó el equipo se dice «Persona no disponible», como quien no se lee.
            oculta: f.activo ? null : 'sin_acceso',
            datos: { clase, nombre: f.nombre },
          }))
        : null
    }
  }
}

// De las filas de UNA clase (lo que devolvió la lectura) al estado de cada id pedido: lo que no vino no se ve; lo que vino con `eliminado_en`, está
// eliminado. Una fila mal formada es un valor de error, no una excepción.
export function resolverClase(
  clase: ClaseDeMencion,
  pedidos: readonly string[],
  crudas: unknown,
): Resultado<Map<string, EstadoDeReferencia>> {
  const filas = filasDe(clase, crudas)
  if (filas === null) {
    return fallo('inesperado', 'No pudimos leer lo mencionado. Vuelve a intentar en un momento.')
  }
  const porId = new Map(filas.map((f) => [f.id, f]))
  const mapa = new Map<string, EstadoDeReferencia>()
  for (const id of pedidos) {
    const fila = porId.get(id)
    const clave = claveDeReferencia({ clase, id })
    if (fila === undefined) {
      mapa.set(clave, { situacion: 'sin_acceso' })
    } else if (fila.oculta !== null) {
      mapa.set(clave, { situacion: fila.oculta })
    } else {
      mapa.set(clave, { situacion: 'visible', id, datos: fila.datos })
    }
  }
  return ok(mapa)
}

// La ficha de un mensaje (`mensajes.tipo` distinto de `texto`) con la FK de su tipo. `id` nulo: la FK quedó nula (`on delete set null`).
export const TIPOS_DE_FICHA = ['vehiculo', 'lead', 'cotizacion', 'tarea', 'evento'] as const
export type TipoDeFicha = (typeof TIPOS_DE_FICHA)[number]
export type Ficha = { tipo: TipoDeFicha; id: string | null }

type FKsDeFila = {
  vehiculo_id?: string | null | undefined
  lead_id?: string | null | undefined
  cotizacion_id?: string | null | undefined
  tarea_id?: string | null | undefined
  evento_id?: string | null | undefined
}

export function fichaDeFila(tipo: string, fks: FKsDeFila): Ficha | null {
  switch (tipo) {
    case 'vehiculo':
      return { tipo, id: fks.vehiculo_id ?? null }
    case 'lead':
      return { tipo, id: fks.lead_id ?? null }
    case 'cotizacion':
      return { tipo, id: fks.cotizacion_id ?? null }
    case 'tarea':
      return { tipo, id: fks.tarea_id ?? null }
    case 'evento':
      return { tipo, id: fks.evento_id ?? null }
    default:
      return null
  }
}

// Una ficha de vehículo, lead o cotización se dibuja como una mención; las de tarea y evento son de otro paso. Sin id, no hay a quién leer.
export function referenciaDeFicha(ficha: Ficha | null): Referencia | null {
  if (ficha === null || ficha.id === null) {
    return null
  }
  return ficha.tipo === 'vehiculo' || ficha.tipo === 'lead' || ficha.tipo === 'cotizacion'
    ? { clase: ficha.tipo, id: ficha.id.toLowerCase() }
    : null
}

// El estado de lo que apunta una ficha cuya FK quedó nula: «Eliminado».
export const ELIMINADO: EstadoDeReferencia = { situacion: 'eliminado' }

// Las referencias de varios mensajes (cuerpo vivo y ficha) que todavía no están resueltas, únicas por clave.
export function referenciasSinResolver(
  referencias: readonly Referencia[],
  resueltas: MapaDeReferencias,
): Referencia[] {
  const vistas = new Set<string>()
  const faltan: Referencia[] = []
  for (const r of referencias) {
    const clave = claveDeReferencia(r)
    if (!resueltas.has(clave) && !vistas.has(clave)) {
      vistas.add(clave)
      faltan.push(r)
    }
  }
  return faltan
}

// La ficha de una tarea o de un evento en el hilo (7.10-3): lo que se lee de cada una con la sesión de quien mira, y las reglas puras de qué se ofrece.
// Lo que no llegó no se ve (la RLS no distingue «no existe» de «no es tuyo»): «no disponible». Sólo columnas de lectura: nunca descripción ni vínculos.
// Sin I/O.
import { z } from 'zod'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'

export type ClaseDeFicha = 'tarea' | 'evento'
export type PedidoDeFicha = { clase: ClaseDeFicha; id: string }
export type EstadoDeAgenda = 'pendiente' | 'completado' | 'cancelado'

export type DatosDeFichaDeTarea = {
  clase: 'tarea'
  titulo: string
  venceEn: string | null
  estado: EstadoDeAgenda
  completadaEn: string | null
  responsableId: string
  responsableNombre: string | null
  creadoPor: string
  // La versión que se leyó: `completarTarea` la exige para no pisar un cambio ajeno.
  actualizadoEn: string
}
export type DatosDeFichaDeEvento = {
  clase: 'evento'
  titulo: string
  iniciaEn: string
  lugar: string | null
  estado: EstadoDeAgenda
}
export type DatosDeFicha = DatosDeFichaDeTarea | DatosDeFichaDeEvento

// `no_disponible`: la fila no llegó. `eliminada`: llegó con `eliminado_en`. Lo que aún no se leyó no está en el mapa: «Cargando…».
export type EstadoDeFicha =
  | { situacion: 'visible'; id: string; datos: DatosDeFicha }
  | { situacion: 'no_disponible' }
  | { situacion: 'eliminada' }

export type MapaDeFichas = ReadonlyMap<string, EstadoDeFicha>

export const claveDeFicha = (clase: ClaseDeFicha, id: string) => `${clase}:${id.toLowerCase()}`

export const COLUMNAS_DE_FICHA = {
  tarea:
    'id, titulo, vence_en, estado, completada_en, responsable_id, creado_por, actualizado_en, eliminado_en',
  evento: 'id, titulo, inicia_en, lugar, estado, eliminado_en',
  perfil: 'id, nombre',
} as const

const estado = z.enum(['pendiente', 'completado', 'cancelado'])
const fecha = z.string().min(1)
const esquemaDeTarea = z.object({
  id: z.guid(),
  titulo: z.string(),
  vence_en: fecha.nullable(),
  estado,
  completada_en: fecha.nullable(),
  responsable_id: z.guid(),
  creado_por: z.guid(),
  actualizado_en: fecha,
  eliminado_en: fecha.nullable(),
})
const esquemaDeEvento = z.object({
  id: z.guid(),
  titulo: z.string(),
  inicia_en: fecha,
  lugar: z.string().nullable(),
  estado,
  eliminado_en: fecha.nullable(),
})
const esquemaDePerfil = z.object({ id: z.guid(), nombre: z.string().nullable() })

const ERROR_DE_LECTURA = 'No pudimos leer la ficha. Vuelve a intentar en un momento.'

// De las filas leídas (tareas, eventos y los perfiles de los responsables) al estado de cada ficha pedida.
export function resolverFichas(
  pedidas: readonly PedidoDeFicha[],
  tareas: unknown,
  eventos: unknown,
  perfiles: unknown,
): Resultado<Map<string, EstadoDeFicha>> {
  const t = z.array(esquemaDeTarea).safeParse(tareas)
  const e = z.array(esquemaDeEvento).safeParse(eventos)
  const p = z.array(esquemaDePerfil).safeParse(perfiles)
  if (!t.success || !e.success || !p.success) {
    return fallo('inesperado', ERROR_DE_LECTURA)
  }
  const tareasPorId = new Map(t.data.map((f) => [f.id.toLowerCase(), f]))
  const eventosPorId = new Map(e.data.map((f) => [f.id.toLowerCase(), f]))
  const nombres = new Map(p.data.map((f) => [f.id.toLowerCase(), f.nombre]))
  const mapa = new Map<string, EstadoDeFicha>()
  for (const { clase, id } of pedidas) {
    const llave = id.toLowerCase()
    const clave = claveDeFicha(clase, llave)
    if (clase === 'tarea') {
      const f = tareasPorId.get(llave)
      mapa.set(
        clave,
        f === undefined
          ? { situacion: 'no_disponible' }
          : f.eliminado_en !== null
            ? { situacion: 'eliminada' }
            : {
                situacion: 'visible',
                id: llave,
                datos: {
                  clase,
                  titulo: f.titulo,
                  venceEn: f.vence_en,
                  estado: f.estado,
                  completadaEn: f.completada_en,
                  responsableId: f.responsable_id,
                  responsableNombre: nombres.get(f.responsable_id.toLowerCase()) ?? null,
                  creadoPor: f.creado_por,
                  actualizadoEn: f.actualizado_en,
                },
              },
      )
    } else {
      const f = eventosPorId.get(llave)
      mapa.set(
        clave,
        f === undefined
          ? { situacion: 'no_disponible' }
          : f.eliminado_en !== null
            ? { situacion: 'eliminada' }
            : {
                situacion: 'visible',
                id: llave,
                datos: {
                  clase,
                  titulo: f.titulo,
                  iniciaEn: f.inicia_en,
                  lugar: f.lugar,
                  estado: f.estado,
                },
              },
      )
    }
  }
  return ok(mapa)
}

// Las fichas que todavía no están resueltas, únicas por clave.
export function fichasSinResolver(
  pedidas: readonly PedidoDeFicha[],
  resueltas: MapaDeFichas,
): PedidoDeFicha[] {
  const vistas = new Set<string>()
  const faltan: PedidoDeFicha[] = []
  for (const p of pedidas) {
    const clave = claveDeFicha(p.clase, p.id)
    if (!resueltas.has(clave) && !vistas.has(clave)) {
      vistas.add(clave)
      faltan.push({ clase: p.clase, id: p.id.toLowerCase() })
    }
  }
  return faltan
}

// Qué se ofrece (la base decide quién puede): completar o reabrir lo ofrece el responsable, y una tarea cancelada no se toca desde el chat. El creador,
// que también puede en la base, lo hace en la agenda (enlace en la ficha).
export function puedeCompletarDesdeFicha(datos: DatosDeFichaDeTarea, yo: string): boolean {
  return datos.estado !== 'cancelado' && datos.responsableId.toLowerCase() === yo.toLowerCase()
}

export function estaVencida(datos: DatosDeFichaDeTarea, ahoraIso: string): boolean {
  return (
    datos.estado === 'pendiente' &&
    datos.venceEn !== null &&
    Date.parse(datos.venceEn) < Date.parse(ahoraIso)
  )
}

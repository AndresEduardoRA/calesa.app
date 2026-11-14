// «Visto» y «último visto» (`docs/GLOSARIO.md`): lo que cada persona abrió en un módulo se marca en sus listas. Abrir la ficha o el resumen de un
// registro lo marca visto *en ese módulo* (`vistos`, por `visto_registrar()`); cada lista lee lo de su página con `vistos_de()`. Sin I/O.
import { z } from 'zod'

// Los mismos valores que el `check` de la tabla.
export const MODULOS_DE_VISTOS = [
  'vehiculos',
  'leads',
  'cotizaciones',
  'agenda',
  'logistica',
  'repuestos',
  'notificaciones',
] as const
export type ModuloDeVistos = (typeof MODULOS_DE_VISTOS)[number]

export const TIPOS_DE_VISTOS = [
  'vehiculo',
  'lead',
  'cotizacion',
  'evento',
  'tarea',
  'proyecto_repuestos',
  'notificacion',
] as const
export type TipoDeVistos = (typeof TIPOS_DE_VISTOS)[number]

// Cuánto se recuerda lo visto (el `check` de `preferencias_usuario`).
export const DIAS_DE_VISTOS = [7, 30, 90, 365] as const
export type DiasDeVistos = (typeof DIAS_DE_VISTOS)[number]

export const CLAVE_DE_VISTOS = 'vistos'

// `preferencias_usuario.vistos`: encendido por defecto, 7 días y con «último visto».
export const esquemaPreferenciaDeVistos = z.object({
  activado: z.boolean(),
  dias: z.union([z.literal(7), z.literal(30), z.literal(90), z.literal(365)]),
  ultimo: z.boolean(),
})
export type PreferenciaDeVistos = z.infer<typeof esquemaPreferenciaDeVistos>

export const VISTOS_POR_DEFECTO: PreferenciaDeVistos = { activado: true, dias: 7, ultimo: true }

// Lo guardado completa lo que falte con lo de fábrica; lo que no se entiende es lo de fábrica.
export function preferenciaDeVistosDesde(crudo: unknown): PreferenciaDeVistos {
  const parcial = esquemaPreferenciaDeVistos.partial().safeParse(crudo)
  return parcial.success ? { ...VISTOS_POR_DEFECTO, ...parcial.data } : VISTOS_POR_DEFECTO
}

// Lo que `vistos_de()` devolvió para una página.
export type LecturaDeVistos = { vistos: ReadonlySet<string>; ultimo: string | null }

export const SIN_VISTOS: LecturaDeVistos = { vistos: new Set(), ultimo: null }

const esquemaDeLectura = z.object({
  vistos: z.array(z.object({ id: z.guid() })),
  ultimo: z.guid().nullable(),
})

export function lecturaDeVistosDesde(dato: unknown): LecturaDeVistos | null {
  const leido = esquemaDeLectura.safeParse(dato)
  if (!leido.success) return null
  return { vistos: new Set(leido.data.vistos.map((v) => v.id)), ultimo: leido.data.ultimo }
}

// Cómo se marca una fila: «último visto» si es el último del módulo (y la persona lo quiere ver), «visto» si se abrió, o nada.
export type MarcaDeVisto = 'visto' | 'ultimo' | null

export function marcaDeVisto(
  id: string,
  lectura: LecturaDeVistos,
  preferencia: PreferenciaDeVistos,
): MarcaDeVisto {
  if (!preferencia.activado) return null
  if (preferencia.ultimo && lectura.ultimo === id) return 'ultimo'
  return lectura.vistos.has(id) || lectura.ultimo === id ? 'visto' : null
}

// Abrir un registro lo vuelve el último visto de inmediato, sin esperar a releer.
export function conAbierto(lectura: LecturaDeVistos, id: string): LecturaDeVistos {
  return { vistos: new Set([...lectura.vistos, id]), ultimo: id }
}

// Lo leído de la base más lo abierto en esta pestaña (que la base puede no tener todavía: se registra tras 1 s). Lo abierto manda en el último.
export function unidas(leida: LecturaDeVistos, local: LecturaDeVistos): LecturaDeVistos {
  return {
    vistos: new Set([...leida.vistos, ...local.vistos]),
    ultimo: local.ultimo ?? leida.ultimo,
  }
}

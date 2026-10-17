// La ficha de un lead (`/leads/[id]`): lo que `lead_ficha()` entrega en un viaje y cómo se lee. La
// base ya recortó todo según quien mira: el teléfono llega completo sólo a la cartera, los extras
// igual, y los atributos «solo la cartera» sólo si quien mira la tiene. Nada acá decide quién ve qué.
import { CAMPOS_DE_NUMEROS, numerosDesde, type NumerosDeLead } from '@/shared/lib/numeros-de-lead'
import { z } from 'zod'
import { TIPOS_DEL_LEAD, type TipoDelLead } from './listado'
import type { OrigenDeLead } from './alta'
import { marcasDesde, type MarcasDeLead } from './marcas'
import { telefonoParaMostrar } from './telefono'

// Lo mismo se dice de un lead que no existe, que está en la papelera o en el limbo y de uno al que
// no se tiene acceso: decir «no tienes permiso» confirmaría que existe.
export const MENSAJE_DE_LEAD_NO_DISPONIBLE = 'No encontramos este lead o no tienes acceso.'

// Un origen con su estado: el lead que entró por uno apagado se sigue nombrando.
export type OrigenConEstado = OrigenDeLead & { activo: boolean }

// Un teléfono alterno. Sin unicidad entre leads; sí dentro del mismo lead.
export type TelefonoExtra = { id: string; telefono: string; etiqueta: string | null }

export type LeadDeFicha = {
  id: string
  // Los números que se ven (el global sólo con el permiso; el propio, con quién lo creó si no es quien mira).
  numeros: NumerosDeLead
  nombre: string
  // El código de país guardado, si el número es el de la empresa.
  telefonoCc: string | null
  // Como lo entrega la base: completo para la cartera, enmascarado para el resto.
  telefono: string
  // El lead está en la cartera de quien mira: define si los datos privados y los teléfonos llegan
  // completos y si puede cambiarlos.
  enCartera: boolean
  tipo: TipoDelLead
  origenId: string | null
  // Los que le llegan a quien mira.
  atributos: Record<string, unknown>
  creadoEn: string
  // La versión de edición: la mueve un cambio de lo editable, no un seguimiento ni compartir.
  actualizadoEn: string
  // Quién lo tiene (el dueño, o el primero de la cartera).
  tieneId: string | null
  tieneNombre: string | null
  telefonos: TelefonoExtra[]
  // Los recordatorios de quien mira sobre este lead que ya pasaron y no completó, hasta
  // `TOPE_DE_VENCIDOS + 1` (la base no cuenta más: el número exacto crecía con el total).
  recordatoriosVencidos: number
  // Cuántos vehículos vinculados ve quien mira (los que no ve no se cuentan): con eso la ficha adelanta
  // que no va a la papelera y avisa al compartir o transferir.
  vehiculosVinculados: number
  // Las de quien mira: favorito, tachado y sus etiquetas.
  marcas: MarcasDeLead
}

// Cuántos vencidos se dicen con su número: la base cuenta hasta uno más (`lead_ficha()`, `limit 21`) y
// la pantalla dice «más de 20». Espejo de esa consulta.
// Los vehículos vinculados que cuenta `lead_ficha()`: hasta 101, y de ahí «más de 100» (nunca el total).
export const TOPE_DE_VINCULADOS = 100
export const VEHICULOS = { singular: 'vehículo', plural: 'vehículos' } as const

export const TOPE_DE_VENCIDOS = 20

const esquemaFicha = z.object({
  id: z.guid(),
  ...CAMPOS_DE_NUMEROS,
  nombre: z.string(),
  telefono_cc: z.string().nullable(),
  telefono: z.string().nullable(),
  en_cartera: z.boolean(),
  tipo: z.enum(TIPOS_DEL_LEAD),
  origen_lead_id: z.guid().nullable(),
  atributos: z.record(z.string(), z.unknown()).nullable(),
  creado_en: z.string(),
  actualizado_en: z.string(),
  tiene_id: z.guid().nullable(),
  tiene_nombre: z.string().nullable(),
  telefonos: z.array(
    z.object({ id: z.guid(), telefono: z.string(), etiqueta: z.string().nullable() }),
  ),
  recordatorios_vencidos: z
    .number()
    .int()
    .nonnegative()
    .max(TOPE_DE_VENCIDOS + 1),
  vehiculos_vinculados: z
    .number()
    .int()
    .nonnegative()
    .max(TOPE_DE_VINCULADOS + 1),
  es_favorito: z.boolean().optional(),
  esta_tachado: z.boolean().optional(),
  etiquetas: z.array(z.guid()).optional(),
})

// El `jsonb` de `lead_ficha()`. Una respuesta que no cumple la forma es `null`: quien llama la
// trata como un error, no como un lead que no se ve.
export function fichaDesde(crudo: unknown): LeadDeFicha | null {
  const leido = esquemaFicha.safeParse(crudo)
  if (!leido.success) {
    return null
  }
  const f = leido.data
  return {
    id: f.id,
    numeros: numerosDesde(f),
    nombre: f.nombre,
    telefonoCc: f.telefono_cc,
    telefono: f.telefono ?? '',
    enCartera: f.en_cartera,
    tipo: f.tipo,
    origenId: f.origen_lead_id,
    atributos: f.atributos ?? {},
    creadoEn: f.creado_en,
    actualizadoEn: f.actualizado_en,
    tieneId: f.tiene_id,
    tieneNombre: f.tiene_nombre,
    telefonos: f.telefonos,
    recordatoriosVencidos: f.recordatorios_vencidos,
    vehiculosVinculados: f.vehiculos_vinculados,
    marcas: marcasDesde(f),
  }
}

// Quién lo tiene, dicho para la cabecera. «Lo tienes tú» no nombra a nadie.
export function quienLoTiene(ficha: LeadDeFicha, yoId: string): string | null {
  if (ficha.tieneId === null) {
    return null
  }
  if (ficha.tieneId === yoId) {
    return 'Lo tienes tú'
  }
  return ficha.tieneNombre ? `Lo tiene ${ficha.tieneNombre}` : 'Lo tiene otra persona'
}

// El nombre de un origen con su estado: el nombre del origen, o «<nombre> (inactivo)» si ya no se ofrece.
export function origenDeLaFicha(
  origenes: readonly OrigenConEstado[],
  origenId: string | null,
): { nombre: string; activo: boolean } | null {
  const origen = origenes.find((uno) => uno.id === origenId)
  return origen ? { nombre: origen.nombre, activo: origen.activo } : null
}

// --- Las secciones de la ficha (`?seccion=`) ----------------------------------------------------------

// Una sección es `disponible` cuando existe su contenido. Las demás (cotizaciones, historial) aparecen
// con su parte: ninguna pestaña lleva a la nada. Cada sección que se suma agrega su clave a
// `SeccionDeLead` y su caso en `<FichaDeLead>`. Ninguna lleva un número: el de «Seguimientos»
// insinuaría los privados de otros.
export type SeccionDeLead = 'datos' | 'seguimientos' | 'vehiculos' | 'oportunidades' | 'portal'

// Lo que la persona ve y decide si una sección se dibuja: «Vehículos» sólo con `vehiculos.ver` en algún
// origen (sin eso estaría siempre vacía); «Oportunidades» sólo con el lead en su cartera (sin ella no
// tiene ni puede crear ninguna: las suyas se ocultan); «Portal» con la cartera y
// `leads.portal.gestionar` (`puedeGestionarPortal()`: nunca vacía, sin acceso ofrece darlo).
export type LoQueVe = { vehiculos: boolean; oportunidades: boolean; portal: boolean }

export const SECCIONES_DE_LEAD: readonly {
  clave: SeccionDeLead
  titulo: string
  disponible: boolean
  // Qué tiene que ver la persona para que la sección aparezca.
  pide?: keyof LoQueVe
}[] = [
  { clave: 'datos', titulo: 'Datos', disponible: true },
  { clave: 'seguimientos', titulo: 'Seguimientos', disponible: true },
  { clave: 'vehiculos', titulo: 'Vehículos', disponible: true, pide: 'vehiculos' },
  { clave: 'oportunidades', titulo: 'Oportunidades', disponible: true, pide: 'oportunidades' },
  { clave: 'portal', titulo: 'Portal', disponible: true, pide: 'portal' },
]

export const CLAVE_DE_SECCION = 'seccion'

const disponibles = (ve: LoQueVe) =>
  SECCIONES_DE_LEAD.filter((seccion) => seccion.disponible && (!seccion.pide || ve[seccion.pide]))

// Con una sola sección no hay nada entre qué elegir: la barra no se dibuja.
export function hayBarraDeSecciones(ve: LoQueVe): boolean {
  return disponibles(ve).length > 1
}

export function seccionesDisponibles(
  ve: LoQueVe,
): readonly { clave: SeccionDeLead; titulo: string }[] {
  return disponibles(ve).map(({ clave, titulo }) => ({ clave, titulo }))
}

// Lo que viene en la URL lo puede escribir cualquiera: lo que no es una sección que existe (o que la
// persona no ve) abre «Datos».
export function seccionDeLead(valor: string | undefined, ve: LoQueVe): SeccionDeLead {
  return disponibles(ve).find((seccion) => seccion.clave === valor)?.clave ?? 'datos'
}

// Un número normalizado como se lee: «+591 70011002» si es el del país de la empresa (el lead guarda
// su código cuando lo es) y «+54…» tal cual si no. Enmascarado, conserva sus puntos.
export function telefonoDeFicha(numero: string, codigoDePais: string | null): string {
  return numero === '' ? '—' : telefonoParaMostrar(numero, codigoDePais)
}

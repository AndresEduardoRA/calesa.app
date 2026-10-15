// Quién tiene un lead: la cartera, dicha con nombres y tipo de acceso (nunca correo ni teléfono), y
// las reglas de qué se ofrece para moverla. Es la clase 2 de la auditoría (`docs/DECISIONES.md`,
// 2026-10-15): lo hace el dueño; quien tiene el permiso en «todos» también, pero nadie se concede
// acceso a sí mismo. La base lo vuelve a decidir (`lead_compartir()`, `lead_transferir()`,
// `lead_revocar_acceso()`, `lead_salir()`): esto sólo gobierna qué se dibuja. Nada de React ni de
// Supabase.
import { z } from 'zod'
import { alcanceDe, type Permisos } from '@/shared/lib/permisos'

export type TipoDeAcceso = 'dueno' | 'compartido'

export type PersonaDeCartera = {
  usuarioId: string
  nombre: string
  tipoAcceso: TipoDeAcceso
  // ISO: desde cuándo lo tiene.
  desde: string
  // Quién se lo compartió, si fue compartido.
  compartidoPor: string | null
  // Es quien mira.
  esYo: boolean
}

// Lo que dice la pantalla (texto, nunca sólo un estilo).
export const ETIQUETA_DE_ACCESO: Record<TipoDeAcceso, string> = {
  dueno: 'Dueño',
  compartido: 'Compartido',
}

export const TITULO_DE_CARTERA = 'Quién lo tiene'
export const ETIQUETA_DE_SALIR = 'Salir de este lead'

// El valor de `?panel=` de cada panel.
export const PANEL_COMPARTIR = 'compartir-lead'
export const PANEL_TRANSFERIR = 'transferir-lead'

// `adoptado` es un valor del enum que quedó sin uso: quien adopta entra como dueño. Se lee como
// dueño si alguna vez aparece.
const esquemaPersona = z.object({
  usuario_id: z.guid(),
  nombre: z.string(),
  tipo_acceso: z.enum(['dueno', 'compartido', 'adoptado']),
  desde: z.string(),
  compartido_por: z.string().nullable().optional(),
  es_yo: z.boolean(),
})

export function carteraDesde(crudo: unknown): PersonaDeCartera[] | null {
  const leida = z.array(esquemaPersona).safeParse(crudo)
  if (!leida.success) {
    return null
  }
  return leida.data.map((p) => ({
    usuarioId: p.usuario_id,
    nombre: p.nombre,
    tipoAcceso: p.tipo_acceso === 'compartido' ? 'compartido' : 'dueno',
    desde: p.desde,
    compartidoPor: p.compartido_por ?? null,
    esYo: p.es_yo,
  }))
}

export type ResultadoDeCartera = 'compartido' | 'transferido' | 'revocado' | 'salio' | 'sin_cambios'

export type RespuestaDeCartera = {
  resultado: ResultadoDeCartera
  // Cómo quedó la cartera (no viene al salir: ya no se ve).
  cartera: PersonaDeCartera[] | null
}

const esquemaRespuesta = z.object({
  resultado: z.enum(['compartido', 'transferido', 'revocado', 'salio', 'sin_cambios']),
  cartera: z.unknown().optional(),
})

export function respuestaDeCarteraDesde(crudo: unknown): RespuestaDeCartera | null {
  const leida = esquemaRespuesta.safeParse(crudo)
  if (!leida.success) {
    return null
  }
  const cartera = leida.data.cartera === undefined ? null : carteraDesde(leida.data.cartera)
  if (leida.data.cartera !== undefined && cartera === null) {
    return null
  }
  return { resultado: leida.data.resultado, cartera }
}

export type CandidatoDeCartera = { id: string; nombre: string }

export function candidatosDesde(crudo: unknown): CandidatoDeCartera[] | null {
  const leidos = z.array(z.object({ id: z.guid(), nombre: z.string() })).safeParse(crudo)
  return leidos.success ? leidos.data : null
}

// Las que se dibujan según el permiso y la cartera de quien mira.
export type AccionesDeCartera = {
  compartir: boolean
  transferir: boolean
  // «Quitar acceso» a un compartido ajeno (la fila que no es la propia ni la del dueño).
  quitar: boolean
  // «Salir de este lead»: sólo un compartido, y sólo si queda alguien más.
  salir: boolean
}

export const SIN_ACCIONES: AccionesDeCartera = {
  compartir: false,
  transferir: false,
  quitar: false,
  salir: false,
}

// Con «propios» mueve el lead quien es su dueño; con «todos», quien lo ve (la supervisión).
function alcanzaPara(alcance: 'propios' | 'todos' | null, soyDueno: boolean): boolean {
  return alcance === 'todos' || (alcance === 'propios' && soyDueno)
}

export function accionesDeCartera(
  permisos: Permisos,
  cartera: readonly PersonaDeCartera[],
): AccionesDeCartera {
  const yo = cartera.find((p) => p.esYo)
  const soyDueno = yo?.tipoAcceso === 'dueno'
  const compartir = alcanzaPara(alcanceDe(permisos, 'leads.compartir'), soyDueno)
  return {
    compartir,
    transferir: alcanzaPara(alcanceDe(permisos, 'leads.transferir'), soyDueno),
    quitar: compartir && cartera.some((p) => p.tipoAcceso === 'compartido' && !p.esYo),
    salir: yo?.tipoAcceso === 'compartido' && cartera.length > 1,
  }
}

// ¿Se le puede quitar el acceso a esta fila? Al dueño no (se transfiere) y a sí mismo tampoco (sale).
export function sePuedeQuitarA(persona: PersonaDeCartera, acciones: AccionesDeCartera): boolean {
  return acciones.quitar && persona.tipoAcceso === 'compartido' && !persona.esYo
}

export function duenoDe(cartera: readonly PersonaDeCartera[]): PersonaDeCartera | null {
  return cartera.find((p) => p.tipoAcceso === 'dueno') ?? null
}

// Lo que se dice antes de transferir: quién deja de ser dueño, quién pasa a serlo y que el saliente
// no pierde el lead.
export function textoDeTransferencia(
  nombreDelLead: string,
  cartera: readonly PersonaDeCartera[],
  entrante: string,
): string {
  const dueno = duenoDe(cartera)
  if (!dueno) {
    return `«${nombreDelLead}» pasará a ser de ${entrante}.`
  }
  const saliente = dueno.esYo ? 'Tú' : dueno.nombre
  return `«${nombreDelLead}» pasará a ser de ${entrante}. ${saliente} ${
    dueno.esYo ? 'seguirás' : 'seguirá'
  } con acceso compartido.`
}

// Los candidatos que coinciden con lo escrito (sin tildes ni mayúsculas).
export function filtrarCandidatos(
  candidatos: readonly CandidatoDeCartera[],
  texto: string,
): CandidatoDeCartera[] {
  const normal = (valor: string) =>
    valor
      .normalize('NFD')
      .replaceAll(/\p{Diacritic}/gu, '')
      .toLowerCase()
  const buscado = normal(texto.trim())
  if (buscado === '') {
    return [...candidatos]
  }
  return candidatos.filter((c) => normal(c.nombre).includes(buscado))
}

export const MENSAJE_DE_SIN_CANDIDATOS = 'No hay nadie más a quien dárselo.'

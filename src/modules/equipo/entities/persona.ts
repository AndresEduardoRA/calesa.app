// Una persona del equipo vista por quien lo administra: su estado, sus roles y lo que pasa si
// se la da de baja. La lista sale de `perfiles`; acá sólo se le da forma.
import { z } from 'zod'
import {
  TOPE_DEL_CONTEO,
  conteoAcotado,
  conteoEnFrase,
  type ConteoAcotado,
} from '@/shared/lib/conteo'
import type { RolDeLaPersona } from './sesion'

// Una persona puede estar en un solo estado. El orden importa: una cuenta dada de baja ya no
// está bloqueada ni pendiente, aunque las columnas viejas lo digan.
export const ESTADOS_PERSONA = ['activa', 'invitacion_pendiente', 'bloqueada', 'baja'] as const
export type EstadoPersona = (typeof ESTADOS_PERSONA)[number]

export const ETIQUETA_ESTADO: Record<EstadoPersona, string> = {
  activa: 'Activa',
  invitacion_pendiente: 'Invitación pendiente',
  bloqueada: 'Bloqueada',
  baja: 'Dada de baja',
}

export type PersonaDelEquipo = {
  id: string
  nombre: string
  email: string
  // Ruta dentro del bucket público `avatares`, y su miniatura de 96 px (cierre 1: la que dibuja la lista; nula hasta que
  // la hace el relleno).
  avatarRuta: string | null
  avatarMiniaturaRuta: string | null
  estado: EstadoPersona
  bloqueoMotivo: string | null
  // Dada de baja y con sus leads todavía pasándose por lotes (`equipo_bajas.terminada_en` nulo).
  bajaEnCurso: boolean
  roles: RolDeLaPersona[]
}

type Cuenta = {
  activo: boolean
  bloqueado: boolean
  invitadoEn: string | null
  invitacionAceptadaEn: string | null
}

// Invitación pendiente = nació invitada y todavía no eligió su contraseña.
export function estadoDePersona(cuenta: Cuenta): EstadoPersona {
  if (!cuenta.activo) {
    return 'baja'
  }
  if (cuenta.bloqueado) {
    return 'bloqueada'
  }
  return cuenta.invitadoEn !== null && cuenta.invitacionAceptadaEn === null
    ? 'invitacion_pendiente'
    : 'activa'
}

const esquemaPersonas = z.array(
  z.object({
    // guid y no uuid: `z.uuid()` exige versión y variante RFC, y Postgres acepta cualquier uuid.
    id: z.guid(),
    nombre: z.string(),
    email: z.string().nullable(),
    avatar_ruta: z.string().nullable(),
    avatar_miniatura_ruta: z.string().nullable().optional(),
    activo: z.boolean(),
    bloqueado: z.boolean(),
    bloqueo_motivo: z.string().nullable(),
    invitado_en: z.string().nullable(),
    invitacion_aceptada_en: z.string().nullable(),
    // Sólo la ve quien tiene `equipo.usuarios.ver`; sin fila (o sin el permiso), nula.
    equipo_bajas: z.object({ terminada_en: z.string().nullable() }).nullable().optional(),
    usuarios_roles: z.array(
      z.object({
        es_principal: z.boolean(),
        roles: z
          .object({
            id: z.guid(),
            clave: z.string(),
            nombre: z.string(),
            color: z.string().nullable(),
            orden: z.number(),
          })
          .nullable(),
      }),
    ),
  }),
)

// Las filas de `perfiles` con sus roles (así las lee infra). El rol principal va primero.
export function personasDesde(filas: unknown): PersonaDelEquipo[] {
  return esquemaPersonas.parse(filas).map((fila) => ({
    id: fila.id,
    nombre: fila.nombre,
    email: fila.email ?? '',
    avatarRuta: fila.avatar_ruta,
    avatarMiniaturaRuta: fila.avatar_miniatura_ruta ?? null,
    estado: estadoDePersona({
      activo: fila.activo,
      bloqueado: fila.bloqueado,
      invitadoEn: fila.invitado_en,
      invitacionAceptadaEn: fila.invitacion_aceptada_en,
    }),
    bloqueoMotivo: fila.bloqueo_motivo,
    bajaEnCurso:
      !fila.activo && fila.equipo_bajas != null && fila.equipo_bajas.terminada_en === null,
    roles: fila.usuarios_roles
      .flatMap(({ es_principal, roles }) =>
        roles ? [{ ...roles, esPrincipal: es_principal }] : [],
      )
      .sort((a, b) => Number(b.esPrincipal) - Number(a.esPrincipal) || a.orden - b.orden)
      .map(({ id, clave, nombre, color, esPrincipal }) => ({
        id,
        clave,
        nombre,
        color,
        esPrincipal,
      })),
  }))
}

// Cómo se la nombra en pantalla y en un diálogo: su nombre o, si no lo cargó, su correo.
export function nombreDePersona(persona: Pick<PersonaDelEquipo, 'nombre' | 'email'>): string {
  return persona.nombre.trim() || persona.email || 'Sin nombre'
}

// El filtro de la lista. «vigentes» es lo que se ve al entrar: todas menos las dadas de baja.
export const FILTROS_DE_ESTADO = ['vigentes', ...ESTADOS_PERSONA] as const
export type FiltroDeEstado = (typeof FILTROS_DE_ESTADO)[number]

export const ETIQUETA_FILTRO: Record<FiltroDeEstado, string> = {
  vigentes: 'En el equipo',
  activa: 'Activas',
  invitacion_pendiente: 'Invitaciones pendientes',
  bloqueada: 'Bloqueadas',
  baja: 'Dadas de baja',
}

function sinAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function filtrarPersonas(
  personas: readonly PersonaDelEquipo[],
  filtro: { estado: FiltroDeEstado; texto: string },
): PersonaDelEquipo[] {
  const buscado = sinAcentos(filtro.texto.trim())
  return personas.filter((persona) => {
    const porEstado =
      filtro.estado === 'vigentes' ? persona.estado !== 'baja' : persona.estado === filtro.estado
    const porTexto =
      buscado === '' || sinAcentos(`${persona.nombre} ${persona.email}`).includes(buscado)
    return porEstado && porTexto
  })
}

// Lo que hay que saber antes de dar de baja a alguien (`equipo_vista_previa_baja()`): la base cuenta hasta 1.001,
// así que con más se dice «más de 1.000».
export type VistaPreviaDeBaja = {
  leadsAlLimbo: ConteoAcotado
  oportunidadesAbiertas: ConteoAcotado
}

const esquemaVistaPrevia = z.object({
  leads_al_limbo: z.number().int().nonnegative(),
  oportunidades_abiertas: z.number().int().nonnegative(),
})

export function vistaPreviaDesde(json: unknown): VistaPreviaDeBaja {
  const { leads_al_limbo, oportunidades_abiertas } = esquemaVistaPrevia.parse(json)
  return {
    leadsAlLimbo: conteoAcotado(leads_al_limbo, TOPE_DEL_CONTEO),
    oportunidadesAbiertas: conteoAcotado(oportunidades_abiertas, TOPE_DEL_CONTEO),
  }
}

function esUno(conteo: ConteoAcotado): boolean {
  return !conteo.hayMas && conteo.n === 1
}

function fraseDeLeads(conteo: ConteoAcotado): string {
  if (conteo.n === 0) {
    return 'No tiene leads a su cargo.'
  }
  return esUno(conteo)
    ? '1 lead irá al limbo: queda sin dueño y nadie lo ve hasta que alguien registre su teléfono.'
    : `${conteoEnFrase(conteo)} leads irán al limbo: quedan sin dueño y nadie los ve hasta que alguien registre su teléfono.`
}

function fraseDeOportunidades(conteo: ConteoAcotado): string | null {
  if (conteo.n === 0) {
    return null
  }
  return esUno(conteo)
    ? 'Su oportunidad abierta se cancela.'
    : `Sus ${conteoEnFrase(conteo)} oportunidades abiertas se cancelan.`
}

// El texto del diálogo de baja: qué se pierde, y que no se puede deshacer.
export function descripcionDeBaja(vista: VistaPreviaDeBaja): string {
  return [
    fraseDeLeads(vista.leadsAlLimbo),
    fraseDeOportunidades(vista.oportunidadesAbiertas),
    'Deja de poder ingresar. No se puede deshacer.',
  ]
    .filter((frase) => frase !== null)
    .join(' ')
}

// El id de una persona tal como llegó en la URL (`?persona=`, `?baja=`): un uuid, o nada.
export function idDePersona(valor: string | undefined | null): string | null {
  const id = z.guid().safeParse(valor)
  return id.success ? id.data : null
}

export const MOTIVO_CUENTA_PROPIA = 'Es tu propia cuenta: no puedes bloquearla ni darla de baja.'

// Lo que quien gestiona el equipo puede hacer sobre una persona, según en qué estado está.
// Sobre la cuenta propia no se bloquea ni se da de baja (la base también lo impide).
export type AccionesSobrePersona = {
  roles: boolean
  bloqueo: 'bloquear' | 'desbloquear' | null
  baja: boolean
  // Generar otro enlace de invitación: sólo mientras está pendiente.
  enlace: boolean
  esPropia: boolean
}

export function accionesSobre(
  persona: Pick<PersonaDelEquipo, 'id' | 'estado'>,
  yoId: string,
): AccionesSobrePersona {
  const esPropia = persona.id === yoId
  if (persona.estado === 'baja') {
    return { roles: false, bloqueo: null, baja: false, enlace: false, esPropia }
  }
  const bloqueo = persona.estado === 'bloqueada' ? 'desbloquear' : 'bloquear'
  return {
    roles: true,
    bloqueo: esPropia ? null : bloqueo,
    baja: !esPropia,
    enlace: persona.estado === 'invitacion_pendiente',
    esPropia,
  }
}

// Lo que devuelve `equipo_dar_de_baja`: si terminó en la llamada y cuántos leads quedaron sin nadie hasta ahí (exacto:
// son los que pasó). Una cartera grande termina en el job `equipo-bajas`, a lo sumo en unos minutos.
export type BajaHecha = { terminada: boolean; leadsAlLimbo: number }

const esquemaBajaHecha = z.object({
  terminada: z.boolean(),
  leads_al_limbo: z.number().int().nonnegative(),
})

export function bajaHechaDesde(json: unknown): BajaHecha | null {
  const leida = esquemaBajaHecha.safeParse(json)
  return leida.success
    ? { terminada: leida.data.terminada, leadsAlLimbo: leida.data.leads_al_limbo }
    : null
}

export const AVISO_DE_BAJA_EN_CURSO = 'Pasando sus leads'

// Lo que se le dice a quien dio de baja a alguien, con lo que devolvió la base.
export function resultadoDeBaja(nombre: string, { terminada, leadsAlLimbo }: BajaHecha): string {
  if (!terminada) {
    return `${nombre} ya no forma parte del equipo. Tenía muchos leads: terminamos de pasarlos en unos minutos. Mientras tanto, los que quedan sin nadie ya están en el limbo y nadie más los ve como suyos.`
  }
  if (leadsAlLimbo === 0) {
    return `${nombre} ya no forma parte del equipo.`
  }
  return leadsAlLimbo === 1
    ? `${nombre} ya no forma parte del equipo. 1 lead quedó en el limbo.`
    : `${nombre} ya no forma parte del equipo. ${String(leadsAlLimbo)} leads quedaron en el limbo.`
}

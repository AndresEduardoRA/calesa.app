// El acceso del cliente al portal, del lado del equipo: cómo está (`portal_estado`), lo que vuelve al
// otorgarlo y la regla de la clave. Otorgar, volver a otorgar, revocar, desbloquear y ver el estado son
// contenido (clase 1): la cartera del lead y `leads.portal.gestionar`; la base lo vuelve a decidir. La
// clave nunca se guarda en claro: la que genera la base vuelve una sola vez y la pantalla la olvida al
// cerrarse.
import { z } from 'zod'
import { puede, type Permisos } from '@/shared/lib/permisos'

// Los valores de `?panel=` de la sección «Portal».
export const PANEL_OTORGAR_PORTAL = 'otorgar-portal'
export const PANEL_REVOCAR_PORTAL = 'revocar-portal'

export const ESTADOS_DEL_ACCESO = ['sin_acceso', 'activo', 'bloqueado', 'revocado'] as const
export type EstadoDelAcceso = (typeof ESTADOS_DEL_ACCESO)[number]

// Quien lo otorgó o lo revocó: su nombre y si ya no está en el equipo. Nulo si la cuenta se borró.
export type PersonaDelAcceso = { nombre: string; deBaja: boolean }

export type AccesoVigente = {
  estado: Exclude<EstadoDelAcceso, 'sin_acceso'>
  codigo: string
  // La versión del acceso: «Volver a otorgar» la manda tal cual (PT409 si otra persona otorgó antes).
  otorgadoEn: string
  otorgadoPor: PersonaDelAcceso | null
  ultimoIngresoEn: string | null
  debeCambiarClave: boolean
  bloqueadoHasta: string | null
  revocadoEn: string | null
  revocadoPor: PersonaDelAcceso | null
}

export type AccesoDelCliente = { estado: 'sin_acceso' } | AccesoVigente

const esquemaPersona = z
  .object({ nombre: z.string(), de_baja: z.boolean() })
  .nullable()
  .optional()
  .transform((p) => (p ? { nombre: p.nombre, deBaja: p.de_baja } : null))

const fecha = z
  .string()
  .nullable()
  .optional()
  .transform((v) => v ?? null)

const esquemaAcceso = z.union([
  z
    .object({ estado: z.literal('sin_acceso') })
    .transform(() => ({ estado: 'sin_acceso' as const })),
  z
    .object({
      estado: z.enum(['activo', 'bloqueado', 'revocado']),
      codigo: z.string(),
      otorgado_en: z.string(),
      otorgado_por: esquemaPersona,
      ultimo_ingreso_en: fecha,
      debe_cambiar_clave: z.boolean(),
      bloqueado_hasta: fecha,
      revocado_en: fecha,
      revocado_por: esquemaPersona,
    })
    .transform((a): AccesoVigente => ({
      estado: a.estado,
      codigo: a.codigo,
      otorgadoEn: a.otorgado_en,
      otorgadoPor: a.otorgado_por,
      ultimoIngresoEn: a.ultimo_ingreso_en,
      debeCambiarClave: a.debe_cambiar_clave,
      bloqueadoHasta: a.bloqueado_hasta,
      revocadoEn: a.revocado_en,
      revocadoPor: a.revocado_por,
    })),
])

// Lo que devuelve `portal_estado()`. `null` si no tiene la forma esperada.
export function accesoDesde(data: unknown): AccesoDelCliente | null {
  const leido = esquemaAcceso.safeParse(data)
  return leido.success ? leido.data : null
}

// La versión que «Dar acceso» o «Volver a otorgar» mandan como esperada: nula si no hay acceso.
export function versionDelAcceso(acceso: AccesoDelCliente): string | null {
  return acceso.estado === 'sin_acceso' ? null : acceso.otorgadoEn
}

// El acceso vale para entrar (activo, o bloqueado por un rato): transferir el lead lo avisa.
export function accesoVigente(acceso: AccesoDelCliente | null): boolean {
  return acceso?.estado === 'activo' || acceso?.estado === 'bloqueado'
}

export type AccesoOtorgado = {
  codigo: string
  otorgadoEn: string
  // Sólo si la generó la base: se muestra una vez y no se guarda en ningún lado.
  clave: string | null
}

const esquemaOtorgado = z
  .object({ codigo: z.string(), otorgado_en: z.string(), clave: z.string().optional() })
  .transform((o): AccesoOtorgado => ({
    codigo: o.codigo,
    otorgadoEn: o.otorgado_en,
    clave: o.clave ?? null,
  }))

// Lo que devuelve `otorgar_portal()`. `null` si no tiene la forma esperada.
export function otorgadoDesde(data: unknown): AccesoOtorgado | null {
  const leido = esquemaOtorgado.safeParse(data)
  return leido.success ? leido.data : null
}

// ¿Ve y gestiona el acceso de este lead? Con el lead en la cartera y `leads.portal.gestionar` (con
// cualquier alcance: «todos» ve el lead pero no actúa sobre su contenido). Decide si la sección existe.
export function puedeGestionarPortal(permisos: Permisos, enCartera: boolean): boolean {
  return enCartera && puede(permisos, 'leads.portal.gestionar')
}

// --- La clave ------------------------------------------------------------------------------------

// Espejo de `_portal_clave_validar()`: de 8 a 64 caracteres, hasta 72 bytes (bcrypt ignora lo que
// sigue) y sin caracteres de control. Distingue mayúsculas y no se recorta.
export const LARGO_MINIMO_DE_CLAVE = 8
export const LARGO_MAXIMO_DE_CLAVE = 64
const BYTES_MAXIMOS_DE_CLAVE = 72
const CONTROL = /\p{Cc}/u

const largo = (texto: string) => [...texto].length

export const esquemaDeClave = z
  .string()
  .refine((c) => largo(c) >= LARGO_MINIMO_DE_CLAVE, {
    error: `La clave necesita al menos ${String(LARGO_MINIMO_DE_CLAVE)} caracteres.`,
  })
  .refine((c) => largo(c) <= LARGO_MAXIMO_DE_CLAVE, {
    error: `La clave puede tener hasta ${String(LARGO_MAXIMO_DE_CLAVE)} caracteres.`,
  })
  .refine((c) => new TextEncoder().encode(c).length <= BYTES_MAXIMOS_DE_CLAVE, {
    error: 'La clave es demasiado larga: usa menos tildes o símbolos.',
  })
  .refine((c) => !CONTROL.test(c), {
    error: 'La clave no puede llevar saltos de línea ni tabulaciones.',
  })

// El motivo por el que una clave escrita no sirve, o `null`.
export function motivoDeClave(clave: string): string | null {
  const leido = esquemaDeClave.safeParse(clave)
  return leido.success ? null : (leido.error.issues[0]?.message ?? null)
}

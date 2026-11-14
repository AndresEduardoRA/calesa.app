// Los teléfonos de un lead que se administran desde la ficha: cambiar el principal (el anterior queda
// como extra «Anterior») y agregar, rotular o quitar extras. Lo mismo en el navegador (para avisar
// antes de enviar) y lo que la base vuelve a comprobar (`cambiar_telefono_lead()`,
// `lead_telefono_guardar()`): los mismos motivos, el mismo texto. Nada acá sabe de React ni de
// Supabase.
import { z } from 'zod'
import { alcanceDe, type Permisos } from '@/shared/lib/permisos'
import type { LeadDeFicha, TelefonoExtra } from './ficha'
import { normalizarTelefono } from './telefono'
import { verificacionDesde, type Verificacion } from './verificacion'

// El máximo de extras por lead es de la empresa (`ajustes_leads.telefonos_extra_maximo`): 6 de fábrica, de 0 a 20. La base lo aplica al
// agregar, no al reemplazar el principal; los leads que ya tienen más los conservan.
export const MAXIMO_DE_FABRICA = 6
export const LIMITES_DEL_MAXIMO = { minimo: 0, maximo: 20 } as const

// «Agregar teléfono» en el panel y en el resumen abre su modal con esta clave de la URL (`?extra=nuevo`): `?panel=` ya lo ocupa la
// edición del lead.
export const CLAVE_DE_EXTRA_EN_PANEL = 'extra'
export const VALOR_DE_EXTRA_NUEVO = 'nuevo'

export const LARGO_MAXIMO_DE_ETIQUETA = 40

// La etiqueta con la que queda el principal que se reemplazó (la pone la base).
export const ETIQUETA_DEL_ANTERIOR = 'Anterior'

// El valor de `?panel=` que abre el cambio del principal. Comparte la clave con la edición de la
// ficha: no pueden estar abiertos a la vez.
export const PANEL_CAMBIAR_TELEFONO = 'cambiar-telefono'

// El de «Agregar teléfono»: un modal con su URL, también compartida con los demás paneles de la ficha.
export const PANEL_AGREGAR_TELEFONO = 'agregar-telefono'

// Las claves del formulario son las que pone la base en el `hint` de un error.
export const CLAVE_DE_TELEFONO = { telefono: 'telefono', etiqueta: 'etiqueta' } as const

// El de «Cambiar» el principal: sólo quien tiene el lead en su cartera y puede editarlo (la misma
// regla que `puedeEditarLead()`: contenido, clase 1). La base lo vuelve a decidir.
export function puedeCambiarTelefonoDeLead(permisos: Permisos, enCartera: boolean): boolean {
  return enCartera && alcanceDe(permisos, 'leads.editar') !== null
}

// Agregar, rotular y quitar extras: la cartera y su propio permiso (`leads.telefonos_extra.editar`, clase 1), sin pedir `leads.editar`.
export function puedeEditarTelefonosExtra(permisos: Permisos, enCartera: boolean): boolean {
  return enCartera && alcanceDe(permisos, 'leads.telefonos_extra.editar') !== null
}

// Cerrar «Agregar teléfono» con esto escrito lo perdería: se pregunta antes. Sólo espacios no cuenta.
export function hayCambiosEnExtra({ telefono, etiqueta }: { telefono: string; etiqueta: string }) {
  return telefono.trim() !== '' || etiqueta.trim() !== ''
}

export const MOTIVO_DE_TELEFONO_REPETIDO = 'Ese número ya está en este lead.'
export const MOTIVO_SIN_EXTRAS = 'Esta empresa no admite teléfonos extra.'
export const MOTIVO_DE_ETIQUETA_LARGA = `La etiqueta admite hasta ${String(LARGO_MAXIMO_DE_ETIQUETA)} caracteres.`

// Espejo exacto del texto de `lead_telefono_guardar()`.
export function motivoDeTope(maximo: number): string {
  return maximo === 0
    ? MOTIVO_SIN_EXTRAS
    : `Un lead admite hasta ${String(maximo)} teléfonos extra. Quita uno para agregar otro.`
}

export type TopeDeExtras = {
  // No entra otro: ya tiene el máximo o más.
  alcanzado: boolean
  // Cuántos habría que quitar para poder agregar uno (0 si no se pasa del máximo).
  sobran: number
  // Lo que se le dice a quien no puede agregar; vacío si puede.
  motivo: string
}

// El tope de un lead con `cantidad` extras. Con más que el máximo (se bajó después) dice cuántos quitar; con exactamente el máximo, el
// mismo texto que la base.
export function topeDeExtras(cantidad: number, maximo: number): TopeDeExtras {
  const sobran = Math.max(0, cantidad - maximo)
  if (cantidad < maximo) {
    return { alcanzado: false, sobran: 0, motivo: '' }
  }
  if (cantidad === maximo) {
    return { alcanzado: true, sobran: 0, motivo: motivoDeTope(maximo) }
  }
  const quitar = String(sobran + 1)
  return {
    alcanzado: true,
    sobran,
    motivo: `Este lead tiene ${String(cantidad)} teléfonos extra y el máximo es ${String(maximo)}: quita ${quitar} para agregar otro.`,
  }
}

export type EntradaDeExtra = {
  codigoDePais: string | null
  // Como se escribió.
  telefono: string
  etiqueta: string
  // El principal del lead, completo (la cartera lo recibe así).
  principal: string
  extras: readonly TelefonoExtra[]
  // El máximo de extras de la empresa.
  maximo: number
  // El extra que se está rotulando: su número no cambia, así que sólo se mira la etiqueta.
  rotulando?: TelefonoExtra | null
}

export type ExtraValidado =
  | { ok: true; numero: string; etiqueta: string | null }
  | { ok: false; porCampo: Partial<Record<keyof typeof CLAVE_DE_TELEFONO, string>> }

// La etiqueta es opcional: vacía queda nula.
export function etiquetaDeExtra(escrita: string): string | null {
  const limpia = escrita.trim()
  return limpia === '' ? null : limpia
}

// ¿Se puede guardar este extra? El número se normaliza como el del alta; no puede repetirse dentro
// del lead ni ser el principal; con el máximo no entra otro. Contra otros leads lo dice la base
// (`verificar_telefono_extra()`): según la regla de la empresa un extra puede repetirse o no.
export function validarExtra(entrada: EntradaDeExtra): ExtraValidado {
  const etiqueta = etiquetaDeExtra(entrada.etiqueta)
  const porCampo: Partial<Record<keyof typeof CLAVE_DE_TELEFONO, string>> = {}
  if (etiqueta !== null && etiqueta.length > LARGO_MAXIMO_DE_ETIQUETA) {
    porCampo.etiqueta = MOTIVO_DE_ETIQUETA_LARGA
  }
  if (entrada.rotulando) {
    return Object.keys(porCampo).length > 0
      ? { ok: false, porCampo }
      : { ok: true, numero: entrada.rotulando.telefono, etiqueta }
  }
  const normalizado = normalizarTelefono(entrada.codigoDePais, entrada.telefono)
  if (!normalizado.ok) {
    porCampo.telefono = normalizado.motivo
  } else if (
    normalizado.numero === entrada.principal ||
    entrada.extras.some((extra) => extra.telefono === normalizado.numero)
  ) {
    porCampo.telefono = MOTIVO_DE_TELEFONO_REPETIDO
  } else if (entrada.extras.length >= entrada.maximo) {
    porCampo.telefono = topeDeExtras(entrada.extras.length, entrada.maximo).motivo
  }
  if (Object.keys(porCampo).length > 0 || !normalizado.ok) {
    return { ok: false, porCampo }
  }
  return { ok: true, numero: normalizado.numero, etiqueta }
}

// --- Lo que contestan las RPC -------------------------------------------------------------------------

// El estado de los teléfonos del lead después de una operación, como lo recibe quien lo tiene en su
// cartera (completos). `actualizadoEn` es la versión del lead: sólo el cambio del principal la mueve.
export type TelefonosDelLead = {
  actualizadoEn: string
  telefonoCc: string | null
  telefono: string
  telefonos: TelefonoExtra[]
}

export type CambioDeTelefono =
  | ({ resultado: 'cambiado' | 'sin_cambios' } & TelefonosDelLead)
  // El número ya existe: no cambió nada y nadie adoptó. Se dice como en el alta.
  | { resultado: 'existe' | 'de_otro' | 'limbo'; verificacion: Verificacion }

export type QuitadoDeExtra = {
  id: string
  telefono: string
  etiqueta: string | null
  creadoEn: string
}

export type ExtrasGuardados = TelefonosDelLead & {
  resultado: 'agregado' | 'rotulado' | 'quitado' | 'sin_cambios'
  // Lo que se quitó, para poder restituirlo con «Deshacer» (mismo id, etiqueta y lugar).
  quitado: QuitadoDeExtra | null
}

// Con «Los teléfonos extra cuentan como el principal» encendida, agregar un número que ya tiene otro lead no escribe: se dice como en el
// alta, con el mismo texto.
export type ChoqueDeExtra = {
  resultado: 'existe' | 'de_otro' | 'limbo'
  verificacion: Verificacion
}

export type CambioDeExtras = ExtrasGuardados | ChoqueDeExtra

export function esChoqueDeExtra(cambio: CambioDeExtras): cambio is ChoqueDeExtra {
  return 'verificacion' in cambio
}

const esquemaExtra = z.object({
  id: z.guid(),
  telefono: z.string(),
  etiqueta: z.string().nullable(),
})

const esquemaDelEstado = z.object({
  actualizado_en: z.string(),
  telefono_cc: z.string().nullable(),
  telefono: z.string(),
  telefonos: z.array(esquemaExtra),
})

function estadoDesde(lectura: z.infer<typeof esquemaDelEstado>): TelefonosDelLead {
  return {
    actualizadoEn: lectura.actualizado_en,
    telefonoCc: lectura.telefono_cc,
    telefono: lectura.telefono,
    telefonos: lectura.telefonos,
  }
}

const esquemaDelCambio = z.discriminatedUnion('resultado', [
  esquemaDelEstado.extend({ resultado: z.enum(['cambiado', 'sin_cambios']) }),
  z.object({ resultado: z.enum(['existe', 'de_otro', 'limbo']), verificacion: z.unknown() }),
])

// El `jsonb` de `cambiar_telefono_lead()`. Algo que no calza es un error de programación: sube como
// excepción y lo recoge el límite de la action.
export function cambioDesde(crudo: unknown): CambioDeTelefono {
  const lectura = esquemaDelCambio.parse(crudo)
  if ('verificacion' in lectura) {
    return { resultado: lectura.resultado, verificacion: verificacionDesde(lectura.verificacion) }
  }
  return { resultado: lectura.resultado, ...estadoDesde(lectura) }
}

const esquemaDeExtras = esquemaDelEstado.extend({
  resultado: z.enum(['agregado', 'rotulado', 'quitado', 'sin_cambios']),
  quitado: z
    .object({
      id: z.guid(),
      telefono: z.string(),
      etiqueta: z.string().nullable(),
      creado_en: z.string(),
    })
    .nullable()
    .optional(),
})

function guardadoDesde(lectura: z.infer<typeof esquemaDeExtras>): ExtrasGuardados {
  return {
    resultado: lectura.resultado,
    ...estadoDesde(lectura),
    quitado: lectura.quitado
      ? {
          id: lectura.quitado.id,
          telefono: lectura.quitado.telefono,
          etiqueta: lectura.quitado.etiqueta,
          creadoEn: lectura.quitado.creado_en,
        }
      : null,
  }
}

// El `jsonb` de `lead_telefono_quitar()`: siempre la lista.
export function quitadoDesde(crudo: unknown): ExtrasGuardados {
  return guardadoDesde(esquemaDeExtras.parse(crudo))
}

const esquemaDelGuardado = z.union([
  esquemaDeExtras,
  z.object({ resultado: z.enum(['existe', 'de_otro', 'limbo']), verificacion: z.unknown() }),
])

// El `jsonb` de `lead_telefono_guardar()`: la lista, o el choque con otro lead.
export function extrasDesde(crudo: unknown): CambioDeExtras {
  const lectura = esquemaDelGuardado.parse(crudo)
  if ('verificacion' in lectura) {
    return { resultado: lectura.resultado, verificacion: verificacionDesde(lectura.verificacion) }
  }
  return guardadoDesde(lectura)
}

// --- Lo que lee el resumen -----------------------------------------------------------------------------

// Los teléfonos de un lead sin traer la ficha entera (`lead_telefonos_leer()`): el resumen del listado.
export type LeadDeTelefonos = {
  id: string
  telefonoCc: string | null
  // Como lo entrega la base: completo para la cartera, enmascarado para el resto.
  telefono: string
  enCartera: boolean
  telefonos: TelefonoExtra[]
  telefonosMaximo: number
}

// Lo mismo que lee el resumen, con lo que ya trae la ficha.
export function telefonosDeLaFicha(ficha: LeadDeFicha): LeadDeTelefonos {
  return {
    id: ficha.id,
    telefonoCc: ficha.telefonoCc,
    telefono: ficha.telefono,
    enCartera: ficha.enCartera,
    telefonos: ficha.telefonos,
    telefonosMaximo: ficha.telefonosMaximo,
  }
}

const esquemaDeLectura = z.object({
  id: z.guid(),
  telefono_cc: z.string().nullable(),
  telefono: z.string().nullable(),
  en_cartera: z.boolean(),
  maximo: z.number().int().min(LIMITES_DEL_MAXIMO.minimo).max(LIMITES_DEL_MAXIMO.maximo),
  telefonos: z.array(esquemaExtra),
})

// El `jsonb` de `lead_telefonos_leer()`; `null` si el lead no se ve o la respuesta no cumple la forma.
export function telefonosDelLeadDesde(crudo: unknown): LeadDeTelefonos | null {
  const leido = esquemaDeLectura.safeParse(crudo)
  if (!leido.success) {
    return null
  }
  const l = leido.data
  return {
    id: l.id,
    telefonoCc: l.telefono_cc,
    telefono: l.telefono ?? '',
    enCartera: l.en_cartera,
    telefonos: l.telefonos,
    telefonosMaximo: l.maximo,
  }
}

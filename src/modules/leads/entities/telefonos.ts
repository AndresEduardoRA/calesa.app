// Los teléfonos de un lead que se administran desde la ficha: cambiar el principal (el anterior queda
// como extra «Anterior») y agregar, rotular o quitar extras. Lo mismo en el navegador (para avisar
// antes de enviar) y lo que la base vuelve a comprobar (`cambiar_telefono_lead()`,
// `lead_telefono_guardar()`): los mismos motivos, el mismo texto. Nada acá sabe de React ni de
// Supabase.
import { z } from 'zod'
import { alcanceDe, type Permisos } from '@/shared/lib/permisos'
import type { TelefonoExtra } from './ficha'
import { normalizarTelefono } from './telefono'
import { verificacionDesde, type Verificacion } from './verificacion'

// Hasta 10 extras por lead; la base lo aplica al agregar, no al reemplazar el principal.
export const MAXIMO_DE_TELEFONOS_EXTRA = 10

export const LARGO_MAXIMO_DE_ETIQUETA = 40

// La etiqueta con la que queda el principal que se reemplazó (la pone la base).
export const ETIQUETA_DEL_ANTERIOR = 'Anterior'

// El valor de `?panel=` que abre el cambio del principal. Comparte la clave con la edición de la
// ficha: no pueden estar abiertos a la vez.
export const PANEL_CAMBIAR_TELEFONO = 'cambiar-telefono'

// Las claves del formulario son las que pone la base en el `hint` de un error.
export const CLAVE_DE_TELEFONO = { telefono: 'telefono', etiqueta: 'etiqueta' } as const

// El de «Cambiar» y los extras: sólo quien tiene el lead en su cartera y puede editarlo (la misma
// regla que `puedeEditarLead()`: contenido, clase 1). La base lo vuelve a decidir.
export function puedeCambiarTelefonoDeLead(permisos: Permisos, enCartera: boolean): boolean {
  return enCartera && alcanceDe(permisos, 'leads.editar') !== null
}

export const MOTIVO_DE_TELEFONO_REPETIDO = 'Ese número ya está en este lead.'
export const MOTIVO_DE_TOPE_DE_EXTRAS = `Un lead admite hasta ${String(MAXIMO_DE_TELEFONOS_EXTRA)} teléfonos extra. Quita uno para agregar otro.`
export const MOTIVO_DE_ETIQUETA_LARGA = `La etiqueta admite hasta ${String(LARGO_MAXIMO_DE_ETIQUETA)} caracteres.`

export type EntradaDeExtra = {
  codigoDePais: string | null
  // Como se escribió.
  telefono: string
  etiqueta: string
  // El principal del lead, completo (la cartera lo recibe así).
  principal: string
  extras: readonly TelefonoExtra[]
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
// del lead ni ser el principal; con 10 no entra otro. No se verifica contra otros leads: un extra
// no tiene unicidad.
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
  } else if (entrada.extras.length >= MAXIMO_DE_TELEFONOS_EXTRA) {
    porCampo.telefono = MOTIVO_DE_TOPE_DE_EXTRAS
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

export type CambioDeExtras = TelefonosDelLead & {
  resultado: 'agregado' | 'rotulado' | 'quitado' | 'sin_cambios'
  // Lo que se quitó, para poder restituirlo con «Deshacer» (mismo id, etiqueta y lugar).
  quitado: QuitadoDeExtra | null
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

// El `jsonb` de `lead_telefono_guardar()` y de `lead_telefono_quitar()`.
export function extrasDesde(crudo: unknown): CambioDeExtras {
  const lectura = esquemaDeExtras.parse(crudo)
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

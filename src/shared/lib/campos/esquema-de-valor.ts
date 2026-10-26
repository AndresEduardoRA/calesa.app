// El esquema Zod de un dato escrito en un formulario de campos, uno por tipo. Es la misma pieza en
// el formulario (para avisar antes de enviar) y en la Server Action (que vuelve a leer el layout):
// las dos validan igual. La base es la última línea y su mensaje lleva el campo en el `hint`.
import { z } from 'zod'
import { instanteDeLocal } from '../fechas'
import type { OpcionDeCampo, TipoDeCampo } from './tipos'

export type Dato = string | number | boolean | string[] | null

export type Esquema = z.ZodType<Dato, unknown>

export const OBLIGATORIO = 'Este dato es obligatorio.'
export const LARGO_DE_TEXTO = 500
export const LARGO_DE_TEXTO_LARGO = 5000
export const NUMERO_MAXIMO = 1_000_000_000_000
const LARGO_DE_CORREO = 160
const LARGO_DE_DOCUMENTO = 30
const VIN = /^[A-HJ-NPR-Z0-9]{11,17}$/
const FECHA = /^\d{4}-\d{2}-\d{2}$/
// Espejos de `_lead_atributos_formato()`.
const CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const DOCUMENTO = /^[A-Za-z0-9][A-Za-z0-9 ./-]{0,29}$/

const vacioANulo = (texto: string) => (texto === '' ? null : texto)

export function texto(largo: number) {
  return z
    .string()
    .trim()
    .max(largo, { error: `Hasta ${String(largo)} caracteres.` })
    .transform(vacioANulo)
}

// Acepta la coma decimal: «1,6» es 1.6.
export const aNumero = (escrito: string) =>
  escrito === '' ? null : Number(escrito.replace(',', '.'))

export function numero(minimo: number, maximo: number, entero: boolean) {
  const mensaje = entero
    ? `Tiene que ser un número entero entre ${String(minimo)} y ${String(maximo)}.`
    : 'Tiene que ser un número.'
  return z
    .string()
    .trim()
    .transform(aNumero)
    .refine(
      (valor) =>
        valor === null ||
        (Number.isFinite(valor) &&
          valor >= minimo &&
          valor <= maximo &&
          (!entero || Number.isInteger(valor))),
      { error: mensaje },
    )
}

export const siONo = () => z.boolean().nullable()

export const vin = () =>
  z
    .string()
    .trim()
    .transform((escrito) => vacioANulo(escrito.toUpperCase()))
    .refine((valor) => valor === null || VIN.test(valor), {
      error: 'El VIN lleva entre 11 y 17 letras y números, sin I, O ni Q.',
    })

export const enlace = () =>
  texto(LARGO_DE_TEXTO).refine((valor) => valor === null || /^https?:\/\/\S+$/i.test(valor), {
    error: 'Tiene que empezar con http:// o https://.',
  })

const correo = () =>
  texto(LARGO_DE_CORREO).refine((valor) => valor === null || CORREO.test(valor), {
    error: 'Tiene que ser un correo.',
  })

const documento = () =>
  z
    .string()
    .trim()
    .transform(vacioANulo)
    .refine((valor) => valor === null || DOCUMENTO.test(valor), {
      error: `Lleva letras, números y separadores, hasta ${String(LARGO_DE_DOCUMENTO)}.`,
    })

const esDia = (dia: string) => {
  const instante = new Date(`${dia}T00:00:00Z`)
  return (
    FECHA.test(dia) && !Number.isNaN(instante.getTime()) && instante.toISOString().startsWith(dia)
  )
}

const fecha = () =>
  z
    .string()
    .trim()
    .transform(vacioANulo)
    .refine((valor) => valor === null || esDia(valor), { error: 'No es una fecha válida.' })

// La hora que se escribe es la de la empresa; se guarda el instante en UTC.
function fechaHora(zona: string | undefined) {
  return z
    .string()
    .trim()
    .transform((escrito) => (escrito === '' ? null : (instanteDeLocal(escrito, { zona }) ?? '')))
    .refine((valor) => valor !== '', { error: 'No es una fecha y hora válida.' })
}

export function unaDe(validas: ReadonlySet<string>) {
  return z
    .string()
    .transform(vacioANulo)
    .refine((valor) => valor === null || validas.has(valor), {
      error: 'Elige una de las opciones.',
    })
}

function variasDe(validas: ReadonlySet<string>) {
  return z
    .array(z.string())
    .transform((elegidas) => [...new Set(elegidas)])
    .refine((elegidas) => elegidas.every((una) => validas.has(una)), {
      error: 'Hay una opción que ya no existe.',
    })
    .transform((elegidas) => (elegidas.length === 0 ? null : elegidas))
}

export function requerir(esquema: Esquema): Esquema {
  return esquema.refine((valor) => valor !== null, { error: OBLIGATORIO })
}

export type ContextoDeEsquema = {
  zona?: string | undefined
  // Lo que el registro ya tiene en ese campo: una opción que se sacó del campo sigue valiendo
  // mientras el registro la tenga (el dato se conserva).
  guardado?: unknown
}

// Las opciones que valen para un campo: las de hoy, más las que el registro ya tiene guardadas.
function opcionesValidas(opciones: readonly OpcionDeCampo[], guardado: unknown): Set<string> {
  const guardadas = Array.isArray(guardado) ? guardado : [guardado]
  return new Set([
    ...opciones.map((opcion) => opcion.clave),
    ...guardadas.filter((una): una is string => typeof una === 'string'),
  ])
}

type DeTipo = (opciones: readonly OpcionDeCampo[], contexto: ContextoDeEsquema) => Esquema

const ESQUEMA_POR_TIPO: Record<TipoDeCampo, DeTipo> = {
  texto: () => texto(LARGO_DE_TEXTO),
  texto_largo: () => texto(LARGO_DE_TEXTO_LARGO),
  lote: () => texto(LARGO_DE_TEXTO),
  numero: () => numero(-NUMERO_MAXIMO, NUMERO_MAXIMO, false),
  moneda: () => numero(-NUMERO_MAXIMO, NUMERO_MAXIMO, false),
  booleano: siONo,
  fecha,
  fecha_hora: (_opciones, contexto) => fechaHora(contexto.zona),
  url: enlace,
  vin,
  correo,
  documento,
  opcion: (opciones, contexto) => unaDe(opcionesValidas(opciones, contexto.guardado)),
  multi_opcion: (opciones, contexto) => variasDe(opcionesValidas(opciones, contexto.guardado)),
}

// El esquema de un campo del layout, según su tipo.
export function esquemaDeValor(
  campo: { tipo: TipoDeCampo; opciones: readonly OpcionDeCampo[] },
  contexto: ContextoDeEsquema = {},
): Esquema {
  return ESQUEMA_POR_TIPO[campo.tipo](campo.opciones, contexto)
}

// El primer motivo de cada campo que no pasó, por su clave en el formulario.
export function motivosPorCampo(problemas: readonly z.core.$ZodIssue[]): Record<string, string> {
  const porCampo: Record<string, string> = {}
  for (const problema of problemas) {
    porCampo[String(problema.path[0])] ??= problema.message
  }
  return porCampo
}

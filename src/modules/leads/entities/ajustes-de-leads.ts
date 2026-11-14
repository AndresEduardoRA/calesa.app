// Los ajustes de leads de la empresa (`ajustes_leads`, una sola fila): la plantilla del embudo, con la que nace el embudo de cada
// persona, y el mensaje del portal, el texto para WhatsApp al dar acceso. Cada uno con su versión. Se leen con `ajustes_leads_leer()`
// (toda cuenta activa) y se escriben por RPC con `leads.configurar` (9.04-4).
import { z } from 'zod'
import type { ErrorApp, Resultado } from '@/shared/lib/errores'
import type { Etapa } from './embudo'
import { CLAVES_DE_COLOR } from './etiqueta'
import { LIMITES_DEL_MAXIMO } from './telefonos'

// «Restablecer» cada plantilla pide confirmar, en la URL de su pestaña (`?panel=…`).
export const PANEL_RESTABLECER_EMBUDO = 'restablecer-embudo'
export const PANEL_RESTABLECER_PORTAL = 'restablecer-portal'

export type AjustesDeLeads = {
  embudo: {
    // Sin id: no son etapas de ningún embudo.
    etapas: Etapa[]
    // Nadie la cambió: son las seis de fábrica.
    deFabrica: boolean
    actualizadoEn: string
  }
  portal: {
    // Nulo: el de fábrica (`MENSAJE_DE_FABRICA`).
    mensaje: string | null
    actualizadoEn: string
  }
  // Los teléfonos extra: cuántos admite un lead y si cuentan como el principal.
  telefonos: {
    maximo: number
    comoPrincipal: boolean
    actualizadoEn: string
  }
}

// Las de fábrica llegan sin las marcas en falso (`{"nombre":"Contactado","color":"azul"}`): una marca ausente vale `false`.
const marca = z
  .boolean()
  .nullish()
  .transform((valor) => valor ?? false)

const esquemaAjustes = z.object({
  embudo: z.object({
    etapas: z.array(
      z.object({
        nombre: z.string().min(1),
        color: z.enum(CLAVES_DE_COLOR).catch('gris'),
        es_inicial: marca,
        es_ganada: marca,
        es_perdida: marca,
      }),
    ),
    de_fabrica: z.boolean(),
    actualizado_en: z.string().min(1),
  }),
  portal: z.object({
    mensaje: z.string().nullable(),
    actualizado_en: z.string().min(1),
  }),
  telefonos: z.object({
    maximo: z.number().int().min(LIMITES_DEL_MAXIMO.minimo).max(LIMITES_DEL_MAXIMO.maximo),
    como_principal: z.boolean(),
    actualizado_en: z.string().min(1),
  }),
})

// La respuesta de `ajustes_leads_leer()`; `null` si no tiene esa forma.
export function ajustesDeLeadsDesde(crudo: unknown): AjustesDeLeads | null {
  const leido = esquemaAjustes.safeParse(crudo)
  if (!leido.success) {
    return null
  }
  const { embudo, portal, telefonos } = leido.data
  return {
    embudo: {
      etapas: embudo.etapas.map((etapa) => ({
        id: null,
        nombre: etapa.nombre,
        color: etapa.color,
        esInicial: etapa.es_inicial,
        esGanada: etapa.es_ganada,
        esPerdida: etapa.es_perdida,
      })),
      deFabrica: embudo.de_fabrica,
      actualizadoEn: embudo.actualizado_en,
    },
    portal: { mensaje: portal.mensaje, actualizadoEn: portal.actualizado_en },
    telefonos: {
      maximo: telefonos.maximo,
      comoPrincipal: telefonos.como_principal,
      actualizadoEn: telefonos.actualizado_en,
    },
  }
}

// El texto del máximo de teléfonos extra (de 0 a 20, entero). Espejo de `telefonos_extra_ajustes_guardar()`: el mismo motivo.
export const MOTIVO_DE_MAXIMO_INVALIDO = `El máximo va de ${String(LIMITES_DEL_MAXIMO.minimo)} a ${String(LIMITES_DEL_MAXIMO.maximo)}.`

export function validarMaximoDeExtras(
  texto: string,
): { ok: true; maximo: number } | { ok: false; motivo: string } {
  const limpio = texto.trim()
  if (!/^\d{1,2}$/.test(limpio)) {
    return { ok: false, motivo: MOTIVO_DE_MAXIMO_INVALIDO }
  }
  const maximo = Number(limpio)
  if (maximo < LIMITES_DEL_MAXIMO.minimo || maximo > LIMITES_DEL_MAXIMO.maximo) {
    return { ok: false, motivo: MOTIVO_DE_MAXIMO_INVALIDO }
  }
  return { ok: true, maximo }
}

export type LectorDeAjustesDeLeads = () => Promise<Resultado<AjustesDeLeads>>

// Un rechazo con el campo que lo causó (`etapas`, `texto`), si lo hay.
type FalloDeAjustes = { ok: false; error: ErrorApp; campo?: string }
type Version = Promise<{ ok: true; data: { actualizadoEn: string } } | FalloDeAjustes>

export type EscritorDeAjustesDeLeads = {
  // `etapas` nulas: vuelven las de fábrica. Sin id: una plantilla no es de ningún embudo.
  guardarPlantillaDelEmbudo: (pedido: {
    etapas: readonly Omit<Etapa, 'id'>[] | null
    actualizadoEnEsperado: string
  }) => Version
  // `texto` nulo: vuelve el de fábrica.
  guardarMensajeDelPortal: (pedido: {
    texto: string | null
    actualizadoEnEsperado: string
  }) => Version
  guardarAjustesDeTelefonos: (pedido: {
    maximo: number
    comoPrincipal: boolean
    actualizadoEnEsperado: string
  }) => Version
}

// --- Los choques de teléfonos --------------------------------------------------------------------------

// Un extra que repite el número de otro lead vivo (el principal, o un extra anterior). El número va enmascarado; un lead que quien mira no
// ve llega sin id ni nombre.
export type LeadDeChoque = { id: string | null; nombre: string | null }

export type ChoqueDeTelefonos = {
  id: string
  telefono: string
  lead: LeadDeChoque
  otro: LeadDeChoque & { como: 'principal' | 'extra' }
}

export type PaginaDeChoques = {
  filas: ChoqueDeTelefonos[]
  // El cursor de la página que sigue: la última fila devuelta, o hasta donde se miró si el recorrido se cortó.
  siguiente: string | null
  hayMas: boolean
  // Se miraron las filas que admite una llamada sin llegar al final: «Seguir buscando».
  recorridoCortado: boolean
}

const esquemaDeLeadDeChoque = z.object({ id: z.guid().nullable(), nombre: z.string().nullable() })

const esquemaDeChoques = z.object({
  filas: z.array(
    z.object({
      id: z.guid(),
      telefono: z.string(),
      lead: esquemaDeLeadDeChoque,
      otro: esquemaDeLeadDeChoque.extend({ como: z.enum(['principal', 'extra']) }),
    }),
  ),
  siguiente: z.guid().nullable(),
  hay_mas: z.boolean(),
  recorrido_cortado: z.boolean(),
})

// El `jsonb` de `telefonos_extra_choques()`; `null` si no tiene esa forma.
export function choquesDesde(crudo: unknown): PaginaDeChoques | null {
  const leido = esquemaDeChoques.safeParse(crudo)
  if (!leido.success) {
    return null
  }
  const c = leido.data
  return {
    filas: c.filas,
    siguiente: c.siguiente,
    hayMas: c.hay_mas,
    recorridoCortado: c.recorrido_cortado,
  }
}

// Quien configura los pide de a una página: sin cursor la primera, con él la que sigue.
export type LectorDeChoques = (cursor: string | null) => Promise<Resultado<PaginaDeChoques>>

// Los ajustes de leads de la empresa (`ajustes_leads`, una sola fila): la plantilla del embudo, con la que nace el embudo de cada
// persona, y el mensaje del portal, el texto para WhatsApp al dar acceso. Cada uno con su versión. Se leen con `ajustes_leads_leer()`
// (toda cuenta activa) y se escriben por RPC con `leads.configurar` (9.04-4).
import { z } from 'zod'
import type { ErrorApp, Resultado } from '@/shared/lib/errores'
import type { Etapa } from './embudo'
import { CLAVES_DE_COLOR } from './etiqueta'

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
})

// La respuesta de `ajustes_leads_leer()`; `null` si no tiene esa forma.
export function ajustesDeLeadsDesde(crudo: unknown): AjustesDeLeads | null {
  const leido = esquemaAjustes.safeParse(crudo)
  if (!leido.success) {
    return null
  }
  const { embudo, portal } = leido.data
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
  }
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
}

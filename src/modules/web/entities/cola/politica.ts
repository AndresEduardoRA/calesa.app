// La política de la cola web (8.04-2): las claves de `ajustes_web` que gobiernan la rueda. La lee el tablero (los avisos) y se edita (8.04-3) con
// `web_ajustes_guardar`, con `actualizadoEn` como versión.
export type PoliticaDeLaCola = {
  colaActiva: boolean
  ttlContactoMinutos: number
  diasPegajoso: number
  maxAbiertasDefault: number
  maxIntentos: number
  whatsappRespaldo: string | null
  // La versión, intacta como vino (nunca por `Date`).
  actualizadoEn: string
}

export type FilaDePolitica = {
  cola_activa: boolean
  ttl_contacto_minutos: number
  dias_pegajoso: number
  max_abiertas_default: number
  max_intentos: number
  whatsapp_respaldo: string | null
  actualizado_en: string
}

export function politicaDesde(fila: FilaDePolitica): PoliticaDeLaCola {
  return {
    colaActiva: fila.cola_activa,
    ttlContactoMinutos: fila.ttl_contacto_minutos,
    diasPegajoso: fila.dias_pegajoso,
    maxAbiertasDefault: fila.max_abiertas_default,
    maxIntentos: fila.max_intentos,
    // Un respaldo en blanco es lo mismo que ninguno: nadie tendría a quién escribir.
    whatsappRespaldo: fila.whatsapp_respaldo?.trim() ? fila.whatsapp_respaldo : null,
    actualizadoEn: fila.actualizado_en,
  }
}

// Los rangos de cada clave, espejo de `_web_ajustes_validar` (la base decide; esto sólo pone el error junto al campo antes de enviar).
export const LIMITES_DE_LA_POLITICA = {
  ttlContactoMinutos: { min: 5, max: 1440 },
  diasPegajoso: { min: 0, max: 365 },
  maxAbiertasDefault: { min: 1, max: 50 },
  maxIntentos: { min: 1, max: 10 },
} as const

export type EdicionDePolitica = {
  colaActiva: boolean
  ttlContactoMinutos: number
  diasPegajoso: number
  maxAbiertasDefault: number
  maxIntentos: number
}

export type CambiosDePolitica = {
  cola_activa: boolean
  ttl_contacto_minutos: number
  dias_pegajoso: number
  max_abiertas_default: number
  max_intentos: number
}

// Lo que se manda a `web_ajustes_guardar`: siempre las cinco claves de la cola y ninguna más. Una clave del sitio (por ejemplo `whatsapp_respaldo`) pide
// `web.ajustes.gestionar`: con sólo `web.cola.gestionar`, todo el guardado daría 42501.
export function cambiosDePolitica(edicion: EdicionDePolitica): CambiosDePolitica {
  return {
    cola_activa: edicion.colaActiva,
    ttl_contacto_minutos: edicion.ttlContactoMinutos,
    dias_pegajoso: edicion.diasPegajoso,
    max_abiertas_default: edicion.maxAbiertasDefault,
    max_intentos: edicion.maxIntentos,
  }
}

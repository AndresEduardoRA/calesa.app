// La política de la cola web (8.04-2): las claves de `ajustes_web` que gobiernan la rueda. La lee el tablero (los avisos) y la 8.04-3 la edita con
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

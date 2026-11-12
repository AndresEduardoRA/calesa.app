// La cuenta regresiva de un turno de la web (8.05-1): cuánto falta para que `vence_en` lo pase a la siguiente persona de la rueda.
// Puro: el reloj llega como ISO (`ahora`), nunca se lee aquí. El contacto directo por handle (`vence_en` nulo) no tiene reloj.
export type CuentaRegresiva = {
  vencido: boolean
  texto: string
}

const MS_POR_MINUTO = 60_000
const MINUTOS_POR_HORA = 60

export const TEXTO_SIN_LIMITE = 'Sin límite de tiempo'
export const TEXTO_VENCIDO = 'Vencido'

// Faltan ≥ 1 h: «Vence en 1 h 05 min»; < 1 h: «Vence en 12 min»; < 1 min: «Vence en menos de 1 min»; `ahora ≥ venceEn` (inclusivo): «Vencido».
export function cuentaRegresiva(venceEn: string | null, ahora: string): CuentaRegresiva {
  if (venceEn === null) {
    return { vencido: false, texto: TEXTO_SIN_LIMITE }
  }
  const faltanMs = Date.parse(venceEn) - Date.parse(ahora)
  if (!Number.isFinite(faltanMs) || faltanMs <= 0) {
    return { vencido: true, texto: TEXTO_VENCIDO }
  }
  const minutos = Math.floor(faltanMs / MS_POR_MINUTO)
  if (minutos < 1) {
    return { vencido: false, texto: 'Vence en menos de 1 min' }
  }
  if (minutos < MINUTOS_POR_HORA) {
    return { vencido: false, texto: `Vence en ${minutos} min` }
  }
  const horas = Math.floor(minutos / MINUTOS_POR_HORA)
  const resto = String(minutos % MINUTOS_POR_HORA).padStart(2, '0')
  return { vencido: false, texto: `Vence en ${horas} h ${resto} min` }
}

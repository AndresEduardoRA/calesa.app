// El tiempo de una subasta: cuánto falta y si lo que sabemos quedó viejo.
import type { EstadoDeSubasta } from './subasta'

export type CuentaRegresiva = {
  // `por_empezar`: falta tiempo. `empezo`: la hora ya pasó.
  tipo: 'por_empezar' | 'empezo'
  texto: string
}

function distancia(milisegundos: number): string {
  const minutos = Math.floor(milisegundos / 60_000)
  const dias = Math.floor(minutos / 1440)
  const horas = Math.floor((minutos % 1440) / 60)
  const resto = minutos % 60
  if (dias > 0) {
    return horas > 0
      ? `${dias} ${dias === 1 ? 'día' : 'días'} ${horas} h`
      : `${dias} ${dias === 1 ? 'día' : 'días'}`
  }
  if (horas > 0) {
    return resto > 0 ? `${horas} h ${resto} min` : `${horas} h`
  }
  return `${Math.max(resto, 1)} min`
}

// «en 3 días 4 h», «en 2 h 15 min», «hace 5 h». Con el estado ya conocido, la ficha dice «en vivo»
// o «terminó» en vez de la cuenta: esto es sólo la distancia a la hora de la subasta.
export function cuentaRegresiva(subastaEn: string, ahora: Date): CuentaRegresiva | null {
  const instante = new Date(subastaEn).getTime()
  if (Number.isNaN(instante)) {
    return null
  }
  const diferencia = instante - ahora.getTime()
  return diferencia >= 0
    ? { tipo: 'por_empezar', texto: `en ${distancia(diferencia)}` }
    : { tipo: 'empezo', texto: `hace ${distancia(-diferencia)}` }
}

// La subasta ya debía haber empezado y el estado no cambió: la información quedó vieja.
export function estaDesactualizada(
  estado: EstadoDeSubasta | null,
  subastaEn: string | null,
  ahora: Date,
): boolean {
  if (subastaEn === null || (estado !== 'abierta' && estado !== null)) {
    return false
  }
  const instante = new Date(subastaEn).getTime()
  return !Number.isNaN(instante) && instante < ahora.getTime()
}

// El ⚙ de una celda de tipo de cambio (4.20-3c): la fila que nombra el nodo y cómo se lee el valor nuevo que se tipea. Lo puro, sin React ni I/O; la pantalla es del
// 4.20-3d. La regla de verdad (el permiso, mayor que cero, la versión esperada) es de `tipo_cambio_guardar()` y del esquema de `guardarTipoCambio` (`empresa`): esto sólo
// evita pedir lo que se va a rechazar y dice por qué junto al campo. Copia la regla de `valorTipeado` de `empresa/entities/tipos-cambio.ts`, que no sale por su
// `client.ts` (4.20-3c).
import { formatearParaEditar } from '@/shared/lib/formato'
import { avisoDeNumero, leerNumeroTipeado } from '@/shared/lib/numero-tipeado'
import { MENSAJE_DEL_VALOR_VACIO, type ValorTipeado } from './ajuste'

// La fila de `tipos_cambio` que nombra un nodo `tipo_cambio` que quien mira ve (`formula_tipo_cambio_del_nodo()`). `actualizadoEn` es el texto de la base, con sus
// microsegundos: es la versión que compara `tipo_cambio_guardar` y nunca pasa por `Date`.
export type TipoCambioDelNodo = {
  id: string
  clave: string
  nombre: string
  monedaDe: string
  monedaA: string
  valor: number
  activo: boolean
  actualizadoEn: string
}

// Los textos de Configuración › Empresa › Monedas y del esquema de `guardarTipoCambio`: el ⚙ y Monedas dicen lo mismo.
export const MENSAJE_DEL_TIPO_CAMBIO_INVALIDO =
  'Escribe un valor mayor que cero, con hasta 6 decimales.'
export const MENSAJE_DEL_TIPO_CAMBIO_GRANDE = 'Ese valor es demasiado grande.'
// La base lo aceptaría sin dejar historial (el trigger sólo inserta si el valor cambia): no se pide.
export const MENSAJE_DEL_MISMO_TIPO_CAMBIO = 'El tipo de cambio ya tiene ese valor.'

const DECIMALES_MAXIMOS = 6
const TOPE = 1e12

// Lo que se tipea en «Valor nuevo» de un tipo de cambio, con el lector de toda la app y el locale de la empresa: mayor que cero, con hasta 6 decimales (los que guarda
// `numeric(18,6)`), menor que un billón y distinto del valor de hoy.
export function tipoCambioTipeado(texto: string, locale: string, actual: number): ValorTipeado {
  const leido = leerNumeroTipeado(texto, locale)
  if (!leido.ok) {
    return {
      ok: false,
      aviso:
        leido.motivo === 'separador'
          ? avisoDeNumero(texto, leido.motivo, locale)
          : MENSAJE_DEL_TIPO_CAMBIO_INVALIDO,
    }
  }
  if (leido.valor === null) {
    return { ok: false, aviso: MENSAJE_DEL_VALOR_VACIO }
  }
  if (leido.valor <= 0 || leido.decimales > DECIMALES_MAXIMOS) {
    return { ok: false, aviso: MENSAJE_DEL_TIPO_CAMBIO_INVALIDO }
  }
  if (leido.valor >= TOPE) {
    return { ok: false, aviso: MENSAJE_DEL_TIPO_CAMBIO_GRANDE }
  }
  if (leido.valor === actual) {
    return { ok: false, aviso: MENSAJE_DEL_MISMO_TIPO_CAMBIO }
  }
  return { ok: true, valor: leido.valor }
}

// El texto con que abre «Valor nuevo»: el valor de hoy con toda su precisión, el decimal del locale y sin miles (como `textoParaEditar` de `empresa`).
export const textoInicialDeTipoCambio = (valor: number, locale: string): string =>
  formatearParaEditar(valor, { locale })

const DECIMALES_MINIMOS_AL_MOSTRAR = 2

// Con cuántos decimales se muestra «Valor de hoy» (4.20-3d): los que tiene, entre 2 y 6 (la base guarda 6), como Monedas. Copia de `decimalesDeValor` de
// `empresa/entities/tipos-cambio.ts`, que no sale por su `client.ts` (4.20-3d). 11.68 → 2; 6.9612 → 4; 0.000145 → 6.
export function decimalesDeTipoCambio(valor: number): number {
  for (let decimales = DECIMALES_MINIMOS_AL_MOSTRAR; decimales < DECIMALES_MAXIMOS; decimales++) {
    const factor = 10 ** decimales
    if (Math.abs(Math.round(valor * factor) / factor - valor) < 1e-9) {
      return decimales
    }
  }
  return DECIMALES_MAXIMOS
}

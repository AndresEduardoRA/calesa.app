// La configuración del cotizador de repuestos que se tipea en Configuración › Repuestos › «Cotizador» (8.12-2, C3). Pura y exacta: el número tipeado
// se lee con el lector único de `shared` (el decimal es el del locale y el otro separador sólo agrupa de a 3) y después se arma el texto exacto con
// enteros a escala fija, sin `float`. El formulario manda a la action el **texto canónico** (`'1.3500'`), que la action vuelve a validar con
// `decimalCanonico`. El recargo se tipea en % con 2 decimales y se guarda como fracción con 4: es el mismo entero (D19).
import { avisoDeNumero, leerNumeroTipeado, separadoresDelLocale } from '@/shared/lib/numero-tipeado'
import { aEscala, aTexto } from './decimal'

export type CampoDecimal = { escala: number; minimo: 'cero' | 'positivo'; maximo: string }

// Los topes salen de la columna (`numeric(10,4)`, `numeric(10,2)`) o, en los montos, de lo que `<Monto>` dibuja exacto (D20).
export const CAMPOS_DE_CONFIGURACION = {
  factor: { escala: 4, minimo: 'positivo', maximo: '999999.9999' },
  recargo: { escala: 2, minimo: 'cero', maximo: '999999.99' },
  redondeo: { escala: 2, minimo: 'positivo', maximo: '99999999.99' },
  montoDeTramo: { escala: 2, minimo: 'cero', maximo: '999999999999.99' },
  montoDeCaja: { escala: 2, minimo: 'positivo', maximo: '999999999999.99' },
} as const satisfies Record<string, CampoDecimal>

export const DEMASIADO_GRANDE = 'Ese valor es demasiado grande.'
export const HASTA_MAYOR_QUE_DESDE = 'El "hasta" tiene que ser mayor que el "desde".'
const FALTA = 'Falta el valor.'

export function mensajeDelCampo({ escala, minimo }: CampoDecimal): string {
  const rango = minimo === 'positivo' ? 'mayor que cero' : 'cero o mayor'
  return `Escribe un número ${rango}, con hasta ${escala} decimales.`
}

export type DecimalLeido = { ok: true; valor: string } | { ok: false; error: string }
export type LectorDeDecimal = (texto: string, campo: CampoDecimal) => DecimalLeido

const CANONICO = /^\d+(?:\.\d+)?$/

/** El texto canónico (dígitos y a lo sumo un punto) validado contra el campo: escala, signo y tope. */
export function decimalCanonico(texto: string, campo: CampoDecimal): DecimalLeido {
  const limpio = texto.trim()
  if (limpio === '') return { ok: false, error: FALTA }
  const n = CANONICO.test(limpio) ? aEscala(limpio, campo.escala) : null
  if (n === null || (campo.minimo === 'positivo' && n === 0n)) {
    return { ok: false, error: mensajeDelCampo(campo) }
  }
  const maximo = aEscala(campo.maximo, campo.escala) ?? 0n
  if (n > maximo) return { ok: false, error: DEMASIADO_GRANDE }
  return { ok: true, valor: aTexto(n, campo.escala) }
}

/** Lo que tipea la persona, con el locale de la empresa, como texto canónico del campo. */
export function leerDecimal(texto: string, campo: CampoDecimal, locale: string): DecimalLeido {
  const leido = leerNumeroTipeado(texto, locale)
  if (!leido.ok) return { ok: false, error: avisoDeNumero(texto, leido.motivo, locale) }
  if (leido.valor === null) return { ok: false, error: FALTA }
  const limpio = texto.trim()
  if (limpio.startsWith('-')) return { ok: false, error: mensajeDelCampo(campo) }
  // El lector ya aceptó la forma: queda quitar el separador de miles y cambiar el decimal por el punto, sin pasar por `number`.
  const { decimal, miles } = separadoresDelLocale(locale)
  const [entera = '', fraccion = ''] = limpio
    .replace(/^\+/, '')
    .split(miles)
    .join('')
    .split(decimal)
  return decimalCanonico(`${entera || '0'}${fraccion ? `.${fraccion}` : ''}`, campo)
}

/** El texto canónico para llenar un campo: el punto pasa al decimal del locale (nunca `formatearParaEditar(Number(…))`). */
export function paraEditar(canonico: string, locale: string): string {
  const { decimal } = separadoresDelLocale(locale)
  return canonico.replace('.', decimal)
}

/** `'10.00'` (%) → `'0.1000'` (fracción): el mismo entero, de escala 2 a escala 4. */
export function fraccionDesdePorcentaje(porcentaje: string): string {
  return aTexto(aEscala(porcentaje, 2) ?? 0n, 4)
}

/** `'0.0750'` (fracción) → `'7.50'` (%, canónico). */
export function porcentajeCanonico(fraccion: string): string {
  return aTexto(aEscala(fraccion, 4) ?? 0n, 2)
}

/** `'0.0750'` (fracción) → `'7,50'` en es-BO, para llenar el campo del recargo. */
export function porcentajeDesdeFraccion(fraccion: string, locale: string): string {
  return paraEditar(porcentajeCanonico(fraccion), locale)
}

type Validacion<Datos, Campo extends string> =
  { ok: true; datos: Datos } | { ok: false; errores: Partial<Record<Campo, string>> }

function leerCampos<Campo extends string>(
  textos: Record<Campo, string>,
  campos: Record<Campo, CampoDecimal>,
  leer: LectorDeDecimal,
): Validacion<Record<Campo, string>, Campo> {
  const datos = {} as Record<Campo, string>
  const errores: Partial<Record<Campo, string>> = {}
  for (const clave of Object.keys(campos) as Campo[]) {
    const leido = leer(textos[clave], campos[clave])
    if (leido.ok) datos[clave] = leido.valor
    else errores[clave] = leido.error
  }
  return Object.keys(errores).length > 0 ? { ok: false, errores } : { ok: true, datos }
}

export type BorradorDeFormula = { factor: string; recargo: string; redondeo: string }
export type DatosDeFormula = { factorImportado: string; recargoLocal: string; redondeo: string }

/** La fórmula tipeada; `recargoLocal` queda en % canónico (la action lo pasa a fracción con `fraccionDesdePorcentaje`). */
export function validarFormula(
  borrador: BorradorDeFormula,
  leer: LectorDeDecimal,
): Validacion<DatosDeFormula, keyof BorradorDeFormula> {
  const C = CAMPOS_DE_CONFIGURACION
  const leido = leerCampos(
    borrador,
    { factor: C.factor, recargo: C.recargo, redondeo: C.redondeo },
    leer,
  )
  if (!leido.ok) return leido
  const { factor, recargo, redondeo } = leido.datos
  return { ok: true, datos: { factorImportado: factor, recargoLocal: recargo, redondeo } }
}

export type BorradorDeTramo = { costoMin: string; costoMax: string; monto: string }
export type DatosDeTramo = { costoMin: string; costoMax: string | null; monto: string }

/** Un tramo tipeado: «hasta» vacío es abierto (`null`) y, si no, mayor que «desde» (comparando enteros). */
export function validarTramo(
  borrador: BorradorDeTramo,
  leer: LectorDeDecimal,
): Validacion<DatosDeTramo, keyof BorradorDeTramo> {
  const M = CAMPOS_DE_CONFIGURACION.montoDeTramo
  const abierto = borrador.costoMax.trim() === ''
  const textos = {
    costoMin: borrador.costoMin,
    monto: borrador.monto,
    costoMax: abierto ? '0' : borrador.costoMax,
  }
  const leido = leerCampos(textos, { costoMin: M, monto: M, costoMax: M }, leer)
  if (!leido.ok) return leido
  const { costoMin, costoMax, monto } = leido.datos
  if (!abierto && (aEscala(costoMax, 2) ?? 0n) <= (aEscala(costoMin, 2) ?? 0n)) {
    return { ok: false, errores: { costoMax: HASTA_MAYOR_QUE_DESDE } }
  }
  return { ok: true, datos: { costoMin, costoMax: abierto ? null : costoMax, monto } }
}

export type BorradorDeCaja = { monto: string }

export function validarCaja(
  borrador: BorradorDeCaja,
  leer: LectorDeDecimal,
): Validacion<{ monto: string }, 'monto'> {
  return leerCampos(borrador, { monto: CAMPOS_DE_CONFIGURACION.montoDeCaja }, leer)
}

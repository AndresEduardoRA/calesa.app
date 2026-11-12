// El rango de un campo numérico (9-2): un mínimo y un máximo, nulos = sin límite, sólo en un número o un monto. Espejo de la base:
// `_valor_fuera_de_rango` (la regla), `_campo_rango` (antes de guardar el campo) y `_atributos_rango` (el motivo). La base es la
// última línea; esto avisa antes de enviar y con los números en el locale de la empresa.
import { formatearNumero } from '../formato'
import { NUMERO_MAXIMO, type TipoDeCampo } from './tipos'

export type Rango = { minimo: number | null; maximo: number | null }

export function tieneRango(tipo: TipoDeCampo): boolean {
  return tipo === 'numero' || tipo === 'moneda'
}

// Sólo un número queda fuera; los bordes valen y un límite nulo no limita.
export function fueraDeRango(valor: unknown, rango: Rango): boolean {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    return false
  }
  return (
    (rango.minimo !== null && valor < rango.minimo) ||
    (rango.maximo !== null && valor > rango.maximo)
  )
}

export type ProblemaDelRango = { campo: 'minimo' | 'maximo' | 'valorDefecto'; mensaje: string }

// Lo que la base rechazaría al guardar el campo, en su mismo orden y con sus textos.
export function problemaDelRango(
  campo: Rango & { tipo: TipoDeCampo; valorDefecto: unknown },
): ProblemaDelRango | null {
  const { minimo, maximo } = campo
  if (minimo === null && maximo === null) {
    return null
  }
  if (!tieneRango(campo.tipo)) {
    return { campo: 'minimo', mensaje: 'Sólo un número o un monto lleva mínimo y máximo.' }
  }
  if (minimo !== null && Math.abs(minimo) > NUMERO_MAXIMO) {
    return { campo: 'minimo', mensaje: 'El mínimo es demasiado grande.' }
  }
  if (maximo !== null && Math.abs(maximo) > NUMERO_MAXIMO) {
    return { campo: 'maximo', mensaje: 'El máximo es demasiado grande.' }
  }
  if (minimo !== null && maximo !== null && minimo > maximo) {
    return { campo: 'maximo', mensaje: 'El mínimo no puede ser mayor que el máximo.' }
  }
  if (fueraDeRango(campo.valorDefecto, campo)) {
    return { campo: 'valorDefecto', mensaje: 'El valor por defecto queda fuera del rango.' }
  }
  return null
}

// ¿El rango propuesto puede dejar afuera algo cargado? Aparece o sube el mínimo, aparece o baja el máximo. Quitar o ensanchar, no.
export function rangoSeAcota(vigente: Rango, propuesto: Partial<Rango>): boolean {
  const { minimo, maximo } = propuesto
  const subeElMinimo =
    typeof minimo === 'number' && (vigente.minimo === null || minimo > vigente.minimo)
  const bajaElMaximo =
    typeof maximo === 'number' && (vigente.maximo === null || maximo < vigente.maximo)
  return subeElMinimo || bajaElMaximo
}

const esLimite = (valor: unknown): valor is number | null =>
  valor === null || typeof valor === 'number'

// Las claves del rango que trae un cambio (de cualquier módulo): número o null, y nada si no vienen.
export function rangoDe(cambios: object): Partial<Rango> {
  const rango: Partial<Rango> = {}
  const minimo: unknown = Reflect.get(cambios, 'minimo')
  const maximo: unknown = Reflect.get(cambios, 'maximo')
  if (esLimite(minimo)) {
    rango.minimo = minimo
  }
  if (esLimite(maximo)) {
    rango.maximo = maximo
  }
  return rango
}

// «"Edad" va de 18 a 99.», «… va desde 18.» o «… va hasta 99.»: los textos de la base, con los números en el locale.
export function motivoDeRango(etiqueta: string, rango: Rango, locale: string): string {
  const escrito = (n: number) => formatearNumero(n, { locale, decimales: 6 })
  if (rango.minimo !== null && rango.maximo !== null) {
    return `«${etiqueta}» va de ${escrito(rango.minimo)} a ${escrito(rango.maximo)}.`
  }
  if (rango.minimo !== null) {
    return `«${etiqueta}» va desde ${escrito(rango.minimo)}.`
  }
  return `«${etiqueta}» va hasta ${escrito(rango.maximo ?? 0)}.`
}

// El valor por defecto de un campo del layout: lo que el formulario de alta de un vehículo trae
// puesto. Espejo de `_origen_valor_defecto()`; la base lo vuelve a comprobar.
import type { OpcionDeCampo, TipoDeCampo, ValorDefecto } from './campo'

export const LARGO_MAXIMO_DE_VALOR_DEFECTO = 500

type Lector = (valor: unknown, claves: ReadonlySet<string>) => ValorDefecto | null

const texto: Lector = (valor) =>
  typeof valor === 'string' && valor !== '' && valor.length <= LARGO_MAXIMO_DE_VALOR_DEFECTO
    ? valor
    : null

const numero: Lector = (valor) =>
  typeof valor === 'number' && Number.isFinite(valor) ? valor : null

const siONo: Lector = (valor) => (typeof valor === 'boolean' ? valor : null)

const unaOpcion: Lector = (valor, claves) =>
  typeof valor === 'string' && claves.has(valor) ? valor : null

// Se queda con las opciones que siguen existiendo.
const variasOpciones: Lector = (valor, claves) => {
  if (!Array.isArray(valor)) {
    return null
  }
  const elegidas = valor.filter(
    (clave): clave is string => typeof clave === 'string' && claves.has(clave),
  )
  return elegidas.length > 0 ? elegidas : null
}

const LECTORES: Partial<Record<TipoDeCampo, Lector>> = {
  texto,
  texto_largo: texto,
  numero,
  moneda: numero,
  booleano: siONo,
  opcion: unaOpcion,
  multi_opcion: variasOpciones,
}

// El valor tal como sirve para ese tipo y esas opciones, o null si no sirve (o está vacío). Con
// esto el formulario limpia el valor cuando cambia el tipo o se saca la opción que lo era.
export function valorDefectoPara(
  tipo: TipoDeCampo,
  opciones: readonly OpcionDeCampo[],
  valor: unknown,
): ValorDefecto | null {
  const lector = LECTORES[tipo]
  return lector ? lector(valor, new Set(opciones.map((opcion) => opcion.clave))) : null
}

// Un valor fijo no tiene sentido en una fecha, un enlace, un VIN ni un lote: no tienen lector.
export function admiteValorDefecto(tipo: TipoDeCampo): boolean {
  return LECTORES[tipo] !== undefined
}

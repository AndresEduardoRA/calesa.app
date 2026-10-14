// Cómo se muestra el valor de un campo del layout, según su tipo. Devuelve qué mostrar, no cómo
// dibujarlo: un monto lo imprime `<Monto>` (Modo Live) y un enlace es un enlace.
import { formatearFecha, formatearFechaHora } from '../fechas'
import { formatearNumero } from '../formato'
import type { OpcionDeCampo, TipoDeCampo } from './tipos'

// Lo que hace falta de un campo para mostrar su valor: de un vehículo o de un lead.
export type CampoMostrable = {
  tipo: TipoDeCampo
  opciones: readonly OpcionDeCampo[]
}

export type ValorMostrado =
  | { tipo: 'vacio' }
  | { tipo: 'texto'; texto: string }
  | { tipo: 'monto'; valor: number }
  | { tipo: 'enlace'; url: string }

type Formato = { locale?: string; zona?: string }

const VACIO: ValorMostrado = { tipo: 'vacio' }

const esVacio = (valor: unknown) =>
  valor === undefined ||
  valor === null ||
  valor === '' ||
  (Array.isArray(valor) && valor.length === 0)

const texto = (valor: string): ValorMostrado => ({ tipo: 'texto', texto: valor })

// Una opción que ya se sacó del campo se sigue mostrando, con su clave: el dato no se perdió.
function etiquetaDeOpcion(campo: CampoMostrable, clave: unknown): string {
  const comoTexto = typeof clave === 'string' || typeof clave === 'number' ? String(clave) : ''
  return campo.opciones.find((opcion) => opcion.clave === comoTexto)?.etiqueta ?? comoTexto
}

type Lector = (campo: CampoMostrable, valor: unknown, formato: Formato) => ValorMostrado

const fecha =
  (conHora: boolean): Lector =>
  (_campo, valor, { zona }) => {
    if (typeof valor !== 'string' || Number.isNaN(Date.parse(valor))) {
      return typeof valor === 'string' ? texto(valor) : VACIO
    }
    return texto(conHora ? formatearFechaHora(valor, { zona }) : formatearFecha(valor, { zona }))
  }

const numero: Lector = (_campo, valor, { locale }) =>
  typeof valor === 'number' ? texto(formatearNumero(valor, { locale })) : VACIO

const monto: Lector = (_campo, valor) =>
  typeof valor === 'number' ? { tipo: 'monto', valor } : VACIO

const siONo: Lector = (_campo, valor) =>
  typeof valor === 'boolean' ? texto(valor ? 'Sí' : 'No') : VACIO

const unaOpcion: Lector = (campo, valor) => texto(etiquetaDeOpcion(campo, valor))

const variasOpciones: Lector = (campo, valor) =>
  Array.isArray(valor)
    ? texto(valor.map((clave) => etiquetaDeOpcion(campo, clave)).join(', '))
    : VACIO

// Sólo se enlaza lo que es una dirección web: cualquier otra cosa se muestra como texto.
const enlace: Lector = (_campo, valor) => {
  if (typeof valor !== 'string') {
    return VACIO
  }
  return /^https?:\/\//i.test(valor) ? { tipo: 'enlace', url: valor } : texto(valor)
}

const textoPlano: Lector = (_campo, valor) =>
  typeof valor === 'string' || typeof valor === 'number' ? texto(String(valor)) : VACIO

const LECTOR_POR_TIPO: Record<TipoDeCampo, Lector> = {
  booleano: siONo,
  numero,
  moneda: monto,
  opcion: unaOpcion,
  multi_opcion: variasOpciones,
  fecha: fecha(false),
  fecha_hora: fecha(true),
  url: enlace,
  texto: textoPlano,
  texto_largo: textoPlano,
  vin: textoPlano,
  lote: textoPlano,
  correo: textoPlano,
  documento: textoPlano,
}

export function valorMostrado(
  campo: CampoMostrable,
  valor: unknown,
  formato: Formato = {},
): ValorMostrado {
  return esVacio(valor) ? VACIO : LECTOR_POR_TIPO[campo.tipo](campo, valor, formato)
}

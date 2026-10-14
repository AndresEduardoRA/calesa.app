// La subasta de un vehículo: de la respuesta de apibara a los datos de la ficha, qué se actualiza
// al refrescar, qué fotos trae y cómo se dice la cuenta regresiva. Todo puro: la respuesta llega
// como `unknown` y nunca se confía en su forma.
import type { EntradaDeApibara } from './apibara'
import type { CampoDeVehiculo, OpcionDeCampo, TipoDeCampo } from './campo'

export type EstadoDeSubasta = 'abierta' | 'en_vivo' | 'terminada' | 'vendida'

export const ESTADOS_DE_SUBASTA: readonly EstadoDeSubasta[] = [
  'abierta',
  'en_vivo',
  'terminada',
  'vendida',
]

const ETIQUETA_DE_ESTADO: Record<EstadoDeSubasta, string> = {
  abierta: 'Abierta',
  en_vivo: 'En vivo',
  terminada: 'Terminada',
  vendida: 'Vendida',
}

export function etiquetaDeEstado(estado: EstadoDeSubasta): string {
  return ETIQUETA_DE_ESTADO[estado]
}

export function esEstadoDeSubasta(valor: unknown): valor is EstadoDeSubasta {
  return typeof valor === 'string' && (ESTADOS_DE_SUBASTA as readonly string[]).includes(valor)
}

// --- Leer la respuesta ---------------------------------------------------------------------------

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor)
}

// El valor en una ruta con puntos (`vehicle_specs.engine.raw`), o undefined si no está.
export function valorEnRuta(raw: unknown, ruta: string): unknown {
  let actual: unknown = raw
  for (const parte of ruta.split('.')) {
    if (!esObjeto(actual)) {
      return undefined
    }
    actual = actual[parte]
  }
  return actual
}

function textoDe(valor: unknown): string | undefined {
  if (typeof valor === 'string') {
    const limpio = valor.trim()
    return limpio === '' ? undefined : limpio
  }
  return typeof valor === 'number' && Number.isFinite(valor) ? String(valor) : undefined
}

function numeroDe(valor: unknown): number | undefined {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : undefined
  }
  if (typeof valor === 'string' && /^-?\d+(\.\d+)?$/.test(valor.trim())) {
    return Number(valor.trim())
  }
  return undefined
}

const sinTildes = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

function opcionPara(texto: string, opciones: readonly OpcionDeCampo[]): string | undefined {
  const buscado = sinTildes(texto)
  return opciones.find(
    (opcion) => sinTildes(opcion.clave) === buscado || sinTildes(opcion.etiqueta) === buscado,
  )?.clave
}

// --- Del bruto a los datos ------------------------------------------------------------------------

// Los datos comunes que son columna. `precio` nunca viene de apibara: es el precio de lista que
// pone la persona, no la puja.
export type ColumnasDeSubasta = {
  titulo?: string
  marca?: string
  modelo?: string
  anio?: number
  vin?: string
  lote?: string
  plataforma?: string
  kilometraje?: number
  url_origen?: string
}

export type ValorDeAtributo = string | number | boolean | string[]

export type DatosDeSubasta = {
  columnas: ColumnasDeSubasta
  atributos: Record<string, ValorDeAtributo>
  // Un valor que la API trajo y el campo no puede guardar (una opción que no existe en la lista).
  sinCoincidencia: { clave: string; etiqueta: string; valor: string }[]
}

export type CampoConRuta = Pick<
  CampoDeVehiculo,
  'clave' | 'etiqueta' | 'tipo' | 'opciones' | 'activo'
> & {
  claveApibara?: string | null
}

const PATRON_DE_VIN = /^[A-HJ-NPR-Z0-9]{11,17}$/

const acotado = (largo: number) => (valor: unknown) => textoDe(valor)?.slice(0, largo)
const enMinusculas = (valor: unknown) => textoDe(valor)?.toLowerCase().slice(0, 40)

function anioDe(valor: unknown): number | undefined {
  const numero = numeroDe(valor)
  return numero !== undefined && Number.isInteger(numero) && numero >= 1900 && numero <= 2100
    ? numero
    : undefined
}

function vinDe(valor: unknown): string | undefined {
  const vin = textoDe(valor)?.toUpperCase()
  return vin !== undefined && PATRON_DE_VIN.test(vin) ? vin : undefined
}

function kilometrosDe(valor: unknown): number | undefined {
  const numero = numeroDe(valor)
  return numero !== undefined && numero >= 0 ? Math.round(numero) : undefined
}

const DE_COLUMNAS: readonly (readonly [
  keyof ColumnasDeSubasta,
  string,
  (valor: unknown) => string | number | undefined,
])[] = [
  ['titulo', 'title', acotado(160)],
  ['marca', 'make', acotado(80)],
  ['modelo', 'model', acotado(80)],
  ['anio', 'year', anioDe],
  ['vin', 'vin', vinDe],
  ['lote', 'lot_number', acotado(40)],
  ['plataforma', 'platform', enMinusculas],
  ['kilometraje', 'odometer.km', kilometrosDe],
]

export function columnasDesdeSubasta(raw: unknown, urlPegada?: string | null): ColumnasDeSubasta {
  const columnas: Record<string, string | number> = {}
  for (const [columna, ruta, leer] of DE_COLUMNAS) {
    const valor = leer(valorEnRuta(raw, ruta))
    if (valor !== undefined) {
      columnas[columna] = valor
    }
  }
  if (urlPegada && /^https?:\/\/\S+$/i.test(urlPegada)) {
    columnas['url_origen'] = urlPegada.slice(0, 500)
  }
  return columnas
}

function instanteIso(valor: unknown): string | undefined {
  const texto = textoDe(valor)
  if (texto === undefined) {
    return undefined
  }
  const fecha = new Date(texto)
  return Number.isNaN(fecha.getTime()) ? undefined : fecha.toISOString()
}

type Convertido = { valor: ValorDeAtributo } | { sinCoincidencia: string } | null

const conValor = (valor: ValorDeAtributo | undefined): Convertido =>
  valor === undefined ? null : { valor }

function deOpcion(campo: CampoConRuta, crudo: unknown): Convertido {
  const texto = textoDe(crudo)
  if (texto === undefined) {
    return null
  }
  const clave = opcionPara(texto, campo.opciones)
  return clave === undefined ? { sinCoincidencia: texto } : { valor: clave }
}

function deVariasOpciones(campo: CampoConRuta, crudo: unknown): Convertido {
  const crudos = Array.isArray(crudo) ? crudo : typeof crudo === 'string' ? crudo.split(';') : []
  const claves = crudos.flatMap((uno) => {
    const texto = textoDe(uno)
    const clave = texto === undefined ? undefined : opcionPara(texto, campo.opciones)
    return clave === undefined ? [] : [clave]
  })
  return claves.length > 0 ? { valor: claves } : null
}

function deFecha(crudo: unknown): Convertido {
  const texto = textoDe(crudo)
  return texto !== undefined && /^\d{4}-\d{2}-\d{2}/.test(texto)
    ? { valor: texto.slice(0, 10) }
    : null
}

const deTexto = (_campo: CampoConRuta, crudo: unknown) => conValor(textoDe(crudo))
const deNumero = (_campo: CampoConRuta, crudo: unknown) => conValor(numeroDe(crudo))

// Un conversor por tipo de campo: lo que no se puede convertir no se escribe.
const CONVERSORES: Record<TipoDeCampo, (campo: CampoConRuta, crudo: unknown) => Convertido> = {
  texto: deTexto,
  texto_largo: deTexto,
  url: deTexto,
  vin: deTexto,
  lote: deTexto,
  numero: deNumero,
  moneda: deNumero,
  booleano: (_campo, crudo) => (typeof crudo === 'boolean' ? { valor: crudo } : null),
  fecha: (_campo, crudo) => deFecha(crudo),
  fecha_hora: (_campo, crudo) => conValor(instanteIso(crudo)),
  opcion: deOpcion,
  multi_opcion: deVariasOpciones,
}

// Los atributos que llena la respuesta: uno por campo activo del layout que tenga ruta. Lo que no
// viene (nulo, vacío, otra forma) no se escribe: nunca se guarda un nulo.
export function atributosDesdeSubasta(
  raw: unknown,
  campos: readonly CampoConRuta[],
): Pick<DatosDeSubasta, 'atributos' | 'sinCoincidencia'> {
  const atributos: Record<string, ValorDeAtributo> = {}
  const sinCoincidencia: DatosDeSubasta['sinCoincidencia'] = []
  for (const campo of campos) {
    if (!campo.activo || !campo.claveApibara) {
      continue
    }
    const convertido = CONVERSORES[campo.tipo](campo, valorEnRuta(raw, campo.claveApibara))
    if (convertido === null) {
      continue
    }
    if ('sinCoincidencia' in convertido) {
      sinCoincidencia.push({
        clave: campo.clave,
        etiqueta: campo.etiqueta,
        valor: convertido.sinCoincidencia,
      })
    } else {
      atributos[campo.clave] = convertido.valor
    }
  }
  return { atributos, sinCoincidencia }
}

export function datosDesdeSubasta(
  raw: unknown,
  campos: readonly CampoConRuta[],
  urlPegada?: string | null,
): DatosDeSubasta {
  return { columnas: columnasDesdeSubasta(raw, urlPegada), ...atributosDesdeSubasta(raw, campos) }
}

// Lo que ya se sabe de lo que se pegó aunque apibara no responda: seguir a mano no pierde el
// enlace, el VIN ni el lote. Un enlace trae además su plataforma.
export function columnasDeEntrada(entrada: EntradaDeApibara): ColumnasDeSubasta {
  switch (entrada.tipo) {
    case 'enlace':
      return { url_origen: entrada.valor.slice(0, 500), plataforma: entrada.plataforma }
    case 'vin':
      return { vin: entrada.valor }
    case 'lote':
      return { lote: entrada.valor }
  }
}

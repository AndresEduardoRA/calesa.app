// El teléfono de un lead: cómo se normaliza lo que la persona escribe o pega. La fuente es
// `normalizar_telefono()` de la base (`supabase/schemas/00_base/03_utilidades.sql`): esto es su
// espejo, para responder al tipear sin ir al servidor. Un test corre las dos funciones sobre la misma
// tabla de casos (`telefono.casos.ts`) y exige el mismo número y el mismo motivo.
//
// - Con «+» al inicio o con «00» es internacional: el número ya trae su código y el de la empresa
//   no se usa.
// - Sin ellos es nacional: lleva el código de la empresa y pierde un 0 troncal inicial.
// - Espacios, guiones, puntos y paréntesis se admiten; una letra o un «+» en medio, no.

export const DIGITOS_MINIMOS_DE_TELEFONO = 8
export const DIGITOS_MAXIMOS_DE_TELEFONO = 15

export type TelefonoNormalizado =
  { ok: true; numero: string; internacional: boolean } | { ok: false; motivo: string }

const MOTIVO = {
  vacio: 'Escribe el teléfono.',
  caracteres:
    'El teléfono sólo lleva números; se admiten espacios, guiones, paréntesis y un «+» al inicio.',
  mas: 'El «+» va sólo al inicio del teléfono.',
  ceroDelPais: 'El código de país no empieza con 0.',
  sinCodigo: 'Escribe el número completo, con «+» y el código de país.',
  faltan: 'Al teléfono le faltan dígitos: con el código de país lleva entre 8 y 15.',
  sobran: 'Al teléfono le sobran dígitos: con el código de país lleva entre 8 y 15.',
} as const

const rechazo = (motivo: string): TelefonoNormalizado => ({ ok: false, motivo })

// `btrim()` de la base sólo quita espacios.
const sinEspaciosDeLosBordes = (texto: string) => texto.replace(/^ +| +$/g, '')

const soloDigitos = (texto: string) => texto.replace(/\D/g, '')

// Lo que se ve sin mirar el código de país: vacío, letras o un «+» donde no va.
function motivoDeForma(tel: string): string | null {
  if (tel === '') {
    return MOTIVO.vacio
  }
  if (/[^0-9+\s().-]/.test(tel)) {
    return MOTIVO.caracteres
  }
  return /.\+/.test(tel) ? MOTIVO.mas : null
}

function motivoDeLargo(numero: string): string | null {
  if (numero.length < DIGITOS_MINIMOS_DE_TELEFONO) {
    return MOTIVO.faltan
  }
  return numero.length > DIGITOS_MAXIMOS_DE_TELEFONO ? MOTIVO.sobran : null
}

// El número con su código de país: el que trae (internacional) o el de la empresa más un 0 troncal
// menos (nacional).
function conCodigoDePais(
  digitos: string,
  internacional: boolean,
  cc: string,
): { numero: string } | { motivo: string } {
  if (internacional) {
    return digitos.startsWith('0') ? { motivo: MOTIVO.ceroDelPais } : { numero: digitos }
  }
  return cc === '' ? { motivo: MOTIVO.sinCodigo } : { numero: cc + digitos.replace(/^0/, '') }
}

export function normalizarTelefono(
  codigoDePais: string | null | undefined,
  escrito: string,
): TelefonoNormalizado {
  const tel = sinEspaciosDeLosBordes(escrito)
  const forma = motivoDeForma(tel)
  if (forma) {
    return rechazo(forma)
  }
  let digitos = soloDigitos(tel)
  let internacional = tel.startsWith('+')
  if (!internacional && digitos.startsWith('00')) {
    internacional = true
    digitos = digitos.slice(2)
  }
  if (digitos === '') {
    return rechazo(MOTIVO.vacio)
  }
  const completo = conCodigoDePais(digitos, internacional, soloDigitos(codigoDePais ?? ''))
  if ('motivo' in completo) {
    return rechazo(completo.motivo)
  }
  const largo = motivoDeLargo(completo.numero)
  return largo ? rechazo(largo) : { ok: true, numero: completo.numero, internacional }
}

// Cómo se muestra un número normalizado: «+591 70011002» si es del país de la empresa, y «+54…»
// tal cual si no. No parte lo que no sabe partir.
export function telefonoParaMostrar(
  numero: string,
  codigoDePais: string | null | undefined,
): string {
  const cc = soloDigitos(codigoDePais ?? '')
  if (cc !== '' && numero.startsWith(cc) && numero.length > cc.length) {
    return `+${cc} ${numero.slice(cc.length)}`
  }
  return `+${numero}`
}

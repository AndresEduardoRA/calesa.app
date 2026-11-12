// Lo que la persona le pasa al cliente después de otorgar: el código dicho símbolo por símbolo y el
// texto listo para WhatsApp. El texto sale del mensaje del portal de la empresa (`ajustes_leads.portal_mensaje`,
// Configuración › Leads › «Mensaje del portal»); si es nulo, del de fábrica de acá, en español neutro. La dirección
// de la web va sólo si está configurada.
import type { PersonaDelAcceso } from './portal'

// Cómo se dice cada símbolo del código por teléfono. La parte al azar no tiene I, O, 0 ni 1; el
// prefijo (letras del nombre de la empresa) sí puede llevar I y O. B y V, como se distinguen al dictar.
const NOMBRE_DEL_SIMBOLO: Record<string, string> = {
  A: 'a',
  B: 'be larga',
  C: 'ce',
  D: 'de',
  E: 'e',
  F: 'efe',
  G: 'ge',
  H: 'hache',
  I: 'i',
  J: 'jota',
  K: 'ka',
  L: 'ele',
  M: 'eme',
  N: 'ene',
  O: 'o',
  P: 'pe',
  Q: 'cu',
  R: 'erre',
  S: 'ese',
  T: 'te',
  U: 'u',
  V: 've corta',
  W: 'doble ve',
  X: 'equis',
  Y: 'ye',
  Z: 'zeta',
  '2': 'dos',
  '3': 'tres',
  '4': 'cuatro',
  '5': 'cinco',
  '6': 'seis',
  '7': 'siete',
  '8': 'ocho',
  '9': 'nueve',
}

// «MII-4F2K9» → «eme, i, i, guion, cuatro, efe, dos, ka, nueve».
export function codigoDictado(codigo: string): string {
  return [...codigo.toUpperCase()]
    .map((simbolo) => (simbolo === '-' ? 'guion' : (NOMBRE_DEL_SIMBOLO[simbolo] ?? simbolo)))
    .join(', ')
}

export type DatosDelMensaje = {
  // El nombre del lead, para saludarlo.
  cliente: string
  empresa: string
  codigo: string
  clave: string
  // La dirección pública de la web; nula si nadie la configuró (el texto sale sin enlace).
  direccion: string | null
  // El mensaje del portal de la empresa, con sus variables; nulo = el de fábrica.
  plantilla: string | null
}

// Las variables que un mensaje del portal puede llevar. `{codigo}` y `{clave}` son obligatorias: sin ellas el cliente no entra.
export const VARIABLES_DEL_MENSAJE = ['cliente', 'empresa', 'codigo', 'clave', 'direccion'] as const
export type VariableDelMensaje = (typeof VARIABLES_DEL_MENSAJE)[number]
export const LARGO_MAXIMO_DEL_MENSAJE = 1000

// Toda `{…}` cuenta como variable, como en la base (`\{([^{}]*)\}`): una errata como `{Codigo}` se rechaza, no sale literal.
const VARIABLE = /\{([^{}]*)\}/g

// El de fábrica, con sus variables: lo que el editor muestra para partir. Con un cliente con nombre, aplicarlo da lo mismo
// que `textoParaWhatsApp` sin plantilla.
export const MENSAJE_DE_FABRICA = [
  'Hola, {cliente}.',
  'Ya tienes acceso a tu seguimiento en {empresa}.',
  'Para ver cómo va tu compra, entra en {direccion} con estos datos:',
  'Código: {codigo}',
  'Clave temporal: {clave}',
  'Al entrar te pediremos que cambies la clave.',
].join('\n')

const esVariable = (nombre: string): nombre is VariableDelMensaje =>
  (VARIABLES_DEL_MENSAJE as readonly string[]).includes(nombre)

// Espejo de `_portal_mensaje_normalizar` (la base decide; esto lo dice antes de enviar), en su orden y con sus textos: `\r\n` pasa a
// `\n`, se recortan sólo espacios, tabuladores y saltos en los bordes (como `btrim`, no `trim()`), en blanco es `null` (el de fábrica),
// el largo se cuenta en caracteres (code points, como `char_length`).
export function validarMensajeDelPortal(
  texto: string,
): { ok: true; texto: string | null } | { ok: false; motivo: string } {
  const v = texto.replaceAll('\r\n', '\n').replace(/^[ \t\n\r]+|[ \t\n\r]+$/g, '')
  if (v === '') {
    return { ok: true, texto: null }
  }
  if ([...v].length > LARGO_MAXIMO_DEL_MENSAJE) {
    return {
      ok: false,
      motivo: `El mensaje lleva hasta ${String(LARGO_MAXIMO_DEL_MENSAJE)} caracteres.`,
    }
  }
  for (const [, nombre = ''] of v.matchAll(VARIABLE)) {
    if (!esVariable(nombre)) {
      return {
        ok: false,
        motivo: `{${nombre}} no es una variable del mensaje. Usa {cliente}, {empresa}, {codigo}, {clave} o {direccion}.`,
      }
    }
  }
  if (!v.includes('{codigo}') || !v.includes('{clave}')) {
    return {
      ok: false,
      motivo:
        'El mensaje tiene que llevar {codigo} y {clave}: sin ellos el cliente no puede entrar.',
    }
  }
  return { ok: true, texto: v }
}

// Cada variable por su valor, en una sola pasada: un valor que trae `{clave}` o `$&` sale tal cual. Lo que no es una variable queda
// literal. Sin dirección, `{direccion}` dice «la web de <empresa>»; un cliente sin nombre, vacío.
export function aplicarMensaje(
  plantilla: string,
  { cliente, empresa, codigo, clave, direccion }: Omit<DatosDelMensaje, 'plantilla'>,
): string {
  const valores: Record<VariableDelMensaje, string> = {
    cliente: cliente.trim(),
    empresa,
    codigo,
    clave,
    direccion: direccion ?? `la web de ${empresa}`,
  }
  return plantilla.replace(VARIABLE, (entera, nombre: string) =>
    esVariable(nombre) ? valores[nombre] : entera,
  )
}

// El texto para WhatsApp. Con el mensaje de la empresa, ese con sus variables; sin él, el de fábrica. Sin la dirección no se inventa
// una: dice dónde sin enlace.
export function textoParaWhatsApp({ plantilla, ...datos }: DatosDelMensaje) {
  if (plantilla !== null) {
    return aplicarMensaje(plantilla, datos)
  }
  const { cliente, empresa, codigo, clave, direccion } = datos
  const saludo = cliente.trim() === '' ? 'Hola.' : `Hola, ${cliente.trim()}.`
  const donde = direccion
    ? `Para ver cómo va tu compra, entra en ${direccion} con estos datos:`
    : `Para ver cómo va tu compra, entra en la web de ${empresa} con estos datos:`
  return [
    saludo,
    `Ya tienes acceso a tu seguimiento en ${empresa}.`,
    donde,
    `Código: ${codigo}`,
    `Clave temporal: ${clave}`,
    'Al entrar te pediremos que cambies la clave.',
  ].join('\n')
}

// Quién lo otorgó o lo revocó, como lo dice la sección.
export function nombreDeQuien(persona: PersonaDelAcceso | null): string {
  if (!persona) {
    return 'alguien que ya no está en el equipo'
  }
  return persona.deBaja ? `${persona.nombre} (ya no está en el equipo)` : persona.nombre
}

// Al transferir un lead con el acceso vigente: el acceso es del lead y sigue, y el cliente verá al nuevo
// dueño como su asesor. Sólo lo lee quien gestiona el acceso.
export function avisoDelPortalAlTransferir(lead: string, destino: string | null): string {
  return destino
    ? `${lead} tiene acceso al portal: desde ahora verá a ${destino} como su asesor.`
    : `${lead} tiene acceso al portal: verá como su asesor a quien se lo pases.`
}

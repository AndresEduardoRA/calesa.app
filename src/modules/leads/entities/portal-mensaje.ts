// Lo que la persona le pasa al cliente después de otorgar: el código dicho símbolo por símbolo y el
// texto listo para WhatsApp. La plantilla vive acá, en español neutro, con el nombre de la empresa; una
// plantilla editable por empresa queda pendiente. La dirección de la web va sólo si está configurada.
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
}

// El texto para WhatsApp. Sin la dirección no se inventa una: dice dónde sin enlace.
export function textoParaWhatsApp({ cliente, empresa, codigo, clave, direccion }: DatosDelMensaje) {
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

// Cómo se nombra un origen y lo que se importa en él: el nombre («Corea»), el sustantivo
// («vehículo», «unidad», «lote») y su género, para que la interfaz concuerde sin texto fijo
// («Ninguna unidad en Corea todavía»). Piezas puras: salen por `client.ts`.
import { claveDeTexto, type EstiloDeClave } from '@/shared/lib/campos'
import type { Genero } from './origen'

// Así se arma toda clave interna de este módulo: el origen, y también los campos del layout.
export const ESTILO_DE_CLAVE: EstiloDeClave = { prefijo: 'o_', vacio: 'origen' }

// De un nombre a la clave interna: sin acentos, en minúsculas, con guion bajo, de 2 a 31
// caracteres y empezando con una letra (el CHECK de `origenes.clave`).
export function claveDeNombre(nombre: string, largoMaximo = 31): string {
  return claveDeTexto(nombre, largoMaximo, ESTILO_DE_CLAVE)
}

// Casi todo lo que termina en -a, -ción, -dad, -tad, -tud es femenino. Es una sugerencia: la
// persona la corrige cuando no acierta («moto» es femenino, «día» masculino).
const FEMENINAS = /(a|ción|sión|dad|tad|tud|umbre)$/
const MASCULINAS_EN_A = new Set(['día', 'mapa', 'sistema', 'programa', 'tema', 'problema'])
const FEMENINAS_EN_O = new Set(['moto', 'mano'])

export function generoSugerido(sustantivo: string): Genero {
  const palabra = sustantivo.trim().toLowerCase().split(/\s+/)[0] ?? ''
  if (FEMENINAS_EN_O.has(palabra)) {
    return 'f'
  }
  if (MASCULINAS_EN_A.has(palabra)) {
    return 'm'
  }
  return FEMENINAS.test(palabra) ? 'f' : 'm'
}

const SIN_ACENTO_FINAL: Record<string, string> = { ó: 'o', á: 'a', é: 'e', í: 'i', ú: 'u' }

// Plural de una palabra. Cubre lo que se importa (vehículo, unidad, lote, camión, moto, auto);
// una palabra rara que falle es motivo para agregar una columna de plural en `origenes`.
function pluralDePalabra(palabra: string): string {
  if (palabra === '') {
    return palabra
  }
  const ultima = palabra.slice(-1)
  if ('aeiouáéó'.includes(ultima)) {
    return `${palabra}s`
  }
  if (ultima === 'z') {
    return `${palabra.slice(0, -1)}ces`
  }
  if (ultima === 's' || ultima === 'x') {
    return palabra
  }
  // camión → camiones, jardín → jardines: la tilde de la última sílaba se cae al sumar una.
  const penultima = palabra.slice(-2, -1)
  if (ultima === 'n' && penultima in SIN_ACENTO_FINAL) {
    return `${palabra.slice(0, -2)}${SIN_ACENTO_FINAL[penultima] ?? penultima}nes`
  }
  return `${palabra}${'íú'.includes(ultima) ? 's' : 'es'}`
}

export function pluralDe(sustantivo: string): string {
  return sustantivo.trim().split(/\s+/).map(pluralDePalabra).join(' ')
}

// «3 lotes», «1 lote», «0 lotes».
export function contados(cantidad: number, sustantivo: string): string {
  return `${cantidad} ${cantidad === 1 ? sustantivo : pluralDe(sustantivo)}`
}

export function concordar<Forma>(genero: Genero, formas: { m: Forma; f: Forma }): Forma {
  return genero === 'f' ? formas.f : formas.m
}

export function articulo(genero: Genero): 'el' | 'la' {
  return concordar(genero, { m: 'el', f: 'la' })
}

export function ninguno(genero: Genero): 'ningún' | 'ninguna' {
  return concordar(genero, { m: 'ningún', f: 'ninguna' })
}

// El vacío de un origen, como lo diría la interfaz: «Ninguna unidad en Corea todavía».
export function frasePorVacio(origen: { nombre: string; sustantivo: string; genero: Genero }) {
  const sustantivo = origen.sustantivo.trim() === '' ? 'vehículo' : origen.sustantivo.trim()
  const nombre = origen.nombre.trim() === '' ? 'este origen' : origen.nombre.trim()
  return `${ninguno(origen.genero)} ${sustantivo} en ${nombre} todavía`
}

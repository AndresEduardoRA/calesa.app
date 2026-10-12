// Color: contraste según WCAG y los tokens de marca que salen del color de la empresa
// (`ajustes_empresa.color_acento`). El relleno (`--color-primario`) es el mismo en claro y en
// oscuro; lo que se deriva es el texto que va encima y las variantes `-ink` y `-soft` de cada
// tema, para que siempre se lean sobre su superficie (design/tokens.css, regla de `-ink`).
import { COLOR_FONDO_CLARO, COLOR_SUPERFICIE_OSCURA, COLOR_TINTA } from '@/shared/config/app'

// Texto normal, nivel AA.
export const CONTRASTE_AA = 4.5

const HEX = /^#[0-9a-f]{6}$/i
const BLANCO = '#ffffff'
const NEGRO = '#000000'

type RGB = readonly [number, number, number]

export function esHex(valor: string): boolean {
  return HEX.test(valor)
}

function aRGB(hex: string): RGB {
  const numero = Number.parseInt(hex.slice(1), 16)
  return [(numero >> 16) & 255, (numero >> 8) & 255, numero & 255]
}

function aHex(rgb: RGB): string {
  return `#${rgb.map((canal) => Math.round(canal).toString(16).padStart(2, '0')).join('')}`
}

function canalLineal(canal: number): number {
  const fraccion = canal / 255
  return fraccion <= 0.04045 ? fraccion / 12.92 : ((fraccion + 0.055) / 1.055) ** 2.4
}

// Luminancia relativa: 0 es negro, 1 es blanco.
export function luminancia(hex: string): number {
  const [rojo, verde, azul] = aRGB(hex)
  return 0.2126 * canalLineal(rojo) + 0.7152 * canalLineal(verde) + 0.0722 * canalLineal(azul)
}

// De 1 (el mismo color) a 21 (negro sobre blanco). El orden de los dos colores no importa.
export function contraste(uno: string, otro: string): number {
  const [a, b] = [luminancia(uno), luminancia(otro)]
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

// `peso` es cuánto de `hacia` entra en la mezcla: 0 deja `desde`, 1 da `hacia`.
export function mezclar(desde: string, hacia: string, peso: number): string {
  const [rojo, verde, azul] = aRGB(desde)
  const [rojoFinal, verdeFinal, azulFinal] = aRGB(hacia)
  return aHex([
    rojo + (rojoFinal - rojo) * peso,
    verde + (verdeFinal - verde) * peso,
    azul + (azulFinal - azul) * peso,
  ])
}

const PASOS = 50

// Cuánto hay que acercar `color` a `hacia` para que `medir` dé AA. `null` si ni llegando alcanza.
function pesoHastaAA(color: string, hacia: string, medir: (mezcla: string) => number) {
  for (let paso = 0; paso <= PASOS; paso++) {
    const peso = paso / PASOS
    const mezcla = mezclar(color, hacia, peso)
    if (medir(mezcla) >= CONTRASTE_AA) {
      return { peso, mezcla }
    }
  }
  return null
}

function suave(color: string, opacidad: number): string {
  const [rojo, verde, azul] = aRGB(color)
  return `rgba(${rojo}, ${verde}, ${azul}, ${opacidad})`
}

export type TokensDeMarca = {
  primario: string
  // El relleno al pasar el cursor.
  primarioOscuro: string
  // El texto que va sobre el relleno: blanco o la tinta oscura, lo que se lea mejor.
  sobrePrimario: string
  claro: { ink: string; soft: string }
  oscuro: { ink: string; soft: string }
}

export type MarcaDerivada =
  | { ok: true; tokens: TokensDeMarca }
  | {
      ok: false
      // Lo que da el texto del botón en blanco y en tinta oscura: ninguno llega a AA.
      conBlanco: number
      conTinta: number
      // El tono más cercano que sí pasa.
      sugerido: string
    }

function sugerirCercano(color: string): string {
  const masOscuro = pesoHastaAA(color, NEGRO, (mezcla) => contraste(mezcla, BLANCO))
  const masClaro = pesoHastaAA(color, BLANCO, (mezcla) => contraste(mezcla, COLOR_TINTA))
  if (masOscuro && masClaro) {
    return masOscuro.peso <= masClaro.peso ? masOscuro.mezcla : masClaro.mezcla
  }
  return (masOscuro ?? masClaro)?.mezcla ?? NEGRO
}

// El color de la empresa se acepta si el texto del botón se lee sobre él (AA) en blanco o en
// tinta oscura. Un tono intermedio (un rojo puro, por ejemplo) no lo logra con ninguno.
export function tokensDeMarca(color: string): MarcaDerivada {
  const primario = color.toLowerCase()
  const conBlanco = contraste(primario, BLANCO)
  const conTinta = contraste(primario, COLOR_TINTA)
  if (Math.max(conBlanco, conTinta) < CONTRASTE_AA) {
    return { ok: false, conBlanco, conTinta, sugerido: sugerirCercano(primario) }
  }
  const sobreBlanco = conBlanco >= conTinta
  const inkClaro = pesoHastaAA(primario, NEGRO, (mezcla) => contraste(mezcla, COLOR_FONDO_CLARO))
  const inkOscuro = pesoHastaAA(primario, BLANCO, (mezcla) =>
    contraste(mezcla, COLOR_SUPERFICIE_OSCURA),
  )
  return {
    ok: true,
    tokens: {
      primario,
      // Se aleja del texto que lleva encima: así el contraste nunca baja al pasar el cursor.
      primarioOscuro: mezclar(primario, sobreBlanco ? NEGRO : BLANCO, 0.14),
      sobrePrimario: sobreBlanco ? BLANCO : COLOR_TINTA,
      claro: { ink: inkClaro?.mezcla ?? NEGRO, soft: suave(primario, 0.12) },
      oscuro: { ink: inkOscuro?.mezcla ?? BLANCO, soft: suave(primario, 0.22) },
    },
  }
}

// Las variables que pisan a los valores neutros de design/tokens.css. Va en un <style> y no en
// `<html style>`: un estilo en línea le ganaría al bloque `.dark`.
export function cssDeMarca(tokens: TokensDeMarca): string {
  return [
    ':root{',
    `--color-primario:${tokens.primario};`,
    `--color-primario-oscuro:${tokens.primarioOscuro};`,
    `--color-sobre-primario:${tokens.sobrePrimario};`,
    `--color-primario-ink:${tokens.claro.ink};`,
    `--color-primario-soft:${tokens.claro.soft};`,
    '}',
    '.dark{',
    `--color-primario-ink:${tokens.oscuro.ink};`,
    `--color-primario-soft:${tokens.oscuro.soft};`,
    '}',
  ].join('')
}

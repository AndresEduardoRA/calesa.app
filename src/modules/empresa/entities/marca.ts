// La marca de la empresa: su color y su logo. Reglas puras; quien sube el archivo es `infra/`.
import { tokensDeMarca } from '@/shared/lib/color'
import { formatearNumero } from '@/shared/lib/formato'
import type { Dimensiones } from '@/shared/lib/imagenes'

// --- Color ------------------------------------------------------------------------------------

export type ColorDeMarca = { ok: true; color: string } | { ok: false; motivo: string }

function razon(contraste: number): string {
  return `${formatearNumero(contraste, { decimales: 1 })}:1`
}

// El color se acepta si el texto de los botones se lee sobre él (AA: 4,5:1), en blanco o en
// oscuro. Si no, el motivo dice cuánto da y propone el tono más cercano que sí sirve.
export function validarColorDeMarca(color: string): ColorDeMarca {
  const limpio = color.trim().toLowerCase()
  if (!/^#[0-9a-f]{6}$/.test(limpio)) {
    return { ok: false, motivo: 'Escribe el color como #rrggbb, por ejemplo #3b5bdb.' }
  }
  const marca = tokensDeMarca(limpio)
  if (marca.ok) {
    return { ok: true, color: limpio }
  }
  return {
    ok: false,
    motivo: `Sobre ${limpio} el texto de los botones no se lee: da ${razon(marca.conBlanco)} en blanco y ${razon(marca.conTinta)} en oscuro, y hace falta 4,5:1. Uno cercano que sí sirve: ${marca.sugerido}.`,
  }
}

// --- Logo -------------------------------------------------------------------------------------

// Un logo no pasa por la compresión de fotos (WebP con pérdida): el SVG se sube tal cual y un
// raster grande se reduce a PNG, que no pierde calidad ni transparencia.
const EXTENSION_POR_TIPO = {
  'image/svg+xml': 'svg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
} as const

export type TipoDeLogo = keyof typeof EXTENSION_POR_TIPO
export type ExtensionDeLogo = (typeof EXTENSION_POR_TIPO)[TipoDeLogo]

export const TIPOS_DE_LOGO = Object.keys(EXTENSION_POR_TIPO).join(',')
export const CARPETA_DE_LOGOS = 'logos'
export const RUTA_DE_LOGO = /^logos\/[0-9a-f]{64}\.(svg|png|webp|jpg)$/

const KB = 1024
// Lo que se acepta leer del disco: más que eso es una foto, no un logo.
const PESO_MAXIMO_ORIGINAL = 10 * KB * KB
export const PESO_MAXIMO_SVG = 200 * KB
// Lo que termina en Storage, ya reducido.
export const PESO_MAXIMO_LOGO = KB * KB
export const LADO_MAXIMO_LOGO = 1024
// El ícono más grande de la app mide 512 px.
const LADO_RECOMENDADO = 512

export function extensionDeLogo(tipo: string): ExtensionDeLogo | null {
  return tipo in EXTENSION_POR_TIPO ? EXTENSION_POR_TIPO[tipo as TipoDeLogo] : null
}

// Lo que se puede decir del archivo apenas se elige, antes de leerlo. null = se puede seguir.
export function motivoDeLogoInvalido(archivo: { tipo: string; peso: number }): string | null {
  if (!extensionDeLogo(archivo.tipo)) {
    return 'El logo tiene que ser SVG, PNG, WebP o JPEG.'
  }
  if (archivo.tipo === 'image/svg+xml' && archivo.peso > PESO_MAXIMO_SVG) {
    return 'El SVG pesa más de 200 KB: expórtalo sin imágenes incrustadas.'
  }
  if (archivo.peso > PESO_MAXIMO_ORIGINAL) {
    return 'El archivo pesa más de 10 MB: es demasiado para un logo.'
  }
  return null
}

// Lo que se sube, ya reducido si hacía falta.
export function motivoDeLogoPesado(peso: number): string | null {
  return peso > PESO_MAXIMO_LOGO
    ? 'El logo sigue pesando más de 1 MB después de reducirlo. Prueba con un SVG o con un PNG de menos colores.'
    : null
}

// Un SVG se muestra con <img>, donde no corre código; igual se rechaza lo que no pinta nada en
// un logo, y el que no dice cuánto mide (no se podría dibujar en los íconos).
export function motivoDeSvgInvalido(texto: string): string | null {
  const raiz = /<svg\b[^>]*>/i.exec(texto)?.[0]
  if (!raiz) {
    return 'El archivo no es un SVG.'
  }
  if (/<script\b|<foreignObject\b|\son[a-z]+\s*=/i.test(texto)) {
    return 'El SVG trae código o contenido incrustado. Expórtalo como SVG simple.'
  }
  const conMedidas =
    /\bviewBox\s*=/i.test(raiz) || (/\bwidth\s*=/i.test(raiz) && /\bheight\s*=/i.test(raiz))
  return conMedidas ? null : 'El SVG no dice cuánto mide (le falta viewBox o width y height).'
}

// No impide subirlo: avisa de lo que va a pasar con los íconos.
export function avisoDeLogoChico(tipo: string, medidas: Dimensiones): string | null {
  if (tipo === 'image/svg+xml' || Math.max(medidas.ancho, medidas.alto) >= LADO_RECOMENDADO) {
    return null
  }
  return `El logo mide ${medidas.ancho} × ${medidas.alto} px: los íconos de la app se van a ver borrosos. Si puedes, usa uno de 512 px o un SVG.`
}

function numero(raiz: string, atributo: string): number | null {
  const valor = new RegExp(`\\b${atributo}\\s*=\\s*["']\\s*([0-9.]+)(px)?\\s*["']`, 'i').exec(
    raiz,
  )?.[1]
  const leido = valor ? Number(valor) : Number.NaN
  return Number.isFinite(leido) && leido > 0 ? leido : null
}

// Cuánto mide un SVG según su etiqueta raíz: `width` y `height` si los trae en píxeles, y si no
// el `viewBox`. Un SVG sin medidas propias no se puede dibujar en un lienzo en todos los
// navegadores: con esto se le ponen antes de dibujarlo.
export function medidasDeSvg(texto: string): Dimensiones | null {
  const raiz = /<svg\b[^>]*>/i.exec(texto)?.[0] ?? ''
  const [ancho, alto] = [numero(raiz, 'width'), numero(raiz, 'height')]
  if (ancho && alto) {
    return { ancho, alto }
  }
  const caja =
    /\bviewBox\s*=\s*["']\s*[-0-9.]+[\s,]+[-0-9.]+[\s,]+([0-9.]+)[\s,]+([0-9.]+)\s*["']/i.exec(raiz)
  const [anchoCaja, altoCaja] = [Number(caja?.[1]), Number(caja?.[2])]
  return anchoCaja > 0 && altoCaja > 0 ? { ancho: anchoCaja, alto: altoCaja } : null
}

// El mismo SVG con `width` y `height` explícitos en su raíz.
export function svgConMedidas(texto: string, medidas: Dimensiones): string {
  return texto.replace(/<svg\b([^>]*)>/i, (_, atributos: string) => {
    const sinMedidas = atributos.replace(/\s(width|height)\s*=\s*("[^"]*"|'[^']*')/gi, '')
    return `<svg${sinMedidas} width="${medidas.ancho}" height="${medidas.alto}">`
  })
}

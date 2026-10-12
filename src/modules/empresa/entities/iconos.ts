// Los íconos de la app (PWA, pestaña del navegador, «Agregar a inicio»). Sin logo son los neutros
// de public/iconos; «Regenerar íconos» los dibuja a partir del logo y guarda sus rutas en
// `ajustes_empresa.iconos` (design/ICONOS.md).
import { z } from 'zod'
import { COLOR_TEMA } from '@/shared/config/app'
import type { Dimensiones } from '@/shared/lib/imagenes'

// 16 y 48 px sólo existen dentro de `favicon.ico`, que queda neutro: el bucket no admite `.ico`
// y los navegadores actuales usan el <link> en PNG.
export const ICONOS = [
  { clave: '32', lado: 32, enmascarable: false, redondeado: true },
  // iOS recorta las esquinas por su cuenta y no admite transparencia: fondo a sangre.
  { clave: '180', lado: 180, enmascarable: false, redondeado: false },
  { clave: '192', lado: 192, enmascarable: false, redondeado: true },
  { clave: '512', lado: 512, enmascarable: false, redondeado: true },
  // Android lo recorta con la forma que quiera: lo importante va en el centro.
  { clave: '512m', lado: 512, enmascarable: true, redondeado: false },
] as const

export type EspecificacionDeIcono = (typeof ICONOS)[number]
export type ClaveDeIcono = EspecificacionDeIcono['clave']

// Rutas dentro del bucket `marca`, una por ícono.
export type Iconos = Record<ClaveDeIcono, string>

export const RUTA_DE_ICONO = /^iconos\/[0-9a-f]{64}\.png$/

const rutaDeIcono = z.string().regex(RUTA_DE_ICONO)

export const esquemaIconos = z.object({
  '32': rutaDeIcono,
  '180': rutaDeIcono,
  '192': rutaDeIcono,
  '512': rutaDeIcono,
  '512m': rutaDeIcono,
})

// Lo guardado en la base. Devuelve null si no hay íconos propios o si no tienen la forma esperada:
// en los dos casos valen los neutros.
export function iconosDesde(guardado: unknown): Iconos | null {
  const leidos = esquemaIconos.safeParse(guardado)
  return leidos.success ? leidos.data : null
}

// El logo suele ser del color de la marca: sobre ese mismo color no se vería. Por eso se elige.
export const FONDOS_DE_ICONO = ['marca', 'blanco'] as const
export type FondoDeIcono = (typeof FONDOS_DE_ICONO)[number]

export function colorDeFondo(fondo: FondoDeIcono, colorAcento: string | null): string {
  return fondo === 'blanco' ? '#ffffff' : (colorAcento ?? COLOR_TEMA)
}

// Cuánto del lado ocupa el logo. En el enmascarable entra en el cuadrado inscrito en la zona
// segura (un círculo del 80 % del lado): 0,8 / √2.
const PROPORCION_NORMAL = 0.68
const PROPORCION_ENMASCARABLE = 0.56
const RADIO_REDONDEADO = 0.22

export type Encuadre = {
  // Dónde va el logo, centrado y sin deformar.
  logo: { x: number; y: number; ancho: number; alto: number }
  // Radio de las esquinas del fondo, en píxeles. 0 = a sangre.
  radio: number
}

export function encuadreDeIcono(icono: EspecificacionDeIcono, logo: Dimensiones): Encuadre {
  const caja = icono.lado * (icono.enmascarable ? PROPORCION_ENMASCARABLE : PROPORCION_NORMAL)
  const escala = caja / Math.max(logo.ancho, logo.alto, 1)
  const ancho = logo.ancho * escala
  const alto = logo.alto * escala
  return {
    logo: { x: (icono.lado - ancho) / 2, y: (icono.lado - alto) / 2, ancho, alto },
    radio: icono.redondeado ? icono.lado * RADIO_REDONDEADO : 0,
  }
}

type IconoDeManifest = { src: string; sizes: string; type: string; purpose?: 'maskable' }

const NEUTROS: Iconos = {
  '32': '/iconos/icono-32.png',
  '180': '/apple-touch-icon.png',
  '192': '/iconos/icono-192.png',
  '512': '/iconos/icono-512.png',
  '512m': '/iconos/icono-512-maskable.png',
}

// La dirección de un ícono: el generado desde el logo si existe, y si no el neutro de public/.
export function urlDeIcono(
  iconos: Iconos | null,
  clave: ClaveDeIcono,
  urlDe: (ruta: string) => string,
): string {
  return iconos ? urlDe(iconos[clave]) : NEUTROS[clave]
}

// Los que declara el manifest de la PWA. Con íconos propios la dirección cambia en cada
// regeneración (el nombre es el hash): así el navegador se entera de que hay uno nuevo.
export function iconosDelManifest(
  iconos: Iconos | null,
  urlDe: (ruta: string) => string,
): IconoDeManifest[] {
  return [
    { src: urlDeIcono(iconos, '192', urlDe), sizes: '192x192', type: 'image/png' },
    { src: urlDeIcono(iconos, '512', urlDe), sizes: '512x512', type: 'image/png' },
    {
      src: urlDeIcono(iconos, '512m', urlDe),
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ]
}

// Los tamaños que sirve `/iconos/vigente/[tamano]` a los <link> del documento.
export function claveDeIconoVigente(tamano: string): ClaveDeIcono | null {
  return tamano === '32' || tamano === '180' || tamano === '192' ? tamano : null
}

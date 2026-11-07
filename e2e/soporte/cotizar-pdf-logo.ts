// Los logos de prueba del PDF (paso 4.18-3a, E8 de `e2e/cotizar-pdf.spec.ts`) y cómo se ponen: el objeto en el bucket `marca` por su hash y su ruta en los ajustes, por SQL.
// Lo restaura `restaurarEmpresa()` con la instantánea de antes.
import { createHash } from 'node:crypto'
import { expect } from '@playwright/test'
import { admin } from './base'
import { leerElPdf } from './cotizar-pdf'
import type { Page } from '@playwright/test'
import { literal, sql } from './sql'

// Un PNG de 1 × 1, un SVG que react-pdf dibuja fiel, uno que no (el color le llega por `<style>`, y su `<rect>` de color propio prueba que el filtro lo dejó fuera) y un WebP.
export const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)
export const VERDE = '#0a7f3c'
export const ROSA = '#c2185b'
const svg = (cuerpo: string) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" width="10" height="10">${cuerpo}</svg>`,
  )
export const SVG_SIMPLE = svg(`<rect width="10" height="10" fill="${VERDE}"/>`)
export const SVG_CON_ESTILO = svg(
  `<style>.a{fill:${VERDE}}</style><rect class="a" width="5" height="5"/><rect x="5" width="5" height="5" fill="${ROSA}"/>`,
)
export const WEBP = Buffer.from('RIFF\u0000\u0000\u0000\u0000WEBPVP8 ', 'latin1')

export async function ponerElLogo(datos: Buffer, extension: string, tipo: string) {
  const ruta = `logos/${createHash('sha256').update(datos).digest('hex')}.${extension}`
  const subida = await admin()
    .storage.from('marca')
    .upload(ruta, datos, { contentType: tipo, upsert: true })
  expect(subida.error).toBeNull()
  sql(`update public.ajustes_empresa set logo_ruta = ${literal(ruta)} where id = 1`)
}

// Pone el logo, pide el PDF y exige que las líneas sean las de sin logo: el logo no mueve el texto.
export async function leerConElLogo(
  page: Page,
  id: string,
  logo: { datos: Buffer; extension: string; tipo: string },
  lineasSinLogo: string[],
) {
  await ponerElLogo(logo.datos, logo.extension, logo.tipo)
  const pdf = await leerElPdf(page, id)
  expect(pdf.lineas).toEqual(lineasSinLogo)
  return pdf.leido
}

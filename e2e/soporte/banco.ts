// Lo que el e2e necesita para dibujar un componente compartido SOLO, sin una ruta de pruebas en `src/app` (que viajaría en el build de
// producción): compila un banco (`banco-de-xcell.tsx`) a un script con esbuild y lo sirve en una URL que el servidor no tiene, con los
// estilos compilados de la app (los de `/ingreso`, una pantalla pública). La página se arma con `page.route`, en el mismo origen.
//
// esbuild NO es una dependencia del proyecto: viene con `tsx` (que sí lo es) y se resuelve desde él. Sin una dependencia nueva; si `tsx`
// dejara de traerlo, esto falla en voz alta en vez de callar.
import { createRequire } from 'node:module'
import { join } from 'node:path'
import type { Page } from '@playwright/test'
import { textoGrandeAlCargar } from './recorrido'

type Esbuild = {
  build(opciones: Record<string, unknown>): Promise<{ outputFiles: { text: string }[] }>
}

const compilados = new Map<string, Promise<string>>()

export function compilar(entrada: string): Promise<string> {
  let compilado = compilados.get(entrada)
  if (!compilado) {
    const raiz = process.cwd()
    const desdeLaRaiz = createRequire(join(raiz, 'package.json'))
    const esbuild = createRequire(desdeLaRaiz.resolve('tsx/package.json'))('esbuild') as Esbuild
    compilado = esbuild
      .build({
        entryPoints: [join(raiz, entrada)],
        bundle: true,
        write: false,
        format: 'iife',
        platform: 'browser',
        target: 'es2022',
        jsx: 'automatic',
        define: { 'process.env.NODE_ENV': '"production"' },
        tsconfig: join(raiz, 'tsconfig.json'),
        logLevel: 'silent',
      })
      .then((r) => r.outputFiles[0]?.text ?? '')
    compilados.set(entrada, compilado)
  }
  return compilado
}

// Lo de `/ingreso` que hace falta para vestir el banco igual que la app: las hojas de estilo y los atributos de <html> (la clase de las fuentes).
type Cabeza = { enlaces: string; atributosDeHtml: string }
let cabeza: Promise<Cabeza> | undefined

async function cabezaDeLaApp(page: Page): Promise<Cabeza> {
  cabeza ??= page.request.get('/ingreso').then(async (respuesta) => {
    const html = await respuesta.text()
    const enlaces = (html.match(/<link[^>]+rel="stylesheet"[^>]*>/g) ?? []).join('\n')
    const atributosDeHtml = /<html([^>]*)>/.exec(html)?.[1] ?? ''
    if (enlaces === '') {
      throw new Error('/ingreso no trae hojas de estilo: no hay con qué vestir el banco.')
    }
    return { enlaces, atributosDeHtml }
  })
  return cabeza
}

export type OpcionesDelBanco = {
  tema?: 'claro' | 'oscuro'
  // El texto al 200 % desde el primer cuadro.
  zoom?: '100' | '200'
  live?: boolean
  modo?: '300'
}

// Abre el banco en `page`: la ruta, el tema, el Modo Live y el tamaño del texto. Devuelve cuando la hoja ya se dibujó.
export async function abrirBanco(
  page: Page,
  entrada: string,
  ruta: string,
  opciones: OpcionesDelBanco = {},
): Promise<void> {
  const [js, { enlaces, atributosDeHtml }] = await Promise.all([
    compilar(entrada),
    cabezaDeLaApp(page),
  ])
  const clases = [opciones.tema === 'oscuro' ? 'dark' : '', opciones.live ? 'live' : '']
    .filter(Boolean)
    .join(' ')
  const atributos = atributosDeHtml.includes('class="')
    ? atributosDeHtml.replace('class="', `class="${clases} `)
    : `${atributosDeHtml} class="${clases}"`
  const cuerpo = `<!doctype html><html${atributos}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${enlaces}</head><body><div id="banco"></div><script>${js.replace(/<\/script/gi, '<\\/script')}</script></body></html>`
  await page.route(`**${ruta}**`, (r) =>
    r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: cuerpo }),
  )
  if (opciones.zoom === '200') {
    await textoGrandeAlCargar(page)
  }
  await page.goto(`${ruta}${opciones.modo ? `?modo=${opciones.modo}` : ''}`)
  await page.locator('[data-xcell]').first().waitFor()
}

export const BANCO_DE_XCELL = 'e2e/soporte/banco-de-xcell.tsx'
export const RUTA_DEL_BANCO_DE_XCELL = '/__banco/xcell'

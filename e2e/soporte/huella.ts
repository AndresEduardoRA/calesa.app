// La huella de lo que hace una prueba, para saber si el celular le agrega algo al escritorio (cierre 5a-fix-3).
//
// Sólo con `E2E_HUELLA=<carpeta>`; sin la variable no existe. Por cada prueba guarda, en
// `<carpeta>/<proyecto>/<hash>.json.gz`: (1) los pasos —cada acción de un `Locator` y cada `expect`—, con el
// selector, la URL y la **huella del elemento** (la cadena de sus ancestros: etiqueta, rol, nombre, `data-slot`,
// `data-side`, `aria-modal`), (2) los errores de consola y de página, y (3) el JS de la app que se ejecutó
// (cobertura de bloques de V8). `scripts/comparar-anchos.mjs` compara escritorio y celular prueba por prueba.
//
// Se engancha al `Frame` del cliente de Playwright (versión fijada en el lockfile): todo `Locator` termina ahí con su
// selector. El elemento se mide **después** de la acción o del `expect`, con `$$eval` (no espera): si ya no está, la
// huella dice cero elementos, igual en los dos proyectos. Un desfase de tiempo sólo puede dar una diferencia de más
// (la prueba se queda en el celular), nunca una igualdad de más.
import { mkdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import type { CDPSession, Frame, Page, TestInfo } from '@playwright/test'

export type PasoDeHuella = {
  // La acción (`click`, `fill`…) o `expect:<expresión>`.
  m: string
  // El selector tal como lo escribió la prueba.
  s: string
  // Lo que el `expect` esperaba (número o texto), para que `toHaveCount(0)` y `toHaveCount(1)` no se confundan.
  x: string
  // La URL después del paso, sin el origen.
  u: string
  // Cuántos elementos coincidían y la huella de los dos primeros.
  n: number
  h: string[]
}

export type Huella = {
  prueba: string
  proyecto: string
  pasos: PasoDeHuella[]
  errores: string[]
  // Función del JS de la app (`<archivo>|<desde>`) → sus bloques que no corrieron (`desde-hasta,…`).
  cobertura: Record<string, string>
}

type Grabadora = {
  pasos: PasoDeHuella[]
  errores: string[]
  tomarCobertura: (aunqueSeaPronto?: boolean) => Promise<void>
}

// Los e2e corren con un solo worker y de a una prueba: la grabadora de la prueba en curso.
let actual: Grabadora | null = null
const parchados = new WeakSet<object>()

const ACCIONES = [
  'goto',
  'click',
  'dblclick',
  'fill',
  'press',
  'type',
  'check',
  'uncheck',
  'hover',
  'selectOption',
  'setInputFiles',
  'tap',
  'focus',
  'selectText',
  'dispatchEvent',
  'dragAndDrop',
]
// Lo que puede navegar: antes se toma la cobertura, porque lo que se ejecutó en la página de antes se pierde.
const PUEDEN_NAVEGAR = new Set(['goto', 'click', 'dblclick', 'press', 'tap'])
const ENTRE_COBERTURAS_MS = 400

// Corre en el navegador: no puede usar nada de afuera.
function huellaEnElNavegador(elementos: Element[]): { n: number; h: string[] } {
  const nombreDe = (e: Element, conTexto: boolean): string => {
    const etiqueta = e.getAttribute('aria-label')
    if (etiqueta) return etiqueta
    const por = e.getAttribute('aria-labelledby')
    const referido = por ? document.getElementById(por.split(' ').at(0) ?? '') : null
    if (referido?.textContent) return referido.textContent.trim().slice(0, 40)
    return conTexto ? e.textContent.replace(/\s+/g, ' ').trim().slice(0, 40) : ''
  }
  const cadena = (inicio: Element): string => {
    const piezas: string[] = []
    let e: Element | null = inicio
    for (let i = 0; e && e !== document.body && i < 8; i++) {
      piezas.push(
        [
          e.localName,
          e.getAttribute('role') ?? '',
          nombreDe(e, i === 0),
          e.getAttribute('data-slot') ?? '',
          e.getAttribute('data-side') ?? '',
          e.getAttribute('aria-modal') ?? '',
        ].join('|'),
      )
      e = e.parentElement
    }
    return piezas.join(' < ')
  }
  return { n: elementos.length, h: elementos.slice(0, 2).map(cadena) }
}

const sinOrigen = (url: string): string => {
  try {
    const u = new URL(url)
    return u.pathname + u.search
  } catch {
    return url
  }
}

async function registrar(
  frame: Frame,
  metodo: string,
  selector: string,
  esperado: string,
): Promise<void> {
  if (!actual) return
  let medida: { n: number; h: string[] } = { n: -1, h: [] }
  if (selector) {
    try {
      medida = await frame.$$eval(selector, huellaEnElNavegador)
    } catch {
      // La página cambió mientras se medía: queda -1, igual en los dos proyectos o una diferencia de más.
    }
  }
  actual.pasos.push({ m: metodo, s: selector, x: esperado, u: sinOrigen(frame.url()), ...medida })
}

type Opciones = {
  selector?: string
  expectedNumber?: number
  expectedText?: unknown
  isNot?: boolean
}
type Funcion = (this: Frame, ...args: unknown[]) => Promise<unknown>

function parchar(page: Page): void {
  const proto = Object.getPrototypeOf(page.mainFrame()) as Record<string, unknown>
  if (parchados.has(proto)) return
  parchados.add(proto)
  for (const nombre of ACCIONES) {
    const original = proto[nombre]
    if (typeof original !== 'function') continue
    proto[nombre] = async function (this: Frame, ...args: unknown[]) {
      if (actual && PUEDEN_NAVEGAR.has(nombre)) await actual.tomarCobertura()
      const resultado = await (original as Funcion).apply(this, args)
      await registrar(
        this,
        nombre,
        typeof args[0] === 'string' && nombre !== 'goto' ? args[0] : '',
        '',
      )
      return resultado
    }
  }
  const esperar = proto['_expect']
  if (typeof esperar === 'function') {
    proto['_expect'] = async function (this: Frame, expresion: string, opciones: Opciones) {
      const resultado = await (esperar as Funcion).call(this, expresion, opciones)
      const esperado = JSON.stringify([
        opciones.expectedNumber ?? null,
        opciones.expectedText ?? null,
      ])
      await registrar(
        this,
        `expect:${expresion}${opciones.isNot ? '!' : ''}`,
        opciones.selector ?? '',
        esperado,
      )
      return resultado
    }
  }
}

type RangoDeV8 = { startOffset: number; endOffset: number; count: number }
type ScriptDeV8 = { url: string; functions: { ranges: RangoDeV8[] }[] }

async function empezarCobertura(
  page: Page,
  acumulado: Map<string, string[]>,
): Promise<{ sesion: CDPSession; tomar: (aunqueSeaPronto?: boolean) => Promise<void> }> {
  const sesion = await page.context().newCDPSession(page)
  await sesion.send('Profiler.enable')
  await sesion.send('Profiler.startPreciseCoverage', { callCount: true, detailed: true })
  let ultima = 0
  const tomar = async (aunqueSeaPronto = false): Promise<void> => {
    if (!aunqueSeaPronto && Date.now() - ultima < ENTRE_COBERTURAS_MS) return
    ultima = Date.now()
    let resultado: ScriptDeV8[]
    try {
      resultado = ((await sesion.send('Profiler.takePreciseCoverage')) as { result: ScriptDeV8[] })
        .result
    } catch {
      return
    }
    for (const script of resultado) {
      if (!script.url.includes('/_next/static/')) continue
      const archivo = script.url.replace(/^https?:\/\/[^/]+/, '').split('?')[0] ?? ''
      for (const funcion of script.functions) {
        const raiz = funcion.ranges[0]
        if (!raiz || raiz.count === 0) continue
        const clave = `${archivo}|${String(raiz.startOffset)}`
        const ceros = funcion.ranges
          .slice(1)
          .filter((r) => r.count === 0)
          .map((r) => `${String(r.startOffset)}-${String(r.endOffset)}`)
        const previo = acumulado.get(clave)
        // Un bloque no ejecutado es el que no corrió en ninguna de las lecturas en que la función se llamó.
        acumulado.set(clave, previo ? previo.filter((r) => ceros.includes(r)) : ceros)
      }
    }
  }
  return { sesion, tomar }
}

export type Sesion = { terminar: () => Promise<void> }

export async function empezarHuella(page: Page, info: TestInfo, carpeta: string): Promise<Sesion> {
  parchar(page)
  const acumulado = new Map<string, string[]>()
  const { sesion, tomar } = await empezarCobertura(page, acumulado)
  const errores: string[] = []
  page.on('pageerror', (e) => errores.push(`pageerror: ${e.message.slice(0, 160)}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(`console: ${m.text().slice(0, 160)}`)
  })
  const grabadora: Grabadora = { pasos: [], errores, tomarCobertura: tomar }
  actual = grabadora
  return {
    terminar: async () => {
      await tomar(true)
      actual = null
      await sesion.detach().catch(() => undefined)
      const archivo = basename(info.file)
      const desde = info.titlePath.indexOf(archivo)
      const prueba = (desde >= 0 ? info.titlePath.slice(desde) : [archivo, info.title]).join(' › ')
      const huella: Huella = {
        prueba,
        proyecto: info.project.name,
        pasos: grabadora.pasos,
        errores,
        cobertura: Object.fromEntries([...acumulado].map(([k, v]) => [k, v.join(',')])),
      }
      const destino = join(carpeta, info.project.name)
      mkdirSync(destino, { recursive: true })
      const nombre = createHash('sha1').update(prueba).digest('hex').slice(0, 16)
      writeFileSync(join(destino, `${nombre}.json.gz`), gzipSync(JSON.stringify(huella)))
    },
  }
}

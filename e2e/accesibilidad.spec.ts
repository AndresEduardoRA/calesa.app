import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CONTRASENA } from './soporte/alta'
import { barrer, focoVisible, REGLAS_DURAS, type Hallazgo } from './soporte/accesibilidad'
import { CONOCIDOS } from './soporte/accesibilidad-conocidos'
import {
  DINAMICAS,
  esDinamica,
  limpiarTerreno,
  REDIRECCIONES,
  rutasDeLaApp,
  sembrarTerreno,
  type Ruta,
  type Terreno,
} from './soporte/accesibilidad-rutas'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { entrarConSesion } from './soporte/pasos'
import { expect, test, type Page } from './soporte/prueba'

// La auditoría AA (9.12-1, `docs/PLAN.md` › 9.12): un barrido de todas las páginas de `src/app` que comprueba lo que una máquina puede.
// Caen la prueba un control sin nombre accesible y un `aria-describedby`/`aria-labelledby` roto que no estén en los conocidos
// (`soporte/accesibilidad-conocidos.ts`, cada uno con la parte que lo arregla); el `h1`, el título, el orden de foco, el foco visible y
// los blancos táctiles sólo informan. Cada página se mira en tema claro y su foco visible otra vez en oscuro (el contraste de los
// colores lo mide `design/tokens.test.ts`). Con `E2E_HALLAZGOS=<carpeta>` deja `<carpeta>/<proyecto>.json` para la tabla de hallazgos.
test.describe.configure({ mode: 'serial' })

const RUTAS = rutasDeLaApp()

// Grupos para que ninguna prueba pase de su tiempo; «el resto» se lleva lo que ningún otro nombra.
const GRUPOS: { nombre: string; incluye: (plantilla: string) => boolean }[] = [
  { nombre: 'acceso', incluye: () => false },
  { nombre: 'inicio y leads', incluye: (p) => p === '/' || p.startsWith('/leads') },
  {
    nombre: 'vehículos y cotizaciones',
    incluye: (p) => p.startsWith('/vehiculos') || p.startsWith('/cotizaciones'),
  },
  { nombre: 'logística', incluye: (p) => p.startsWith('/logistica') },
  { nombre: 'repuestos', incluye: (p) => p.startsWith('/repuestos') },
  { nombre: 'configuración', incluye: (p) => p.startsWith('/configuracion') },
]

function grupoDe(ruta: Ruta): string {
  if (ruta.grupo === 'acceso') return 'acceso'
  return GRUPOS.find((g) => g.incluye(ruta.plantilla))?.nombre ?? 'el resto'
}

type Registro = {
  ruta: string
  url: string
  tema: 'claro' | 'oscuro'
  hallazgos: Hallazgo[]
  titulo?: string
}
const registros: Registro[] = []
const pendientes: { ruta: string; parte: string; motivo: string }[] = []

let duena = ''
let terreno: Terreno | undefined

test.beforeAll(async ({}, info) => {
  test.setTimeout(60_000)
  duena = correoDePrueba(`duena-a11y-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dalia Barrido' })
  terreno = await sembrarTerreno(info.project.name, duena)
})

test.afterAll(async ({}, info) => {
  await limpiarTerreno(info.project.name)
  await borrarPersonasDePrueba()
  const carpeta = process.env['E2E_HALLAZGOS']
  if (!carpeta) return
  mkdirSync(carpeta, { recursive: true })
  writeFileSync(
    join(carpeta, `${info.project.name}.json`),
    `${JSON.stringify({ registros, pendientes, conocidos: CONOCIDOS }, null, 2)}\n`,
  )
})

const esConocido = (ruta: string, h: Hallazgo) =>
  CONOCIDOS.some((c) => c.ruta === ruta && c.regla === h.regla && c.descriptor === h.descriptor)

async function visitar(page: Page, ruta: Ruta, url: string): Promise<void> {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
  await page.goto(url)
  const esperado = REDIRECCIONES[ruta.plantilla] ?? new URL(url, 'http://x').pathname
  await expect
    .poll(() => new URL(page.url()).pathname, { message: `${ruta.plantilla} terminó en otra ruta` })
    .toBe(esperado)
  const { hallazgos, titulo } = await barrer(page)
  registros.push({
    ruta: ruta.plantilla,
    url,
    tema: 'claro',
    titulo,
    hallazgos: [...hallazgos, ...(await focoVisible(page))],
  })
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await page.waitForFunction(() => document.documentElement.classList.contains('dark'))
  registros.push({ ruta: ruta.plantilla, url, tema: 'oscuro', hallazgos: await focoVisible(page) })
}

function destino(ruta: Ruta): string | null {
  if (!esDinamica(ruta.plantilla)) return ruta.plantilla
  const resultado = DINAMICAS[ruta.plantilla]?.(terreno as Terreno)
  if (!resultado) throw new Error(`${ruta.plantilla} no tiene entrada en DINAMICAS`)
  if ('url' in resultado) return resultado.url
  pendientes.push({ ruta: ruta.plantilla, parte: resultado.pendiente, motivo: resultado.motivo })
  return null
}

test('E2E A0 toda página de src/app tiene ruta, resolver o pendiente', () => {
  expect(RUTAS.length).toBeGreaterThan(40)
  expect(RUTAS.filter((r) => r.grupo === 'acceso').length).toBeGreaterThan(2)
  expect(
    RUTAS.filter((r) => esDinamica(r.plantilla) && !DINAMICAS[r.plantilla]).map((r) => r.plantilla),
  ).toEqual([])
  expect(Object.keys(DINAMICAS).filter((p) => !RUTAS.some((r) => r.plantilla === p))).toEqual([])
})

const NOMBRES = ['acceso', ...GRUPOS.slice(1).map((g) => g.nombre), 'el resto']

NOMBRES.forEach((nombre, i) => {
  test(`E2E A${String(i + 1)} barrido de accesibilidad: ${nombre}`, async ({ page }) => {
    const rutas = RUTAS.filter((r) => grupoDe(r) === nombre)
    expect(rutas.length).toBeGreaterThan(0)
    test.setTimeout(30_000 + rutas.length * 20_000)
    if (nombre !== 'acceso') await entrarConSesion(page, duena, CONTRASENA)
    const desde = registros.length
    for (const ruta of rutas) {
      const url = destino(ruta)
      if (url) await visitar(page, ruta, url)
    }
    const nuevos = registros
      .slice(desde)
      .flatMap((r) => r.hallazgos.map((h) => ({ ruta: r.ruta, ...h })))
      .filter((h) => REGLAS_DURAS.includes(h.regla) && !esConocido(h.ruta, h))
      .map((h) => `${h.ruta} · ${h.regla} · ${h.descriptor} (×${String(h.n)})`)
    // Un conocido que esta corrida no vio no la hace caer (lo dibujado cambia con el proyecto y el estado): queda anotado.
    const vistos = registros.slice(desde)
    for (const c of CONOCIDOS.filter((c) => rutas.some((r) => r.plantilla === c.ruta))) {
      const visto = vistos.some(
        (r) =>
          r.ruta === c.ruta &&
          r.hallazgos.some((h) => h.regla === c.regla && h.descriptor === c.descriptor),
      )
      if (!visto)
        test.info().annotations.push({
          type: 'conocido-sin-ver',
          description: `${c.ruta} · ${c.descriptor}`,
        })
    }
    expect(
      nuevos,
      'controles sin nombre o referencias rotas que no están en los conocidos',
    ).toEqual([])
  })
})

// Un título por página (9.12-5, R4): es lo primero que lee quien navega con un lector de pantalla. `/auth/nueva-contrasena` sin sesión de
// recuperación termina en `/recuperar` (`REDIRECCIONES`): las dos dicen lo mismo y se aceptan.
test('E2E A9 cada página tiene su propio título', () => {
  const porTitulo = new Map<string, string[]>()
  for (const r of registros) {
    if (r.tema !== 'claro' || r.titulo === undefined || r.ruta in REDIRECCIONES) continue
    porTitulo.set(r.titulo, [...(porTitulo.get(r.titulo) ?? []), r.ruta])
  }
  const repetidos = [...porTitulo].filter(([, rutas]) => rutas.length > 1)
  expect(repetidos, 'títulos que repiten dos o más páginas').toEqual([])
})

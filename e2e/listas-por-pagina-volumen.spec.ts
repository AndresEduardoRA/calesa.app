import { gzipSync } from 'node:zlib'
import type { Page, Request, TestInfo } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import {
  elegirTamano,
  esperarHidratado,
  filasDelListado,
  fijarPreferencia,
  parametrosDe,
  selectorDeTamano,
} from './soporte/listas-por-pagina'
import { entrarConSesion } from './soporte/pasos'
import { capturar, sinScrollHorizontal } from './soporte/recorrido'
import { sql } from './soporte/sql'
import { MAXIMO_DE_PAGINA_DE_LEADS } from '../src/modules/leads/entities/listado'
import { MAXIMO_DE_PAGINA_DE_VEHICULOS } from '../src/modules/vehiculos/entities/vehiculo'
import { tamanosHasta } from '../src/shared/lib/paginacion'

// «Ítems por página» con VOLUMEN (9g): el listado de leads (50.000 en total, la dueña con «todos» y Ana con «propios») y
// el inventario de vehículos (10.000), cada uno con **su valor máximo**, en escritorio y celular. Se afirma lo
// determinista (bytes de la primera respuesta, nodos del DOM, lo que el navegador le pide a la base, una página profunda que
// no pesa más que la primera) y se toman capturas con cada valor del selector para mirarlas
// (`E2E_CAPTURAS=e2e-capturas/9g`). Sólo con `E2E_VOLUMEN=1` y tras `pnpm db:sembrar-volumen`; después, `pnpm db:reset`.
// El costo de la consulta con ese tamaño lo mide `pnpm db:medir:volumen` (con planes asertados).
test.describe.configure({ mode: 'serial' })

const CLAVE = 'Volumen-9e-clave'
const DUENA = 'duena-volumen@ejemplo.com'
const ANA = 'ana-volumen@ejemplo.com'

// Cuántos nodos del DOM aguanta cada lista con su máximo: lo medido (leads a 100 filas, 9h: 5.020 en escritorio y 5.015 en
// el celular; inventario 7.894; la tabla y las tarjetas están las dos en el DOM) con un margen. El presupuesto del celular
// de la 9e es 9.000: las dos caben con 100.
const NODOS_MAXIMOS = { leads: 6_500, vehiculos: 9_000 }
// Lo que pesa, comprimido, el documento de la primera respuesta (el HTML y el flujo de React) con el máximo de la lista:
// lo medido (leads a 100, 46,6 KB —705 KB crudos—; inventario 57 KB) con un margen. Un peso que de pronto se duplica es
// una columna que nadie pensó.
const BYTES_MAXIMOS_DEL_DOCUMENTO = { leads: 60_000, vehiculos: 75_000 }

const nodos = (page: Page) => page.evaluate(() => document.querySelectorAll('*').length)

test.beforeAll(() => {
  const leads = Number(sql("select count(*) from public.leads where nombre like 'Volumen %'"))
  test.skip(leads < 50_000, 'Sin volumen: corre pnpm db:sembrar-volumen.')
})

test.afterAll(async () => {
  for (const correo of [DUENA, ANA]) {
    await fijarPreferencia(correo, null)
  }
})

function notas(info: TestInfo, tipo: string, descripcion: string) {
  info.annotations.push({ type: tipo, description: descripcion })
  console.warn(`[${info.project.name}] ${tipo}: ${descripcion}`)
}

// Lo que el navegador pide mientras se carga una pantalla: a quién y cuántas acciones del servidor.
function observar(page: Page) {
  const pedidos: Request[] = []
  page.on('request', (pedido) => pedidos.push(pedido))
  return {
    aLaBase: () => pedidos.filter((p) => /:54621\//.test(p.url())).length,
    acciones: () =>
      pedidos.filter((p) => p.method() === 'POST' && p.headers()['next-action'] !== undefined)
        .length,
    reiniciar: () => (pedidos.length = 0),
  }
}

// Lo que pesa el documento que respondió el servidor para esa URL: tal cual y comprimido (lo que viaja de verdad).
async function pesoDelDocumento(page: Page, url: string): Promise<{ crudo: number; gzip: number }> {
  const respuesta = await page.goto(url, { waitUntil: 'load' })
  const cuerpo = (await respuesta?.body()) ?? Buffer.alloc(0)
  return { crudo: cuerpo.length, gzip: gzipSync(cuerpo).length }
}

async function esperarLista(page: Page) {
  await expect(filasDelListado(page).first()).toBeVisible({ timeout: 60_000 })
  await esperarHidratado(page)
}

async function pasarPaginas(page: Page, veces: number) {
  for (let i = 0; i < veces; i += 1) {
    const antes = page.url()
    await page.getByRole('link', { name: 'Siguiente' }).click()
    await expect.poll(() => page.url(), { timeout: 30_000 }).not.toBe(antes)
    await expect(filasDelListado(page).first()).toBeVisible({ timeout: 30_000 })
  }
}

for (const [quien, correo] of [
  ['la dueña («todos»)', DUENA],
  ['Ana («propios»)', ANA],
] as const) {
  test(`listado de leads de ${quien}: con el máximo (${String(MAXIMO_DE_PAGINA_DE_LEADS)}) cabe en bytes y en nodos, y una página profunda no pesa más`, async ({
    page,
  }, info) => {
    test.setTimeout(240_000)
    await entrarConSesion(page, correo, CLAVE)
    await fijarPreferencia(correo, null)
    const pedidos = observar(page)
    const maximo = MAXIMO_DE_PAGINA_DE_LEADS
    const peso = await pesoDelDocumento(page, `/leads?por=${String(maximo)}`)
    await esperarLista(page)
    // La lista llega con el HTML del servidor: el navegador no le pide nada a la base ni ejecuta acciones.
    expect(pedidos.aLaBase()).toBe(0)
    expect(pedidos.acciones()).toBe(0)
    // Con el máximo se ven exactamente las filas del máximo (hay miles detrás).
    await expect(filasDelListado(page)).toHaveCount(maximo)
    await expect(selectorDeTamano(page)).toHaveValue(String(maximo))
    const primera = await nodos(page)
    notas(
      info,
      'listado de leads',
      `${quien}: ${String(peso.crudo)} bytes (${String(peso.gzip)} comprimidos), ${String(primera)} nodos, ${String(maximo)} filas`,
    )
    expect(peso.gzip).toBeLessThan(BYTES_MAXIMOS_DEL_DOCUMENTO.leads)
    expect(primera).toBeLessThan(NODOS_MAXIMOS.leads)
    await sinScrollHorizontal(page)
    await capturar(page, info, `leads-${correo.startsWith('duena') ? 'duena' : 'ana'}-max`)
    // Una página profunda (10 «Siguiente»): las filas son las mismas y el DOM no crece con la profundidad.
    await pasarPaginas(page, 10)
    await expect(filasDelListado(page)).toHaveCount(maximo)
    const profunda = await nodos(page)
    notas(
      info,
      'página profunda de leads',
      `${quien}: ${String(profunda)} nodos (la primera ${String(primera)})`,
    )
    expect(profunda).toBeLessThanOrEqual(Math.ceil(primera * 1.15))
    expect(parametrosDe(page).get('por')).toBe(String(maximo))
  })

  test(`el selector de ${quien} ofrece sólo hasta el máximo de la lista, y lo que pide la URL se acota`, async ({
    page,
  }, info) => {
    test.setTimeout(240_000)
    await entrarConSesion(page, correo, CLAVE)
    // Con la preferencia más alta del selector, la lista muestra el máximo de ESTA lista, no más.
    await fijarPreferencia(correo, 100)
    await page.goto('/leads')
    await esperarLista(page)
    await expect(filasDelListado(page)).toHaveCount(MAXIMO_DE_PAGINA_DE_LEADS)
    const opciones = await selectorDeTamano(page).locator('option').allTextContents()
    expect(opciones).toEqual(tamanosHasta(MAXIMO_DE_PAGINA_DE_LEADS).map(String))
    await page.goto('/leads?por=100')
    await expect(filasDelListado(page).first()).toBeVisible({ timeout: 60_000 })
    await expect(filasDelListado(page)).toHaveCount(MAXIMO_DE_PAGINA_DE_LEADS)
    // Un recorrido con cada valor del selector (capturas): cada uno trae esa cantidad de filas.
    for (const tamano of tamanosHasta(MAXIMO_DE_PAGINA_DE_LEADS)) {
      await elegirTamano(page, tamano)
      await expect(filasDelListado(page)).toHaveCount(tamano, { timeout: 60_000 })
      await expect(selectorDeTamano(page)).toHaveValue(String(tamano))
      await sinScrollHorizontal(page)
      await capturar(
        page,
        info,
        `leads-${correo.startsWith('duena') ? 'duena' : 'ana'}-por-${String(tamano)}`,
      )
    }
    // El selector, a la vista (en el celular está al pie de la lista).
    await selectorDeTamano(page).scrollIntoViewIfNeeded()
    await capturar(page, info, `leads-${correo.startsWith('duena') ? 'duena' : 'ana'}-selector`)
    await fijarPreferencia(correo, null)
  })
}

test('inventario de vehículos de la dueña: con el máximo (100) cabe en bytes y en nodos, y una página profunda no pesa más', async ({
  page,
}, info) => {
  test.setTimeout(240_000)
  const origen = sql("select id from public.origenes where tipo = 'subasta' order by orden limit 1")
  await entrarConSesion(page, DUENA, CLAVE)
  await fijarPreferencia(DUENA, null)
  const pedidos = observar(page)
  const maximo = MAXIMO_DE_PAGINA_DE_VEHICULOS
  const peso = await pesoDelDocumento(page, `/vehiculos?origen=${origen}&por=${String(maximo)}`)
  await esperarLista(page)
  expect(pedidos.aLaBase()).toBe(0)
  expect(pedidos.acciones()).toBe(0)
  await expect(filasDelListado(page)).toHaveCount(maximo)
  const primera = await nodos(page)
  notas(
    info,
    'inventario',
    `${String(peso.crudo)} bytes (${String(peso.gzip)} comprimidos), ${String(primera)} nodos, ${String(maximo)} filas`,
  )
  expect(peso.gzip).toBeLessThan(BYTES_MAXIMOS_DEL_DOCUMENTO.vehiculos)
  expect(primera).toBeLessThan(NODOS_MAXIMOS.vehiculos)
  await sinScrollHorizontal(page)
  await capturar(page, info, 'vehiculos-max')
  await pasarPaginas(page, 10)
  await expect(filasDelListado(page)).toHaveCount(maximo)
  const profunda = await nodos(page)
  notas(
    info,
    'página profunda de vehículos',
    `${String(profunda)} nodos (la primera ${String(primera)})`,
  )
  expect(profunda).toBeLessThanOrEqual(Math.ceil(primera * 1.15))
  // Con cada valor del selector (capturas), y lo que se ve crece con el tamaño sin salirse del presupuesto.
  const pesos: number[] = []
  for (const tamano of tamanosHasta(maximo)) {
    pesos.push(
      (await pesoDelDocumento(page, `/vehiculos?origen=${origen}&por=${String(tamano)}`)).gzip,
    )
    await esperarLista(page)
    await expect(filasDelListado(page)).toHaveCount(tamano)
    await capturar(page, info, `vehiculos-por-${String(tamano)}`)
  }
  notas(
    info,
    'bytes por tamaño',
    tamanosHasta(maximo)
      .map((t, i) => `${String(t)}: ${String(pesos[i])}`)
      .join(' · '),
  )
  // Sin costo por fila que crezca: el máximo pesa, a lo sumo, 2,5 veces lo que pesan 50 filas (son el doble de filas).
  const de50 = pesos[tamanosHasta(maximo).indexOf(50)] ?? 1
  expect(pesos.at(-1) ?? 0).toBeLessThan(de50 * 2.5)
  await selectorDeTamano(page).scrollIntoViewIfNeeded()
  await capturar(page, info, 'vehiculos-selector')
})

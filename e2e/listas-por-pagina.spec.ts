import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { admin } from './soporte/base'
import { idDe } from './soporte/leads'
import {
  irALeads,
  limpiarListado,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import {
  elegirTamano,
  esperarHidratado,
  filasDelListado,
  fijarPreferencia,
  parametrosDe,
  preferenciaDe,
  registrarRed,
  type LineaDeRed,
  selectorDeTamano,
} from './soporte/listas-por-pagina'
import { capturar, demorarAcciones, tactil } from './soporte/recorrido'
import { MAXIMO_DE_PAGINA_DE_LEADS } from '../src/modules/leads/entities/listado'
import { tamanosHasta } from '../src/shared/lib/paginacion'

// «Ítems por página» (9g) en el listado de leads, con la asesora Berta y la dueña, en escritorio y celular: el selector,
// cada valor, lo que se recuerda entre sesiones y dispositivos, y los casos que no son el feliz (un valor manipulado, la
// página 3 con filtros, dos pestañas, sin red, el teclado, «Ver como»). Con volumen (50.000 leads) y a 100 va el spec
// `listas-por-pagina-volumen.spec.ts`. Capturas: `E2E_CAPTURAS=e2e-capturas/9g`.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado
let proyecto = ''

const BUSCAR = 'PorPagina'
const consulta = (extra = '') => `?q=${BUSCAR}${extra}`

test.beforeAll(async ({}, info) => {
  test.setTimeout(120_000)
  proyecto = info.project.name
  t = await prepararListado(proyecto)
  // 130 leads de Berta (dos páginas con 100) y 30 de la dueña, directo en la base (el trigger arma la cartera).
  const insertar = async (email: string, cuantos: number, marca: string, base: number) => {
    const creador = await idDe(email)
    const { error } = await admin()
      .from('leads')
      .insert(
        Array.from({ length: cuantos }, (_, i) => ({
          nombre: `E2E ${BUSCAR}${marca} ${String(i + 1).padStart(3, '0')} ${proyecto}`,
          telefono_principal: `5917${String(base + (proyecto === 'movil' ? 1 : 0))}${String(i).padStart(5, '0')}`,
          creado_por: creador,
        })),
      )
    expect(error).toBeNull()
  }
  await insertar(t.personas.berta, 130, '', 84)
  await insertar(t.personas.duena, 30, 'D', 86)
})

let red: LineaDeRed | null = null
test.beforeEach(({ page }) => {
  red = registrarRed(page)
})
// Si una prueba falla, queda la línea de tiempo de sus pedidos junto a la traza (`red.txt`).
test.afterEach(async ({}, info) => {
  if (info.status !== info.expectedStatus) {
    await red?.adjuntar(info)
  }
})

test.afterAll(async () => {
  await fijarPreferencia(t.personas.berta, null)
  await fijarPreferencia(t.personas.duena, null)
  await limpiarListado(t)
})

test('sin haber elegido, la lista trae 50 y el selector lo dice; elegir cambia, vuelve a la primera y se recuerda', async ({
  page,
}, info) => {
  await fijarPreferencia(t.personas.berta, null)
  await entrar(page, t.personas.berta)
  await irALeads(page, consulta())
  await expect(filasDelListado(page)).toHaveCount(50)
  await expect(selectorDeTamano(page)).toHaveValue('50')
  expect(parametrosDe(page).has('por')).toBe(false)
  await tactil(page, selectorDeTamano(page))

  // El selector ofrece hasta el máximo de ESTA lista (50: a 100 el plan del listado de la dueña deja el índice).
  expect(await selectorDeTamano(page).locator('option').allTextContents()).toEqual(
    tamanosHasta(MAXIMO_DE_PAGINA_DE_LEADS).map(String),
  )
  // Cada valor: la página trae esa cantidad y la URL lo pide.
  for (const tamano of [10, 25, 50]) {
    await elegirTamano(page, tamano)
    await expect(filasDelListado(page)).toHaveCount(tamano)
    await expect(selectorDeTamano(page)).toHaveValue(String(tamano))
    expect(parametrosDe(page).get('por')).toBe(String(tamano))
    expect(parametrosDe(page).has('cursor')).toBe(false)
  }
  // Lo recuerda la cuenta: en la base queda el último, y la lista sin `?por=` lo respeta.
  await elegirTamano(page, 25)
  await expect(filasDelListado(page)).toHaveCount(25)
  await expect.poll(() => preferenciaDe(t.personas.berta)).toBe(25)
  await irALeads(page, consulta())
  await expect(filasDelListado(page)).toHaveCount(25)
  await expect(selectorDeTamano(page)).toHaveValue('25')
  expect(parametrosDe(page).has('por')).toBe(false)
  await capturar(page, info, 'leads-25')
})

test('cambiar el tamaño en la página 3 con filtros y búsqueda vuelve a la primera y los conserva', async ({
  page,
}) => {
  await fijarPreferencia(t.personas.berta, 10)
  await entrar(page, t.personas.berta)
  await irALeads(page, consulta('&tipo=prospecto'))
  await expect(filasDelListado(page)).toHaveCount(10)
  for (let pagina = 2; pagina <= 3; pagina++) {
    await page.getByRole('link', { name: 'Siguiente' }).click()
    await expect(page).toHaveURL(/cursor=/)
    await expect(filasDelListado(page)).toHaveCount(10)
  }
  expect(parametrosDe(page).has('cursor')).toBe(true)
  await elegirTamano(page, 25)
  await expect(filasDelListado(page)).toHaveCount(25)
  const url = parametrosDe(page)
  expect(url.has('cursor')).toBe(false)
  expect(url.get('por')).toBe('25')
  expect(url.get('q')).toBe(BUSCAR)
  expect(url.get('tipo')).toBe('prospecto')
  // Y las páginas siguientes siguen con el tamaño nuevo.
  await page.getByRole('link', { name: 'Siguiente' }).click()
  await expect(filasDelListado(page)).toHaveCount(25)
  expect(parametrosDe(page).get('por')).toBe('25')
})

// 0a de la 9j. `cambiar el tamaño en la página 3` falló una vez en la 9i: el selector decía 25 y la lista seguía con 10 pasados 5 s.
// Sin reproducirse (E1: 20 de 20 con el servidor frío; E1b: 20 de 20 con los 8 núcleos ocupados), las dos formas de que un cambio
// llegue tarde se fuerzan acá: guardar la preferencia lento (1 y 6 s: con 6 s el `expect` de 5 s del fallo original habría visto lo mismo) y la lectura de la página nueva lenta. Lo que se asserta es
// el orden y el final, que no dependen del reloj: la lista no cambia hasta que el guardado terminó (la URL sigue en la página de
// antes), y cuando todo llegó la lista tiene el tamaño nuevo, la URL lo dice y la cuenta lo guardó.
for (const ms of [1_000, 6_000]) {
  test(`si guardar la preferencia tarda ${String(ms / 1000)} s, la lista espera el guardado y termina con el tamaño nuevo`, async ({
    page,
  }) => {
    test.setTimeout(60_000)
    await fijarPreferencia(t.personas.berta, 10)
    await entrar(page, t.personas.berta)
    await irALeads(page, consulta('&tipo=prospecto'))
    await expect(filasDelListado(page)).toHaveCount(10)
    await page.getByRole('link', { name: 'Siguiente' }).click()
    await expect(page).toHaveURL(/cursor=/)
    const acciones = await demorarAcciones(page, ms)
    await elegirTamano(page, 25)
    await expect(selectorDeTamano(page)).toHaveValue('25')
    // Mientras el guardado no termina, la página es la de antes.
    expect(parametrosDe(page).has('por')).toBe(false)
    expect(parametrosDe(page).has('cursor')).toBe(true)
    await expect(filasDelListado(page)).toHaveCount(25, { timeout: ms + 15_000 })
    const url = parametrosDe(page)
    expect(url.get('por')).toBe('25')
    expect(url.has('cursor')).toBe(false)
    expect(url.get('q')).toBe(BUSCAR)
    await expect.poll(() => preferenciaDe(t.personas.berta)).toBe(25)
    // Un solo guardado: ni se repitió ni quedó otro en vuelo.
    expect(acciones).toHaveLength(1)
    await expect(selectorDeTamano(page)).toHaveValue('25')
  })
}

test('si la lectura de la página nueva tarda, el selector sigue en lo elegido y la lista llega después, sin volver atrás', async ({
  page,
}) => {
  test.setTimeout(60_000)
  await fijarPreferencia(t.personas.berta, 10)
  await entrar(page, t.personas.berta)
  await irALeads(page, consulta('&tipo=prospecto'))
  await expect(filasDelListado(page)).toHaveCount(10)
  // La lectura de `?por=25` (la navegación del servidor) sale 5 s tarde.
  await page.route(/[?&]por=25/, async (ruta) => {
    await new Promise((listo) => setTimeout(listo, 5_000))
    await ruta.fallback()
  })
  await elegirTamano(page, 25)
  await expect(selectorDeTamano(page)).toHaveValue('25')
  await expect(filasDelListado(page)).toHaveCount(25, { timeout: 20_000 })
  expect(parametrosDe(page).get('por')).toBe('25')
  await expect(selectorDeTamano(page)).toHaveValue('25')
  await expect.poll(() => preferenciaDe(t.personas.berta)).toBe(25)
})

test('un valor manipulado en la URL se ignora y manda la preferencia; uno válido manda a esa página', async ({
  page,
}) => {
  await fijarPreferencia(t.personas.berta, 25)
  await entrar(page, t.personas.berta)
  for (const malo of ['7', '100000', 'abc', '-5', '0', '25.5', '1e2', '', '%20', '10;DROP']) {
    await irALeads(page, consulta(`&por=${malo}`))
    await expect(filasDelListado(page)).toHaveCount(25)
    await expect(selectorDeTamano(page)).toHaveValue('25')
  }
  // Un tamaño del selector pero más alto que el máximo de la lista se acota a ese máximo: 100 se ve como 50.
  await irALeads(page, consulta('&por=100'))
  await expect(filasDelListado(page)).toHaveCount(MAXIMO_DE_PAGINA_DE_LEADS)
  await expect(selectorDeTamano(page)).toHaveValue(String(MAXIMO_DE_PAGINA_DE_LEADS))
  await irALeads(page, consulta('&por=10'))
  await expect(filasDelListado(page)).toHaveCount(10)
  // Pedirlo por la URL no cambia lo que recuerda la cuenta: eso sólo lo hace elegir en el selector.
  expect(await preferenciaDe(t.personas.berta)).toBe(25)
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('una lista con menos filas que la página no ofrece páginas, y el selector sigue ahí', async ({
  page,
}) => {
  await fijarPreferencia(t.personas.berta, 50)
  await entrar(page, t.personas.berta)
  await irALeads(page, `?q=${BUSCAR} 12`)
  const filas = await filasDelListado(page).count()
  expect(filas).toBeGreaterThan(1)
  expect(filas).toBeLessThan(25)
  await expect(page.getByRole('link', { name: 'Siguiente' })).toHaveCount(0)
  await expect(selectorDeTamano(page)).toHaveValue('50')
})

test('dos pestañas con valores distintos se mantienen; al recargar sin `?por=` manda lo último guardado', async ({
  page,
}) => {
  await fijarPreferencia(t.personas.berta, 50)
  await entrar(page, t.personas.berta)
  const otra = await page.context().newPage()
  await irALeads(page, consulta('&por=10'))
  await otra.goto(`/leads${consulta('&por=50')}`)
  await expect(filasDelListado(page)).toHaveCount(10)
  await expect(filasDelListado(otra)).toHaveCount(50)
  // Elegir en una pestaña lo guarda; la otra sigue como estaba hasta que se recarga.
  await elegirTamano(otra, 25)
  await expect(filasDelListado(otra)).toHaveCount(25)
  await expect.poll(() => preferenciaDe(t.personas.berta)).toBe(25)
  await expect(filasDelListado(page)).toHaveCount(10)
  await page.goto(`/leads${consulta()}`)
  await expect(filasDelListado(page)).toHaveCount(25)
  await otra.close()
})

test('la preferencia viaja de un dispositivo al otro', async ({ page, browser }) => {
  await fijarPreferencia(t.personas.berta, null)
  await entrar(page, t.personas.berta)
  await irALeads(page, consulta())
  await elegirTamano(page, 10)
  await expect(filasDelListado(page)).toHaveCount(10)
  await expect.poll(() => preferenciaDe(t.personas.berta)).toBe(10)
  // Otro contexto (otro navegador, otro dispositivo) de la misma persona: sin `?por=`, ve 10.
  const contexto = await browser.newContext({
    viewport: page.viewportSize() ?? { width: 1280, height: 720 },
  })
  const otro = await contexto.newPage()
  await entrar(otro, t.personas.berta, { fresco: true })
  await otro.goto(`/leads${consulta()}`)
  await expect(filasDelListado(otro)).toHaveCount(10)
  await expect(selectorDeTamano(otro)).toHaveValue('10')
  await contexto.close()
})

test('sin red el cambio se muestra, no navega ni se pierde, y sale solo al volver la conexión', async ({
  page,
}) => {
  await fijarPreferencia(t.personas.berta, 50)
  await entrar(page, t.personas.berta)
  await irALeads(page, consulta())
  await expect(filasDelListado(page)).toHaveCount(50)
  await page.context().setOffline(true)
  await elegirTamano(page, 25)
  await expect(
    page.getByText('Sin conexión: se aplicará cuando vuelva la red.').first(),
  ).toBeVisible()
  await expect(selectorDeTamano(page)).toHaveValue('25')
  expect(parametrosDe(page).has('por')).toBe(false)
  await expect(filasDelListado(page)).toHaveCount(50)
  expect(await preferenciaDe(t.personas.berta)).toBe(50)
  await page.context().setOffline(false)
  await expect(filasDelListado(page)).toHaveCount(25)
  expect(parametrosDe(page).get('por')).toBe('25')
  await expect.poll(() => preferenciaDe(t.personas.berta)).toBe(25)
})

test('con el teclado las flechas recorren sin ir al servidor y Enter confirma; Esc lo deja como estaba', async ({
  page,
}) => {
  test.skip(
    page.viewportSize()?.width !== undefined && page.viewportSize()!.width < 768,
    'el teclado es de escritorio',
  )
  await fijarPreferencia(t.personas.berta, 50)
  await entrar(page, t.personas.berta)
  await irALeads(page, consulta())
  const selector = selectorDeTamano(page)
  await esperarHidratado(page)
  await selector.focus()
  await page.keyboard.press('ArrowUp')
  await expect(selector).toHaveValue('25')
  // Todavía no se pidió nada: ni la URL ni la lista cambiaron.
  expect(parametrosDe(page).has('por')).toBe(false)
  await expect(filasDelListado(page)).toHaveCount(50)
  await page.keyboard.press('Escape')
  await expect(selector).toHaveValue('50')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('ArrowUp')
  await expect(selector).toHaveValue('10')
  await page.keyboard.press('Enter')
  await expect(filasDelListado(page)).toHaveCount(10)
  expect(parametrosDe(page).get('por')).toBe('10')
})

test('«Ver como»: manda la preferencia de quien mira, no la de la persona vista', async ({
  page,
}) => {
  await fijarPreferencia(t.personas.duena, 25)
  // Berta, la persona vista (con el rol de asesora), tiene otra: no cuenta.
  await fijarPreferencia(t.personas.berta, 100)
  const { data: rol } = await admin()
    .from('roles')
    .select('id')
    .eq('clave', 'asesor')
    .single<{ id: string }>()
  await entrar(page, t.personas.duena)
  await page
    .context()
    .addCookies([{ name: 'perspectiva', value: rol?.id ?? '', url: new URL(page.url()).origin }])
  await irALeads(page, `?q=${BUSCAR}D`)
  await expect(filasDelListado(page)).toHaveCount(25)
  await expect(selectorDeTamano(page)).toHaveValue('25')
})

test('una preferencia de 100 (la de otra lista) se ve como el máximo de ésta, sin cambiarla', async ({
  page,
}) => {
  await fijarPreferencia(t.personas.berta, 100)
  await entrar(page, t.personas.berta)
  await irALeads(page, consulta())
  await expect(filasDelListado(page)).toHaveCount(MAXIMO_DE_PAGINA_DE_LEADS)
  await expect(selectorDeTamano(page)).toHaveValue(String(MAXIMO_DE_PAGINA_DE_LEADS))
  // Mirar la lista no toca lo que recuerda la cuenta: en el inventario, que admite 100, sigue siendo 100.
  expect(await preferenciaDe(t.personas.berta)).toBe(100)
})

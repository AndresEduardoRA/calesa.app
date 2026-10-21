import { expect, test, type Page } from './soporte/prueba'
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
  esperarHidratado,
  filasDelListado,
  fijarPreferencia,
  paginaSiguiente,
  parametrosDe,
  preferenciaDe,
  selectorDeTamano,
} from './soporte/listas-por-pagina'
import { demorarAcciones } from './soporte/recorrido'

// «Ítems por página» (5a-15) con una navegación pendiente, en el listado de leads: lo que pasa si la persona cambia el tamaño mientras la
// página 3 todavía se está pidiendo. El feliz y el resto están en `listas-por-pagina.spec.ts`; el estrés (20 corridas seguidas con latencia
// y con CPU lenta) en `por-pagina-pendiente-leads.spec.ts`, sólo con `E2E_ESTRES=1`.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado
const BUSCAR = 'PorPagPendCasos'
const consulta = (extra = '') => `?q=${BUSCAR}${extra}`

test.beforeAll(async ({}, info) => {
  test.setTimeout(120_000)
  t = await prepararListado(info.project.name)
  const creador = await idDe(t.personas.berta)
  const base = info.project.name === 'movil' ? 79 : 78
  const { error } = await admin()
    .from('leads')
    .insert(
      Array.from({ length: 60 }, (_, i) => ({
        nombre: `E2E ${BUSCAR} ${String(i + 1).padStart(3, '0')} ${info.project.name}`,
        telefono_principal: `5917${String(base)}${String(i).padStart(5, '0')}`,
        creado_por: creador,
      })),
    )
  expect(error).toBeNull()
})

test.afterAll(async () => {
  await fijarPreferencia(t.personas.berta, null)
  await limpiarListado(t)
})

// Todos con una navegación pendiente: el cursor de la página 3 tarda 1 s en llegar y, mientras,
// la persona cambia el tamaño. Termina SIEMPRE en la primera página con el tamaño que valga.
async function conLaPaginaTresPendiente(page: Page): Promise<void> {
  await fijarPreferencia(t.personas.berta, 10)
  await entrar(page, t.personas.berta)
  await irALeads(page, consulta())
  await expect(filasDelListado(page)).toHaveCount(10)
  await paginaSiguiente(page)
  await esperarHidratado(page)
  await page.route(/[?&]cursor=/, async (ruta) => {
    if (ruta.request().headers()['rsc'] !== undefined) {
      await new Promise((listo) => setTimeout(listo, 1_000))
    }
    await ruta.fallback()
  })
  await page.getByRole('link', { name: 'Siguiente' }).click()
}

test('con la página 3 pendiente, un tamaño que no es de la lista (un `<option>` inventado) se ignora: no se guarda, no navega y el selector vuelve a lo que había', async ({
  page,
}) => {
  test.setTimeout(60_000)
  await conLaPaginaTresPendiente(page)
  const acciones = await demorarAcciones(page, 0)
  await selectorDeTamano(page).evaluate((select: HTMLSelectElement) => {
    select.add(new Option('7', '7'))
  })
  await selectorDeTamano(page).selectOption('7')
  await expect(selectorDeTamano(page)).toHaveValue('10')
  // La navegación que ya iba a la página 3 termina sola, con el tamaño de antes y sin `?por=`.
  await expect(page).toHaveURL(/cursor=/)
  await expect(filasDelListado(page)).toHaveCount(10)
  expect(parametrosDe(page).has('por')).toBe(false)
  expect(await preferenciaDe(t.personas.berta)).toBe(10)
  expect(acciones).toHaveLength(0)
})

test('con la página 3 pendiente, dos cambios seguidos terminan en el último', async ({ page }) => {
  test.setTimeout(60_000)
  await conLaPaginaTresPendiente(page)
  await selectorDeTamano(page).selectOption('25')
  await selectorDeTamano(page).selectOption('50')
  await expect(filasDelListado(page)).toHaveCount(50, { timeout: 15_000 })
  await expect.poll(() => parametrosDe(page).get('por')).toBe('50')
  expect(parametrosDe(page).has('cursor')).toBe(false)
  await expect(selectorDeTamano(page)).toHaveValue('50')
  await expect.poll(() => preferenciaDe(t.personas.berta)).toBe(50)
})

test('con la página 3 pendiente, si se pierde la red a mitad del cambio no se pierde lo elegido: se aplica al volver', async ({
  page,
}) => {
  test.setTimeout(60_000)
  await conLaPaginaTresPendiente(page)
  await selectorDeTamano(page).selectOption('25')
  await page.context().setOffline(true)
  await expect(selectorDeTamano(page)).toHaveValue('25')
  await page.context().setOffline(false)
  await expect(filasDelListado(page)).toHaveCount(25, { timeout: 20_000 })
  await expect.poll(() => parametrosDe(page).get('por')).toBe('25')
  expect(parametrosDe(page).has('cursor')).toBe(false)
  await expect(selectorDeTamano(page)).toHaveValue('25')
  await expect.poll(() => preferenciaDe(t.personas.berta)).toBe(25)
})

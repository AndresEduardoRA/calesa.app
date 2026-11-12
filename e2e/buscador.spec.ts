import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { AJENO_CARLOS, irALeads } from './soporte/leads-listado'
import { limpiarRecorrido, prepararRecorrido, type TerrenoDelRecorrido } from './soporte/recorrido'
import { sql } from './soporte/sql'

// El buscador global (7.13). `?` abre «Atajos de teclado» (y no se dispara mientras se escribe); abrir una ficha deja su visita en
// `visitados` sólo si la persona la ve; `Ctrl+K` abre la paleta: busca, abre fichas, ejecuta acciones y dice «sin conexión».
test.describe.configure({ mode: 'serial' })

let r: TerrenoDelRecorrido
let anaId = ''

const visitasDe = (referenciaId: string) =>
  Number(
    sql(
      `select count(*) from public.visitados where usuario_id = '${anaId}' and referencia_id = '${referenciaId}'`,
    ),
  )

test.beforeAll(async ({}, info) => {
  r = await prepararRecorrido(info.project.name, 'Buscador')
  anaId = sql(`select id from auth.users where email = '${r.ana.email}'`)
  sql(`delete from public.visitados where usuario_id = '${anaId}'`)
})

test.afterAll(async () => {
  if (anaId) {
    sql(`delete from public.visitados where usuario_id = '${anaId}'`)
  }
  await limpiarRecorrido(r)
})

test('? lista los atajos y no se dispara mientras se escribe', async ({ page }) => {
  await entrar(page, r.ana.email)
  await irALeads(page)

  const lista = page.getByRole('dialog', { name: 'Atajos de teclado' })
  // Escribiendo en el cuadro de búsqueda, `?` es un carácter más.
  const caja = page.getByRole('searchbox', { name: 'Buscar por nombre o número' })
  await caja.click()
  await page.keyboard.type('?')
  await expect(caja).toHaveValue('?')
  await expect(lista).toBeHidden()
  await caja.fill('')

  await page.locator('main').click({ position: { x: 5, y: 5 } })
  await page.keyboard.type('?')
  await expect(lista).toBeVisible()
  await expect(lista.getByText('Buscar y ejecutar comandos')).toBeVisible()
  await expect(lista.getByText('Ver la lista de atajos')).toBeVisible()
  await expect(lista.getByText('Guardar y seguir')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(lista).toBeHidden()
})

test('abrir una ficha registra la visita, una sola vez, y lo que no se ve no deja marca', async ({
  page,
}) => {
  await entrar(page, r.ana.email)
  await page.goto(`/leads/${r.uno.id}`)
  await expect.poll(() => visitasDe(r.uno.id), { timeout: 20_000 }).toBe(1)
  expect(sql(`select tipo from public.visitados where referencia_id = '${r.uno.id}'`)).toBe('lead')

  await page.goto(`/leads/${r.uno.id}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.waitForLoadState('networkidle')
  expect(visitasDe(r.uno.id)).toBe(1)

  await page.goto(`/leads/${r.deCarlos}`)
  await expect(page.getByText('No encontramos este lead o no tienes acceso.')).toBeVisible()
  await page.waitForLoadState('networkidle')
  expect(visitasDe(r.deCarlos)).toBe(0)
})

const paleta = (page: Page) => page.getByRole('dialog', { name: 'Buscar' })

// `Ctrl+K` abre la paleta recién cuando el marco terminó de hidratar (lo escucha `useAtajo`): se insiste hasta que abre. Con la
// paleta abierta otro `Ctrl+K` no la cierra, así que insistir nunca la alterna; la primera vez su código llega diferido.
async function abrirPaleta(page: Page): Promise<void> {
  await expect(async () => {
    await page.keyboard.press('Control+k')
    await expect(paleta(page)).toBeVisible({ timeout: 1000 })
  }).toPass()
}

test('Ctrl+K, el nombre de un lead y Enter abren su ficha, que sale en «Últimos abiertos»; el lead ajeno no aparece', async ({
  page,
}) => {
  await entrar(page, r.ana.email)
  await irALeads(page)
  await abrirPaleta(page)
  await expect(paleta(page).getByRole('option', { name: 'Nueva cotización' })).toBeVisible()

  const cuadro = paleta(page).getByRole('combobox', { name: 'Buscar' })
  await cuadro.fill(r.uno.nombre)
  const opcion = paleta(page).getByRole('option', { name: new RegExp(r.uno.nombre) })
  await expect(opcion).toBeVisible()
  await expect(opcion).toHaveAttribute('data-selected', 'true')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(new RegExp(`/leads/${r.uno.id}`))
  await expect(page.getByRole('heading', { level: 1 })).toContainText(r.uno.nombre)
  await expect.poll(() => visitasDe(r.uno.id), { timeout: 20_000 }).toBe(1)

  await abrirPaleta(page)
  const ultimos = paleta(page).getByRole('group', { name: 'Últimos abiertos' })
  await expect(ultimos.getByRole('option', { name: new RegExp(r.uno.nombre) })).toBeVisible()

  await paleta(page).getByRole('combobox', { name: 'Buscar' }).fill(AJENO_CARLOS)
  await expect(paleta(page).getByText(`Sin resultados para «${AJENO_CARLOS}».`)).toBeVisible()
  await expect(paleta(page).getByRole('option', { name: new RegExp(AJENO_CARLOS) })).toHaveCount(0)
})

test('Nueva cotización lleva a la hoja, Nuevo lead abre el alta y Ver todos va al listado', async ({
  page,
}) => {
  await entrar(page, r.ana.email)
  await irALeads(page)

  await abrirPaleta(page)
  await paleta(page).getByRole('option', { name: 'Nueva cotización' }).click()
  await expect(page).toHaveURL(/\/cotizaciones\/nuevo/)

  await irALeads(page)
  await abrirPaleta(page)
  await paleta(page).getByRole('combobox', { name: 'Buscar' }).fill('nuevo lead')
  await expect(paleta(page).getByRole('option', { name: 'Nuevo lead' })).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/panel=nuevo-lead/)
  const alta = page.getByRole('dialog', { name: 'Nuevo lead' })
  await expect(alta).toBeVisible()
  await expect(alta.locator(':focus')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(alta).toBeHidden()

  await abrirPaleta(page)
  await paleta(page).getByRole('combobox', { name: 'Buscar' }).fill(r.uno.nombre)
  await paleta(page).getByRole('option', { name: 'Ver todos en Leads' }).click()
  await expect(page).toHaveURL(/\/leads\?.*q=/)
})

test('sin conexión la paleta lo dice y Reintentar vuelve a buscar', async ({ page, context }) => {
  await entrar(page, r.ana.email)
  await irALeads(page)
  await abrirPaleta(page)
  await expect(paleta(page).getByRole('option', { name: 'Nueva cotización' })).toBeVisible()
  await context.setOffline(true)
  await paleta(page).getByRole('combobox', { name: 'Buscar' }).fill(r.uno.nombre)
  await expect(paleta(page).getByText('No hay conexión.')).toBeVisible()
  await context.setOffline(false)
  await paleta(page).getByRole('button', { name: 'Reintentar' }).click()
  await expect(paleta(page).getByRole('option', { name: new RegExp(r.uno.nombre) })).toBeVisible()
})

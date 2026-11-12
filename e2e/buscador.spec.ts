import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { irALeads } from './soporte/leads-listado'
import { limpiarRecorrido, prepararRecorrido, type TerrenoDelRecorrido } from './soporte/recorrido'
import { sql } from './soporte/sql'

// El buscador global (7.13). Parte 1: `?` abre «Atajos de teclado» (y no se dispara mientras se escribe) y abrir una
// ficha deja su visita en `visitados` sólo si la persona la ve.
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

import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { vigilarRecalculos } from './soporte/cotizar'
import { sql } from './soporte/sql'

// El par porcentaje–monto en la hoja de la subasta sembrada (paso 4.13-3c): un candado por lado. Transferencia se calcula (el monto no se edita) y su porcentaje, una
// constante, se tipea: antes la celda entera quedaba bloqueada con el motivo del monto.
test.describe.configure({ mode: 'serial' })

let duena = ''
let subasta = ''

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-hoja-par-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dora Par' })
  subasta = sql("select id from public.origenes where clave = 'subasta_usa'")
})

test.afterAll(async () => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const celda = (page: Page, nodo: string) => page.locator(`[data-nodo="${nodo}"]`)

async function abrir(page: Page): Promise<void> {
  await entrar(page, duena)
  await page.goto(`/cotizaciones/nuevo?origen=${subasta}`)
  await expect(page.locator('[data-hoja]')).toBeVisible()
}

// Abre un lado de una celda (insiste hasta que la página hidrató), escribe y confirma con Enter.
async function tipear(page: Page, nodo: string, parada: number, texto: string): Promise<void> {
  const entrada = celda(page, nodo).locator('input')
  await expect(async () => {
    if (!(await entrada.isVisible())) {
      await celda(page, nodo)
        .locator(`[data-parada="${String(parada)}"]`)
        .click()
    }
    await expect(entrada).toBeVisible({ timeout: 500 })
  }).toPass()
  await entrada.fill(texto)
  await entrada.press('Enter')
  await expect(entrada).toBeHidden()
}

test('Transferencia: el monto calculado lleva su candado y el porcentaje se tipea y recalcula', async ({
  page,
}) => {
  const vigilante = await vigilarRecalculos(page)
  await abrir(page)
  const transferencia = celda(page, 'transferencia')
  await expect(transferencia.locator('[data-parada="0"]')).toHaveAttribute('aria-disabled', 'true')
  await expect(transferencia.locator('[data-parada="1"]')).not.toHaveAttribute('aria-disabled')
  await expect(transferencia).toContainText('Se calcula con los demás datos.')
  // `aria-disabled` es «deshabilitado» para Playwright: el clic se fuerza para ver que el lado bloqueado no abre.
  await transferencia.locator('[data-parada="0"]').click({ force: true })
  await expect(transferencia.locator('input')).toHaveCount(0)
  await tipear(page, 'transferencia', 1, '5')
  await expect
    .poll(() => vigilante.pedidos.at(-1)?.p_entradas.overrides)
    .toEqual({ transferencia_pct: 0.05 })
  await expect(transferencia.getByRole('button', { name: /^Volver al/ })).toBeVisible()
  await expect(transferencia.locator('[data-parada="0"]')).toHaveAttribute('aria-disabled', 'true')
})

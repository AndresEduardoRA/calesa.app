import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { borrarRolesDePrueba } from './soporte/base'
import { guardarPorLaHoja, numeroDeLaCotizacion } from './soporte/cotizar-guardada'
import { sembrarRevisiones } from './soporte/cotizar-encima'
import { limpiarGuardado, prepararGuardado, tipearEnLaHoja } from './soporte/cotizar-guardar'

// Las revisiones de una cotización guardada (paso 4.15-3b, `docs/UX.md` › «Cotizar»): el botón «Revisiones» de `/cotizaciones/[id]` abre un panel de sólo lectura con su URL
// (`?panel=revisiones`): quién guardó, cuándo, qué cambió y el total antes y después, de a 20 por cursor. Lo recorta la base con la sesión de quien mira.
test.describe.configure({ mode: 'serial' })

let origen = { id: '', nombre: '' }
let duena = ''
let lead = ''
let cotizacion = ''

// Lo medido (20 filas: 241 nodos, 11.907 B; 4.15-3b) va a `docs/RENDIMIENTO.md`; los topes son lo medido más un 5 %.
const TOPE_DE_BYTES = 12503
const TOPE_DE_NODOS = 254

test.beforeAll(async ({}, info) => {
  await borrarRolesDePrueba()
  ;({ origen, duena, lead } = await prepararGuardado(info.project.name, 'revisiones'))
})

test.afterAll(async () => {
  await limpiarGuardado()
  await borrarRolesDePrueba()
})

const botonRevisiones = (page: Page) => page.getByRole('button', { name: 'Revisiones' })
const panel = (page: Page) =>
  page.getByRole('dialog', {
    name: `Revisiones de la cotización n.º ${numeroDeLaCotizacion(cotizacion)}`,
  })
const filas = (page: Page) =>
  panel(page).getByRole('list', { name: 'Revisiones' }).getByRole('listitem')

test('E2E guardar un cambio de «Pública» deja una revisión con quién, qué y el total antes y después', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  cotizacion = await guardarPorLaHoja(page, { origenId: origen.id, lead, pub: '1200' })
  await page.goto(`/cotizaciones/${cotizacion}`)
  await tipearEnLaHoja(page, 'pub', '300')
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Cambios guardados.')).toBeVisible()
  await botonRevisiones(page).click()
  await expect(panel(page)).toBeVisible()
  await expect(filas(page)).toHaveCount(1)
  await expect(filas(page).first()).toContainText('Gala Guarda')
  await expect(filas(page).first()).toContainText('Cambió «Pública»')
  await expect(filas(page).first()).toContainText(/Total:.*1\.205,00.*305,00/)
})

test('E2E recargar con ?panel=revisiones abre el panel y «atrás» lo cierra', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/${cotizacion}`)
  await botonRevisiones(page).click()
  await expect(page).toHaveURL(/panel=revisiones/)
  await page.reload()
  await expect(panel(page)).toBeVisible()
  await page.goBack()
  await expect(panel(page)).toBeHidden()
  await expect(page).not.toHaveURL(/panel=revisiones/)
})

test('E2E con 501 revisiones la primera página cabe en su presupuesto y «Ver más» trae 20 más sin repetir', async ({
  page,
}) => {
  sembrarRevisiones(cotizacion, 501)
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/${cotizacion}`)
  const respuesta = page.waitForResponse((r) =>
    new URL(r.url()).pathname.endsWith('/rpc/cotizacion_revisiones'),
  )
  await botonRevisiones(page).click()
  const bytes = (await (await respuesta).body()).length
  await expect(filas(page)).toHaveCount(20)
  const nodos = await panel(page)
    .getByRole('list', { name: 'Revisiones' })
    .evaluate((e) => e.querySelectorAll('*').length + 1)
  test.info().annotations.push({
    type: 'medido',
    description: `nodos ${String(nodos)}, bytes ${String(bytes)}`,
  })
  expect(nodos).toBeLessThanOrEqual(TOPE_DE_NODOS)
  expect(bytes).toBeLessThanOrEqual(TOPE_DE_BYTES)
  const lecturas: string[] = []
  page.on('request', (p) => {
    if (p.url().endsWith('/rpc/cotizacion_revisiones')) {
      lecturas.push(p.postData() ?? '')
    }
  })
  await panel(page).getByRole('button', { name: 'Ver más' }).click()
  await expect(filas(page)).toHaveCount(40)
  expect(lecturas).toHaveLength(1)
  expect(lecturas[0]).toContain('p_antes')
})

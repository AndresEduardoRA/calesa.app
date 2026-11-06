import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { literal, sql } from './soporte/sql'
import { borrarRolesDePrueba } from './soporte/base'
import { guardarPorLaHoja, numeroDeLaCotizacion } from './soporte/cotizar-guardada'
import {
  bordeDeUnDia,
  fecharRevisiones,
  primeraRevisionHasta,
  sembrarRevisiones,
} from './soporte/cotizar-encima'
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

type Lectura = { cuerpo: { p_hasta?: string; p_antes?: number }; primera: number }
const esLectura = (r: { url: () => string }) =>
  new URL(r.url()).pathname.endsWith('/rpc/cotizacion_revisiones')

// Pulsa lo que pide una página y da lo que mandó y el id con el que empezó la respuesta.
async function leyendo(page: Page, pulsar: () => Promise<void>): Promise<Lectura> {
  const respuesta = page.waitForResponse(esLectura)
  await pulsar()
  const r = await respuesta
  const cuerpo = JSON.parse(r.request().postData() ?? '{}') as Lectura['cuerpo']
  const { revisiones } = (await r.json()) as { revisiones: { id: number }[] }
  return { cuerpo, primera: revisiones[0]?.id ?? 0 }
}

test('E2E «Ir a una fecha» trae las revisiones de ese día y anteriores, «Ver más» sigue sin la fecha y «Volver a las más recientes» trae la más nueva', async ({
  page,
}) => {
  sembrarRevisiones(cotizacion, 501)
  fecharRevisiones(cotizacion, 6)
  const masNueva = Number(
    sql(
      `select max(id) from public.cotizaciones_revisiones where cotizacion_id = ${literal(cotizacion)}::uuid`,
    ),
  )
  const diaDe = (dias: number) =>
    new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10)
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/${cotizacion}`)
  await botonRevisiones(page).click()
  await expect(filas(page)).toHaveCount(20)
  const irA = (dia: string) => async () => {
    await panel(page).getByLabel('Ir a una fecha').fill(dia)
    await panel(page).getByRole('button', { name: 'Ir', exact: true }).click()
  }

  const dia = diaDe(60)
  const salto = await leyendo(page, irA(dia))
  expect(salto.cuerpo).not.toHaveProperty('p_antes')
  expect(new Date(salto.cuerpo.p_hasta ?? '').getTime()).toBe(new Date(bordeDeUnDia(dia)).getTime())
  expect(salto.primera).toBe(primeraRevisionHasta(cotizacion, dia))
  await expect(panel(page).getByText(/^Desde el /)).toBeVisible()
  await expect(filas(page)).toHaveCount(20)

  const mas = await leyendo(page, () =>
    panel(page).getByRole('button', { name: 'Ver más' }).click(),
  )
  expect(mas.cuerpo).toHaveProperty('p_antes')
  expect(mas.cuerpo).not.toHaveProperty('p_hasta')
  await expect(filas(page)).toHaveCount(40)

  const vuelta = await leyendo(page, () =>
    panel(page).getByRole('button', { name: 'Volver a las más recientes' }).click(),
  )
  expect(vuelta.cuerpo).not.toHaveProperty('p_hasta')
  expect(vuelta.cuerpo).not.toHaveProperty('p_antes')
  expect(vuelta.primera).toBe(masNueva)
  await expect(panel(page).getByText(/^Desde el /)).toBeHidden()
  await expect(filas(page)).toHaveCount(20)

  const antigua = diaDe(200)
  await leyendo(page, irA(antigua))
  await expect(panel(page).getByText('No hay revisiones hasta esa fecha.')).toBeVisible()
  await expect(filas(page)).toHaveCount(0)
  await expect(panel(page).getByLabel('Ir a una fecha')).toBeVisible()
  await expect(
    panel(page).getByRole('button', { name: 'Volver a las más recientes' }),
  ).toBeVisible()
})

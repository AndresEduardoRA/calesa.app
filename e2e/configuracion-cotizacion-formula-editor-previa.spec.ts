// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import {
  borrarLoDePrevia,
  claveDeLaTabla,
  sembrarBorradorDePrevia,
  sembrarTabla,
  sembrarTipoDeCambio,
} from './soporte/formula-editor-previa'
import { sql } from './soporte/sql'

// La vista previa del editor de la fórmula (4.21-3a-2, P5, `docs/UX.md` › «Cotización: fórmula»): al abrir el editor, «Cifras de prueba.» con el total y la cifra de cada
// fila, calculados con `evaluar()` con los datos en 0, el tipo de cambio de hoy y las tablas vivas del origen (la del origen gana a la compartida; la congelada
// gana a las dos). Se calcula una vez por cambio aplicado: ni tipear ni aplicar leen de nuevo.
test.describe.configure({ mode: 'serial' })

const TC = 7

let proyecto = ''
let duena = ''
let delOrigen = { id: '', nombre: '' }
let soloCompartida = { id: '', nombre: '' }
let congelada = { id: '', nombre: '' }
let sinNada = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarOrigenesDeCotizar()
  borrarLoDePrevia()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-previa-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Pía Previa' })
  sembrarTipoDeCambio(proyecto, TC)
  delOrigen = await crearOrigenDeCotizar(proyecto, 'pvorig', false)
  soloCompartida = await crearOrigenDeCotizar(proyecto, 'pvcomp', false)
  congelada = await crearOrigenDeCotizar(proyecto, 'pvcong', false)
  sinNada = await crearOrigenDeCotizar(proyecto, 'pvnada', false)
  // La compartida vale 0,5 y la del primer origen 0,25: ahí gana la del origen.
  sembrarTabla({ proyecto, origenId: null, factor: 0.5 })
  sembrarTabla({ proyecto, origenId: delOrigen.id, factor: 0.25 })
  for (const o of [delOrigen, soloCompartida, congelada]) {
    sembrarBorradorDePrevia(o.id, duena, proyecto, o === congelada ? 0.9 : undefined)
  }
  // Sin tabla ni tipo de cambio que valgan: la fórmula de `sinNada` nombra los mismos, pero se desactivan para él abajo.
  sembrarBorradorDePrevia(sinNada.id, duena, proyecto)
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  borrarLoDePrevia()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const filas = (page: Page) => page.getByRole('list', { name: 'Filas de la fórmula' })
const fila = (page: Page, id: string) => filas(page).locator(`li[data-fila="${id}"]`)
const previa = (page: Page) => page.getByRole('region', { name: 'Vista previa' })

async function abrirEditor(page: Page, origenId: string) {
  await page.goto(`/configuracion/cotizacion?seccion=formula&origen=${origenId}`)
  await expect(page.getByRole('heading', { name: 'Fórmula', level: 2 })).toBeVisible()
  await page
    .getByRole('region', { name: 'Borrador' })
    .getByRole('button', { name: 'Editar', exact: true })
    .click()
  await expect(filas(page)).toBeVisible()
}

test('E1: «Cifras de prueba.» con el total y la cifra de cada fila, con el tipo de cambio de hoy', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirEditor(page, delOrigen.id)
  await expect(previa(page)).toContainText('Cifras de prueba.')
  await expect(fila(page, 'doble')).toContainText(/1\.800,00/)
  await expect(previa(page).getByText('Total en dólares')).toBeVisible()
  await expect(previa(page)).toContainText(/1\.800,00/)
  await expect(previa(page).getByText('Total en Bs')).toBeVisible()
  await expect(previa(page)).toContainText(/Bs\s*12\.600,00/)
  await expect(fila(page, 'tc').locator('[data-cifra]')).toHaveText('7')
})

test('E2: de dos tablas con la misma clave gana la del origen; sin ella, la compartida', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirEditor(page, delOrigen.id)
  await expect(fila(page, 'factor').locator('[data-cifra]')).toHaveText('0,25')
  await page.goto('/configuracion/cotizacion?seccion=formula&origen=' + soloCompartida.id)
  await page
    .getByRole('region', { name: 'Borrador' })
    .getByRole('button', { name: 'Editar', exact: true })
    .click()
  await expect(fila(page, 'factor').locator('[data-cifra]')).toHaveText('0,5')
})

test('E3 (D5): la tabla que la fórmula congeló manda sobre la viva', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await abrirEditor(page, congelada.id)
  await expect(fila(page, 'factor').locator('[data-cifra]')).toHaveText('0,9')
})

test('E4: lo que falta se avisa y la fila dice por qué no tiene cifra', async ({ page }) => {
  // El origen `sinNada` no tiene tabla propia, y la compartida y el tipo de cambio se apagan para esta prueba.
  sql(
    `update public.tablas_referencia set activa = false where origen_id is null and clave = '${claveDeLaTabla(proyecto)}'`,
  )
  sql(`update public.tipos_cambio set activo = false where clave like 'e2e_tc_previa_${proyecto}'`)
  try {
    await entrar(page, duena, { fresco: true })
    await abrirEditor(page, sinNada.id)
    await expect(previa(page)).toContainText(
      `No hay una tabla «${claveDeLaTabla(proyecto)}» activa en ${sinNada.nombre} ni compartida.`,
    )
    await expect(previa(page)).toContainText(/No hay un tipo de cambio activo/)
    await expect(fila(page, 'factor')).toContainText('La tabla de referencia no tiene filas.')
    await expect(fila(page, 'tc')).toContainText('Falta el tipo de cambio.')
  } finally {
    sql(
      `update public.tablas_referencia set activa = true where origen_id is null and clave = '${claveDeLaTabla(proyecto)}'`,
    )
    sql(`update public.tipos_cambio set activo = true where clave like 'e2e_tc_previa_${proyecto}'`)
  }
})

test('E5: aplicar un texto cambia la cifra y el total sin nuevas lecturas; tipear no cambia nada', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  const lecturas: string[] = []
  page.on('request', (r) => {
    if (/\/rest\/v1\/(tipos_cambio|tablas_referencia)/.test(r.url())) lecturas.push(r.url())
  })
  await abrirEditor(page, delOrigen.id)
  await expect(fila(page, 'doble')).toContainText(/1\.800,00/)
  const antes = lecturas.length
  expect(antes).toBeGreaterThan(0)
  const doble = fila(page, 'doble')
  await doble.getByRole('button', { name: 'Editar Doble' }).click()
  await page.getByRole('textbox', { name: 'Texto de Doble' }).fill('=base*3')
  // Tipear no cambia nada.
  await expect(doble).not.toContainText(/2\.700,00/)
  await doble.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(doble).toContainText(/2\.700,00/)
  await expect(previa(page)).toContainText(/2\.700,00/)
  await expect(previa(page)).toContainText(/18\.900,00/)
  expect(lecturas.length).toBe(antes)
})

import { expect, test, type Locator, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import { leerElBorradorDelDiseno, publicarFormulaDeTresSumandos } from './soporte/diseno-editor'
import { sinScrollHorizontal } from './soporte/recorrido'

// La vista previa de la pestaña «Diseño» (4.22-5, `docs/UX.md` › «Cotización: diseño (estados propios)»): el diseño en edición dibujado con los componentes de la hoja a 412 px, a
// 1.280 px y a 412 con el texto al doble. Un recorrido: la elección va en la URL, cada ancho dispara sus cortes, la página no se ensancha, lo que se edita se ve sin guardar y la hoja
// de prueba no se toca.
test.describe.configure({ mode: 'serial' })

let duena = ''
let origen = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-vista-previa-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Vera Vista' })
  origen = await crearOrigenDeCotizar(proyecto, 'dvista', false)
  publicarFormulaDeTresSumandos(origen.id)
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const marco = (page: Page) => page.locator('[data-vista-previa]')
const hoja = (page: Page) => page.locator('[data-vista-previa] [data-hoja-de-prueba]')
const tituloDeLaHoja = (page: Page) => hoja(page).locator('[data-seccion="base"] h2')

async function caja(l: Locator) {
  const c = await l.boundingBox()
  expect(c).not.toBeNull()
  return c!
}

async function elegir(page: Page, nombre: string, ancho: string) {
  await page
    .getByRole('group', { name: 'Ancho de la vista previa' })
    .getByRole('button', { name: nombre, exact: true })
    .click()
  await expect(marco(page)).toHaveAttribute('data-ancho', ancho)
  await expect(hoja(page)).toBeVisible()
}

test('V1: la vista previa va a 412, a 1.280 y a 200 %, sigue al diseño sin guardar y no se toca', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/configuracion/cotizacion?seccion=diseno&origen=${origen.id}`)
  await expect(page.getByRole('heading', { name: 'Diseño', level: 2 })).toBeVisible()
  const boton = page.getByRole('button', { name: 'Vista previa', exact: true })
  await expect(boton).toHaveAttribute('aria-expanded', 'false')
  await expect(marco(page)).toHaveCount(0)

  // 412: una columna y el resumen debajo; la página no se ensancha.
  await boton.click()
  await expect(boton).toHaveAttribute('aria-expanded', 'true')
  await expect(page).toHaveURL(/vista=412/)
  await expect(marco(page)).toHaveAttribute('data-ancho', '412')
  await expect(hoja(page)).toBeVisible()
  await expect(
    page.getByText('Cifras de prueba: los datos en 0; no son las de una cotización.'),
  ).toBeVisible()
  const secciones = hoja(page).locator('[data-secciones]')
  const resumen = hoja(page).locator('[data-resumen]')
  await expect(resumen).toBeVisible()
  expect((await caja(resumen)).y).toBeGreaterThanOrEqual(
    (await caja(secciones)).y + (await caja(secciones)).height - 1,
  )
  await sinScrollHorizontal(page)
  const alto412 = (await caja(tituloDeLaHoja(page))).height

  // 1.280: el marco se desplaza y el resumen queda al costado; la página sigue igual.
  await elegir(page, '1.280 px', '1280')
  const medidas = await marco(page).evaluate((e) => ({
    total: e.scrollWidth,
    visible: e.clientWidth,
  }))
  expect(medidas.total).toBeGreaterThanOrEqual(1280)
  expect(medidas.visible).toBeLessThan(1280)
  const costado = await caja(hoja(page).locator('[data-secciones]'))
  const resumenAlLado = await caja(hoja(page).locator('[data-resumen]'))
  expect(resumenAlLado.x).toBeGreaterThanOrEqual(costado.x + costado.width - 1)
  await sinScrollHorizontal(page)

  // 200 %: el texto mide el doble y la página sigue sin ensancharse.
  await elegir(page, '200 %', '200')
  const alto200 = (await caja(tituloDeLaHoja(page))).height
  expect(alto200).toBeGreaterThanOrEqual(alto412 * 1.8)
  await sinScrollHorizontal(page)

  // Recargar deja el ancho elegido.
  await page.reload()
  await expect(marco(page)).toHaveAttribute('data-ancho', '200')
  await expect(hoja(page)).toBeVisible()

  // Cambiar un título se ve en la vista previa sin guardar: no se escribe nada en la base.
  await page.locator('li[data-seccion="base"]').getByLabel('Título').first().fill('Base nueva')
  await expect(tituloDeLaHoja(page)).toHaveText('Base nueva')
  expect(leerElBorradorDelDiseno(origen.id)).toBeNull()

  // La hoja de prueba sólo se ve: no se enfoca nada de adentro y la URL no cambia.
  const url = page.url()
  const enfocado = await hoja(page).evaluate((raiz) => {
    const campo = raiz.querySelector<HTMLElement>('input, button')
    campo?.focus()
    return campo !== null && raiz.contains(document.activeElement)
  })
  expect(enfocado).toBe(false)
  expect(page.url()).toBe(url)

  // «Vista previa» la cierra.
  await boton.click()
  await expect(marco(page)).toHaveCount(0)
  await expect(page).not.toHaveURL(/vista=/)
})

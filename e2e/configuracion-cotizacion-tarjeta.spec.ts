import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { PREFIJO_ROL_E2E, correoDePrueba, crearPersona, darRolDePrueba } from './soporte/base'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import {
  borradorGuardado,
  limpiarTerrenoDePlantilla,
  prepararTerrenoDePlantilla,
  type TerrenoDePlantilla,
} from './soporte/plantilla'
import { sinScrollHorizontal, tactil } from './soporte/recorrido'

// La pestaña «Tarjeta» de Configuración › Cotización (4.19-3b, `docs/UX.md` › «Cotización: tarjeta (estados propios)»): quien configura el origen edita el borrador de la
// plantilla de la tarjeta (los grupos con su tono, el total, las filas, la nota, el logo y las columnas) y lo guarda con la versión esperada. Sin la clave no hay pestaña;
// sin fórmula publicada, un vacío con su enlace; lo escrito y sin guardar vuelve tras recargar.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let terreno: TerrenoDePlantilla | undefined
let configuradora = ''
let sinClave = ''
let sinFormula = { id: '', nombre: '' }
let ajeno = { id: '', nombre: '' }

const origenId = () => {
  if (!terreno) throw new Error('No hay terreno.')
  return terreno.origenId
}

test.beforeAll(async ({}, info) => {
  info.setTimeout(180_000)
  proyecto = info.project.name
  terreno = await prepararTerrenoDePlantilla(proyecto, 'tarjeta')
  sinFormula = await crearOrigenDeCotizar(proyecto, 'tarjsinf', false)
  ajeno = await crearOrigenDeCotizar(proyecto, 'tarjajeno', false)
  configuradora = correoDePrueba(`configura-tarjeta-${proyecto}`)
  await crearPersona({
    email: configuradora,
    contrasena: CONTRASENA,
    nombre: 'Cleo Tarjeta',
    invitada: true,
  })
  await darRolDePrueba({
    email: configuradora,
    rol: { nombre: `${PREFIJO_ROL_E2E}Tarjeta ${proyecto}`, clave: `e2e_tarjeta_${proyecto}` },
    permisos: [origenId(), sinFormula.id].map((id) => ({
      clave: 'cotizaciones.configurar',
      origenId: id,
    })),
  })
  sinClave = correoDePrueba(`sinclave-tarjeta-${proyecto}`)
  await crearPersona({
    email: sinClave,
    contrasena: CONTRASENA,
    nombre: 'Sol Sinclave',
    invitada: true,
  })
  await darRolDePrueba({
    email: sinClave,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}SinTarjeta ${proyecto}`,
      clave: `e2e_sintarjeta_${proyecto}`,
    },
    permisos: ['equipo.roles.ver'],
  })
})

test.afterAll(async ({}, info) => {
  info.setTimeout(120_000)
  await limpiarTerrenoDePlantilla()
  borrarOrigenesDeCotizar()
})

async function abrirTarjeta(page: Page, id = origenId()) {
  await page.goto(`/configuracion/cotizacion?seccion=tarjeta&origen=${id}`)
  await expect(page.getByRole('heading', { name: /^Tarjeta de / })).toBeVisible()
}

const guardar = (page: Page) => page.getByRole('button', { name: 'Guardar' })

test('E1: sin borrador ni publicada el editor parte de los grupos de la fórmula, guarda y lo guardado vuelve tras recargar', async ({
  page,
}) => {
  await entrar(page, configuradora, { fresco: true })
  await page.goto('/configuracion/cotizacion')
  const pestanas = page.getByRole('tab')
  await expect(pestanas).toHaveText(['Fórmula', 'Tarjeta'])
  await page.getByRole('tab', { name: 'Tarjeta' }).click()
  await expect(page.getByRole('heading', { name: /^Tarjeta de / })).toBeVisible()
  await expect(
    page.getByText('Sin borrador ni publicada: parte de los grupos de la fórmula.'),
  ).toBeVisible()
  // Sin borrador, «Guardar» está activo desde el principio.
  await expect(guardar(page)).toBeEnabled()
  await page.getByLabel('Etiqueta del total').fill('TOTAL EN DÓLARES')
  await page.getByLabel('Tono de «Compra»').selectOption({ index: 1 })
  await guardar(page).click()
  await expect(page.getByText('Se guardó el borrador.')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Etiqueta del total')).toHaveValue('TOTAL EN DÓLARES')
  await expect(page.getByText(/^Sobre el borrador guardado el /)).toBeVisible()
  // Sin cambios no hay qué guardar.
  await expect(guardar(page)).toBeDisabled()
  const guardado = borradorGuardado(origenId())
  expect(guardado?.definicion.total.etiqueta).toBe('TOTAL EN DÓLARES')
  expect(guardado?.definicion.grupos[0]?.tono).toBeTruthy()
  // Sin aserción sobre los decimales de `actualizadoEn`: la base los escribe sin los ceros del final y el reloj de esta máquina da a veces sólo 3 o 5 (cayó con
  // «.695», «.43929» y «.62499»). Que la versión esperada conserve los microsegundos lo prueba el PT409 de `-conflicto.spec.ts`.
  expect(guardado?.actualizadoEn).toBeTruthy()
})

test('E2: sin la clave no hay pestaña ni se abre por la URL; un origen ajeno abre el suyo; sin fórmula, el vacío con su enlace', async ({
  page,
}) => {
  await entrar(page, sinClave, { fresco: true })
  await page.goto('/configuracion/cotizacion?seccion=tarjeta')
  await expect(page.getByRole('tab', { name: 'Tarjeta' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: /^Tarjeta de / })).toHaveCount(0)

  await page.context().clearCookies()
  await entrar(page, configuradora, { fresco: true })
  await abrirTarjeta(page, ajeno.id)
  await expect(page.getByLabel('Origen')).toHaveValue(origenId())
  await page.goto(`/configuracion/cotizacion?seccion=tarjeta&origen=${sinFormula.id}`)
  await expect(page.getByText(/^Falta publicar la fórmula de /)).toBeVisible()
  await expect(page.getByRole('heading', { name: /^Tarjeta de / })).toHaveCount(0)
  await page.getByRole('link', { name: 'Ir a «Fórmula»' }).click()
  await expect(page).toHaveURL(new RegExp(`seccion=formula&origen=${sinFormula.id}`))
})

test('E4: lo tipeado y sin guardar vuelve tras recargar con «Descartar», y «Descartar» lo quita', async ({
  page,
}) => {
  await entrar(page, configuradora, { fresco: true })
  await abrirTarjeta(page)
  await page.getByText('Pie y columnas').click()
  await page.getByLabel('Nota de la tarjeta').fill('Escrita y sin guardar')
  await expect(guardar(page)).toBeEnabled()
  await page.reload()
  await expect(page.getByText('Recuperamos lo que habías escrito y no guardaste.')).toBeVisible()
  await expect(page.getByLabel('Nota de la tarjeta')).toHaveValue('Escrita y sin guardar')
  await page.getByRole('button', { name: 'Descartar', exact: true }).click()
  await expect(page.getByLabel('Nota de la tarjeta')).toHaveValue('')
  await expect(guardar(page)).toBeDisabled()
})

test('E8: sin scroll horizontal y con blancos táctiles', async ({ page }) => {
  await entrar(page, configuradora, { fresco: true })
  await abrirTarjeta(page)
  await sinScrollHorizontal(page)
  await tactil(page, guardar(page))
  await tactil(page, page.getByLabel('Etiqueta del total'))
})

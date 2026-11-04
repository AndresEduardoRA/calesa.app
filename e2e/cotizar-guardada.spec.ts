import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarRolesDePrueba,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
  PREFIJO_ROL_E2E,
} from './soporte/base'
import { idDePersona, sembrarCotizaciones } from './soporte/cotizaciones-sembradas'
import { vigilarRecalculos } from './soporte/cotizar'
import { crearOrigenDeCotizar, publicarLaVersionSiguiente } from './soporte/cotizar-formula'
import {
  cambiarElFactorVivo,
  crearVehiculoDePrueba,
  envejecerLaCotizacion,
  guardarPorLaHoja,
  numeroDeLaCotizacion,
  publicarConTablaViva,
  revisionesDe,
  urlDeLaHoja,
} from './soporte/cotizar-guardada'
import {
  celdaDeLaHoja,
  cotizacionGuardada,
  formulaVigente,
  limpiarGuardado,
  prepararGuardado,
  tipearEnLaHoja,
  totalDeLaHoja,
} from './soporte/cotizar-guardar'
import { literal, sql } from './soporte/sql'

// La página de una cotización guardada (paso 4.15-3, `docs/UX.md` › «Cotizar»): `/cotizaciones/[id]` abre la hoja de SU versión con lo que se guardó, en sólo lectura para quien
// no la puede guardar, y dice cuando lo de hoy (las tablas de referencia, los datos del vehículo) no es lo guardado. Todo lo que muestra lo decide la base con la sesión de quien mira.
test.describe.configure({ mode: 'serial' })

let origen = { id: '', nombre: '' }
let origenVivo = { id: '', nombre: '' }
let duena = ''
let lead = ''
let vera = ''
let guardada = ''
let vehiculoDelHistorial = ''
let vehiculoDe2019 = ''

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarRolesDePrueba()
  ;({ origen, duena, lead } = await prepararGuardado(proyecto, 'guardada'))
  vera = correoDePrueba(`vera-guardada-${proyecto}`)
  await crearPersona({
    email: vera,
    contrasena: CONTRASENA,
    nombre: 'Vera Solover',
    invitada: true,
  })
  await darRolDePrueba({
    email: vera,
    rol: { nombre: `${PREFIJO_ROL_E2E}Sólo ver guardadas`, clave: 'e2e_solo_ver_guardadas' },
    permisos: ['vehiculos.ver', 'cotizaciones.ver'],
  })
  // Un segundo origen con la fórmula de la tabla viva: lo que cambia entre guardar y abrir es una fila de su tabla.
  origenVivo = await crearOrigenDeCotizar(proyecto, 'viva', true)
  publicarConTablaViva(origenVivo.id, 100)
  vehiculoDe2019 = crearVehiculoDePrueba(origenVivo.id, `Guardada 2019 ${proyecto}`, 2019)
  vehiculoDelHistorial = crearVehiculoDePrueba(origen.id, `Guardada historial ${proyecto}`)
  sembrarCotizaciones({
    origenId: origen.id,
    vehiculoId: vehiculoDelHistorial,
    creadoPor: idDePersona(duena),
    cuantas: 1,
  })
})

test.afterAll(async () => {
  await limpiarGuardado()
  await borrarRolesDePrueba()
})

const encabezado = (page: Page, id: string) =>
  page.getByRole('heading', { name: `Cotización n.º ${numeroDeLaCotizacion(id)}` })
// El id de la cotización más nueva de un vehículo.
const idDeLaMasNueva = (vehiculoId: string): string =>
  sql(
    `select id from public.cotizaciones where vehiculo_id = ${literal(vehiculoId)}::uuid order by creado_en desc, id desc limit 1`,
  )
const NO_DISPONIBLE = 'Esta cotización ya no está disponible: no existe o ya no tienes acceso.'
const AVISO_DE_HOY = '[data-aviso-de-hoy]'
const TOTAL_GUARDADO = '[data-total-cotizado]'

test('E2E desde el historial del vehículo, la fila lleva a la página de la cotización', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(urlDeLaHoja(origen.id, lead, vehiculoDelHistorial))
  await page.getByRole('button', { name: /^Vehículo:/ }).click()
  const panel = page.getByRole('dialog', { name: 'Vehículo' })
  await panel.getByRole('button', { name: /^Historial de cotizaciones/ }).click()
  const fila = panel
    .getByRole('list', { name: 'Historial de cotizaciones' })
    .getByRole('link')
    .first()
  await expect(fila).toContainText('Gala Guarda')
  const id = idDeLaMasNueva(vehiculoDelHistorial)
  await expect(fila).toHaveAttribute('href', `/cotizaciones/${id}`)
  await fila.click()
  await expect(page).toHaveURL(new RegExp(`/cotizaciones/${id}$`))
  await expect(encabezado(page, id)).toBeVisible()
})

test('E2E una cotización guardada por la hoja abre con lo tipeado y su total, y recalcula por su cotización', async ({
  page,
}) => {
  const recalculos = await vigilarRecalculos(page)
  await entrar(page, duena, { fresco: true })
  guardada = await guardarPorLaHoja(page, { origenId: origen.id, lead, pub: '1200' })
  recalculos.pedidos.length = 0
  await page.goto(`/cotizaciones/${guardada}`)
  await expect(encabezado(page, guardada)).toBeVisible()
  await expect(celdaDeLaHoja(page, 'pub')).toContainText('1.200')
  await expect(totalDeLaHoja(page)).toContainText('1.205,00')
  // Lo de hoy es lo guardado: ni aviso ni «Total guardado». Y el primer cálculo lo hizo el servidor: el navegador no pidió nada.
  await expect(page.locator(AVISO_DE_HOY)).toHaveCount(0)
  await expect(page.locator(TOTAL_GUARDADO)).toHaveCount(0)
  expect(recalculos.pedidos).toHaveLength(0)
  await tipearEnLaHoja(page, 'pub', '300')
  await expect(totalDeLaHoja(page)).toContainText('305,00')
  const pedido = recalculos.pedidos.at(-1) as unknown as Record<string, unknown>
  expect(pedido['p_cotizacion']).toBe(guardada)
  expect(pedido).not.toHaveProperty('p_abierta')
  expect(pedido).not.toHaveProperty('p_origen')
  expect(page.url()).toContain(`/cotizaciones/${guardada}`)
})

test('E2E tras publicar la versión siguiente de la fórmula, la guardada sigue dibujando SU versión', async ({
  page,
}) => {
  const formulaGuardada = cotizacionGuardada(guardada).formulaId
  publicarLaVersionSiguiente(origen.id, 500)
  expect(formulaVigente(origen.id)).not.toBe(formulaGuardada)
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/${guardada}`)
  await expect(encabezado(page, guardada)).toBeVisible()
  await expect(totalDeLaHoja(page)).toContainText('1.205,00')
  await expect(celdaDeLaHoja(page, 'con_ayuda')).toContainText('5,00')
  await expect(page.locator(AVISO_DE_HOY)).toHaveCount(0)
})

test('E2E quien sólo ve la cotización la abre en sólo lectura: sin «Guardar» y con su texto', async ({
  page,
}) => {
  await entrar(page, vera, { fresco: true })
  await page.goto(`/cotizaciones/${guardada}`)
  await expect(encabezado(page, guardada)).toBeVisible()
  await expect(
    page.getByText('Sólo lectura: no puedes guardar esta cotización.', { exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toHaveCount(0)
  await expect(totalDeLaHoja(page)).toBeVisible()
  await page.keyboard.press('ControlOrMeta+s')
  await expect(page.getByText('Cambios guardados.')).toHaveCount(0)
})

test('E2E una cotización que no existe y un id que no es un id dicen lo mismo', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/cotizaciones/00000000-0000-4000-8000-00000000dead')
  await expect(page.getByText(NO_DISPONIBLE)).toBeVisible()
  await page.goto('/cotizaciones/no-es-un-id')
  await expect(page.getByText(NO_DISPONIBLE)).toBeVisible()
})

test('E2E pasada su vigencia la cotización dice «Vencida»', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/${guardada}`)
  await expect(page.getByText('Vale hasta el', { exact: false })).toBeVisible()
  envejecerLaCotizacion(guardada, 400)
  await page.goto(`/cotizaciones/${guardada}`)
  await expect(page.getByText('Vencida', { exact: true })).toBeVisible()
  await expect(page.getByText('Vale hasta el', { exact: false })).toHaveCount(0)
})

test('E2E si una tabla viva cambia entre guardar y abrir, se dice y se ve el total de antes', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  const id = await guardarPorLaHoja(page, {
    origenId: origenVivo.id,
    lead,
    pub: '100',
    vehiculoId: vehiculoDe2019,
  })
  // Con el factor de 2019 en 100: 100 de la celda + 5 de la constante + 100 de la tabla.
  await page.goto(`/cotizaciones/${id}`)
  await expect(totalDeLaHoja(page)).toContainText('205,00')
  await expect(page.locator(AVISO_DE_HOY)).toHaveCount(0)
  cambiarElFactorVivo(origenVivo.id, 300)
  await page.goto(`/cotizaciones/${id}`)
  await expect(page.locator(AVISO_DE_HOY)).toHaveText(
    'Lo de hoy no es lo guardado: cambió una tabla o un dato del vehículo desde que se guardó.',
  )
  await expect(page.locator(TOTAL_GUARDADO)).toContainText('205,00')
  await expect(totalDeLaHoja(page)).toContainText('405,00')
  // Sin tipear nada «Guardar» está encendido y dice qué pasa: lo deja con lo de hoy, y deja una revisión.
  await expect(page.getByText('Guardar lo deja con lo de hoy.')).toBeVisible()
  const antes = revisionesDe(id)
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Cambios guardados.')).toBeVisible()
  expect(revisionesDe(id)).toBe(antes + 1)
  await page.reload()
  await expect(page.locator(AVISO_DE_HOY)).toHaveCount(0)
  await expect(page.locator(TOTAL_GUARDADO)).toHaveCount(0)
  await expect(totalDeLaHoja(page)).toContainText('405,00')
})

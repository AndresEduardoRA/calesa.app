import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { vigilarRecalculos } from './soporte/cotizar'
import {
  VISIBLE_SIN_COSTOS,
  borrarOrigenesDeCotizar,
  crearOrigenDeCotizar,
  publicarLaVersionSiguiente,
} from './soporte/cotizar-formula'
import { capturar } from './soporte/recorrido'
import { formatearMonto } from '../src/shared/lib/formato'

// La hoja de cotizar (paso 4.13-2, `docs/UX.md` › «Cotizar»): dibujada desde el diseño publicado de un origen, con su candado y su motivo en cada celda, y recalculada en la
// base 150 ms después de la última confirmación, de a un pedido y aplicando sólo la respuesta más nueva. No guarda. Sin entrada en la navegación: se entra por URL.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let conFormula = { id: '', nombre: '' }
let sinFormula = { id: '', nombre: '' }
let todos = ''
let duena = ''
let sinPermiso = ''
let soloCrear = ''
const LEAD = '11111111-2222-4333-8444-555555555555'

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  conFormula = await crearOrigenDeCotizar(proyecto, 'con', true)
  sinFormula = await crearOrigenDeCotizar(proyecto, 'sin', false)
  duena = correoDePrueba(`duena-cotizar-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dora Cotiza' })
  todos = correoDePrueba(`todos-cotizar-${proyecto}`)
  await crearPersona({ email: todos, contrasena: CONTRASENA, nombre: 'Tita Todos', invitada: true })
  await darRolDePrueba({
    email: todos,
    rol: { nombre: `${PREFIJO_ROL_E2E}Cotiza ${proyecto}`, clave: `e2e_cotiza_${proyecto}` },
    permisos: ['cotizaciones.ver', 'cotizaciones.crear'],
  })
  soloCrear = correoDePrueba(`solo-crear-${proyecto}`)
  await crearPersona({
    email: soloCrear,
    contrasena: CONTRASENA,
    nombre: 'Cora Crea',
    invitada: true,
  })
  await darRolDePrueba({
    email: soloCrear,
    rol: { nombre: `${PREFIJO_ROL_E2E}Sólo crea ${proyecto}`, clave: `e2e_solo_crea_${proyecto}` },
    permisos: ['cotizaciones.crear'],
  })
  sinPermiso = correoDePrueba(`sin-cotizar-${proyecto}`)
  await crearPersona({
    email: sinPermiso,
    contrasena: CONTRASENA,
    nombre: 'Sol Sin',
    invitada: true,
  })
  await darRolDePrueba({
    email: sinPermiso,
    rol: { nombre: `${PREFIJO_ROL_E2E}No cotiza ${proyecto}`, clave: `e2e_no_cotiza_${proyecto}` },
    permisos: ['vehiculos.ver'],
  })
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const hoja = (page: Page) => page.locator('[data-hoja]')
const celda = (page: Page, nodo: string) => page.locator(`[data-nodo="${nodo}"]`)
const total = (page: Page) => page.locator('[data-total]')
const resumen = (page: Page) => page.getByLabel('Resumen')

async function irA(page: Page, correo: string, url: string): Promise<void> {
  await page.context().clearCookies()
  await entrar(page, correo, { fresco: true })
  await page.goto(url)
}

async function abrirLaHoja(page: Page, correo: string, url: string): Promise<void> {
  await irA(page, correo, url)
  await expect(hoja(page)).toBeVisible()
}

// Tipea un número como una persona: abre la celda, lo escribe y confirma con Enter. La celda sólo abre cuando la página terminó de hidratar: se insiste hasta que abre.
async function tipear(page: Page, nodo: string, texto: string): Promise<void> {
  const entrada = celda(page, nodo).locator('input')
  await expect(async () => {
    if (!(await entrada.isVisible())) {
      await celda(page, nodo).locator('[data-parada="0"]').click()
    }
    await expect(entrada).toBeVisible({ timeout: 500 })
  }).toPass()
  await entrada.fill(texto)
  await entrada.press('Enter')
  await expect(entrada).toBeHidden()
}

const sinEspacios = (texto: string | null) => (texto ?? '').replace(/\s/g, '')

test('la hoja dibuja las secciones y los ítems en el orden declarado, con su candado y su motivo', async ({
  page,
}, info) => {
  await abrirLaHoja(page, todos, `/cotizaciones/nuevo?origen=${conFormula.id}`)
  await expect(page.locator('[data-seccion]')).toHaveCount(2)
  const secciones = await page
    .locator('[data-seccion]')
    .evaluateAll((es) => es.map((e) => e.getAttribute('data-seccion')))
  expect(secciones).toEqual(['abierta', 'solo_editar'])
  const nodos = await page
    .locator('[data-nodo]')
    .evaluateAll((es) => es.map((e) => e.getAttribute('data-nodo')))
  expect(nodos).toEqual(VISIBLE_SIN_COSTOS)
  await expect(celda(page, 'anio')).toContainText('Viene del vehículo.')
  await expect(celda(page, 'solo_n')).toContainText('Lo edita quien tiene el nivel «Costos».')
  await expect(celda(page, 'dep')).toContainText('Se habilita con «Activar».')
  await expect(celda(page, 'pub')).not.toContainText('Se habilita')
  await capturar(page, info, 'cotizar-hoja-de-prueba')
})

test('al abrir no se pide nada desde el navegador: el servidor ya trajo la hoja y el primer cálculo', async ({
  page,
}) => {
  const vigilante = await vigilarRecalculos(page)
  await abrirLaHoja(page, todos, `/cotizaciones/nuevo?origen=${conFormula.id}`)
  await page.waitForLoadState('networkidle')
  expect(vigilante.pedidos).toHaveLength(0)
  await expect(total(page)).toContainText('5,00')
})

test('elegir otra opción de la variante apaga lo que no es de ella, con el motivo escrito', async ({
  page,
}) => {
  const vigilante = await vigilarRecalculos(page)
  await abrirLaHoja(page, todos, `/cotizaciones/nuevo?origen=${conFormula.id}`)
  await expect(celda(page, 'v').getByLabel('A')).toBeChecked()
  await celda(page, 'v').getByText('B', { exact: true }).click()
  await expect(celda(page, 'pub')).toContainText('Sólo en A.')
  await expect.poll(() => vigilante.pedidos.at(-1)?.p_entradas.variante).toBe('b')
})

test('tipear un monto sin separador de miles recalcula y el total sale de la respuesta de la base', async ({
  page,
}) => {
  const vigilante = await vigilarRecalculos(page)
  await abrirLaHoja(page, todos, `/cotizaciones/nuevo?origen=${conFormula.id}`)
  await tipear(page, 'pub', '1200')
  await expect.poll(() => vigilante.respuestas.length).toBe(1)
  expect(vigilante.pedidos[0]?.p_entradas.inputs).toEqual({ pub: 1200 })
  expect(vigilante.pedidos[0]?.p_origen).toBe(conFormula.id)
  expect(vigilante.pedidos[0]?.p_abierta).toMatch(/^[0-9a-f-]{36}\.[0-9]{1,16}\.[0-9a-f]{64}$/)
  const usd = (vigilante.respuestas[0] as { totales: { usd: number } }).totales.usd
  const esperado = formatearMonto(usd, { moneda: 'USD', locale: 'es-BO' })
  await expect(total(page)).toContainText('1.205,00')
  await expect
    .poll(async () => sinEspacios(await total(page).textContent()))
    .toContain(sinEspacios(esperado))
  await expect(celda(page, 'pub')).toContainText('1.200,00')
})

test('encender un interruptor habilita la celda que depende de él', async ({ page }) => {
  await vigilarRecalculos(page)
  await abrirLaHoja(page, todos, `/cotizaciones/nuevo?origen=${conFormula.id}`)
  await expect(celda(page, 'dep')).toContainText('Se habilita con «Activar».')
  await celda(page, 'activar').getByRole('switch', { name: 'Activar' }).click()
  await expect(celda(page, 'dep')).not.toContainText('Se habilita con «Activar».')
  await tipear(page, 'dep', '300')
  await expect(total(page)).toContainText('305,00')
})

test('↺ vuelve al valor por defecto de una constante', async ({ page }) => {
  await vigilarRecalculos(page)
  await abrirLaHoja(page, todos, `/cotizaciones/nuevo?origen=${conFormula.id}`)
  await expect(celda(page, 'con_ayuda')).toContainText('5,00')
  await tipear(page, 'con_ayuda', '10')
  await expect(celda(page, 'con_ayuda')).toContainText('10,00')
  await celda(page, 'con_ayuda')
    .getByRole('button', { name: /Volver al valor por defecto/ })
    .click()
  await expect(celda(page, 'con_ayuda')).toContainText('5,00')
  await expect(
    celda(page, 'con_ayuda').getByRole('button', { name: /Volver al valor por defecto/ }),
  ).toHaveCount(0)
})

test('varias confirmaciones seguidas con uno en vuelo no sacan otro pedido, y sólo se aplica la respuesta más nueva', async ({
  page,
}) => {
  const vigilante = await vigilarRecalculos(page)
  await abrirLaHoja(page, todos, `/cotizaciones/nuevo?origen=${conFormula.id}`)
  vigilante.retener()
  await tipear(page, 'pub', '1')
  await expect.poll(() => vigilante.pedidos.length).toBe(1)
  await tipear(page, 'pub', '2')
  await tipear(page, 'pub', '3')
  // Una ausencia no tiene un estado al que esperar: se deja pasar más de la espera de 150 ms, con el pedido retenido, y se mira que no salió otro.
  await page.waitForTimeout(500)
  expect(vigilante.pedidos).toHaveLength(1)
  expect(vigilante.pedidos[0]?.p_entradas.inputs).toEqual({ pub: 1 })
  await expect(resumen(page)).toHaveAttribute('aria-busy', 'true')
  await expect(resumen(page)).toContainText('Total desactualizado.')
  await expect(celda(page, 'pub')).toContainText('3,00')
  vigilante.soltar()
  await expect.poll(() => vigilante.pedidos.length).toBe(2)
  expect(vigilante.pedidos[1]?.p_entradas.inputs).toEqual({ pub: 3 })
  await expect(resumen(page)).toHaveAttribute('aria-busy', 'false')
  await expect(total(page)).toContainText('8,00')
  await expect(resumen(page)).not.toContainText('Total desactualizado.')
  expect(vigilante.enVueloMaximo()).toBe(1)
})

test('sin red dice «No se pudo recalcular», conserva lo tipeado y no deja el total por bueno; «Reintentar» lo arregla', async ({
  page,
}, info) => {
  const vigilante = await vigilarRecalculos(page)
  await abrirLaHoja(page, todos, `/cotizaciones/nuevo?origen=${conFormula.id}`)
  vigilante.cortar()
  await tipear(page, 'pub', '700')
  await expect(resumen(page)).toContainText('No se pudo recalcular.')
  await expect(resumen(page)).toContainText('Total desactualizado.')
  await expect(celda(page, 'pub')).toContainText('700,00')
  // El resumen queda al final de la hoja (el 4.13-4 lo fija): se lleva a la vista para mirarlo.
  await resumen(page).scrollIntoViewIfNeeded()
  await capturar(page, info, 'cotizar-no-se-pudo-recalcular')
  vigilante.restablecer()
  await resumen(page).getByRole('button', { name: 'Reintentar' }).click()
  await expect(resumen(page)).not.toContainText('No se pudo recalcular.')
  await expect(total(page)).toContainText('705,00')
  expect(vigilante.enVueloMaximo()).toBe(1)
})

test('las pestañas son los orígenes donde se cotiza, con su nombre; cambiar de origen conserva el lead', async ({
  page,
}) => {
  await abrirLaHoja(page, todos, `/cotizaciones/nuevo?origen=${conFormula.id}&lead=${LEAD}`)
  const pestanas = page.getByRole('navigation', { name: 'Orígenes' })
  await expect(pestanas.getByRole('link', { name: conFormula.nombre })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await pestanas.getByRole('link', { name: sinFormula.nombre }).click()
  await expect(page).toHaveURL(new RegExp(`origen=${sinFormula.id}&lead=${LEAD}`))
  await expect(page.getByText(`Falta publicar la fórmula de ${sinFormula.nombre}`)).toBeVisible()
  await expect(pestanas.getByRole('link', { name: sinFormula.nombre })).toHaveAttribute(
    'aria-current',
    'page',
  )
})

test('«Falta publicar la fórmula» lleva el enlace a configuración sólo a quien puede configurar', async ({
  page,
}, info) => {
  await irA(page, todos, `/cotizaciones/nuevo?origen=${sinFormula.id}`)
  await expect(page.getByText(`Falta publicar la fórmula de ${sinFormula.nombre}`)).toBeVisible()
  await expect(page.getByRole('link', { name: /Ir a la configuración de cotización/ })).toHaveCount(
    0,
  )
  await irA(page, duena, `/cotizaciones/nuevo?origen=${sinFormula.id}`)
  await expect(page.getByText(`Falta publicar la fórmula de ${sinFormula.nombre}`)).toBeVisible()
  await expect(
    page.getByRole('link', { name: /Ir a la configuración de cotización/ }),
  ).toHaveAttribute('href', '/configuracion/cotizacion')
  await capturar(page, info, 'cotizar-falta-publicar')
})

test('quien puede cotizar pero no ver cotizaciones no tiene dónde cotizar: cotizar pide también ver (4-32)', async ({
  page,
}) => {
  await irA(page, soloCrear, `/cotizaciones/nuevo?origen=${conFormula.id}`)
  await expect(page.getByText('No tienes permiso para cotizar en ningún origen.')).toBeVisible()
  await expect(page.getByText('No puedes ver esta hoja')).toHaveCount(0)
  await expect(hoja(page)).toHaveCount(0)
})

test('si se publica otra versión con la hoja abierta, el total que se ve sigue siendo el de la hoja que se dibujó (4-28)', async ({
  page,
}) => {
  const origen = await crearOrigenDeCotizar(proyecto, 'v2', true)
  const vigilante = await vigilarRecalculos(page)
  await abrirLaHoja(page, todos, `/cotizaciones/nuevo?origen=${origen.id}`)
  await expect(celda(page, 'con_ayuda')).toContainText('5,00')
  // Otra persona publica la versión siguiente (con_ayuda 6) mientras ésta tiene la hoja abierta.
  publicarLaVersionSiguiente(origen.id, 6)
  await tipear(page, 'pub', '100')
  await expect.poll(() => vigilante.respuestas.length).toBe(1)
  // El total es el de la versión que se dibujó (5 + 100), no el de la publicada ahora (6 + 100), y la constante sigue en 5.
  await expect(total(page)).toContainText('105,00')
  await expect(total(page)).not.toContainText('106,00')
  await expect(celda(page, 'con_ayuda')).toContainText('5,00')
})

test('quien no cotiza en ningún origen ve «sin permiso», no una hoja ni un error', async ({
  page,
}) => {
  await irA(page, sinPermiso, `/cotizaciones/nuevo?origen=${conFormula.id}`)
  await expect(page.getByText('No tienes permiso para cotizar en ningún origen.')).toBeVisible()
  await expect(hoja(page)).toHaveCount(0)
})

test('un vehículo que la base no deja usar se suelta y la hoja lo dice; el lead ilegible se ignora', async ({
  page,
}) => {
  const vigilante = await vigilarRecalculos(page)
  await abrirLaHoja(
    page,
    todos,
    `/cotizaciones/nuevo?origen=${conFormula.id}&vehiculo=99999999-8888-4777-8666-555555555555&lead=no-es-un-id`,
  )
  await expect(resumen(page)).toContainText('No se puede usar ese vehículo.')
  await expect(total(page)).toContainText('5,00')
  await tipear(page, 'pub', '50')
  await expect.poll(() => vigilante.pedidos.length).toBe(1)
  expect(vigilante.pedidos[0]?.p_vehiculo).toBeUndefined()
})

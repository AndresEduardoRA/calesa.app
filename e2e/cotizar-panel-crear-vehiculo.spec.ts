import { expect, test, type Locator, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import {
  COPART,
  ENLACE_DE_COPART,
  fallo,
  ficha,
  fijarApibara,
  leerApibara,
  otroCopart,
  restaurarApibara,
  simularApibara,
  type EstadoDeApibara,
} from './soporte/apibara'
import {
  borrarRolesDePrueba,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
  PREFIJO_ROL_E2E,
} from './soporte/base'
import { CONTRASENA } from './soporte/alta'
import { limpiarGuardado, prepararGuardado } from './soporte/cotizar-guardar'
import { crearOrigenDeSubastaDeCotizar } from './soporte/cotizar-formula'
import { literal, sql } from './soporte/sql'

// Buscar, traer y crear el vehículo desde el panel de la hoja de cotizar (paso 4.14-2c1, `docs/UX.md` › «Cotizar»): un campo arriba del panel busca por nombre, VIN o
// lote entre los vehículos del origen (desde 3 letras o números, sin pestañas mientras hay resultados) y elegir un resultado es elegir el vehículo de la hoja. Un enlace, un VIN o
// un lote se pueden traer de la subasta (apibara se intercepta: ningún e2e llama a la real) y «+» carga a mano: los dos abren el alta del inventario dentro del panel y «Crear y
// elegir» crea el vehículo y la hoja lo elige, sin guardar ninguna cotización (P1 del 4.14-2c: el vehículo se crea al confirmarlo en el panel).
test.describe.configure({ mode: 'serial' })

let subasta = { id: '', nombre: '' }
let duena = ''
let lead = ''
let sinAlta = ''
let apibaraAntes: EstadoDeApibara

// Cuánto puede sumar al documento de la hoja lo que viaja para el alta (C7, `docs/RENDIMIENTO.md`). Con el layout en el documento sumaba 69.098 B (106 campos, > 40.000 de presupuesto): por P2 el alta lo lee desde el navegador al abrirse.
const TOPE_DE_BYTES_DEL_LAYOUT = 40_000

// 25 vehículos «Crea busca 01» a «25», del más nuevo (01) al más viejo, para recorrer una página de 20 y otra de 5.
function sembrar(origenId: string): void {
  const o = `${literal(origenId)}::uuid`
  sql(`
    insert into public.vehiculos (origen_id, titulo, creado_en)
      select ${o}, 'Crea busca ' || lpad(g::text, 2, '0'), now() - g * interval '1 minute'
        from generate_series(1, 25) g;
    insert into public.vehiculos (origen_id, titulo, lote) values (${o}, 'Crea con lote', '71234567');`)
}

test.beforeAll(async ({}, info) => {
  await borrarRolesDePrueba()
  ;({ duena, lead } = await prepararGuardado(info.project.name, 'creaveh'))
  subasta = await crearOrigenDeSubastaDeCotizar(info.project.name, 'creasub')
  sembrar(subasta.id)
  // Ve los vehículos y cotiza, pero no los crea.
  sinAlta = correoDePrueba(`sinalta-creaveh-${info.project.name}`)
  await crearPersona({ email: sinAlta, contrasena: CONTRASENA, nombre: 'Sin Alta', invitada: true })
  await darRolDePrueba({
    email: sinAlta,
    rol: { nombre: `${PREFIJO_ROL_E2E}Sin alta`, clave: 'e2e_sin_alta_vehiculos' },
    permisos: ['vehiculos.ver', 'cotizaciones.crear', 'cotizaciones.ver'],
  })
  apibaraAntes = await leerApibara()
  await fijarApibara(true)
})

test.afterAll(async () => {
  await restaurarApibara(apibaraAntes)
  await limpiarGuardado()
  await borrarRolesDePrueba()
})

const barra = (page: Page): Locator => page.getByRole('button', { name: /^Vehículo:/ })
const panel = (page: Page): Locator => page.getByRole('dialog', { name: 'Vehículo' })
const campo = (page: Page): Locator => panel(page).getByRole('searchbox')
const tarjetas = (page: Page): Locator =>
  panel(page).getByRole('list', { name: 'Vehículos' }).getByRole('listitem')

async function abrirElPanel(page: Page, origenId: string, quien = duena): Promise<void> {
  await entrar(page, quien, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${origenId}&lead=${lead}`)
  await expect(page.locator('[data-hoja]')).toBeVisible()
  await barra(page).click()
  await expect(panel(page)).toBeVisible()
}

test('E2E B1 buscar por nombre: sin pestañas, de a 20, el vacío y el mínimo', async ({ page }) => {
  await abrirElPanel(page, subasta.id)
  await expect(campo(page)).toBeFocused()
  await expect(panel(page).getByRole('tab', { name: 'Últ. cotización' })).toBeVisible()
  await campo(page).fill('Crea busca')
  await expect(panel(page).getByRole('heading', { name: 'Resultados' })).toBeVisible()
  await expect(panel(page).getByRole('tab')).toHaveCount(0)
  await expect(tarjetas(page)).toHaveCount(20)
  await expect(tarjetas(page).first()).toContainText('Crea busca 01')
  await expect(page).toHaveURL(/buscar=Crea\+busca|buscar=Crea%20busca/)
  await panel(page).getByRole('button', { name: 'Siguiente' }).click()
  await expect(tarjetas(page)).toHaveCount(5)
  await expect(tarjetas(page).last()).toContainText('Crea busca 25')

  await campo(page).fill('zzq')
  await expect(
    panel(page).getByText(
      'Ningún vehículo de este origen tiene «zzq» en el título, el VIN o el lote.',
    ),
  ).toBeVisible()
  await expect(page).not.toHaveURL(/cursor=/)

  await campo(page).fill('Cr')
  await expect(panel(page).getByText('Escribe al menos 3 letras o números.')).toBeVisible()
  await expect(panel(page).getByRole('tab', { name: 'Últ. cotización' })).toBeVisible()
  await expect(panel(page).getByRole('heading', { name: 'Resultados' })).toHaveCount(0)
})

test('E2E B1 elegir un resultado pone el vehículo en la barra y cierra el panel', async ({
  page,
}) => {
  await abrirElPanel(page, subasta.id)
  await campo(page).fill('Crea busca 07')
  await expect(tarjetas(page)).toHaveCount(1)
  await tarjetas(page).first().getByRole('button').click()
  await expect(panel(page)).toBeHidden()
  await expect(barra(page)).toContainText('Crea busca 07')
  await expect(page).toHaveURL(/vehiculo=/)
  await expect(page).not.toHaveURL(/buscar=/)
})

const cuantosDelOrigen = (clausula: string): number =>
  Number(
    sql(
      `select count(*) from public.vehiculos where origen_id = ${literal(subasta.id)}::uuid and ${clausula}`,
    ),
  )
const cotizacionesDe = (titulo: string): number =>
  Number(
    sql(
      `select count(*) from public.cotizaciones c join public.vehiculos v on v.id = c.vehiculo_id where v.origen_id = ${literal(subasta.id)}::uuid and v.titulo = ${literal(titulo)}`,
    ),
  )

test('E2E B2 un lote del inventario aparece en los resultados y también se puede traer, sin gastar una consulta', async ({
  page,
}) => {
  const pedidos = await simularApibara(page, () => fallo('no_encontrado'))
  await abrirElPanel(page, subasta.id)
  await campo(page).fill('71234567')
  await expect(tarjetas(page)).toHaveCount(1)
  await expect(tarjetas(page).first()).toContainText('Crea con lote')
  await expect(panel(page).getByRole('button', { name: 'Traer el lote 71234567' })).toBeVisible()
  // Enter con un lote que ya está a la vista no consulta: cada consulta gasta cuota.
  await campo(page).press('Enter')
  await expect(panel(page).getByRole('button', { name: 'Volver a la lista' })).toHaveCount(0)
  expect(pedidos.filter((pedido) => pedido.accion === 'ficha')).toEqual([])
  await tarjetas(page).first().getByRole('button').click()
  await expect(barra(page)).toContainText('Crea con lote')
})

// Antes de T1: T1 crea el lote 58540656 en el origen, y una consulta de un lote que ya está en el inventario no llena la ficha (queda marcada «ya está»).
test('E2E A2 recargar con el alta de la subasta abierta muestra lo pegado y no vuelve a consultar', async ({
  page,
}) => {
  const pedidos = await simularApibara(page, (entrada) =>
    entrada === ENLACE_DE_COPART ? ficha(otroCopart({}), ENLACE_DE_COPART) : fallo('no_encontrado'),
  )
  await abrirElPanel(page, subasta.id)
  await campo(page).fill(ENLACE_DE_COPART)
  await campo(page).press('Enter')
  await expect(panel(page).getByText('Datos traídos de Copart · lote 58540656')).toBeVisible()
  expect(pedidos.filter((pedido) => pedido.accion === 'ficha')).toHaveLength(1)
  await page.reload()
  await expect(panel(page).getByLabel('Enlaces, VIN o lotes')).toHaveValue(ENLACE_DE_COPART)
  await expect(panel(page).getByRole('button', { name: 'Traer datos' })).toBeVisible()
  expect(pedidos.filter((pedido) => pedido.accion === 'ficha')).toHaveLength(1)
  await panel(page).getByRole('button', { name: 'Volver a la lista' }).click()
  await expect(campo(page)).toBeFocused()
  await expect(campo(page)).toHaveValue(ENLACE_DE_COPART)
})

test('E2E T1 un enlace de Copart se trae con Enter y «Crear y elegir» crea el vehículo sin guardar ninguna cotización', async ({
  page,
}) => {
  test.setTimeout(120_000)
  const pedidos = await simularApibara(page, (entrada) =>
    entrada === ENLACE_DE_COPART ? ficha(otroCopart({}), ENLACE_DE_COPART) : fallo('no_encontrado'),
  )
  await abrirElPanel(page, subasta.id)
  await campo(page).fill(ENLACE_DE_COPART)
  await expect(panel(page).getByRole('button', { name: 'Traer el enlace de Copart' })).toBeVisible()
  await campo(page).press('Enter')
  await expect(panel(page).getByText('Datos traídos de Copart · lote 58540656')).toBeVisible()
  await expect(panel(page).getByLabel('Título (obligatorio)')).toHaveValue(
    String(COPART['title'] ?? '2024 FORD BRONCO BIG BEND'),
  )
  expect(pedidos.filter((pedido) => pedido.accion === 'ficha')).toHaveLength(1)
  await page.keyboard.press('Control+s')
  await expect(panel(page)).toBeHidden()
  await expect(page).toHaveURL(/vehiculo=/)
  await expect(page).not.toHaveURL(/alta=|buscar=/)
  await expect(barra(page)).toContainText('2024 FORD BRONCO BIG BEND')
  expect(
    sql(
      `select importado_apibara::text || '|' || coalesce(lote, '') from public.vehiculos where origen_id = ${literal(subasta.id)}::uuid and lote = '58540656'`,
    ),
  ).toBe('true|58540656')
  expect(cotizacionesDe('2024 FORD BRONCO BIG BEND')).toBe(0)
  await expect(page.getByText(/Se guardaron las 2 fotos de la subasta/)).toBeVisible({
    timeout: 90_000,
  })
})

test('E2E M1 «+» carga a mano: «Crear y elegir» crea el vehículo y la hoja lo elige', async ({
  page,
}) => {
  const antes = cuantosDelOrigen(`titulo = 'Alta a mano 1'`)
  await abrirElPanel(page, subasta.id)
  await panel(page).getByRole('button', { name: 'Cargar a mano' }).click()
  await expect(panel(page).getByLabel('Título (obligatorio)')).toBeFocused()
  await panel(page).getByLabel('Título (obligatorio)').fill('Alta a mano 1')
  await panel(page).getByRole('button', { name: 'Crear y elegir' }).click()
  await expect(panel(page)).toBeHidden()
  await expect(barra(page)).toContainText('Alta a mano 1')
  await expect(page).toHaveURL(/vehiculo=/)
  expect(antes).toBe(0)
  expect(cuantosDelOrigen(`titulo = 'Alta a mano 1' and importado_apibara = false`)).toBe(1)
  expect(cotizacionesDe('Alta a mano 1')).toBe(0)
})

test('E2E A1 con apibara apagada no hay «Traer» y el enlace dice por qué', async ({ page }) => {
  await fijarApibara(false)
  try {
    await abrirElPanel(page, subasta.id)
    await campo(page).fill(ENLACE_DE_COPART)
    await expect(
      panel(page).getByText('La consulta de subastas está apagada: carga el vehículo a mano.'),
    ).toBeVisible()
    await expect(panel(page).getByRole('button', { name: /^Traer/ })).toHaveCount(0)
    await expect(panel(page).getByRole('button', { name: 'Cargar a mano' })).toBeVisible()
    await campo(page).fill('58540656')
    await expect(panel(page).getByRole('button', { name: /^Traer/ })).toHaveCount(0)
  } finally {
    await fijarApibara(true)
  }
})

test('E2E P1 quien ve los vehículos y no los crea busca y elige, pero no tiene «+» ni «Traer»', async ({
  page,
}) => {
  await abrirElPanel(page, subasta.id, sinAlta)
  await expect(panel(page).getByRole('button', { name: 'Cargar a mano' })).toHaveCount(0)
  await campo(page).fill('71234567')
  await expect(tarjetas(page)).toHaveCount(1)
  await expect(panel(page).getByRole('button', { name: /^Traer/ })).toHaveCount(0)
  await campo(page).fill(ENLACE_DE_COPART)
  await expect(
    panel(page).getByText(
      'No puedes dar de alta en este origen: busca el vehículo por nombre, VIN o lote.',
    ),
  ).toBeVisible()
  await campo(page).press('Enter')
  await expect(panel(page).getByRole('button', { name: 'Volver a la lista' })).toHaveCount(0)
})

test('E2E D1 lo que viaja para el alta suma al documento de la hoja dentro del presupuesto', async ({
  page,
}, info) => {
  const documento = async (quien: string): Promise<number> => {
    await page.context().clearCookies()
    await entrar(page, quien, { fresco: true })
    const respuesta = await page.goto(`/cotizaciones/nuevo?origen=${subasta.id}&lead=${lead}`)
    await expect(page.locator('[data-hoja]')).toBeVisible()
    return (await respuesta?.body())?.length ?? 0
  }
  const conAlta = await documento(duena)
  const sinElAlta = await documento(sinAlta)
  const suma = conAlta - sinElAlta
  info.annotations.push({
    type: 'bytes del documento',
    description: `con alta ${String(conAlta)}, sin alta ${String(sinElAlta)}, suma ${String(suma)}`,
  })
  console.warn(`bytes del documento: con alta ${conAlta}, sin alta ${sinElAlta}, suma ${suma}`)
  expect(suma).toBeLessThanOrEqual(TOPE_DE_BYTES_DEL_LAYOUT)
})

import type { Locator, Page, Request } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { conRespuesta, demorarPedido, esAccionDelServidor, esRpc } from './soporte/esperas'
import { idDePersona } from './soporte/leads-alta'
import { nuevoLead } from './soporte/leads-ficha'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import {
  abrirPestanaDeRecordatorios,
  abrirPestanaDeSeguimientos,
  modalDeSeguimiento,
} from './soporte/leads-seguimientos'
import {
  borrarVolumen,
  cambiarEnOtraVentana,
  MARCA_DE_VOLUMEN,
  primeroHasta,
  sembrarVolumen,
} from './soporte/leads-volumen'
import { TAMANO_DE_VER_MAS, TOPE_DE_LO_CARGADO } from '../src/shared/lib/paginacion'

// El drawer de un lead con 20.000 seguimientos y 5.000 recordatorios (3.000 completados), 9d-2: ninguna
// pestaña trae ni dibuja todo, y ninguna acción crece con el total ni con lo cargado. Aserciones
// deterministas (pedidos, bytes, nodos), sin cronómetros. Sólo escritorio: nada depende del viewport.
test.describe.configure({ mode: 'serial' })

// Presupuestos de la primera respuesta de cada pestaña, con lo sembrado (un párrafo por seguimiento): lo
// medido en la 9d-2 más la mitad (16,3 KB y 9,4 KB; `docs/RENDIMIENTO.md`).
const KB_DE_SEGUIMIENTOS = 24
const KB_DE_RECORDATORIOS = 14
const NODOS_TRAS_5_VER_MAS = 2_500
const NODOS_EN_EL_TOPE = 9_000

let t: TerrenoDelListado
let lead: { id: string; nombre: string }

test.beforeAll(async ({}, info) => {
  test.skip(info.project.name !== 'escritorio', 'Sólo escritorio: nada depende del viewport.')
  test.setTimeout(240_000)
  borrarVolumen()
  t = await prepararListado(info.project.name)
  const creado = await nuevoLead({
    corto: `Rap ${MARCA_DE_VOLUMEN}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.berta,
  })
  lead = { id: creado.id, nombre: creado.nombre }
  sembrarVolumen(lead.id, await idDePersona(t.personas.berta))
})

test.afterAll(async ({}, info) => {
  if (info.project.name !== 'escritorio') {
    return
  }
  borrarVolumen()
  await limpiarListado(t)
})

const drawerDe = (page: Page) => page.getByRole('dialog', { name: lead.nombre })
const itemsDe = (region: Locator) => region.locator(':scope > ol > li, :scope > ul > li')

// Los pedidos a una RPC (por su ruta exacta) desde que se llama hasta que se mira.
function contarPedidos(page: Page, rpc: string) {
  const pedidos: Request[] = []
  page.on('request', (pedido) => {
    if (new URL(pedido.url()).pathname.endsWith(`/rpc/${rpc}`)) {
      pedidos.push(pedido)
    }
  })
  return pedidos
}

async function bytesDe(pedido: Request | undefined): Promise<number> {
  const respuesta = await pedido?.response()
  return (await respuesta?.body())?.length ?? Number.POSITIVE_INFINITY
}

async function irAlDrawer(page: Page, pestana: string) {
  await page.goto(`/leads?lead=${lead.id}${pestana}`)
  await expect(drawerDe(page)).toBeVisible()
}

test('«Seguimientos»: una página al abrir, «Ver más» hasta el tope, la red y el doble clic', async ({
  page,
}, info) => {
  test.setTimeout(180_000)
  await entrar(page, t.personas.berta)
  const pedidos = contarPedidos(page, 'lead_seguimientos')
  await irAlDrawer(page, '')
  expect(pedidos).toHaveLength(0)
  await abrirPestanaDeSeguimientos(page, drawerDe(page))
  const linea = drawerDe(page).getByRole('region', { name: 'Seguimientos' })
  await expect(itemsDe(linea)).toHaveCount(TAMANO_DE_VER_MAS)
  expect(pedidos).toHaveLength(1)
  const bytes = await bytesDe(pedidos[0])
  info.annotations.push({ type: 'bytes, primera página', description: String(bytes) })
  expect(bytes).toBeLessThan(KB_DE_SEGUIMIENTOS * 1024)

  // Sin red al paginar: se avisa, lo cargado queda y el siguiente intento suma.
  await page.route('**/rpc/lead_seguimientos', (ruta) => ruta.abort(), { times: 1 })
  await linea.getByRole('button', { name: 'Ver más' }).click()
  // Que no llegó: es la conexión, no «algo falló de nuestro lado» (9d-3).
  await expect(page.getByText(/No pudimos llegar al servidor. Revisa tu conexión/)).toBeVisible()
  await expect(itemsDe(linea)).toHaveCount(TAMANO_DE_VER_MAS)
  await conRespuesta(
    page,
    esRpc('lead_seguimientos'),
    () => linea.getByRole('button', { name: 'Ver más' }).click(),
    '«Ver más» de seguimientos',
  )
  await expect(itemsDe(linea)).toHaveCount(40)

  // El doble clic pide una sola página.
  const antes = pedidos.length
  await conRespuesta(
    page,
    esRpc('lead_seguimientos'),
    () => linea.getByRole('button', { name: 'Ver más' }).dblclick(),
    'doble clic en «Ver más»',
  )
  await expect(itemsDe(linea)).toHaveCount(60)
  expect(pedidos.length - antes).toBe(1)

  // Hasta el tope: 500 y el aviso, nunca más.
  const nodos: string[] = []
  let nodosTras5 = 0
  for (let clics = 3; clics <= 25; clics += 1) {
    const verMas = linea.getByRole('button', { name: 'Ver más' })
    if ((await verMas.count()) === 0) {
      break
    }
    const cuantos = await itemsDe(linea).count()
    await conRespuesta(
      page,
      esRpc('lead_seguimientos'),
      () => verMas.click(),
      `«Ver más» nº ${String(clics)}`,
    )
    await expect(itemsDe(linea)).not.toHaveCount(cuantos)
    if (clics === 5) {
      nodosTras5 = await drawerDe(page).locator('*').count()
      nodos.push(`5: ${String(nodosTras5)}`)
    }
  }
  await expect(linea.getByText('Mostrando los 500 más recientes.')).toBeVisible()
  await expect(itemsDe(linea)).toHaveCount(TOPE_DE_LO_CARGADO)
  await expect(linea.getByRole('button', { name: 'Ver más' })).toHaveCount(0)
  const nodosEnElTope = await drawerDe(page).locator('*').count()
  nodos.push(`tope: ${String(nodosEnElTope)}`)
  // Los nodos del drawer están acotados (9e): lo medido en la 9d-2 (~1.700 y ~7.000) con margen.
  expect(nodosTras5).toBeLessThan(NODOS_TRAS_5_VER_MAS)
  expect(nodosEnElTope).toBeLessThan(NODOS_EN_EL_TOPE)
  info.annotations.push({ type: 'nodos del drawer tras «Ver más»', description: nodos.join(', ') })
})

test('«Ir a una fecha» siembra el cursor de ese día y «Volver» trae lo más nuevo', async ({
  page,
}) => {
  await entrar(page, t.personas.berta)
  await irAlDrawer(page, '&pestana=seguimientos')
  const linea = drawerDe(page).getByRole('region', { name: 'Seguimientos' })
  await expect(itemsDe(linea)).toHaveCount(TAMANO_DE_VER_MAS)
  const dia = new Date(Date.now() - 200 * 86_400_000).toISOString().slice(0, 10)
  const pedidos = contarPedidos(page, 'lead_seguimientos')
  await linea.getByLabel('Ir a una fecha').fill(dia)
  await conRespuesta(
    page,
    esRpc('lead_seguimientos'),
    () => linea.getByRole('button', { name: 'Ir', exact: true }).click(),
    '«Ir a una fecha»',
  )
  await expect(linea.getByText(/^Desde el /)).toBeVisible()
  await expect(itemsDe(linea).first()).toContainText(primeroHasta(lead.id, dia))
  await expect(itemsDe(linea)).toHaveCount(TAMANO_DE_VER_MAS)
  expect(pedidos).toHaveLength(1)
  await conRespuesta(
    page,
    esRpc('lead_seguimientos'),
    () => linea.getByRole('button', { name: 'Volver a los más recientes' }).click(),
    '«Volver a los más recientes»',
  )
  await expect(linea.getByText(/^Desde el /)).toHaveCount(0)
  await expect(itemsDe(linea).first()).toContainText('Volumen 1')
})

test('«Recargar» tras un conflicto con 500 cargados: dos pedidos, lo escrito queda y se guarda', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await entrar(page, t.personas.berta)
  await irAlDrawer(page, '&pestana=seguimientos')
  const linea = drawerDe(page).getByRole('region', { name: 'Seguimientos' })
  await expect(itemsDe(linea)).toHaveCount(TAMANO_DE_VER_MAS)
  while ((await linea.getByRole('button', { name: 'Ver más' }).count()) > 0) {
    const cuantos = await itemsDe(linea).count()
    await conRespuesta(
      page,
      esRpc('lead_seguimientos'),
      () => linea.getByRole('button', { name: 'Ver más' }).click(),
      '«Ver más» hasta el tope',
    )
    await expect(itemsDe(linea)).not.toHaveCount(cuantos)
  }
  await expect(itemsDe(linea)).toHaveCount(TOPE_DE_LO_CARGADO)

  // Uno lejano, fuera de la primera página: lo edita y otra ventana lo cambia mientras tanto.
  const lejano = 'Volumen 480'
  await linea.getByRole('article', { name: lejano }).getByRole('button', { name: 'Editar' }).click()
  const modal = modalDeSeguimiento(page, 'Editar')
  await expect(modal).toBeVisible()
  await modal.getByLabel('Resumen').fill('Escrito con 500 cargados')
  cambiarEnOtraVentana(lejano, lead.id)
  await conRespuesta(
    page,
    esAccionDelServidor,
    () => modal.getByRole('button', { name: 'Guardar' }).click(),
    '«Guardar» con el seguimiento cambiado',
  )
  await expect(modal.getByRole('button', { name: 'Recargar' })).toBeVisible()

  // La primera página y, como el que se edita no vino en ella, ése por su id: dos pedidos.
  const pagina = contarPedidos(page, 'lead_seguimientos')
  const porId = contarPedidos(page, 'lead_seguimiento')
  await conRespuesta(
    page,
    esRpc('lead_seguimientos'),
    () =>
      conRespuesta(
        page,
        esRpc('lead_seguimiento'),
        () => modal.getByRole('button', { name: 'Recargar' }).click(),
        '«Recargar»: el seguimiento por su id',
      ),
    '«Recargar»: la primera página',
  )
  await expect(modal.getByRole('button', { name: 'Recargar' })).toHaveCount(0)
  expect(pagina).toHaveLength(1)
  expect(porId).toHaveLength(1)
  await expect(modal.getByLabel('Resumen')).toHaveValue('Escrito con 500 cargados')
  await conRespuesta(
    page,
    esAccionDelServidor,
    () => modal.getByRole('button', { name: 'Guardar' }).click(),
    '«Guardar» tras recargar',
  )
  await expect(modal).toHaveCount(0)
  // Lo cargado más allá de la primera página volvió a «Ver más».
  await expect(itemsDe(linea)).toHaveCount(TAMANO_DE_VER_MAS)
})

test('«Recordatorios»: una página de pendientes, los completados sólo al abrirlos, y el aviso de la ficha', async ({
  page,
}, info) => {
  await entrar(page, t.personas.berta)
  const pedidos = contarPedidos(page, 'lead_recordatorios')
  await irAlDrawer(page, '&pestana=seguimientos')
  await expect(drawerDe(page).getByRole('region', { name: 'Seguimientos' })).toBeVisible()
  expect(pedidos).toHaveLength(0)
  await abrirPestanaDeRecordatorios(page, drawerDe(page))
  const bloque = drawerDe(page).getByRole('region', { name: 'Tus recordatorios' })
  const pendientes = bloque.locator(':scope > ul > li')
  await expect(pendientes).toHaveCount(TAMANO_DE_VER_MAS)
  expect(pedidos).toHaveLength(1)
  const bytes = await bytesDe(pedidos[0])
  info.annotations.push({
    type: 'bytes, primera página de recordatorios',
    description: String(bytes),
  })
  expect(bytes).toBeLessThan(KB_DE_RECORDATORIOS * 1024)
  // Los vencidos primero, marcados.
  await expect(pendientes.first()).toContainText('Vencido')
  await expect(bloque.getByRole('button', { name: 'Agendar recordatorio' })).toBeVisible()

  // «Completados» sin número, y sin leer hasta abrirlo.
  await expect(bloque.getByText('Completados', { exact: true })).toBeVisible()
  expect(pedidos).toHaveLength(1)
  await conRespuesta(
    page,
    esRpc('lead_recordatorios'),
    () => bloque.getByText('Completados', { exact: true }).click(),
    'abrir «Completados»',
  )
  const completados = bloque.locator('details ul > li')
  await expect(completados).toHaveCount(TAMANO_DE_VER_MAS)
  expect(pedidos).toHaveLength(2)
  await conRespuesta(
    page,
    esRpc('lead_recordatorios'),
    () => bloque.locator('details').getByRole('button', { name: 'Ver más' }).click(),
    '«Ver más» de completados',
  )
  await expect(completados).toHaveCount(40)

  // El aviso de vencidos no cuenta todo: hay 1.000, dice «más de 20».
  await page.goto(`/leads/${lead.id}`)
  await expect(
    page.getByText('Tienes más de 20 recordatorios vencidos sobre este lead.'),
  ).toBeVisible()
})

test('«Seguimientos»: «Ver más» con el pedido demorado 6 s', async ({ page }) => {
  await entrar(page, t.personas.berta)
  await irAlDrawer(page, '&pestana=seguimientos')
  const linea = drawerDe(page).getByRole('region', { name: 'Seguimientos' })
  await expect(itemsDe(linea)).toHaveCount(TAMANO_DE_VER_MAS)
  // Con la primera página ya leída: sólo el pedido de «Ver más» sale tarde.
  const demorados = await demorarPedido(
    page,
    (pedido) => pedido.method() === 'POST' && pedido.url().endsWith('/rpc/lead_seguimientos'),
    6_000,
  )
  await conRespuesta(
    page,
    esRpc('lead_seguimientos'),
    () => linea.getByRole('button', { name: 'Ver más' }).click(),
    '«Ver más» demorado 6 s',
  )
  expect(demorados).toHaveLength(1)
  await expect(itemsDe(linea)).toHaveCount(TAMANO_DE_VER_MAS * 2)
})

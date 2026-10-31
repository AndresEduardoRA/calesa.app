import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, Teclado, dialogo, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import {
  celdaDeLaHoja,
  tarjetaGuardada,
  totalDeLaHoja,
  vigilarGuardados,
  type PedidoDeGuardadoVisto,
} from './soporte/cotizar-guardar'
import { borrarLeadsDePrueba, crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { crearAsesoraDeLaSemilla } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'
import { cargarVehiculos, vehiculoPorTitulo } from './soporte/vehiculos'
import { formatearNumero } from '../src/shared/lib/formato'

// El tramo del cliente de la tarea de oro 2 (`docs/UX.md`, paso 4.14-3c): con la hoja abierta sin cliente (el vehículo ya en la URL), la asesora de la semilla elige al cliente
// con el teclado (uno que existe o uno nuevo desde el «+» del panel) y guarda la cotización con él. 0 clics. Como la 1, la 2 y la 4 (`docs/DECISIONES.md`): lo pulsado no cambia de
// una máquina a otra; el reloj del robot es un tope generoso; la hora de una persona, KLM.
test.describe.configure({ mode: 'serial' })

// Las teclas de control, medidas en la primera corrida verde (4.14-3c), iguales en escritorio y celular. Con un cliente que existe: 29 (Tab y Enter a «Saltar al contenido», los Tab hasta
// la barra «Cliente» y su Enter, los Tab hasta la fila y su Enter, y el tramo de la hoja: Tab hasta `remate` y Enter, hasta `grua` y Enter, y Ctrl+S); con uno nuevo: 30 (en vez de la fila, el Tab
// hasta «+» y su Enter, un Tab del teléfono al nombre y Ctrl+S del alta). 1,6 s el robot; KLM 17,2 s y 28,3 s. Determinista: una parada nueva en el camino lo rompe a propósito.
const CONTROLES_CON_UN_CLIENTE_QUE_EXISTE = 29
const CONTROLES_CON_UN_CLIENTE_NUEVO = 30

let asesora = ''
let subasta = ''
let vehiculo = ''
let leadExistente = ''

const TEXTO_SIN_CLIENTE = 'Para guardar, elige el cliente en «Cliente».'

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  // La dueña primero: la primera cuenta de la empresa tiene que poder gestionar el equipo.
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-oro-2c-${proyecto}`),
    contrasena: CONTRASENA,
    nombre: 'Dora Cliente',
  })
  ;({ email: asesora } = await crearAsesoraDeLaSemilla(`oro-2c-${proyecto}`))
  subasta = sql("select id from public.origenes where clave = 'subasta_usa'")
  leadExistente = await crearLead({
    nombre: `oro 2c ${proyecto}`,
    telefono: telefonoAlAzar(),
    deQuien: asesora,
  })
  const titulo = `E2E oro 2c ${proyecto}`
  await cargarVehiculos(subasta, [{ titulo, anio: 2020, atributos: { tipo_vehiculo: 'autos' } }])
  vehiculo = (await vehiculoPorTitulo(titulo))?.id ?? ''
  expect(vehiculo, 'el vehículo de la tarea de oro').not.toBe('')
})

test.afterAll(async () => {
  if (vehiculo !== '') {
    // Las cotizaciones del vehículo, aunque una prueba haya caído antes de anotarlas: sin ellas no se puede borrar a la asesora.
    sql(`delete from public.cotizaciones where vehiculo_id = ${literal(vehiculo)}::uuid`)
    sql(`delete from public.vehiculos where id = ${literal(vehiculo)}::uuid`)
  }
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const valor = (page: Page, nodo: string) => celdaDeLaHoja(page, nodo).locator('[data-parada="0"]')
const barra = (page: Page) => page.getByRole('button', { name: /^Cliente:/ })
const panelCliente = (page: Page) => page.getByRole('dialog', { name: 'Cliente', exact: true })

// De la barra «Cliente» con el foco al guardado: el remate, la grúa y Ctrl+S, como en el tramo de la hoja de la tarea de oro 2.
async function llenarYGuardar(page: Page, teclado: Teclado): Promise<void> {
  await teclado.tabularHasta(valor(page, 'remate'))
  await teclado.escribir('9500')
  await teclado.pulsar('Enter')
  await expect(valor(page, 'remate')).toBeFocused()
  await teclado.tabularHasta(valor(page, 'grua'))
  await teclado.escribir('450')
  await teclado.pulsar('Enter')
  await expect(page.getByLabel('Resumen')).toHaveAttribute('aria-busy', 'false', {
    timeout: 15_000,
  })
  await expect(totalDeLaHoja(page)).toContainText(/\d/)
  await teclado.pulsar('ControlOrMeta+s')
  await expect(tarjetaGuardada(page)).toContainText(/Cotización n\.º \d+ guardada/)
}

// Lo que guardó la hoja (no la action que crea el lead, que sale de la misma página).
const deLaCotizacion = (pedidos: PedidoDeGuardadoVisto[]) =>
  pedidos.filter((pedido) => (pedido as Partial<PedidoDeGuardadoVisto>).entradas !== undefined)

function informar(
  info: { project: { name: string }; annotations: { type: string; description?: string }[] },
  titulo: string,
  teclado: Teclado,
  medida: { robot: number; decisiones: number },
): { controles: number; klm: number } {
  const controles = teclado.pulsaciones
  const { robot, decisiones } = medida
  const klm = teclado.klm(decisiones)
  const seg = (v: number) => `${formatearNumero(v, { decimales: 1 })} s`
  const resumen = `${seg(robot)} el robot · ${String(controles)} teclas de control · KLM ${seg(klm)} · 0 clics`
  console.warn(`[${titulo}] ${info.project.name}: ${resumen}`)
  info.annotations.push({ type: `meta de 90 s, ${titulo}`, description: resumen })
  return { controles, klm }
}

test('tarea de oro 2, el cliente que existe: de la hoja sin cliente a la cotización guardada con él, sólo con el teclado', async ({
  page,
}, info) => {
  const guardados = await vigilarGuardados(page)
  await entrar(page, asesora, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${subasta}&vehiculo=${vehiculo}`)
  await expect(page.locator('[data-hoja]')).toBeVisible()
  // Antes de empezar, la hoja dice lo que falta y dónde se elige.
  await expect(page.getByText(TEXTO_SIN_CLIENTE)).toBeVisible()
  const teclado = new Teclado(page)
  const inicio = performance.now()

  await teclado.pulsar('Tab')
  await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused()
  await teclado.pulsar('Enter')
  await teclado.tabularHasta(barra(page))
  await teclado.pulsar('Enter')
  // El panel abre con el foco en el buscador: las primeras letras del lead y su fila es lo que sigue.
  await expect(panelCliente(page).getByRole('searchbox')).toBeFocused()
  await teclado.escribir('oro 2c')
  const fila = panelCliente(page).getByRole('list', { name: 'Leads' }).getByRole('button').first()
  // La búsqueda llega a una pausa de lo tipeado (3 letras o más): antes, la lista que se ve es «míos» y se reemplaza al llegar los resultados, con el foco adentro.
  await expect(panelCliente(page).getByRole('heading', { name: 'Resultados' })).toBeVisible()
  await expect(fila).toContainText('oro 2c')
  await teclado.tabularHasta(fila)
  await teclado.pulsar('Enter')
  await expect(barra(page)).toContainText('oro 2c')
  await expect(page).toHaveURL(new RegExp(`lead=${leadExistente}`))
  await expect(barra(page)).toBeFocused()
  await llenarYGuardar(page, teclado)
  const fin = performance.now()

  const pedidos = deLaCotizacion(guardados.pedidos)
  expect(pedidos).toHaveLength(1)
  const cotizacion = pedidos[0]?.intento ?? ''
  expect(
    sql(
      `select lead_id || '|' || vehiculo_id from public.cotizaciones where id = ${literal(cotizacion)}::uuid`,
    ),
  ).toBe(`${leadExistente}|${vehiculo}`)

  const { controles, klm } = informar(info, 'tarea de oro 2, el cliente', teclado, {
    robot: (fin - inicio) / 1000,
    decisiones: 4,
  })
  expect(controles).toBeLessThanOrEqual(CONTROLES_CON_UN_CLIENTE_QUE_EXISTE)
  expect((fin - inicio) / 1000).toBeLessThan(30)
  expect(klm).toBeLessThanOrEqual(90)
})

test('tarea de oro 2, el cliente nuevo: del «+» del panel a la cotización guardada con el lead creado, sólo con el teclado', async ({
  page,
}, info) => {
  const guardados = await vigilarGuardados(page)
  await entrar(page, asesora, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${subasta}&vehiculo=${vehiculo}`)
  await expect(page.locator('[data-hoja]')).toBeVisible()
  await expect(page.getByText(TEXTO_SIN_CLIENTE)).toBeVisible()
  const nombre = `E2E oro 2c nuevo ${info.project.name}`
  const teclado = new Teclado(page)
  const inicio = performance.now()

  await teclado.pulsar('Tab')
  await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused()
  await teclado.pulsar('Enter')
  await teclado.tabularHasta(barra(page))
  await teclado.pulsar('Enter')
  await expect(panelCliente(page).getByRole('searchbox')).toBeFocused()
  // «+» es lo que sigue al buscador: abre «Nuevo lead» con el foco en el teléfono.
  await teclado.tabularHasta(panelCliente(page).getByRole('button', { name: 'Nuevo lead' }))
  await teclado.pulsar('Enter')
  await expect(dialogo(page).getByLabel('Teléfono principal')).toBeFocused()
  await teclado.escribir(telefonoAlAzar())
  await teclado.pulsar('Tab')
  await teclado.escribir(nombre)
  // El robot tipea más rápido de lo que la página confirma: antes de guardar, el nombre entero ya es el estado del formulario.
  await expect(dialogo(page).getByLabel('Nombre')).toHaveValue(nombre)
  await teclado.pulsar('ControlOrMeta+s')
  // El lead se crea, la hoja lo elige y el foco vuelve a la barra.
  await expect(barra(page)).toContainText('oro 2c nuevo')
  await expect(barra(page)).toBeFocused()
  // La hoja ya tiene al cliente (la página volvió a leer): ya no pide elegirlo.
  await expect(page.getByText(TEXTO_SIN_CLIENTE)).toBeHidden()
  // La hoja que volvió a montarse con el cliente terminó de calcular: un Tab antes cae en lo que todavía cambia.
  await expect(page.getByLabel('Resumen')).toHaveAttribute('aria-busy', 'false', {
    timeout: 15_000,
  })
  await expect(valor(page, 'remate')).toBeVisible()
  await llenarYGuardar(page, teclado)
  const fin = performance.now()

  const creado = sql(`select id from public.leads where nombre = ${literal(nombre)}`)
  expect(creado).not.toBe('')
  const pedidos = deLaCotizacion(guardados.pedidos)
  expect(pedidos).toHaveLength(1)
  const cotizacion = pedidos[0]?.intento ?? ''
  expect(
    sql(
      `select lead_id || '|' || vehiculo_id from public.cotizaciones where id = ${literal(cotizacion)}::uuid`,
    ),
  ).toBe(`${creado}|${vehiculo}`)

  const { controles, klm } = informar(info, 'tarea de oro 2, el cliente nuevo', teclado, {
    robot: (fin - inicio) / 1000,
    decisiones: 6,
  })
  expect(controles).toBeLessThanOrEqual(CONTROLES_CON_UN_CLIENTE_NUEVO)
  expect((fin - inicio) / 1000).toBeLessThan(30)
  expect(klm).toBeLessThanOrEqual(90)
})

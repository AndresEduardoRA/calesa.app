import { expect, test, type Locator, type Page } from './soporte/prueba'
import { CONTRASENA, Teclado, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import {
  celdaDeLaHoja,
  cotizacionGuardada,
  formulaVigente,
  tarjetaGuardada,
  totalDeLaHoja,
  vigilarGuardados,
} from './soporte/cotizar-guardar'
import { borrarLeadsDePrueba, crearLead, idDe } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { crearAsesoraDeLaSemilla } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'
import { cargarVehiculos, vehiculoPorTitulo } from './soporte/vehiculos'
import { formatearMonto, formatearNumero } from '../src/shared/lib/formato'

// Tarea de oro 2 (`docs/UX.md`): cotizar un vehículo del inventario en ≤ 90 s, con cada celda editable alcanzable con el teclado (paso 4.13-4d). El panel del vehículo
// (4.14) y el PDF en 1 clic (4.18) no existen todavía: esto mide el tramo de la hoja, que llega con el lead y el vehículo en la URL, y el 4.28 mide la tarea entera. Como
// la 1 y la 4 (`docs/DECISIONES.md`): lo que no cambia de una máquina a otra es lo pulsado; el reloj del robot es un tope generoso; la hora de una persona, KLM.
test.describe.configure({ mode: 'serial' })

// Las teclas de control del tramo de la hoja (Tab y Enter a «Saltar al contenido», los Tab hasta `remate` y su Enter, los Tab hasta `grua` y su Enter, y Ctrl+S), contadas al
// escribirlo (4.13-4d): 23 en los dos proyectos, con 0,7 s el robot y KLM 12,5 s. Es determinista: una parada nueva en el camino lo rompe a propósito.
const CONTROLES_MAXIMOS = 23

let asesora = ''
let duena = ''
let subasta = ''
let lead = ''
let vehiculo = ''
let cotizacion = ''

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  // La dueña primero: la primera cuenta de la empresa tiene que poder gestionar el equipo.
  duena = correoDePrueba(`duena-oro-2-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dora Teclas' })
  ;({ email: asesora } = await crearAsesoraDeLaSemilla(`oro-2-${proyecto}`))
  subasta = sql("select id from public.origenes where clave = 'subasta_usa'")
  lead = await crearLead({
    nombre: `oro 2 ${proyecto}`,
    telefono: telefonoAlAzar(),
    deQuien: asesora,
  })
  const titulo = `E2E oro 2 ${proyecto}`
  await cargarVehiculos(subasta, [{ titulo, anio: 2020, atributos: { tipo_vehiculo: 'autos' } }])
  vehiculo = (await vehiculoPorTitulo(titulo))?.id ?? ''
  expect(vehiculo, 'el vehículo de la tarea de oro').not.toBe('')
})

test.afterAll(async () => {
  if (cotizacion !== '') {
    sql(`delete from public.cotizaciones where id = ${literal(cotizacion)}::uuid`)
  }
  if (vehiculo !== '') {
    sql(`delete from public.vehiculos where id = ${literal(vehiculo)}::uuid`)
  }
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const valor = (page: Page, nodo: string) => celdaDeLaHoja(page, nodo).locator('[data-parada="0"]')
const sinEspacios = (texto: string | null) => (texto ?? '').replace(/\s/g, '')

test('tarea de oro 2: de la hoja abierta a la cotización guardada, sólo con el teclado', async ({
  page,
}, info) => {
  const guardados = await vigilarGuardados(page)
  await entrar(page, asesora, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${subasta}&lead=${lead}&vehiculo=${vehiculo}`)
  await expect(page.locator('[data-hoja]')).toBeVisible()
  const teclado = new Teclado(page)
  const inicio = performance.now()

  await teclado.pulsar('Tab')
  await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused()
  await teclado.pulsar('Enter')
  // Tipear un número sobre la celda abre su edición con él; Enter lo confirma y deja el foco en la celda.
  await teclado.tabularHasta(valor(page, 'remate'))
  await teclado.escribir('9500')
  await teclado.pulsar('Enter')
  await expect(valor(page, 'remate')).toBeFocused()
  await teclado.tabularHasta(valor(page, 'grua'))
  await teclado.escribir('450')
  await teclado.pulsar('Enter')
  await expect(page.getByLabel('Resumen')).toHaveAttribute('aria-busy', 'false')
  await expect(totalDeLaHoja(page)).toContainText(/\d/)
  await teclado.pulsar('ControlOrMeta+s')
  await expect(tarjetaGuardada(page)).toContainText(/Cotización n\.º \d+ guardada/)
  const fin = performance.now()

  const [pedido] = guardados.pedidos
  expect(guardados.pedidos).toHaveLength(1)
  cotizacion = pedido?.intento ?? ''
  const fila = cotizacionGuardada(cotizacion)
  expect(fila.filas).toBe(1)
  expect(fila.creadoPor).toBe(await idDe(asesora))
  expect(fila.formulaId).toBe(formulaVigente(subasta))
  expect(
    sql(
      `select lead_id || '|' || vehiculo_id from public.cotizaciones where id = ${literal(cotizacion)}::uuid`,
    ),
  ).toBe(`${lead}|${vehiculo}`)
  // Lo guardado es lo que se ve: el total de la base es el de la tarjeta.
  const esperado = formatearMonto(Number(fila.totalBase), { moneda: 'USD', locale: 'es-BO' })
  expect(
    sinEspacios(await tarjetaGuardada(page).locator('[data-total-guardado]').textContent()),
  ).toContain(sinEspacios(esperado))

  const controles = teclado.pulsaciones
  const klm = teclado.klm(3)
  const robot = (fin - inicio) / 1000
  const seg = (v: number) => `${formatearNumero(v, { decimales: 1 })} s`
  const resumen = `${seg(robot)} el robot · ${String(controles)} teclas de control · KLM ${seg(klm)} · 0 clics`
  console.warn(`[tarea de oro 2] ${info.project.name}: ${resumen}`)
  info.annotations.push({ type: 'meta de 90 s', description: resumen })
  expect(controles).toBeLessThanOrEqual(CONTROLES_MAXIMOS)
  expect(robot).toBeLessThan(30)
  expect(klm).toBeLessThanOrEqual(90)
})

// Cada lado editable de cada celda (el valor y el porcentaje de un par) de `lugar`, en orden de documento: los marca con su posición para seguir el foco.
async function marcarLosEditables(lugar: Locator): Promise<number> {
  return lugar.evaluate((raiz) => {
    const editables = [
      ...raiz.querySelectorAll<HTMLElement>('[data-parada="0"], [data-parada="1"]'),
    ].filter((e) => !e.hasAttribute('disabled') && e.getAttribute('aria-disabled') !== 'true')
    editables.forEach((e, i) => {
      e.setAttribute('data-e2e-editable', String(i))
    })
    return editables.length
  })
}

// Tab hasta que el foco pasó por los `total` editables marcados; devuelve las posiciones por las que pasó, en orden (sin repetir la de seguido) y cuántos Tab costó.
async function tabularPorLosEditables(
  page: Page,
  total: number,
  maximo: number,
): Promise<{ vistos: number[]; tabs: number }> {
  const enFoco = () =>
    page.evaluate(() => document.activeElement?.getAttribute('data-e2e-editable') ?? null)
  const vistos: number[] = []
  const anotar = (marca: string | null) => {
    if (marca !== null && vistos.at(-1) !== Number(marca)) vistos.push(Number(marca))
  }
  anotar(await enFoco())
  let tabs = 0
  while (vistos.at(-1) !== total - 1 && tabs < maximo) {
    await page.keyboard.press('Tab')
    tabs += 1
    anotar(await enFoco())
  }
  return { vistos, tabs }
}

test('cada celda editable de la hoja y de «Avanzado» se alcanza con Tab, en orden', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${subasta}`)
  const hoja = page.locator('[data-hoja]')
  await expect(hoja).toBeVisible()
  const enLaHoja = await marcarLosEditables(hoja)
  expect(enLaHoja).toBeGreaterThan(0)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused()
  await page.keyboard.press('Enter')
  const deLaHoja = await tabularPorLosEditables(page, enLaHoja, 200)
  expect(deLaHoja.vistos).toEqual([...Array(enLaHoja).keys()])

  const boton = page.locator('[data-avanzado]').getByRole('button', { name: /^Avanzado/ })
  await boton.focus()
  await page.keyboard.press('Enter')
  const dialogo = page.getByRole('dialog', { name: 'Avanzado' })
  await expect(dialogo).toBeVisible()
  const enElModal = await marcarLosEditables(dialogo)
  expect(enElModal).toBeGreaterThan(0)
  // Al abrir, el foco está en el primer valor que se puede tipear (el primero de la lista).
  await expect(dialogo.locator('[data-e2e-editable="0"]')).toBeFocused()
  const delModal = await tabularPorLosEditables(page, enElModal, 200)
  expect(delModal.vistos).toEqual([...Array(enElModal).keys()])
  const medida = `hoja: ${String(enLaHoja)} lados en ${String(deLaHoja.tabs)} Tab; «Avanzado»: ${String(enElModal)} en ${String(delModal.tabs)}`
  console.warn(`[Tab por los editables] ${info.project.name}: ${medida}`)
  info.annotations.push({ type: 'Tab por los editables', description: medida })
})

import { expect, test, type Locator, type Page } from './soporte/prueba'
import { CONTRASENA, Teclado, entrar } from './soporte/alta'
import {
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
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import {
  celdaDeLaHoja,
  cotizacionGuardada,
  tarjetaGuardada,
  totalDeLaHoja,
  vigilarGuardados,
} from './soporte/cotizar-guardar'
import { borrarLeadsDePrueba, crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { crearAsesoraDeLaSemilla } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'
import { formatearNumero } from '../src/shared/lib/formato'

// Tarea de oro 2 con un enlace de subasta (paso 4.14-2c3, cierra 4-10; `docs/UX.md`): la asesora abre `subasta_usa` con su lead y sin vehículo y, sólo con el teclado, pega un
// enlace de Copart en el panel del vehículo, lo crea y lo elige, elige su tipo de la tabla (la subasta dice «AUTOMOBILE», que la tabla no tiene), escribe remate y grúa y guarda.
// apibara se intercepta con una ficha de otro VIN y otro lote (los de la grabada los usa `cotizar-panel-crear-vehiculo`; el VIN es único entre los vivos). Como la tarea de oro 2
// del inventario: lo que no cambia de una máquina a otra es lo pulsado; el reloj del robot es un tope generoso; la hora de una persona, KLM.
test.describe.configure({ mode: 'serial' })

// Las teclas de control: Tab y Enter a «Saltar al contenido», los Tab hasta la barra y su Enter, Enter para traer el enlace, Ctrl+S («Crear y elegir»), Enter en la barra (el foco
// vuelve a ella), los Tab hasta el tipo y su Enter, los Tab hasta `remate` y su Enter, hasta `grua` y su Enter, y Ctrl+S. Medido en la primera corrida verde (2026-10-30): 32,
// con 2,5 s el robot y KLM 39,5 s en escritorio; determinista: una parada nueva en el camino lo rompe a propósito.
const CONTROLES_CON_EL_ENLACE = 32

let asesora = ''
let subasta = ''
let lead = ''
let vin = ''
let apibaraAntes: EstadoDeApibara | null = null

const borrarElVehiculo = () => {
  sql(`
    delete from public.cotizaciones where vehiculo_id in (select id from public.vehiculos where vin = ${literal(vin)});
    delete from public.vehiculos where vin = ${literal(vin)}`)
}

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  vin = `E2E2C3${proyecto === 'movil' ? 'M' : 'E'}000000001`
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  // La dueña primero: la primera cuenta de la empresa tiene que poder gestionar el equipo.
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-oro-enlace-${proyecto}`),
    contrasena: CONTRASENA,
    nombre: 'Dora Enlace',
  })
  ;({ email: asesora } = await crearAsesoraDeLaSemilla(`oro-enlace-${proyecto}`))
  subasta = sql("select id from public.origenes where clave = 'subasta_usa'")
  lead = await crearLead({
    nombre: `oro enlace ${proyecto}`,
    telefono: telefonoAlAzar(),
    deQuien: asesora,
  })
  borrarElVehiculo()
  apibaraAntes = await leerApibara()
  await fijarApibara(true)
})

test.afterAll(async () => {
  if (apibaraAntes) {
    await restaurarApibara(apibaraAntes)
  }
  borrarElVehiculo()
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const barra = (page: Page): Locator => page.getByRole('button', { name: /^Vehículo:/ })
const panel = (page: Page): Locator => page.getByRole('dialog', { name: 'Vehículo' })
const valor = (page: Page, nodo: string) => celdaDeLaHoja(page, nodo).locator('[data-parada="0"]')

test('tarea de oro 2 con un enlace de Copart: de la hoja vacía a la cotización guardada, sólo con el teclado', async ({
  page,
}, info) => {
  test.setTimeout(150_000)
  const lote = info.project.name === 'movil' ? '77140002' : '77140001'
  const titulo = `2024 ORO ENLACE ${info.project.name.toUpperCase()}`
  await simularApibara(page, (entrada) =>
    entrada === ENLACE_DE_COPART
      ? ficha(otroCopart({ vin, lot_number: lote, title: titulo }), ENLACE_DE_COPART)
      : fallo('no_encontrado'),
  )
  const guardados = await vigilarGuardados(page)
  await entrar(page, asesora, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${subasta}&lead=${lead}`)
  await expect(page.locator('[data-hoja]')).toBeVisible()
  const teclado = new Teclado(page)
  const inicio = performance.now()

  await teclado.pulsar('Tab')
  await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused()
  await teclado.pulsar('Enter')
  await teclado.tabularHasta(barra(page))
  await teclado.pulsar('Enter')
  await expect(panel(page).getByRole('searchbox')).toBeFocused()
  await teclado.escribir(ENLACE_DE_COPART)
  await teclado.pulsar('Enter')
  await expect(panel(page).getByLabel('Título (obligatorio)')).toHaveValue(titulo)
  await teclado.pulsar('ControlOrMeta+s')
  await expect(panel(page)).toBeHidden()
  await expect(barra(page)).toContainText(titulo)
  await expect(barra(page)).toBeFocused()

  await teclado.pulsar('Enter')
  const tipo = panel(page).getByRole('group', { name: 'Tipo de vehículo' })
  await expect(tipo.getByRole('button').first()).toBeVisible()
  await teclado.tabularHasta(tipo.getByRole('button', { name: 'autos', exact: true }))
  await teclado.pulsar('Enter')
  await expect(panel(page)).toBeHidden()
  await expect(barra(page)).toBeFocused()

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

  // El vigilante ve toda action de la página (crear el vehículo, sus fotos, su tipo): la cotización es la que lleva `intento`.
  const deLaHoja = guardados.pedidos.filter((visto) => Object.hasOwn(visto, 'intento'))
  const [pedido] = deLaHoja
  expect(deLaHoja).toHaveLength(1)
  const cotizacion = pedido?.intento ?? ''
  expect(cotizacionGuardada(cotizacion).filas).toBe(1)
  expect(
    sql(`
      select c.lead_id || '|' || v.lote || '|' || (v.atributos->>'tipo_vehiculo') || '|' || (c.valores->>'transporte_bolivia' is not null)::text
        from public.cotizaciones c join public.vehiculos v on v.id = c.vehiculo_id
       where c.id = ${literal(cotizacion)}::uuid and v.vin = ${literal(vin)}`),
  ).toBe(`${lead}|${lote}|autos|true`)

  const controles = teclado.pulsaciones
  const klm = teclado.klm(6)
  const robot = (fin - inicio) / 1000
  const seg = (v: number) => `${formatearNumero(v, { decimales: 1 })} s`
  const resumen = `${seg(robot)} el robot · ${String(controles)} teclas de control · KLM ${seg(klm)} · 0 clics`
  console.warn(`[tarea de oro 2 con enlace] ${info.project.name}: ${resumen}`)
  info.annotations.push({ type: 'meta de 90 s', description: resumen })
  expect(controles).toBe(CONTROLES_CON_EL_ENLACE)
  expect(robot).toBeLessThan(30)
  expect(klm).toBeLessThanOrEqual(90)
  // Las fotos de la subasta se traen después de crear: se espera a que terminen antes de borrar el vehículo.
  await expect(page.getByText(/Se guardaron las 2 fotos de la subasta/)).toBeVisible({
    timeout: 90_000,
  })
})

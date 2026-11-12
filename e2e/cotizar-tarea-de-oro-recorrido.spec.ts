import { expect, test } from './soporte/prueba'
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
  abrirLaHojaDesdeElListado,
  barraDelVehiculo,
  comprobarLoGuardado,
  cotizarYBajar,
  elegirElCliente,
  nuevaCotizacion,
  panelDelVehiculo,
  sinEspacios,
  totalEnDolares,
} from './soporte/cotizar-recorrido'
import { totalDeLaHoja, vigilarGuardados } from './soporte/cotizar-guardar'
import { borrarLeadsDePrueba, crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { crearAsesoraDeLaSemilla } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'
import { cargarVehiculos, vehiculoPorTitulo } from './soporte/vehiculos'
import { formatearNumero } from '../src/shared/lib/formato'

// El recorrido de la IA del cierre de la Fase 4 (paso 4.28): la tarea de oro 2 entera (`docs/UX.md`), con dos cuentas. Los otros specs de la tarea miden tramos que
// arrancan en la hoja con el lead en la URL; aquí se arranca en el listado `/cotizaciones` y, sólo con el teclado, se abre «Nueva cotización», se elige el vehículo
// en su panel (la asesora pega un enlace de Copart; la dueña busca uno del inventario), el cliente en el suyo, se escriben remate y grúa, se guarda y se baja el PDF.
// La dueña ve los ⚙ y lo de «costos» (más paradas) y también tiene que cumplir los 90 s. Después abre desde el listado la cotización de la asesora. Como los otros
// specs de la tarea: lo que no cambia de una máquina a otra es lo pulsado; el reloj del robot es un tope generoso; la hora de una persona, KLM. apibara se intercepta
// en la página (la clave real no se lee ni se llama).
test.describe.configure({ mode: 'serial' })

// Las teclas de control, contadas en la primera corrida verde (2026-11-08); en el celular, 3 menos (el listado tiene menos paradas antes de «Nueva»). La asesora: Tab y Enter a «Saltar al contenido», los Tab
// hasta «Nueva cotización» y su Enter; los Tab hasta la barra del vehículo y su Enter, Enter para traer el enlace, Ctrl+S («Crear y elegir»), Enter en la barra, los
// Tab hasta el tipo y su Enter; los Tab hasta la barra del cliente y su Enter, los Tab hasta su lead y su Enter; los Tab hasta `remate` y su Enter, hasta `grua` y su
// Enter, Ctrl+S, los Tab hasta «Descargar PDF» y su Enter. La dueña: lo mismo con el vehículo buscado por nombre (los Tab hasta su tarjeta y su Enter) en vez del
// enlace y el tipo. KLM: 56,7 s y 41,1 s en escritorio; 54,5 s y 37,5 s en el celular. Deterministas: una parada nueva en el camino las rompe a propósito (6.01-4: con la entrada de Logística en la navegación, +1 en escritorio: 57 la asesora y 53 la dueña; 7.07: con la de Agenda, otra más: 58 y 54; 7.02: la campana de la barra, +1 en los dos: 59 y 55 en escritorio, 54 y 50 en el celular).
const CONTROLES_DE_LA_ASESORA: Record<string, number> = { escritorio: 59, movil: 54 }
const CONTROLES_DE_LA_DUENA: Record<string, number> = { escritorio: 55, movil: 50 }

let duena = ''
let asesora = ''
let subasta = ''
let leadDeLaAsesora = ''
let leadDeLaDuena = ''
let nombreDelLeadDeLaAsesora = ''
let nombreDelLeadDeLaDuena = ''
let vin = ''
let vehiculoDeLaDuena = ''
let tituloDeLaDuena = ''
let cotizacionDeLaAsesora = ''
let apibaraAntes: EstadoDeApibara | null = null

const borrarLoCreado = () => {
  const leads = [leadDeLaAsesora, leadDeLaDuena].filter((id) => id !== '')
  if (leads.length > 0) {
    sql(
      `delete from public.cotizaciones where lead_id in (${leads.map((id) => `${literal(id)}::uuid`).join(', ')})`,
    )
  }
  sql(`
    delete from public.cotizaciones where vehiculo_id in (select id from public.vehiculos where vin = ${literal(vin)});
    delete from public.vehiculos where vin = ${literal(vin)}`)
  if (vehiculoDeLaDuena !== '') {
    sql(`
      delete from public.cotizaciones where vehiculo_id = ${literal(vehiculoDeLaDuena)}::uuid;
      delete from public.vehiculos where id = ${literal(vehiculoDeLaDuena)}::uuid`)
  }
}

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  vin = `E2E428${proyecto === 'movil' ? 'M' : 'E'}000000001`
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  // La dueña primero: la primera cuenta de la empresa tiene que poder gestionar el equipo.
  duena = correoDePrueba(`duena-recorrido-428-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dora Recorrido' })
  ;({ email: asesora } = await crearAsesoraDeLaSemilla(`recorrido-428-${proyecto}`))
  subasta = sql("select id from public.origenes where clave = 'subasta_usa'")
  nombreDelLeadDeLaAsesora = `recorrido asesora ${proyecto}`
  nombreDelLeadDeLaDuena = `recorrido duena ${proyecto}`
  leadDeLaAsesora = await crearLead({
    nombre: nombreDelLeadDeLaAsesora,
    telefono: telefonoAlAzar(),
    deQuien: asesora,
  })
  leadDeLaDuena = await crearLead({
    nombre: nombreDelLeadDeLaDuena,
    telefono: telefonoAlAzar(),
    deQuien: duena,
  })
  borrarLoCreado()
  tituloDeLaDuena = `E2E recorrido 428 ${proyecto}`
  await cargarVehiculos(subasta, [
    { titulo: tituloDeLaDuena, anio: 2021, atributos: { tipo_vehiculo: 'autos' } },
  ])
  vehiculoDeLaDuena = (await vehiculoPorTitulo(tituloDeLaDuena))?.id ?? ''
  expect(vehiculoDeLaDuena, 'el vehículo del inventario de la dueña').not.toBe('')
  apibaraAntes = await leerApibara()
  await fijarApibara(true)
})

test.afterAll(async () => {
  if (apibaraAntes) {
    await restaurarApibara(apibaraAntes)
  }
  borrarLoCreado()
  await borrarLeadsDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const seg = (v: number) => `${formatearNumero(v, { decimales: 1 })} s`

test('E2E R1 la asesora, la tarea de oro 2 entera con un enlace de Copart: del listado al PDF, sólo con el teclado', async ({
  page,
}, info) => {
  test.setTimeout(180_000)
  const lote = info.project.name === 'movil' ? '77428002' : '77428001'
  const titulo = `2024 RECORRIDO ${info.project.name.toUpperCase()}`
  await simularApibara(page, (entrada) =>
    entrada === ENLACE_DE_COPART
      ? ficha(otroCopart({ vin, lot_number: lote, title: titulo }), ENLACE_DE_COPART)
      : fallo('no_encontrado'),
  )
  const guardados = await vigilarGuardados(page)
  await entrar(page, asesora, { fresco: true })
  await page.goto(`/cotizaciones?origen=${subasta}`)
  await expect(nuevaCotizacion(page)).toBeVisible()
  const teclado = new Teclado(page)
  const inicio = performance.now()

  await abrirLaHojaDesdeElListado(page, teclado, subasta)
  await teclado.tabularHasta(barraDelVehiculo(page))
  await teclado.pulsar('Enter')
  await expect(panelDelVehiculo(page).getByRole('searchbox')).toBeFocused()
  await teclado.escribir(ENLACE_DE_COPART)
  await teclado.pulsar('Enter')
  await expect(panelDelVehiculo(page).getByLabel('Título (obligatorio)')).toHaveValue(titulo)
  await teclado.pulsar('ControlOrMeta+s')
  await expect(panelDelVehiculo(page)).toBeHidden()
  await expect(barraDelVehiculo(page)).toContainText(titulo)
  await expect(barraDelVehiculo(page)).toBeFocused()
  await teclado.pulsar('Enter')
  const tipo = panelDelVehiculo(page).getByRole('group', { name: 'Tipo de vehículo' })
  await expect(tipo.getByRole('button').first()).toBeVisible()
  await teclado.tabularHasta(tipo.getByRole('button', { name: 'autos', exact: true }))
  await teclado.pulsar('Enter')
  await expect(panelDelVehiculo(page)).toBeHidden()
  await expect(barraDelVehiculo(page)).toBeFocused()
  await elegirElCliente(page, teclado, { nombre: nombreDelLeadDeLaAsesora, id: leadDeLaAsesora })
  const descarga = await cotizarYBajar(page, teclado)
  const fin = performance.now()

  const vehiculo = sql(`select id from public.vehiculos where vin = ${literal(vin)}`)
  cotizacionDeLaAsesora = await comprobarLoGuardado(page, guardados.pedidos, descarga, {
    quien: asesora,
    lead: leadDeLaAsesora,
    vehiculo,
    origen: subasta,
  })
  expect(
    sql(
      `select lote || '|' || (atributos->>'tipo_vehiculo') from public.vehiculos where vin = ${literal(vin)}`,
    ),
  ).toBe(`${lote}|autos`)

  const controles = teclado.pulsaciones
  // Las decisiones: abrir la nueva, pegar el enlace, el tipo, el cliente, remate, grúa, guardar y bajar el PDF.
  const klm = teclado.klm(8)
  const robot = (fin - inicio) / 1000
  const resumen = `${seg(robot)} el robot · ${String(controles)} teclas de control · KLM ${seg(klm)} · 0 clics`
  console.warn(`[tarea de oro 2 entera, la asesora] ${info.project.name}: ${resumen}`)
  info.annotations.push({ type: 'meta de 90 s, la asesora', description: resumen })
  expect(controles).toBe(CONTROLES_DE_LA_ASESORA[info.project.name])
  expect(robot).toBeLessThan(45)
  expect(klm).toBeLessThanOrEqual(90)
  // Las fotos de la subasta se traen después de crear: se espera a que terminen antes de borrar el vehículo.
  await expect(page.getByText(/Se guardaron las 2 fotos de la subasta/)).toBeVisible({
    timeout: 90_000,
  })
})

test('E2E R2 la dueña, la misma tarea con un vehículo del inventario: del listado al PDF, sólo con el teclado y en ≤ 90 s', async ({
  page,
}, info) => {
  test.setTimeout(150_000)
  const guardados = await vigilarGuardados(page)
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones?origen=${subasta}`)
  await expect(nuevaCotizacion(page)).toBeVisible()
  const teclado = new Teclado(page)
  const inicio = performance.now()

  await abrirLaHojaDesdeElListado(page, teclado, subasta)
  await teclado.tabularHasta(barraDelVehiculo(page))
  await teclado.pulsar('Enter')
  await expect(panelDelVehiculo(page).getByRole('searchbox')).toBeFocused()
  await teclado.escribir(tituloDeLaDuena)
  const tarjeta = panelDelVehiculo(page)
    .getByRole('list', { name: 'Vehículos' })
    .getByRole('button')
    .first()
  await expect(tarjeta).toContainText(tituloDeLaDuena)
  await teclado.tabularHasta(tarjeta)
  await teclado.pulsar('Enter')
  await expect(barraDelVehiculo(page)).toContainText(tituloDeLaDuena)
  await expect(page).toHaveURL(new RegExp(`vehiculo=${vehiculoDeLaDuena}`))
  await expect(barraDelVehiculo(page)).toBeFocused()
  await elegirElCliente(page, teclado, { nombre: nombreDelLeadDeLaDuena, id: leadDeLaDuena })
  const descarga = await cotizarYBajar(page, teclado)
  const fin = performance.now()

  await comprobarLoGuardado(page, guardados.pedidos, descarga, {
    quien: duena,
    lead: leadDeLaDuena,
    vehiculo: vehiculoDeLaDuena,
    origen: subasta,
  })

  const controles = teclado.pulsaciones
  // Las decisiones: abrir la nueva, el vehículo, el cliente, remate, grúa, guardar y bajar el PDF.
  const klm = teclado.klm(7)
  const robot = (fin - inicio) / 1000
  const resumen = `${seg(robot)} el robot · ${String(controles)} teclas de control · KLM ${seg(klm)} · 0 clics`
  console.warn(`[tarea de oro 2 entera, la dueña] ${info.project.name}: ${resumen}`)
  info.annotations.push({ type: 'meta de 90 s, la dueña', description: resumen })
  expect(controles).toBe(CONTROLES_DE_LA_DUENA[info.project.name])
  expect(robot).toBeLessThan(45)
  expect(klm).toBeLessThanOrEqual(90)
})

test('E2E R3 la dueña abre desde el listado, con el teclado, la cotización de la asesora y ve el total guardado', async ({
  page,
}) => {
  expect(cotizacionDeLaAsesora, 'la cotización de R1').not.toBe('')
  const { numero, total } = (() => {
    const [n = '', t = ''] = sql(
      `select numero, total_base from public.cotizaciones where id = ${literal(cotizacionDeLaAsesora)}::uuid`,
    ).split('|')
    return { numero: n, total: t }
  })()
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones?origen=${subasta}`)
  const abrir = page
    .getByRole('button', { name: `Abrir N.º ${numero}`, exact: true })
    .filter({ visible: true })
  await abrir.focus()
  await page.keyboard.press('Enter')
  const resumen = page.getByRole('dialog')
  await expect(resumen).toContainText(`Cotización n.º ${numero}`)
  await expect(resumen).toContainText(nombreDelLeadDeLaAsesora)
  await expect(resumen).toContainText('Ana Recorrido')
  const enlace = resumen.getByRole('link', { name: 'Abrir cotización' })
  await enlace.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(new RegExp(`/cotizaciones/${cotizacionDeLaAsesora}$`))
  await expect(totalDeLaHoja(page)).toBeVisible()
  expect(sinEspacios(await totalDeLaHoja(page).textContent())).toContain(
    sinEspacios(totalEnDolares(total)),
  )
})

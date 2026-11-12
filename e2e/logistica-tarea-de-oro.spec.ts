import type { Locator, Page, TestInfo } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  admin,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import {
  borrarMover,
  sembrarLote,
  sembrarMover,
  type LoteSembrado,
  type TerrenoDeMover,
} from './soporte/mover'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'
import { formatearNumero } from '../src/shared/lib/formato'

// El recorrido de la IA del cierre de la Fase 6 (paso 6.14): la tarea de oro 3 (`docs/UX.md`), con dos cuentas, logística («Primera Mueve», con `flujos.mover` del
// origen) y la dueña. Mover 1 unidad desde la cadena en ≤ 15 s; marcar que llegó un contenedor de 8 desde `/logistica/embarques` en ≤ 60 s viendo antes qué falta en
// cada una; nunca mover sin el documento bloqueante ni pisar el cambio de otra persona; el margen sin venta nunca es 0. Cada regla ya tiene su prueba SQL y su spec
// (`logistica-mover`, `logistica-lote`, `logistica-gastos-y-pagos`): aquí se recorre la tarea entera y se mide. Como en la tarea de oro 2, el reloj del robot es un
// tope generoso y la hora de una persona es KLM; a diferencia de ella, logística trabaja con puntero: cada gesto (apuntar 1,1 s y clic 0,2 s) cuenta 1,3 s, cada
// tecla 0,28 s y cada decisión 1,35 s (en el celular un toque cuesta lo mismo que un clic). Las capturas (sólo con `E2E_CAPTURAS`) son para el recorrido de la IA.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let terreno: TerrenoDeMover
let lote: LoteSembrado
let conflicto = { id: '', titulo: '' }
const duena = { correo: '', nombre: 'Dora Logística' }

// Cuenta lo que hace una persona con puntero y teclado para estimar su hora con KLM.
class Gestos {
  gestos = 0
  teclas = 0

  constructor(private readonly page: Page) {}

  async tocar(lugar: Locator): Promise<void> {
    await lugar.click()
    this.gestos += 1
  }

  async escribir(lugar: Locator, texto: string): Promise<void> {
    await lugar.click()
    await this.page.keyboard.type(texto)
    this.gestos += 1
    this.teclas += texto.length
  }

  async pulsar(tecla: string): Promise<void> {
    await this.page.keyboard.press(tecla)
    this.teclas += 1
  }

  klm(decisiones: number): number {
    return this.gestos * 1.3 + this.teclas * 0.28 + decisiones * 1.35
  }
}

const seg = (v: number) => `${formatearNumero(v, { decimales: 1 })} s`

type Medida = { tramo: string; meta: number; robot: number; klm: number }

function anotar(info: TestInfo, g: Gestos, { tramo, meta, robot, klm }: Medida) {
  const resumen = `${seg(robot)} el robot · ${String(g.gestos)} gestos · ${String(g.teclas)} teclas · KLM ${seg(klm)}`
  console.warn(`[tarea de oro 3, ${tramo}] ${info.project.name}: ${resumen}`)
  info.annotations.push({ type: `meta de ${String(meta)} s, ${tramo}`, description: resumen })
}

test.beforeAll(async ({}, info) => {
  // Otro nombre que los de `logistica-mover` y `logistica-lote`: no comparten origen.
  proyecto = `oro3_${info.project.name}`
  await borrarMover(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena.correo = correoDePrueba(`duena-oro3-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena.correo, contrasena: CONTRASENA, nombre: duena.nombre })
  terreno = await sembrarMover(proyecto)
  lote = await sembrarLote(terreno, proyecto)
  const titulo = `E2E Oro3 conflicto ${proyecto}`
  const { data, error } = await admin()
    .from('vehiculos')
    .insert({
      origen_id: terreno.origen.id,
      titulo,
      fase_id: terreno.a.id,
      fase_desde: new Date().toISOString(),
    })
    .select('id')
    .single<{ id: string }>()
  if (error) throw new Error(`No se pudo crear el vehículo del conflicto: ${error.message}`)
  conflicto = { id: data.id, titulo }
})

test.afterAll(async () => {
  await borrarMover(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E R1 logística mueve una unidad desde la cadena en ≤ 15 s', async ({ page }, info) => {
  await entrar(page, terreno.primera.correo, { fresco: true })
  await page.goto(`/logistica?origen=${terreno.origen.id}&fase=${terreno.a.id}`)
  const tarjeta = page.getByRole('link', { name: terreno.enA.titulo }).first()
  await expect(tarjeta).toBeVisible()
  await capturar(page, info, 'cadena')
  const g = new Gestos(page)
  const inicio = performance.now()

  await g.tocar(tarjeta)
  const panel = page.getByRole('dialog')
  await expect(panel.getByRole('heading', { name: terreno.enA.titulo })).toBeVisible()
  await g.tocar(panel.getByRole('button', { name: `Elegir el destino «${terreno.b.nombre}»` }))
  await g.escribir(panel.getByLabel('Nota interna (obligatoria)'), 'Zarpó.')
  await capturar(page, info, 'panel-con-destino')
  await g.pulsar('Control+Enter')
  await expect(page.getByText(`${terreno.enA.titulo} pasó a «${terreno.b.nombre}».`)).toBeVisible()
  const fin = performance.now()

  // Las decisiones: la unidad, el destino, la nota y confirmar.
  const klm = g.klm(4)
  const robot = (fin - inicio) / 1000
  anotar(info, g, { tramo: 'mover 1', meta: 15, robot, klm })
  await capturar(page, info, 'movida')
  expect(robot).toBeLessThan(15)
  expect(klm).toBeLessThanOrEqual(15)
  expect(sql(`select fase_id from public.vehiculos where id = ${literal(terreno.enA.id)}`)).toBe(
    terreno.b.id,
  )
})

test('E2E R2 sin el documento bloqueante el botón se apaga y dice cuál', async ({ page }) => {
  await entrar(page, terreno.primera.correo)
  await page.goto(`/logistica/vehiculo/${terreno.enB.id}`)
  await page.getByRole('button', { name: `Elegir el destino «${terreno.c.nombre}»` }).click()
  const bloque = page.locator('[data-destino]').filter({ hasText: terreno.c.nombre })
  await expect(bloque.getByText('Falta', { exact: true })).toBeVisible()
  await expect(bloque.getByText('Obligatorio')).toBeVisible()
  await expect(bloque.locator('[data-motivo-del-boton]')).toHaveText(
    `Falta: ${terreno.tipoDeBl.nombre} aprobado.`,
  )
  await expect(bloque.getByRole('button', { name: `Mover a «${terreno.c.nombre}»` })).toBeDisabled()
})

test('E2E R3 si la dueña movió antes, logística lee su nombre y no se mueve nada', async ({
  page,
  browser,
}) => {
  await entrar(page, terreno.primera.correo)
  await page.goto(`/logistica/vehiculo/${conflicto.id}`)
  await page.getByRole('button', { name: `Elegir el destino «${terreno.b.nombre}»` }).click()
  await page.getByLabel('Nota interna (obligatoria)').fill('Lo muevo yo.')

  const contexto = await browser.newContext({ baseURL: new URL(page.url()).origin })
  const otra = await contexto.newPage()
  await entrar(otra, duena.correo, { fresco: true })
  await otra.goto(`/logistica/vehiculo/${conflicto.id}`)
  await otra.getByRole('button', { name: `Elegir el destino «${terreno.b.nombre}»` }).click()
  await otra.getByLabel('Nota interna (obligatoria)').fill('Ya zarpó.')
  await otra.getByLabel('Nota interna (obligatoria)').press('Control+Enter')
  await expect(otra.getByText(/pasó a «/)).toBeVisible()

  await page.getByLabel('Nota interna (obligatoria)').press('Control+Enter')
  const aviso = page.getByRole('status').filter({ hasText: `${duena.nombre} la movió a` })
  await expect(aviso).toContainText(`«${terreno.b.nombre}»`)
  await expect(aviso).toContainText('No se movió nada.')
  await contexto.close()
})

test('E2E R4 logística marca que llegó un contenedor de 8 desde embarques en ≤ 60 s, viendo antes qué falta en cada uno', async ({
  page,
}, info) => {
  await entrar(page, terreno.primera.correo)
  await page.goto(
    `/logistica/embarques?grupo=contenedores&q=${lote.contenedor.slice(0, 5).toLowerCase()}`,
  )
  // En escritorio el contenedor es una fila de la tabla; en el celular, una tarjeta de la lista.
  const fila = page
    .getByRole('row')
    .or(page.getByRole('listitem'))
    .filter({ has: page.getByRole('button', { name: `Abrir el contenedor ${lote.contenedor}` }) })
  await expect(fila).toContainText('8 unidades')
  await capturar(page, info, 'embarques')
  const g = new Gestos(page)
  const inicio = performance.now()

  await g.tocar(fila.getByRole('button', { name: `Abrir el contenedor ${lote.contenedor}` }))
  const resumen = page.getByRole('dialog', { name: 'Contenedor' })
  await expect(
    resumen.getByRole('heading', { name: `Contenedor ${lote.contenedor}` }),
  ).toBeVisible()
  await g.tocar(resumen.getByText('Mover el grupo', { exact: true }))
  await capturar(page, info, 'contenedor')
  await g.tocar(resumen.getByRole('link', { name: 'Marcar que llegó' }))
  await expect(page.getByRole('heading', { name: 'Mover varias unidades' })).toBeVisible()
  await expect(page.getByText('Se eligieron 8.')).toBeVisible()
  await expect(page.getByText('Elige a dónde mover.')).toBeVisible()
  await g.tocar(page.getByRole('button', { name: `Mover a «${terreno.c.nombre}»` }))
  const unidades = page.locator('[data-unidad-del-lote]')
  const falta = `Falta: ${terreno.tipoDeBl.nombre} aprobado.`
  await expect(unidades.filter({ hasText: lote.sinBl.titulo })).toContainText(falta)
  await expect(unidades.filter({ hasText: 'Lista' })).toHaveCount(7)
  await capturar(page, info, 'vista-previa')
  await g.tocar(page.getByRole('button', { name: 'Mover los 7 que pueden' }))
  const resultado = page.locator('[data-resultado-del-lote]')
  await expect(resultado.getByText('Se movieron 7 de 8.')).toBeVisible()
  await expect(resultado).toContainText(`No se movió «${lote.sinBl.titulo}». ${falta}`)
  const fin = performance.now()

  // Las decisiones: el contenedor, el hueco, marcar, el destino, revisar la vista previa y confirmar.
  const klm = g.klm(6)
  const robot = (fin - inicio) / 1000
  anotar(info, g, { tramo: 'contenedor de 8', meta: 60, robot, klm })
  await capturar(page, info, 'resultado')
  expect(robot).toBeLessThan(60)
  expect(klm).toBeLessThanOrEqual(60)
  const ids = lote.delContenedor.map((u) => literal(u.id)).join(', ')
  expect(
    sql(
      `select count(*) filter (where fase_id = ${literal(terreno.c.id)}) || '|' || count(*) filter (where fase_id = ${literal(terreno.b.id)}) from public.vehiculos where id in (${ids})`,
    ),
  ).toBe('7|1')
  expect(sql(`select fase_id from public.vehiculos where id = ${literal(lote.sinBl.id)}`)).toBe(
    terreno.b.id,
  )
})

test('E2E R5 la dueña ve el margen de una unidad sin venta: «Sin venta registrada», nunca 0', async ({
  page,
}, info) => {
  const unidad = lote.delContenedor[0] ?? { id: '', titulo: '' }
  await entrar(page, duena.correo, { fresco: true })
  await page.goto(`/logistica/vehiculo/${unidad.id}`)
  await page.getByText('Margen', { exact: true }).click()
  const margen = page.locator('[data-hueco="margen"]')
  for (const cifra of ['venta', 'margen']) {
    const lugar = margen.locator(`[data-cifra="${cifra}"]`)
    await expect(lugar).toContainText('Sin venta registrada')
    await expect(lugar).not.toHaveText(/^\D*0([.,]0+)?\D*$/)
  }
  await capturar(page, info, 'margen')
})

test('E2E R6 la dueña recorre la cadena, embarques, aduana, gastos e Inicio', async ({
  page,
}, info) => {
  await entrar(page, duena.correo)
  const barra = page.getByRole('navigation', { name: 'Logística', exact: true })
  const pantallas: { ruta: string; nombre: string; enlace?: string }[] = [
    { ruta: `/logistica?origen=${terreno.origen.id}`, nombre: 'cadena-duena' },
    { ruta: '/logistica/embarques', nombre: 'embarques-duena', enlace: 'Embarques' },
    { ruta: '/logistica/aduana', nombre: 'aduana-duena', enlace: 'Aduana' },
    { ruta: '/logistica/gastos', nombre: 'gastos-duena', enlace: 'Gastos' },
  ]
  for (const p of pantallas) {
    await page.goto(p.ruta)
    await expect(barra).toBeVisible()
    if (p.enlace) {
      await expect(barra.getByRole('link', { name: p.enlace })).toHaveAttribute(
        'aria-current',
        'page',
      )
    }
    await capturar(page, info, p.nombre)
  }
  await page.goto('/')
  await expect(page.getByRole('main')).toBeVisible()
  await capturar(page, info, 'inicio-duena')
})

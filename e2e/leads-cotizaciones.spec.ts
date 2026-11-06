import { expect, test, type Locator, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarRolesDePrueba,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
  PREFIJO_ROL_E2E,
} from './soporte/base'
import { idDePersona, sembrarCotizaciones } from './soporte/cotizaciones-sembradas'
import { limpiarGuardado, prepararGuardado } from './soporte/cotizar-guardar'
import { crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { literal, sql } from './soporte/sql'

// La sección «Cotizaciones» de la ficha del lead (paso 4.17-4b, `docs/UX.md` › «Lead»): la ve quien tiene `cotizaciones.ver` en algún origen (P2 del 4.17-4, sin mirar la
// cartera); se lee desde el navegador al abrirla, de a 20 por cursor hasta 500, y en el tope dice «Ver todas en Cotizaciones» (`/cotizaciones?lead=`). Con la RLS de quien mira.

// Presupuestos (`docs/RENDIMIENTO.md`): los mismos de la pestaña del vehículo (4.17-3), porque es la misma lista sobre la misma forma de consulta: la primera respuesta
// ≤ 5.250 B, 65 nodos con 20 y 1.576 con 500, y la página 25 no pesa más que la 1.ª.
const TOPE_DE_BYTES = 5_250
const TOPE_DE_NODOS_CON_20 = 65
const TOPE_DE_NODOS_CON_500 = 1_576

let origen = { id: '', nombre: '' }
let duena = ''
let sinClave = ''
let ana = ''
const leads: Record<'veintidos' | 'quinientas' | 'ninguna' | 'compartido', string> = {
  veintidos: '',
  quinientas: '',
  ninguna: '',
  compartido: '',
}

const nombreDe = (id: string): string =>
  sql(`select nombre from public.leads where id = ${literal(id)}::uuid`)

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarRolesDePrueba()
  ;({ origen, duena } = await prepararGuardado(proyecto, 'leadcotiz'))
  const nuevo = (nombre: string) =>
    crearLead({ nombre: `${nombre} ${proyecto}`, telefono: telefonoAlAzar(), deQuien: duena })
  leads.veintidos = await nuevo('cotiz veintidos')
  leads.quinientas = await nuevo('cotiz quinientas')
  leads.ninguna = await nuevo('cotiz ninguna')
  leads.compartido = await nuevo('cotiz compartido')
  sinClave = correoDePrueba(`sinclave-leadcotiz-${proyecto}`)
  await crearPersona({
    email: sinClave,
    contrasena: CONTRASENA,
    nombre: 'Sin Clave',
    invitada: true,
  })
  // Ve todos los leads y no tiene cotizaciones.ver.
  await darRolDePrueba({
    email: sinClave,
    rol: { nombre: `${PREFIJO_ROL_E2E}Lead sin cotizaciones`, clave: 'e2e_lead_sin_cotizaciones' },
    permisos: ['leads.ver'],
  })
  ana = correoDePrueba(`ana-leadcotiz-${proyecto}`)
  await crearPersona({ email: ana, contrasena: CONTRASENA, nombre: 'Ana Propios', invitada: true })
  await darRolDePrueba({
    email: ana,
    rol: { nombre: `${PREFIJO_ROL_E2E}Lead propios`, clave: 'e2e_lead_propios' },
    permisos: ['leads.ver', { clave: 'cotizaciones.ver', origenId: origen.id, alcance: 'propios' }],
  })
  const deLaDuena = idDePersona(duena)
  const base = { origenId: origen.id, creadoPor: deLaDuena }
  sembrarCotizaciones({ ...base, leadId: leads.veintidos, cuantas: 22 })
  sembrarCotizaciones({ ...base, leadId: leads.quinientas, cuantas: 520 })
  // Del lead compartido: dos de la dueña y una de Ana (la más vieja); el lead no está en la cartera de Ana.
  sembrarCotizaciones({ ...base, leadId: leads.compartido, cuantas: 2 })
  sembrarCotizaciones({
    origenId: origen.id,
    leadId: leads.compartido,
    creadoPor: idDePersona(ana),
    cuantas: 1,
    desde: 2,
  })
})

test.afterAll(async () => {
  await limpiarGuardado()
  await borrarRolesDePrueba()
})

const barra = (page: Page): Locator => page.getByRole('navigation', { name: 'Secciones del lead' })
const lista = (page: Page): Locator => page.getByRole('list', { name: 'Cotizaciones del lead' })
const filas = (page: Page): Locator => lista(page).getByRole('listitem')

// Los pedidos del navegador a `cotizaciones` (la sección lee desde el navegador; el servidor no lee cotizaciones para la ficha).
function vigilarLecturas(page: Page): string[] {
  const lecturas: string[] = []
  page.on('request', (pedido) => {
    if (new URL(pedido.url()).pathname === '/rest/v1/cotizaciones') {
      lecturas.push(pedido.url())
    }
  })
  return lecturas
}

test('E1 la dueña: en «Datos» no se lee nada; «Cotizaciones» va entre «Oportunidades» y «Portal» y trae 20, y «Ver más» lleva a 22', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/leads/${leads.veintidos}`)
  const enlaces = barra(page).getByRole('link')
  const nombres = await enlaces.allTextContents()
  expect(nombres.indexOf('Cotizaciones')).toBe(nombres.indexOf('Oportunidades') + 1)
  expect(nombres.indexOf('Portal')).toBe(nombres.indexOf('Cotizaciones') + 1)
  const lecturas = vigilarLecturas(page)
  await expect(enlaces.filter({ hasText: 'Datos' })).toHaveAttribute('aria-current', 'page')
  expect(lecturas).toEqual([])

  const respuesta = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/rest/v1/cotizaciones',
  )
  await enlaces.filter({ hasText: 'Cotizaciones' }).click()
  await expect(page).toHaveURL(/seccion=cotizaciones/)
  const bytes = (await (await respuesta).body()).length
  await expect(filas(page)).toHaveCount(20)
  expect(lecturas).toHaveLength(1)
  expect(lecturas[0]).toContain(`lead_id=eq.${leads.veintidos}`)
  const nodos = await lista(page).evaluate((e) => e.querySelectorAll('*').length + 1)
  test.info().annotations.push({
    type: 'medido',
    description: `nodos con 20: ${String(nodos)}, bytes: ${String(bytes)}`,
  })
  expect(nodos).toBeLessThanOrEqual(TOPE_DE_NODOS_CON_20)
  expect(bytes).toBeLessThanOrEqual(TOPE_DE_BYTES)

  const masNueva = sql(
    `select numero from public.cotizaciones where lead_id = ${literal(leads.veintidos)}::uuid order by creado_en desc, id desc limit 1`,
  )
  await expect(filas(page).first()).toContainText(`N.º ${masNueva}`)
  await expect(filas(page).first().getByRole('link')).toHaveAttribute(
    'href',
    /^\/cotizaciones\/[0-9a-f-]{36}$/,
  )
  await page.getByRole('button', { name: 'Ver más' }).click()
  await expect(filas(page)).toHaveCount(22)
  await expect(page.getByRole('button', { name: 'Ver más' })).toHaveCount(0)
  expect(lecturas).toHaveLength(2)
})

test('E2 con 520: «Ver más» llega a 500, dice el tope y «Ver todas en Cotizaciones» lleva al listado del lead', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  const tamanos: number[] = []
  page.on('response', (r) => {
    if (new URL(r.url()).pathname === '/rest/v1/cotizaciones') {
      void r.body().then((cuerpo) => tamanos.push(cuerpo.length))
    }
  })
  await page.goto(`/leads/${leads.quinientas}?seccion=cotizaciones`)
  await expect(filas(page)).toHaveCount(20)
  for (let ronda = 2; ronda <= 25; ronda += 1) {
    await page.getByRole('button', { name: 'Ver más' }).click()
    await expect(filas(page)).toHaveCount(Math.min(20 * ronda, 500))
  }
  await expect(page.getByRole('button', { name: 'Ver más' })).toHaveCount(0)
  await expect(page.getByText('Mostrando las 500 más recientes.')).toBeVisible()
  const nodos = await lista(page).evaluate((e) => e.querySelectorAll('*').length + 1)
  const primera = tamanos[0] ?? 0
  const vigesimaQuinta = tamanos[24] ?? Number.POSITIVE_INFINITY
  test.info().annotations.push({
    type: 'medido',
    description: `nodos con 500: ${String(nodos)}, bytes de la 1.ª: ${String(primera)}, de la 25.ª: ${String(vigesimaQuinta)}`,
  })
  expect(nodos).toBeLessThanOrEqual(TOPE_DE_NODOS_CON_500)
  expect(tamanos.length).toBeGreaterThanOrEqual(25)
  expect(vigesimaQuinta).toBeLessThanOrEqual(primera * 1.05)
  const camino = page.getByRole('link', { name: 'Ver todas en Cotizaciones' })
  await expect(camino).toHaveAttribute('href', `/cotizaciones?lead=${leads.quinientas}`)
  await camino.click()
  await expect(page).toHaveURL(/\/cotizaciones\?lead=/)
  await expect(page.getByText(`Cotizaciones de ${nombreDe(leads.quinientas)}.`)).toBeVisible()
})

test('E3 sin cotizaciones.ver no hay sección y ?seccion=cotizaciones abre «Datos»', async ({
  page,
}) => {
  await entrar(page, sinClave, { fresco: true })
  const lecturas = vigilarLecturas(page)
  await page.goto(`/leads/${leads.compartido}?seccion=cotizaciones`)
  await expect(barra(page).getByRole('link', { name: 'Cotizaciones' })).toHaveCount(0)
  await expect(barra(page).getByRole('link', { name: 'Datos' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  expect(lecturas).toEqual([])
})

test('E3b con «propios» la sección está aunque el lead no sea de su cartera, y la RLS deja sólo la suya', async ({
  page,
}) => {
  await entrar(page, ana, { fresco: true })
  await page.goto(`/leads/${leads.compartido}`)
  await barra(page).getByRole('link', { name: 'Cotizaciones' }).click()
  await expect(filas(page)).toHaveCount(1)
  await expect(filas(page).first()).toContainText('Ana Propios')
  await expect(lista(page)).not.toContainText('Gala Guarda')
})

test('E4 un lead sin cotizaciones: recargar con la sección abierta dice que no hay', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/leads/${leads.ninguna}?seccion=cotizaciones`)
  await expect(barra(page).getByRole('link', { name: 'Cotizaciones' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(page.getByText('Sin cotizaciones que puedas ver.')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Sin cotizaciones que puedas ver.')).toBeVisible()
})

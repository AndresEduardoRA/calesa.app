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
import { literal, sql } from './soporte/sql'

// La pestaña «Cotizaciones» de la ficha del vehículo (paso 4.17-3, `docs/UX.md` › «Vehículo»): la ven quienes tienen `cotizaciones.ver` en el origen del vehículo (P1); se lee
// desde el navegador al abrirla, de a 20 por cursor hasta 500, y en el tope dice «Ver todas en Cotizaciones» (el camino a lo antiguo). Con la RLS de quien mira.

// Presupuestos (`docs/RENDIMIENTO.md`). La primera respuesta es la consulta del historial del panel (4.14-2b): sus mismos topes de bytes (5.250) y de nodos con 20 (65).
// Medido en el 4.17-3, en los dos proyectos: 4.996 bytes en escritorio y 4.912 en móvil la primera respuesta, 61 nodos con 20 y 1.501 con 500 (3 por fila + 1: el previo
// de 1.600 alcanzó); el tope de los 500 es lo medido más un 5 %: 1.576. La respuesta de la página 25 pesa lo mismo que la 1.ª (la misma consulta de 21 filas): no crece con la profundidad.
const TOPE_DE_BYTES = 5_250
const TOPE_DE_NODOS_CON_20 = 65
const TOPE_DE_NODOS_CON_500 = 1_576

let origen = { id: '', nombre: '' }
let duena = ''
let sinClave = ''
let ana = ''
const vehiculos: Record<'veintidos' | 'quinientas' | 'ninguna' | 'propios', string> = {
  veintidos: '',
  quinientas: '',
  ninguna: '',
  propios: '',
}

function crearVehiculo(titulo: string): string {
  sql(
    `insert into public.vehiculos (origen_id, titulo) values (${literal(origen.id)}::uuid, ${literal(titulo)})`,
  )
  return sql(
    `select id from public.vehiculos where origen_id = ${literal(origen.id)}::uuid and titulo = ${literal(titulo)}`,
  )
}

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarRolesDePrueba()
  ;({ origen, duena } = await prepararGuardado(proyecto, 'vehcotiz'))
  sinClave = correoDePrueba(`sinclave-vehcotiz-${proyecto}`)
  await crearPersona({
    email: sinClave,
    contrasena: CONTRASENA,
    nombre: 'Sin Clave',
    invitada: true,
  })
  // Ve el vehículo («todos» en el origen) y no tiene cotizaciones.ver.
  await darRolDePrueba({
    email: sinClave,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Ficha sin cotizaciones`,
      clave: 'e2e_ficha_sin_cotizaciones',
    },
    permisos: ['vehiculos.ver'],
  })
  ana = correoDePrueba(`ana-vehcotiz-${proyecto}`)
  await crearPersona({ email: ana, contrasena: CONTRASENA, nombre: 'Ana Propios', invitada: true })
  await darRolDePrueba({
    email: ana,
    rol: { nombre: `${PREFIJO_ROL_E2E}Ficha propios`, clave: 'e2e_ficha_propios' },
    permisos: [
      'vehiculos.ver',
      { clave: 'cotizaciones.ver', origenId: origen.id, alcance: 'propios' },
    ],
  })
  const deLaDuena = idDePersona(duena)
  const deAna = idDePersona(ana)
  vehiculos.veintidos = crearVehiculo('Pestaña veintidós')
  vehiculos.quinientas = crearVehiculo('Pestaña quinientas')
  vehiculos.ninguna = crearVehiculo('Pestaña ninguna')
  vehiculos.propios = crearVehiculo('Pestaña propios')
  sembrarCotizaciones({
    origenId: origen.id,
    vehiculoId: vehiculos.veintidos,
    creadoPor: deLaDuena,
    cuantas: 22,
  })
  sembrarCotizaciones({
    origenId: origen.id,
    vehiculoId: vehiculos.quinientas,
    creadoPor: deLaDuena,
    cuantas: 520,
  })
  // Del vehículo compartido: dos de la dueña y una de Ana (la más vieja).
  sembrarCotizaciones({
    origenId: origen.id,
    vehiculoId: vehiculos.propios,
    creadoPor: deLaDuena,
    cuantas: 2,
  })
  sembrarCotizaciones({
    origenId: origen.id,
    vehiculoId: vehiculos.propios,
    creadoPor: deAna,
    cuantas: 1,
    desde: 2,
  })
})

test.afterAll(async () => {
  await limpiarGuardado()
  await borrarRolesDePrueba()
})

const pestanas = (page: Page): Locator => page.getByRole('tab')
const lista = (page: Page): Locator => page.getByRole('list', { name: 'Cotizaciones del vehículo' })
const filas = (page: Page): Locator => lista(page).getByRole('listitem')

// Los pedidos del navegador a `cotizaciones` (la pestaña lee desde el navegador; el servidor no lee cotizaciones para la ficha).
function vigilarLecturas(page: Page): string[] {
  const lecturas: string[] = []
  page.on('request', (pedido) => {
    if (new URL(pedido.url()).pathname === '/rest/v1/cotizaciones') {
      lecturas.push(pedido.url())
    }
  })
  return lecturas
}

test('E2E la dueña: en «Ficha» no se lee nada; al elegir «Cotizaciones» llegan 20 y «Ver más» lleva a 22', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/vehiculos/${vehiculos.veintidos}`)
  await expect(pestanas(page)).toHaveText(['Ficha', 'Fotos', 'Cotizaciones'])
  const lecturas = vigilarLecturas(page)
  await expect(pestanas(page).first()).toHaveAttribute('aria-selected', 'true')
  expect(lecturas).toEqual([])

  const respuesta = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/rest/v1/cotizaciones',
  )
  await pestanas(page).getByText('Cotizaciones').click()
  await expect(page).toHaveURL(/seccion=cotizaciones/)
  const bytes = (await (await respuesta).body()).length
  await expect(filas(page)).toHaveCount(20)
  expect(lecturas).toHaveLength(1)
  const nodos = await lista(page).evaluate((e) => e.querySelectorAll('*').length + 1)
  test.info().annotations.push({
    type: 'medido',
    description: `nodos con 20: ${String(nodos)}, bytes: ${String(bytes)}`,
  })
  expect(nodos).toBeLessThanOrEqual(TOPE_DE_NODOS_CON_20)
  expect(bytes).toBeLessThanOrEqual(TOPE_DE_BYTES)

  const masNueva = sql(
    `select numero from public.cotizaciones where vehiculo_id = ${literal(vehiculos.veintidos)}::uuid order by creado_en desc, id desc limit 1`,
  )
  await expect(filas(page).first()).toContainText(`N.º ${masNueva}`)
  await expect(filas(page).first()).toContainText('Gala Guarda')
  await expect(filas(page).first().getByRole('link')).toHaveAttribute(
    'href',
    /^\/cotizaciones\/[0-9a-f-]{36}$/,
  )
  await page.getByRole('button', { name: 'Ver más' }).click()
  await expect(filas(page)).toHaveCount(22)
  await expect(page.getByRole('button', { name: 'Ver más' })).toHaveCount(0)
  expect(lecturas).toHaveLength(2)
})

test('E2E con 520: «Ver más» llega a 500, dice el tope y «Ver todas en Cotizaciones» lleva al listado', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  const tamanos: number[] = []
  page.on('response', (r) => {
    if (new URL(r.url()).pathname === '/rest/v1/cotizaciones') {
      void r.body().then((cuerpo) => tamanos.push(cuerpo.length))
    }
  })
  await page.goto(`/vehiculos/${vehiculos.quinientas}?seccion=cotizaciones`)
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
  await expect(camino).toHaveAttribute('href', `/cotizaciones?vehiculo=${vehiculos.quinientas}`)
  await camino.click()
  await expect(page).toHaveURL(/\/cotizaciones\?vehiculo=/)
  await expect(page.getByText('Cotizaciones de Pestaña quinientas.')).toBeVisible()
})

test('E2E sin cotizaciones.ver no hay pestaña y ?seccion=cotizaciones abre «Ficha»', async ({
  page,
}) => {
  await entrar(page, sinClave, { fresco: true })
  const lecturas = vigilarLecturas(page)
  await page.goto(`/vehiculos/${vehiculos.propios}?seccion=cotizaciones`)
  await expect(pestanas(page)).toHaveText(['Ficha', 'Fotos'])
  await expect(pestanas(page).first()).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('heading', { name: 'Pestaña propios', level: 1 })).toBeVisible()
  expect(lecturas).toEqual([])
})

test('E2E con «propios» la pestaña está y lista sólo la suya (la RLS decide las filas)', async ({
  page,
}) => {
  await entrar(page, ana, { fresco: true })
  await page.goto(`/vehiculos/${vehiculos.propios}`)
  await expect(pestanas(page)).toHaveText(['Ficha', 'Fotos', 'Cotizaciones'])
  await pestanas(page).getByText('Cotizaciones').click()
  await expect(filas(page)).toHaveCount(1)
  await expect(filas(page).first()).toContainText('Ana Propios')
  await expect(lista(page)).not.toContainText('Gala Guarda')
})

test('E2E un vehículo sin cotizaciones: recargar con la pestaña abierta dice que no hay', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/vehiculos/${vehiculos.ninguna}?seccion=cotizaciones`)
  await expect(pestanas(page).getByText('Cotizaciones')).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('Sin cotizaciones que puedas ver.')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Sin cotizaciones que puedas ver.')).toBeVisible()
})

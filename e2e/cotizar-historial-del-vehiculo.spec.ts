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
import {
  limpiarGuardado,
  prepararGuardado,
  tarjetaGuardada,
  tipearEnLaHoja,
  totalDeLaHoja,
  guardarConElAtajo,
} from './soporte/cotizar-guardar'
import { literal, sql } from './soporte/sql'

// El historial del vehículo elegido y «Cotizado (n)» (paso 4.14-2b, `docs/UX.md` › «Cotizar»): la barra dice cuántas cotizaciones del elegido ve quien mira; el panel
// trae, plegado, su historial, que se lee al desplegarlo, de a 20 con «Ver más». Todo con la RLS de quien mira: una persona con «propios» ve sólo las suyas.
test.describe.configure({ mode: 'serial' })

// Presupuestos (`docs/RENDIMIENTO.md`, panel del vehículo). Previos: una fila de la respuesta ≈ 150 bytes × 21 = 3.150 (4.000 con holgura) y una fila del historial ≈ 8 nodos × 20 = 160, más
// ≈ 20 de estructura y «Ver más» = 180 (200 con holgura). Medido en el 4.14-2b, con 21 filas y en los dos proyectos: 4.972 bytes en escritorio y 4.867 en móvil (≈ 237 por fila: la
// estimación no contó los nombres de las claves JSON ni el correo largo de las cuentas de prueba, ≈ 45 caracteres). La persona decidió (P3) fijar el tope en lo medido más un 5 %:
// 5.250 bytes. Los nodos: 61 medidos (3 por fila: el `<li>`, el texto y la clase), el tope en 65 (lo medido más un 5 %, bajo el previo de 200).
const TOPE_DE_NODOS = 65
const TOPE_DE_BYTES = 5_250

let origen = { id: '', nombre: '' }
let duena = ''
let lead = ''
let ana = ''
const vehiculos: Record<'veintidos' | 'dos' | 'ninguna' | 'propios' | 'guardar', string> = {
  veintidos: '',
  dos: '',
  ninguna: '',
  propios: '',
  guardar: '',
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
  ;({ origen, duena, lead } = await prepararGuardado(proyecto, 'histveh'))
  ana = correoDePrueba(`ana-histveh-${proyecto}`)
  await crearPersona({ email: ana, contrasena: CONTRASENA, nombre: 'Ana Propios', invitada: true })
  await darRolDePrueba({
    email: ana,
    rol: { nombre: `${PREFIJO_ROL_E2E}Historial propios`, clave: 'e2e_historial_propios' },
    permisos: [
      'vehiculos.ver',
      'cotizaciones.crear',
      { clave: 'cotizaciones.ver', origenId: origen.id, alcance: 'propios' },
    ],
  })
  const deLaDuena = idDePersona(duena)
  const deAna = idDePersona(ana)
  vehiculos.veintidos = crearVehiculo('Historial veintidós')
  vehiculos.dos = crearVehiculo('Historial dos')
  vehiculos.ninguna = crearVehiculo('Historial ninguna')
  vehiculos.propios = crearVehiculo('Historial propios')
  vehiculos.guardar = crearVehiculo('Historial guardar')
  // 22 del vehículo caliente: la más nueva es una final y las otras 21, preventas.
  sembrarCotizaciones({
    origenId: origen.id,
    vehiculoId: vehiculos.veintidos,
    creadoPor: deLaDuena,
    cuantas: 1,
    clase: 'final',
  })
  sembrarCotizaciones({
    origenId: origen.id,
    vehiculoId: vehiculos.veintidos,
    creadoPor: deLaDuena,
    cuantas: 21,
    desde: 1,
  })
  sembrarCotizaciones({
    origenId: origen.id,
    vehiculoId: vehiculos.dos,
    creadoPor: deLaDuena,
    cuantas: 2,
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

const barra = (page: Page): Locator => page.getByRole('button', { name: /^Vehículo:/ })
const panel = (page: Page): Locator => page.getByRole('dialog', { name: 'Vehículo' })
const historial = (page: Page): Locator =>
  panel(page).getByRole('button', { name: /^Historial de cotizaciones/ })
const filas = (page: Page): Locator =>
  panel(page).getByRole('list', { name: 'Historial de cotizaciones' }).getByRole('listitem')

async function irALaHoja(page: Page, vehiculo: string): Promise<void> {
  await page.goto(`/cotizaciones/nuevo?origen=${origen.id}&lead=${lead}&vehiculo=${vehiculo}`)
  await expect(page.locator('[data-hoja]')).toBeVisible()
}

async function abrirLaHoja(page: Page, correo: string, vehiculo: string): Promise<void> {
  await entrar(page, correo, { fresco: true })
  await irALaHoja(page, vehiculo)
}

// Los pedidos del navegador a `cotizaciones` (la lectura del historial; el servidor lee el conteo por su lado).
function vigilarLecturas(page: Page): string[] {
  const lecturas: string[] = []
  page.on('request', (pedido) => {
    if (new URL(pedido.url()).pathname === '/rest/v1/cotizaciones') {
      lecturas.push(pedido.url())
    }
  })
  return lecturas
}

test('E2E la barra dice «Cotizado (20+)» con 22, «Cotizado (2)» con 2 y nada sin cotizaciones', async ({
  page,
}) => {
  await abrirLaHoja(page, duena, vehiculos.veintidos)
  await expect(barra(page)).toContainText('Cotizado (20+)')
  await irALaHoja(page, vehiculos.dos)
  await expect(barra(page)).toContainText('Cotizado (2)')
  await irALaHoja(page, vehiculos.ninguna)
  await expect(barra(page)).toContainText('Historial ninguna')
  await expect(barra(page)).not.toContainText('Cotizado')
})

test('E2E el panel abre con el historial plegado y sin leerlo; al desplegar, 20 y «Ver más» lleva a 22', async ({
  page,
}) => {
  await abrirLaHoja(page, duena, vehiculos.veintidos)
  const lecturas = vigilarLecturas(page)
  await barra(page).click()
  await expect(panel(page).getByRole('region', { name: 'Elegido' })).toContainText(
    'Historial veintidós',
  )
  await expect(historial(page)).toHaveAccessibleName('Historial de cotizaciones (20+)')
  await expect(historial(page)).toHaveAttribute('aria-expanded', 'false')
  await expect(panel(page).getByRole('list', { name: 'Vehículos' })).toBeVisible()
  expect(lecturas).toEqual([])

  await historial(page).click()
  await expect(historial(page)).toHaveAttribute('aria-expanded', 'true')
  await expect(filas(page)).toHaveCount(20)
  expect(lecturas).toHaveLength(1)
  const masNueva = sql(
    `select numero || '|' || clase from public.cotizaciones where vehiculo_id = ${literal(vehiculos.veintidos)}::uuid order by creado_en desc, id desc limit 1`,
  ).split('|')
  await expect(filas(page).first()).toContainText(`N.º ${masNueva[0] ?? ''}`)
  await expect(filas(page).first()).toContainText('Gala Guarda')
  await expect(filas(page).first()).toContainText('Final')
  await expect(filas(page).nth(1)).toContainText('Preventa')
  await panel(page).getByRole('button', { name: 'Ver más' }).click()
  await expect(filas(page)).toHaveCount(22)
  await expect(panel(page).getByRole('button', { name: 'Ver más' })).toHaveCount(0)
  expect(lecturas).toHaveLength(2)
})

test('E2E una persona con «propios» ve «Cotizado (1)» y sólo la suya (P2)', async ({ page }) => {
  await abrirLaHoja(page, ana, vehiculos.propios)
  await expect(barra(page)).toContainText('Cotizado (1)')
  await barra(page).click()
  await historial(page).click()
  await expect(filas(page)).toHaveCount(1)
  await expect(filas(page).first()).toContainText('Ana Propios')
  await expect(panel(page)).not.toContainText('Gala Guarda')
})

test('E2E el historial desplegado cabe en su presupuesto de bytes y de nodos', async ({ page }) => {
  await abrirLaHoja(page, duena, vehiculos.veintidos)
  await barra(page).click()
  const respuesta = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/rest/v1/cotizaciones',
  )
  await historial(page).click()
  const bytes = (await (await respuesta).body()).length
  await expect(filas(page)).toHaveCount(20)
  const nodos = await panel(page)
    .getByRole('list', { name: 'Historial de cotizaciones' })
    .evaluate((e) => e.querySelectorAll('*').length + 1)
  test.info().annotations.push({
    type: 'medido',
    description: `nodos ${String(nodos)}, bytes ${String(bytes)}`,
  })
  expect(nodos).toBeLessThanOrEqual(TOPE_DE_NODOS)
  expect(bytes).toBeLessThanOrEqual(TOPE_DE_BYTES)
})

test('E2E guardar la primera cotización de un vehículo y abrir el panel sin recargar: el historial la muestra', async ({
  page,
}) => {
  await abrirLaHoja(page, duena, vehiculos.guardar)
  await expect(barra(page)).not.toContainText('Cotizado')
  await tipearEnLaHoja(page, 'pub', '100')
  await expect(totalDeLaHoja(page)).toContainText('105,00')
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toBeVisible()
  // La etiqueta puede seguir vieja (guardar no vuelve a pedir la página): lo que no puede es esconder lo guardado.
  await barra(page).click()
  await expect(historial(page)).toBeVisible()
  await historial(page).click()
  await expect(filas(page)).toHaveCount(1)
  await expect(filas(page).first()).toContainText('Gala Guarda')
  await expect(filas(page).first()).toContainText('Preventa')
})

import { expect, test, type Locator, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { celdaDeLaHoja, tipearEnLaHoja } from './soporte/cotizar-guardar'
import { crearAsesoraDeLaSemilla } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'
import { cargarVehiculos, vehiculoPorTitulo } from './soporte/vehiculos'

// El tipo de vehículo en el panel (paso 4.14-2c3, `docs/UX.md` › «Cotizar»): con un vehículo elegido, «Elegido» ofrece el dato del vehículo que casa con la tabla de
// transporte de `subasta_usa`, entre sus filas y tal cual salen de ella (P1), con el del vehículo marcado. Un toque lo guarda en el vehículo, cierra el panel y la hoja
// recalcula (P4); quien no puede editar el vehículo lo ve sin elegir. Mientras el vehículo no lo tenga, la celda dice dónde se elige.
test.describe.configure({ mode: 'serial' })

const CLAVES = [
  'autos',
  'vagonetas_medianas',
  'vagonetas_grandes',
  'camionetas_medianas',
  'camionetas_grandes',
  'utv',
  'atv',
  'motos',
]
const ELIGE = 'Elige el dato del vehículo en «Vehículo», arriba de la hoja, o escribe el valor.'
const RECUPERAMOS = 'Recuperamos lo que habías escrito y no guardaste.'

let duena = ''
let asesora = ''
let subasta = ''
const titulos: string[] = []

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-tipo-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dora Tipos' })
  ;({ email: asesora } = await crearAsesoraDeLaSemilla(`tipo-${proyecto}`))
  subasta = sql("select id from public.origenes where clave = 'subasta_usa'")
})

test.afterAll(async () => {
  if (titulos.length > 0) {
    sql(
      `delete from public.vehiculos where titulo in (${titulos.map((t) => literal(t)).join(', ')})`,
    )
  }
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

// Un vehículo de `subasta_usa` con ese tipo (y otro atributo, que elegir no toca), cargado por SQL: nadie de la prueba lo creó.
async function vehiculoCon(info: { project: { name: string } }, nombre: string, tipo: string) {
  const titulo = `E2E tipo ${nombre} ${info.project.name}`
  titulos.push(titulo)
  await cargarVehiculos(subasta, [
    { titulo, anio: 2021, atributos: { tipo_vehiculo: tipo, color: 'Rojo' } },
  ])
  const id = (await vehiculoPorTitulo(titulo))?.id ?? ''
  expect(id, titulo).not.toBe('')
  return id
}

const fila = (id: string, columnas: string) =>
  sql(`select ${columnas} from public.vehiculos where id = ${literal(id)}::uuid`)
const loDemas = (id: string) =>
  fila(
    id,
    "(atributos - 'tipo_vehiculo')::text || '|' || titulo || '|' || coalesce(anio::text, '') || '|' || coalesce(lote, '')",
  )

const barra = (page: Page): Locator => page.getByRole('button', { name: /^Vehículo:/ })
const panel = (page: Page): Locator => page.getByRole('dialog', { name: 'Vehículo' })
const grupo = (page: Page): Locator =>
  panel(page)
    .getByRole('region', { name: 'Elegido' })
    .getByRole('group', { name: 'Tipo de vehículo' })
const transporte = (page: Page): Locator => celdaDeLaHoja(page, 'transporte_bolivia')

async function abrir(page: Page, quien: string, vehiculo: string): Promise<void> {
  await entrar(page, quien, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${subasta}&vehiculo=${vehiculo}`)
  await expect(page.locator('[data-hoja]')).toBeVisible()
}
async function abrirElPanel(page: Page): Promise<void> {
  await barra(page).click()
  await expect(grupo(page).getByRole('button').first()).toBeVisible()
}

test('E1: un tipo que no está en la tabla se elige entre sus filas y se guarda en el vehículo, sin tocar lo demás', async ({
  page,
}, info) => {
  const id = await vehiculoCon(info, 'raro', 'AUTOMOBILE')
  const antes = loDemas(id)
  await abrir(page, duena, id)
  await expect(transporte(page)).toContainText(ELIGE)

  await abrirElPanel(page)
  await expect(grupo(page).getByRole('button')).toHaveText(CLAVES)
  await expect(grupo(page).locator('[aria-pressed="true"]')).toHaveCount(0)
  await expect(
    grupo(page).getByText('El vehículo dice «AUTOMOBILE», que no está en la tabla: elige uno.'),
  ).toBeVisible()

  await grupo(page).getByRole('button', { name: 'autos', exact: true }).click()
  await expect(panel(page)).toBeHidden()
  await expect(barra(page)).toBeFocused()
  await expect(page).toHaveURL(
    (url) => url.searchParams.get('vehiculo') === id && !url.searchParams.has('panel'),
  )
  await expect.poll(() => fila(id, "atributos->>'tipo_vehiculo'")).toBe('autos')
  expect(loDemas(id)).toBe(antes)
  await expect(transporte(page)).not.toContainText(ELIGE)
  await expect(transporte(page)).toContainText(/\d/)
  // Sin nada tipeado, ningún aviso del borrador.
  await expect(page.getByText(RECUPERAMOS)).toHaveCount(0)

  await abrirElPanel(page)
  await expect(grupo(page).getByRole('button', { name: 'autos', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('E2: el tipo del vehículo va marcado y abrir el panel no guarda nada', async ({
  page,
}, info) => {
  const id = await vehiculoCon(info, 'moto', 'motos')
  const version = fila(id, 'actualizado_en::text')
  await abrir(page, duena, id)
  await abrirElPanel(page)
  await expect(grupo(page).getByRole('button', { name: 'motos', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(grupo(page).locator('[aria-pressed="true"]')).toHaveCount(1)
  expect(fila(id, 'actualizado_en::text')).toBe(version)
})

test('E3: quien no puede editar el vehículo ve su tipo sin elegir', async ({ page }, info) => {
  const id = await vehiculoCon(info, 'ajeno', 'AUTOMOBILE')
  await abrir(page, asesora, id)
  await barra(page).click()
  await expect(
    grupo(page).getByText('Tipo de vehículo: AUTOMOBILE (no está en la tabla)'),
  ).toBeVisible()
  await expect(grupo(page).getByText('Lo elige quien puede editar este vehículo.')).toBeVisible()
  await expect(grupo(page).getByRole('button')).toHaveCount(0)
  // La celda no manda a elegir a quien no puede.
  await expect(transporte(page)).not.toContainText(ELIGE)
})

test('E4: si otra persona cambió el vehículo entre abrir y elegir, avisa con «Recargar» y no pisa nada', async ({
  page,
}, info) => {
  const id = await vehiculoCon(info, 'conflicto', 'AUTOMOBILE')
  await abrir(page, duena, id)
  await abrirElPanel(page)
  sql(
    `update public.vehiculos set atributos = atributos || '{"color":"Azul"}'::jsonb where id = ${literal(id)}::uuid`,
  )
  await grupo(page).getByRole('button', { name: 'autos', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Recargar' })).toBeVisible()
  await expect(panel(page)).toBeVisible()
  expect(fila(id, "atributos->>'tipo_vehiculo'")).toBe('AUTOMOBILE')
})

test('E5: lo tipeado en la hoja sigue después de elegir el tipo, con el aviso del borrador a lo sumo una vez', async ({
  page,
}, info) => {
  const id = await vehiculoCon(info, 'tipeado', 'AUTOMOBILE')
  await abrir(page, duena, id)
  await tipearEnLaHoja(page, 'remate', '9500')
  await abrirElPanel(page)
  await grupo(page).getByRole('button', { name: 'autos', exact: true }).click()
  await expect(panel(page)).toBeHidden()
  await expect(transporte(page)).not.toContainText(ELIGE)
  await expect(celdaDeLaHoja(page, 'remate')).toContainText('9.500')
  expect(await page.getByText(RECUPERAMOS).count()).toBeLessThanOrEqual(1)
})

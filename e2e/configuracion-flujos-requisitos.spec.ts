// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { masAccionesDe, menuDe } from './soporte/lista-de-catalogo'
import {
  PREFIJO_DE_REQUISITO_E2E,
  abrirInspector,
  borrarRequisitosDePrueba,
  descripcionesDeLaLista,
  faseSinRequisitos,
  requisitosEnLaBase,
} from './soporte/requisitos'

// Configuración › Flujos › inspector de una fase › «Requisitos para entrar» (5.08-1, `docs/UX.md` › «Flujos: requisitos para entrar (estados propios)»): la
// dueña agrega un dato (con y sin porcentaje), lo ve «Informativo», sube uno y quita otro desde la URL; quien sólo configura el flujo también puede. Un solo
// recorrido del camino feliz: la base ya tiene sus pruebas de cada regla (`supabase/tests/areas/flujos/requisitos.sql`).
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let duena = ''
let configuradora = ''
let fase = { id: '', nombre: '' }
const notas = (resto: string) => `${PREFIJO_DE_REQUISITO_E2E} ${resto} ${proyecto}`

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarRequisitosDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  fase = faseSinRequisitos()
  duena = correoDePrueba(`duena-requisitos-${proyecto}`)
  configuradora = correoDePrueba(`configuradora-requisitos-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Rita Requisitos' })
  await crearPersona({
    email: configuradora,
    contrasena: CONTRASENA,
    nombre: 'Flor Flujos',
    invitada: true,
  })
  await darRolDePrueba({
    email: configuradora,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Requisitos ${proyecto}`,
      clave: `e2e_requisitos_${proyecto}`,
    },
    permisos: ['flujos.configurar'],
  })
})

test.afterAll(async () => {
  borrarRequisitosDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('la dueña agrega dos datos, sube uno y quita el otro', async ({ page }) => {
  const antes = requisitosEnLaBase(fase.id)
  await entrar(page, duena, { fresco: true })
  const inspector = await abrirInspector(page, fase.id)
  const formulario = inspector.getByRole('form', { name: 'Agregar requisito de dato' })

  // Un dato simple: nace informativo, al final de la fase.
  await inspector.getByRole('button', { name: 'Agregar requisito' }).click()
  await expect(page).toHaveURL(/agregar=dato/)
  await formulario.getByLabel('Dato que se pide').selectOption('vehiculo.vin')
  await formulario.getByLabel('Notas (opcional)').fill(notas('VIN'))
  await formulario.getByRole('button', { name: 'Agregar requisito' }).click()
  await expect(formulario).toBeHidden()
  await expect(inspector.getByText('VIN del vehículo', { exact: true })).toBeVisible()
  expect(requisitosEnLaBase(fase.id)).toEqual([...antes, 'vehiculo.vin:false:'])

  // Con porcentaje: sin él, el motivo va junto al campo y no se llama a la base.
  await inspector.getByRole('button', { name: 'Agregar requisito' }).click()
  await formulario.getByLabel('Dato que se pide').selectOption('pagos.umbral_pct')
  await formulario.getByLabel('Notas (opcional)').fill(notas('pagos'))
  await formulario.getByRole('button', { name: 'Agregar requisito' }).click()
  await expect(formulario.getByText('Escribe el porcentaje, de 1 a 100.')).toBeVisible()
  expect(requisitosEnLaBase(fase.id)).toHaveLength(antes.length + 1)
  await formulario.getByLabel('Porcentaje del precio').fill('50')
  await formulario.getByRole('button', { name: 'Agregar requisito' }).click()
  await expect(formulario).toBeHidden()
  const pagos = 'Pagos confirmados: 50 % del precio'
  await expect(inspector.getByText(pagos, { exact: true })).toBeVisible()
  expect(requisitosEnLaBase(fase.id)).toEqual([
    ...antes,
    'vehiculo.vin:false:',
    'pagos.umbral_pct:false:50',
  ])
  await expect(inspector.getByText('Informativo')).toHaveCount(
    antes.length === 0 ? 2 : 2 + antes.length,
  )

  // Subir: con el teclado; el de pagos pasa antes que el VIN.
  const subir = inspector.getByRole('button', { name: `Subir ${pagos}`, exact: true })
  await subir.focus()
  await page.keyboard.press('Enter')
  await expect
    .poll(() => requisitosEnLaBase(fase.id))
    .toEqual([...antes, 'pagos.umbral_pct:false:50', 'vehiculo.vin:false:'])
  const vistos = await descripcionesDeLaLista(inspector)
  expect(vistos.slice(-2)).toEqual([pagos, 'VIN del vehículo'])

  // Quitar: lo pide el «⋯», confirma el diálogo (en la URL) y el requisito se va.
  await masAccionesDe(page, 'VIN del vehículo').click()
  await menuDe(page, 'VIN del vehículo').getByRole('menuitem', { name: 'Quitar' }).click()
  const confirmar = page.getByRole('dialog', { name: 'Quitar el requisito «VIN del vehículo»' })
  await expect(confirmar).toBeVisible()
  await expect(page).toHaveURL(/eliminar=requisito&quitar=/)
  await confirmar.getByRole('button', { name: 'Quitar requisito' }).click()
  await expect(confirmar).toBeHidden()
  await expect(inspector.getByText('VIN del vehículo', { exact: true })).toBeHidden()
  expect(requisitosEnLaBase(fase.id)).toEqual([...antes, 'pagos.umbral_pct:false:50'])
})

test('quien sólo configura el flujo también agrega un requisito', async ({ page }) => {
  const antes = requisitosEnLaBase(fase.id)
  await entrar(page, configuradora, { fresco: true })
  const inspector = await abrirInspector(page, fase.id)
  await inspector.getByRole('button', { name: 'Agregar requisito' }).click()
  const formulario = inspector.getByRole('form', { name: 'Agregar requisito de dato' })
  await formulario.getByLabel('Dato que se pide').selectOption('transporte.naviera')
  await formulario.getByLabel('Notas (opcional)').fill(notas('naviera'))
  await formulario.getByRole('button', { name: 'Agregar requisito' }).click()
  await expect(formulario).toBeHidden()
  await expect(inspector.getByText('Naviera', { exact: true })).toBeVisible()
  expect(requisitosEnLaBase(fase.id)).toEqual([...antes, 'transporte.naviera:false:'])
})

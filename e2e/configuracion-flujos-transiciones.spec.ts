// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarOrigenes, crearOrigenDePrueba } from './soporte/origenes'
import { sql } from './soporte/sql'

// Configuración › Flujos › inspector de una fase › «Salidas y quién mueve» (5.06-1, `docs/UX.md` › «Flujos: salidas y quién mueve (estados propios)»): la dueña
// agrega dos salidas con acción y nota, ve sus chips en la fila de la lista, recarga y siguen, y quita una pidiendo confirmar. Un solo recorrido del camino feliz:
// la base ya tiene sus pruebas de cada regla (`supabase/tests/areas/flujos/transiciones.sql`). Las fases se siembran por SQL: no depende de «Nueva fase» (5.04).
test.describe.configure({ mode: 'serial' })

const P = 'E2E 5.06'
const COMPRA = `${P} Compra`
const PUERTO = `${P} Puerto`
const EMBARQUE = `${P} Embarque`
const ENTREGA = `${P} Entrega`

let duena = ''
let origen = { id: '', nombre: '' }
let compra = ''

function sembrarFases(): string {
  const flujo = sql(`select id from public.flujos where origen_id = '${origen.id}'`)
  const fases = [
    [COMPRA, 10, true, false],
    [PUERTO, 20, false, false],
    [EMBARQUE, 30, false, false],
    [ENTREGA, 40, false, true],
  ] as const
  for (const [nombre, orden, inicial, final] of fases) {
    sql(
      `insert into public.fases (flujo_id, nombre, orden, es_inicial, es_final)
       values ('${flujo}', '${nombre}', ${String(orden)}, ${String(inicial)}, ${String(final)})`,
    )
  }
  return sql(`select id from public.fases where flujo_id = '${flujo}' and nombre = '${COMPRA}'`)
}

// Las salidas de «Compra» en la base: «acción|nota» por destino, en orden.
function salidasEnLaBase(): string {
  return sql(
    `select string_agg(coalesce(t.accion, '-') || '|' || t.nota_obligatoria, ',' order by f.orden)
       from public.fases_transiciones t join public.fases f on f.id = t.a_fase_id
      where t.de_fase_id = '${compra}'`,
  )
}

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await borrarOrigenes([])
  origen = await crearOrigenDePrueba(`${P} Origen`, 'e2e_flujo_de_salidas')
  compra = sembrarFases()
  duena = correoDePrueba(`duena-salidas-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Silvia Salidas' })
})

test.afterAll(async () => {
  await borrarOrigenes([])
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('la dueña agrega dos salidas, ve sus chips, recarga y quita una', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/configuracion/flujos?origen=${origen.id}&fase=${compra}`)
  const inspector = page.getByRole('dialog').filter({ hasText: 'Salidas y quién mueve' })
  await expect(inspector).toBeVisible()
  await expect(inspector.getByText('Esta fase no tiene salidas')).toBeVisible()
  await expect(inspector.getByText('Cualquiera con el permiso de mover')).toBeVisible()

  // La primera, con nota obligatoria.
  const formulario = inspector.getByRole('form', { name: 'Agregar salida' })
  await inspector.getByRole('button', { name: 'Agregar salida' }).click()
  await formulario.getByLabel('Fase de destino').selectOption({ label: PUERTO })
  await formulario.getByLabel('Acción').fill(`${P} Comprar`)
  await formulario.getByRole('switch', { name: 'Pide nota al mover' }).click()
  await formulario.getByRole('button', { name: 'Agregar salida' }).click()
  await expect(formulario).toBeHidden()
  await expect(inspector.getByText(`${P} Comprar → ${PUERTO}`)).toBeVisible()

  // La segunda, sin nota; ya no ofrece el destino de la primera.
  await inspector.getByRole('button', { name: 'Agregar salida' }).click()
  const destinos = formulario.getByLabel('Fase de destino').locator('option')
  await expect(destinos).toHaveText(['Elige una fase', EMBARQUE, ENTREGA])
  await formulario.getByLabel('Fase de destino').selectOption({ label: EMBARQUE })
  await formulario.getByLabel('Acción').fill('Embarcar')
  await formulario.getByRole('button', { name: 'Agregar salida' }).click()
  await expect(formulario).toBeHidden()
  await expect(inspector.getByText(`Embarcar → ${EMBARQUE}`)).toBeVisible()
  expect(salidasEnLaBase()).toBe(`${P} Comprar|true,Embarcar|false`)

  // La fila de la lista muestra los chips.
  await page.keyboard.press('Escape')
  await expect(inspector).toBeHidden()
  const chips = page.getByRole('list', { name: 'Salidas', exact: true }).first()
  await expect(chips.getByRole('listitem')).toHaveText([
    `→ ${PUERTO} · ${P} Comprar`,
    `→ ${EMBARQUE} · Embarcar`,
  ])

  // Recargar: siguen.
  await page.goto(`/configuracion/flujos?origen=${origen.id}&fase=${compra}`)
  await expect(inspector).toBeVisible()
  await expect(inspector.getByText(`${P} Comprar → ${PUERTO}`)).toBeVisible()
  await expect(inspector.getByText('Pide nota', { exact: true })).toBeVisible()
  await expect(inspector.getByText(`Embarcar → ${EMBARQUE}`)).toBeVisible()

  // Quitar pide confirmar, en la URL; cancelar no quita nada.
  const quitar = inspector.getByRole('button', { name: `Quitar la salida a ${EMBARQUE}` })
  await quitar.click()
  const confirmar = page.getByRole('dialog', {
    name: `Quitar la salida «Embarcar» a «${EMBARQUE}»`,
  })
  await expect(confirmar).toBeVisible()
  await expect(page).toHaveURL(/fase=[^&]+&eliminar=salida&salida=|eliminar=salida&salida=/)
  await confirmar.getByRole('button', { name: 'Cancelar' }).click()
  await expect(confirmar).toBeHidden()
  expect(salidasEnLaBase()).toBe(`${P} Comprar|true,Embarcar|false`)

  await quitar.click()
  await expect(confirmar).toBeVisible()
  await confirmar.getByRole('button', { name: 'Quitar salida' }).click()
  await expect(confirmar).toBeHidden()
  await expect(inspector.getByText(`Embarcar → ${EMBARQUE}`)).toBeHidden()
  await expect(inspector.getByText(`${P} Comprar → ${PUERTO}`)).toBeVisible()
  expect(salidasEnLaBase()).toBe(`${P} Comprar|true`)
})

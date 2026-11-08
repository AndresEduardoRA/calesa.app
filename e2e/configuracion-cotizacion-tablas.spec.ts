// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import { publicarConTablaViva } from './soporte/cotizar-guardada'
import { literal, sql } from './soporte/sql'

// La pestaña «Tablas» de Configuración › Cotización (4.23-3, `docs/UX.md` › «Cotización: tablas (estados propios)»): quien configura un origen abre una tabla de
// referencia, edita una celda con el locale de la empresa, suma una fila, la mueve y publica con nota. La base reemplaza las filas, sube la versión de la tabla y publica
// la versión siguiente de la fórmula que la usa con esas filas. El PT409 y el 22023 los prueban `supabase/tests/areas/tablas/` y los tests de la action.

let origen = { id: '', nombre: '' }
let duena = ''

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-tablas-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Tita Tablas' })
  origen = await crearOrigenDeCotizar(proyecto, 'vtablas', false)
  // `ch_tabla` viva del origen (Año y Factor): 2018 → 11, 2019 → 22, 2020 → 33; la fórmula publicada la lee.
  publicarConTablaViva(origen.id, 22)
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
})

const deLaTabla = (columna: string) =>
  sql(`
    select ${columna} from public.tablas_referencia
     where origen_id = ${literal(origen.id)}::uuid and clave = 'ch_tabla'`)

test('E2E escritorio · camino feliz: editar, sumar, mover y publicar una tabla de referencia', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/cotizacion')
  await page.getByRole('tab', { name: 'Tablas' }).click()
  await expect(page.getByRole('heading', { name: 'Tablas de referencia', level: 2 })).toBeVisible()
  await page.getByLabel('Origen').selectOption(origen.id)
  const lista = page.getByRole('list', { name: `Tablas de referencia de ${origen.nombre}` })
  await lista.getByRole('link', { name: 'Factores vivos' }).click()

  const editor = page.getByRole('region', { name: 'Editar Factores vivos' })
  await expect(editor.getByRole('heading', { name: 'Editar Factores vivos' })).toBeVisible()
  await expect(editor.getByText('Sin cambios que publicar.')).toBeVisible()
  await expect(editor.getByRole('button', { name: 'Publicar' })).toBeDisabled()

  // «9.200,5» en es-BO es 9200,5 (dinero: sólo `leerNumeroTipeado`).
  await editor.getByLabel('Factor, fila 2').fill('9.200,5')
  await editor.getByLabel('Factor, fila 2').press('Tab')
  await expect(editor.getByLabel('Factor, fila 2')).toHaveValue('9200,5')

  await editor.getByRole('button', { name: 'Más acciones de la fila 3' }).click()
  await page.getByRole('menuitem', { name: 'Sumar una fila debajo' }).click()
  await expect(editor.getByLabel('Año, fila 4')).toBeFocused()
  await editor.getByLabel('Año, fila 4').fill('2022')
  await editor.getByLabel('Factor, fila 4').fill('9195,5')
  await editor.getByLabel('Factor, fila 4').press('Enter')
  await editor.getByRole('button', { name: 'Subir la fila 4' }).click()
  await expect(editor.getByLabel('Año, fila 3')).toHaveValue('2022')
  await expect(editor.getByRole('status').getByText('La fila quedó en el lugar 3.')).toBeAttached()
  await expect(editor.getByText(/^Cambios sin publicar/)).toBeVisible()

  await editor.getByRole('button', { name: 'Publicar' }).click()
  const modal = page.getByRole('dialog', { name: 'Publicar Factores vivos' })
  await modal.getByLabel('Nota').fill('E2E 4.23-3')
  await modal.getByRole('button', { name: 'Publicar' }).click()
  await expect(
    page.getByText(
      'Publicaste la versión 2 de «Factores vivos». Las fórmulas que la usan pasaron a su versión siguiente.',
    ),
  ).toBeVisible()
  await expect(modal).toBeHidden()
  await expect(editor.getByText(/^Versión 2 · Tita Tablas/)).toBeVisible()
  await expect(editor.getByText('Sin cambios que publicar.')).toBeVisible()

  // La base: la tabla en su versión 2 con las filas en el orden nuevo y los números como números, y la fórmula del origen en su versión siguiente con esas filas.
  const esperadas = [
    { anio: 2018, factor: 11 },
    { anio: 2019, factor: 9200.5 },
    { anio: 2022, factor: 9195.5 },
    { anio: 2020, factor: 33 },
  ]
  expect(deLaTabla('version')).toBe('2')
  const filas = sql(`
    select coalesce(jsonb_agg(f.valores order by f.orden), '[]')::text
      from public.tablas_referencia_filas f join public.tablas_referencia t on t.id = f.tabla_id
     where t.origen_id = ${literal(origen.id)}::uuid and t.clave = 'ch_tabla'`)
  expect(JSON.parse(filas)).toEqual(esperadas)
  const formula = sql(`
    select f.version || '|' || (f.params -> 'tablas' -> 'ch_tabla')::text
      from public.formulas f
     where f.origen_id = ${literal(origen.id)}::uuid and f.estado = 'publicada'`)
  const [version, congelada] = formula.split('|')
  expect(version).toBe('2')
  expect(JSON.parse(congelada ?? 'null')).toEqual(esperadas)
})

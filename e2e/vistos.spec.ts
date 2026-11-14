import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/inventario'
import { sql, literal } from './soporte/sql'
import {
  OTRO,
  TITULO,
  abrirConUnClic,
  alInventario,
  limpiarResumen,
  prepararResumen,
  resumenDe,
  type TerrenoDelResumen,
} from './soporte/vehiculos-resumen'

// «Visto» y «último visto» por persona y módulo (A3a, `docs/TANDA.md`): abrir el resumen de un vehículo lo marca en la lista de Vehículos, se
// recuerda al volver, y «Vistos» apagado en `/perfil` no marca nada.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelResumen

test.beforeAll(async ({}, info) => {
  t = await prepararResumen(`${info.project.name}_vistos`)
})

test.afterAll(async () => {
  sql(`delete from public.vistos where referencia_id = ${literal(t.id)}::uuid`)
  await limpiarResumen(t.id)
})

const filaDe = (page: Parameters<typeof alInventario>[0], titulo: string) =>
  page.locator('tbody tr, li article').filter({ hasText: titulo })

test('E2E abrir un vehículo lo marca como el último visto, y se recuerda al volver', async ({
  page,
}) => {
  await entrar(page, t.lector)
  await alInventario(page, t.terreno.corea.id)
  await expect(filaDe(page, TITULO).getByText('Último visto')).toHaveCount(0)
  await abrirConUnClic(page, TITULO)
  await page.keyboard.press('Escape')
  await expect(resumenDe(page, TITULO)).toHaveCount(0)
  await expect(filaDe(page, TITULO).first()).toHaveAttribute('data-visto', 'ultimo')
  await expect(filaDe(page, TITULO).getByText('Último visto')).toBeVisible()
  await expect(filaDe(page, OTRO).first()).not.toHaveAttribute('data-visto', /.+/)
  // Se registró en la base: al recargar, la trae.
  await expect
    .poll(() =>
      sql(
        `select count(*) from public.vistos where referencia_id = ${literal(t.id)}::uuid and modulo = 'vehiculos'`,
      ),
    )
    .toBe('1')
  await page.reload()
  await expect(filaDe(page, TITULO).getByText('Último visto')).toBeVisible()
})

test('E2E con «Vistos» apagado en el perfil la lista no marca nada', async ({ page }) => {
  await entrar(page, t.lector)
  await page.goto('/perfil')
  const bloque = page.getByRole('group', { name: 'Marcar lo que abrí' })
  await bloque.getByText('No', { exact: true }).click()
  await expect
    .poll(() =>
      sql(
        `select valor ->> 'activado' from public.preferencias_usuario p join auth.users u on u.id = p.usuario_id where u.email = ${literal(t.lector)} and p.clave = 'vistos'`,
      ),
    )
    .toBe('false')
  await alInventario(page, t.terreno.corea.id)
  await expect(filaDe(page, TITULO).getByText('Último visto')).toHaveCount(0)
  await expect(filaDe(page, TITULO).first()).not.toHaveAttribute('data-visto', /.+/)
})

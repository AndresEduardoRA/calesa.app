import { expect, test } from './soporte/prueba'
import { desmontarSubasta, prepararSubasta, type EstadoDeApibara } from './soporte/apibara'
import { admin } from './soporte/base'
import { aLaVista, entrar, esMovil, irAlOrigen } from './soporte/inventario'
import { capturar } from './soporte/recorrido'

// La vista del inventario (B2): en un origen de subasta la columna «Precio» es «Puja actual» (con «final» si la subasta terminó o se
// vendió, y «—» sin puja); en escritorio, «Tabla | Tarjetas» cambia la vista sin pedir otra página, la deja en la URL y la recuerda
// por persona. En el celular siempre van las tarjetas y el conmutador no está. Sin llamadas a apibara.
test.describe.configure({ mode: 'serial' })

const T = { viva: 'Puja Viva', vendida: 'Puja Vendida', sinPuja: 'Puja Sin Puja' }

let duena = ''
let subasta = { id: '', nombre: '' }
let apibaraAntes: EstadoDeApibara

test.beforeAll(async ({}, info) => {
  ;({ duena, subasta, apibaraAntes } = await prepararSubasta(info.project.name))
  // El origen de subasta nace con el campo de la puja (`puja_actual`, el de `pricing.current_bid_usd`).
  const filas = [
    { titulo: T.viva, estado_subasta: 'abierta', atributos: { puja_actual: 4250 } },
    { titulo: T.vendida, estado_subasta: 'vendida', atributos: { puja_actual: 6100 } },
    { titulo: T.sinPuja, precio: 9000, atributos: {} },
  ]
  for (const fila of filas) {
    const { error } = await admin()
      .from('vehiculos')
      .insert({ origen_id: subasta.id, ...fila })
    if (error) throw new Error(`No se pudo cargar ${fila.titulo}: ${error.message}`)
  }
})

test.afterAll(async () => {
  await desmontarSubasta(apibaraAntes)
})

async function vistaGuardada(): Promise<unknown> {
  const { data: persona } = await admin()
    .from('perfiles')
    .select('id')
    .eq('email', duena)
    .single<{ id: string }>()
  const { data } = await admin()
    .from('preferencias_usuario')
    .select('valor')
    .eq('usuario_id', persona?.id ?? '')
    .eq('clave', 'vehiculos.vista')
    .maybeSingle<{ valor: unknown }>()
  return data?.valor ?? null
}

test('la columna de la puja en la tabla, y el conmutador que recuerda las tarjetas', async ({
  page,
}, info) => {
  test.skip(esMovil(page), 'en el celular no hay tabla ni conmutador: lo mira la prueba de abajo')
  await entrar(page, duena)
  await irAlOrigen(page, subasta)

  const encabezado = page.getByRole('columnheader', { name: /Puja actual/ })
  await expect(encabezado).toBeVisible()
  await expect(encabezado.locator('[title]')).toHaveAttribute(
    'title',
    'Es la puja de la subasta, no el precio del vehículo',
  )
  const fila = (titulo: string) => aLaVista(page.getByRole('row').filter({ hasText: titulo }))
  await expect(fila(T.viva)).toContainText(/4[.,]250/)
  await expect(fila(T.viva)).not.toContainText('final')
  await expect(fila(T.vendida)).toContainText(/6[.,]100/)
  await expect(fila(T.vendida)).toContainText('final')
  // Sin puja no se pone el precio en su lugar.
  await expect(fila(T.sinPuja)).not.toContainText(/9[.,]000/)
  await capturar(page, info, 'tabla-con-la-puja')

  const grupo = page.getByRole('group', { name: 'Cómo ver la lista' })
  await expect(grupo.getByRole('button', { name: 'Tabla' })).toHaveAttribute('aria-pressed', 'true')
  await grupo.getByRole('button', { name: 'Tarjetas' }).click()
  await expect(page).toHaveURL(/[?&]vista=tarjetas/)
  await expect(aLaVista(page.getByRole('table'))).toHaveCount(0)
  const tarjeta = (titulo: string) =>
    aLaVista(page.getByRole('listitem').filter({ hasText: titulo }))
  await expect(tarjeta(T.viva)).toContainText('Puja actual')
  await expect(tarjeta(T.vendida)).toContainText('Puja final')
  await capturar(page, info, 'tarjetas-en-escritorio')
  await expect.poll(vistaGuardada, { message: 'la preferencia guardada' }).toBe('tarjetas')

  // Sin `?vista=` manda lo que eligió.
  await irAlOrigen(page, subasta)
  await expect(tarjeta(T.viva)).toBeVisible()
  await expect(aLaVista(page.getByRole('table'))).toHaveCount(0)

  await page
    .getByRole('group', { name: 'Cómo ver la lista' })
    .getByRole('button', { name: 'Tabla' })
    .click()
  await expect(page.getByRole('columnheader', { name: /Puja actual/ })).toBeVisible()
  await expect.poll(vistaGuardada, { message: 'la preferencia vuelta a la tabla' }).toBe('tabla')
})

test('en el celular, tarjetas con el rótulo de la puja y sin conmutador', async ({
  page,
}, info) => {
  test.skip(!esMovil(page), 'sólo en el celular')
  await entrar(page, duena)
  await irAlOrigen(page, subasta)
  const tarjeta = (titulo: string) =>
    aLaVista(page.getByRole('listitem').filter({ hasText: titulo }))
  await expect(tarjeta(T.viva)).toContainText('Puja actual')
  await expect(tarjeta(T.vendida)).toContainText('Puja final')
  await expect(aLaVista(page.getByRole('group', { name: 'Cómo ver la lista' }))).toHaveCount(0)
  await capturar(page, info, 'tarjetas-en-el-celular')
})

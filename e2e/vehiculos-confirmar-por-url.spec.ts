import { expect, test } from './soporte/prueba'
import {
  cicloDeUnaConfirmacion,
  dobleClicManda,
  noAbre,
  sinRedNoConfirma,
} from './soporte/confirmar-por-url'
import { entrar, limpiarInventario, prepararInventario, type Terreno } from './soporte/inventario'
import { estadoDe } from './soporte/papelera'
import { cargarVehiculos, vehiculoPorTitulo } from './soporte/vehiculos'

// @sin-celular-archivo: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)

// La purga de la papelera de vehículos, con su URL (cierre 2): `?panel=purgar&lote=<id>&vehiculo=<id>`. Se abre, Esc devuelve el
// foco, «atrás» y la recarga funcionan, sin red no deja confirmar, un doble clic manda un solo pedido y un lote que no está en la
// página no abre nada. El desvincular y el eliminar origen se recorren en `leads-vehiculos*.spec.ts` y `origenes.spec.ts`.
test.describe.configure({ mode: 'serial' })

const A = 'Url Purga A'
const B = 'Url Purga B'

let duena = ''
let corea: Terreno['corea'] = { id: '', nombre: '' }
const ids: Record<string, string> = {}

test.beforeAll(async ({}, info) => {
  const terreno = await prepararInventario(info.project.name, [
    'vehiculos.eliminar',
    'vehiculos.papelera.purgar',
  ])
  ;({ duena, corea } = terreno)
  await cargarVehiculos(corea.id, [{ titulo: A }, { titulo: B }])
  for (const titulo of [A, B]) {
    ids[titulo] = (await vehiculoPorTitulo(titulo))?.id ?? ''
  }
})

test.afterAll(async () => {
  await limpiarInventario()
})

test('purgar de la papelera: su URL, Esc, atrás, recarga, sin red y un solo pedido', async ({
  page,
  context,
}) => {
  await entrar(page, duena)
  for (const titulo of [A, B]) {
    await page.goto(`/vehiculos/${ids[titulo] ?? ''}`)
    await expect(page.getByRole('heading', { name: titulo, level: 1 })).toBeVisible()
    await page.getByRole('button', { name: `Más acciones de ${titulo}` }).click()
    await page.getByRole('menuitem', { name: 'Enviar a la papelera' }).click()
    await expect(page).toHaveURL(new RegExp(`/vehiculos\\?origen=${corea.id}`))
  }
  await page.goto('/vehiculos/papelera')
  const disparador = page.getByRole('button', { name: `Purgar ${B}` })
  const dialogo = page.getByRole('dialog', { name: `Purgar «${B}»` })
  await cicloDeUnaConfirmacion(page, {
    abrir: () => disparador.click(),
    dialogo,
    disparador,
    url: /panel=purgar&lote=[^&]+&vehiculo=/,
  })
  const confirmar = dialogo.getByRole('button', { name: 'Purgar', exact: true })
  await sinRedNoConfirma(context, dialogo, confirmar)
  expect(await dobleClicManda(page, confirmar)).toBe(1)
  await expect(dialogo).toBeHidden()
  expect(await estadoDe(ids[B] ?? '')).toBeNull()
  expect(await estadoDe(ids[A] ?? '')).not.toBeNull()
})

test('purgar de la papelera: un lote que no está en la página no abre nada, avisa y limpia la URL', async ({
  page,
}) => {
  await entrar(page, duena)
  await noAbre(
    page,
    '/vehiculos/papelera?panel=purgar&lote=00000000-0000-4000-8000-000000000999',
    'Ese lote ya no está en esta página de la papelera.',
    /panel=purgar/,
  )
})

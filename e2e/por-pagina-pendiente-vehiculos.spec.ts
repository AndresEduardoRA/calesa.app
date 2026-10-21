import { test } from './soporte/prueba'
import { entrar, limpiarInventario, prepararInventario, type Terreno } from './soporte/inventario'
import { repetirEleccionPendiente, type ModoDeEstres } from './soporte/estres-por-pagina'
import { fijarPreferencia, preferenciaDe } from './soporte/listas-por-pagina'
import { cargarVehiculos } from './soporte/vehiculos'

// 5a-15: «Ítems por página» elegido con una navegación pendiente termina en la primera página con ese tamaño (inventario de vehículos).
// Sólo con `E2E_ESTRES=1` (`playwright.config.ts`): 20 corridas por modo, ≈ 3 min por proyecto. El listado de leads, en el spec hermano.
test.describe.configure({ mode: 'serial' })

let terreno: Terreno
const MARCA = 'PorPagPendVeh'

test.beforeAll(async ({}, info) => {
  test.setTimeout(180_000)
  terreno = await prepararInventario(info.project.name)
  await cargarVehiculos(
    terreno.corea.id,
    Array.from({ length: 130 }, (_, i) => ({
      titulo: `${MARCA} ${String(i + 1).padStart(3, '0')}`,
    })),
  )
})

test.afterAll(async () => {
  await fijarPreferencia(terreno.duena, null)
  await limpiarInventario()
})

for (const modo of ['latencia', 'cpu'] satisfies ModoDeEstres[]) {
  test(`vehiculos: elegir 50 con la página 3 pendiente (${modo}), 20 corridas seguidas`, async ({
    page,
  }) => {
    test.setTimeout(480_000)
    await entrar(page, terreno.duena)
    await repetirEleccionPendiente(page, {
      modo,
      tamano: 50,
      abrirEnLaPrimera: async () => {
        await fijarPreferencia(terreno.duena, 10)
        await page.goto(`/vehiculos?q=${MARCA}&origen=${terreno.corea.id}`)
      },
      preferenciaGuardada: () => preferenciaDe(terreno.duena),
    })
  })
}

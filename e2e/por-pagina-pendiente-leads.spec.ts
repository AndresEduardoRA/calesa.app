import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { admin } from './soporte/base'
import { idDe } from './soporte/leads'
import {
  irALeads,
  limpiarListado,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { repetirEleccionPendiente, type ModoDeEstres } from './soporte/estres-por-pagina'
import { fijarPreferencia, preferenciaDe } from './soporte/listas-por-pagina'

// 5a-15: «Ítems por página» elegido con una navegación pendiente termina en la primera página con ese tamaño (listado de leads).
// Sólo con `E2E_ESTRES=1` (`playwright.config.ts`): 20 corridas por modo, ≈ 3 min por proyecto. El inventario, en el spec hermano.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado
const BUSCAR = 'PorPagPend'

test.beforeAll(async ({}, info) => {
  test.setTimeout(180_000)
  t = await prepararListado(info.project.name)
  const creador = await idDe(t.personas.berta)
  const base = info.project.name === 'movil' ? 77 : 76
  const { error } = await admin()
    .from('leads')
    .insert(
      Array.from({ length: 130 }, (_, i) => ({
        nombre: `E2E ${BUSCAR} ${String(i + 1).padStart(3, '0')} ${info.project.name}`,
        telefono_principal: `5917${String(base)}${String(i).padStart(5, '0')}`,
        creado_por: creador,
      })),
    )
  expect(error).toBeNull()
})

test.afterAll(async () => {
  await fijarPreferencia(t.personas.berta, null)
  await limpiarListado(t)
})

for (const modo of ['latencia', 'cpu'] satisfies ModoDeEstres[]) {
  test(`leads: elegir 25 con la página 3 pendiente (${modo}), 20 corridas seguidas`, async ({
    page,
  }) => {
    test.setTimeout(480_000)
    await entrar(page, t.personas.berta)
    await repetirEleccionPendiente(page, {
      modo,
      tamano: 25,
      abrirEnLaPrimera: async () => {
        await fijarPreferencia(t.personas.berta, 10)
        await irALeads(page, `?q=${BUSCAR}`)
      },
      preferenciaGuardada: () => preferenciaDe(t.personas.berta),
    })
  })
}

import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { descartarAviso } from './soporte/inventario'
import { PREFIJO_CLAVE_E2E, borrarOrigenes, crearOrigenDePrueba } from './soporte/origenes'
import { expect, test } from './soporte/prueba'
import {
  agregarCampo,
  borrarVehiculosDe,
  cargarVehiculos,
  vehiculoPorTitulo,
} from './soporte/vehiculos'

// @sin-celular-archivo: Configuración › Orígenes no se prueba en celular; pruebas sólo en lo clave (la persona, 2026-11-08)

// El campo «principal» de un origen (6.13): la dueña marca «Lote interno» como principal en el panel del campo, la fila del layout lo
// dice con su insignia y, desde entonces, el valor del lote nombra al vehículo en el listado (el título va debajo) y en el panel de
// logística («<lote> · <título>»). Uno por origen, el permiso y la versión los prueba `supabase/tests/areas/origenes/principal.sql`; qué
// nombra con o sin principal, `src/modules/vehiculos/entities/identidad.test.ts`.
test.describe.configure({ mode: 'serial' })

const LOTE = 'L-4471'
const ETIQUETA = 'Lote interno'

let proyecto = ''
let claveDeOrigen = ''
let titulo = ''
let duena = ''
let origen: { id: string; nombre: string }

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  claveDeOrigen = `principal_${proyecto}`
  titulo = `Hilux principal ${proyecto}`
  await borrarVehiculosDe([`${PREFIJO_CLAVE_E2E}${claveDeOrigen}`])
  await borrarOrigenes([`${PREFIJO_CLAVE_E2E}${claveDeOrigen}`])
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-principal-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dalia Principal' })
  origen = await crearOrigenDePrueba(`Principal ${proyecto}`, claveDeOrigen)
  await agregarCampo(origen.id, { clave: 'lote_interno', etiqueta: ETIQUETA, tipo: 'texto' })
  await cargarVehiculos(origen.id, [{ titulo, atributos: { lote_interno: LOTE } }])
})

test.afterAll(async () => {
  await borrarVehiculosDe([`${PREFIJO_CLAVE_E2E}${claveDeOrigen}`])
  await borrarOrigenes([`${PREFIJO_CLAVE_E2E}${claveDeOrigen}`])
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('marcar «Lote interno» como principal lo vuelve el nombre del vehículo en la lista y en logística', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })

  // El panel del campo: el interruptor «Principal», con su ayuda, y la insignia en la fila del layout.
  await page.goto(`/configuracion/origenes/${origen.id}?seccion=campos`)
  await page.getByRole('button', { name: `Editar ${ETIQUETA}` }).click()
  const panel = page.getByRole('dialog')
  await expect(panel.getByText(/Identifica al vehículo en la lista/)).toBeVisible()
  await panel.getByRole('switch', { name: 'Principal' }).click()
  await panel.getByRole('button', { name: 'Guardar' }).click()
  await descartarAviso(page, `Campo «${ETIQUETA}» guardado`)
  const fila = page.getByRole('listitem').filter({ hasText: 'lote_interno' })
  await expect(fila.getByText('Principal', { exact: true })).toBeVisible()

  // El listado: el lote nombra la fila (el botón que abre el resumen) y el título va en la línea de abajo.
  await page.goto(`/vehiculos?origen=${origen.id}`)
  const enLaLista = page.locator('tbody tr, li article').filter({ hasText: LOTE })
  await expect(enLaLista.getByRole('button', { name: `Abrir ${LOTE}`, exact: true })).toBeVisible()
  await expect(enLaLista.getByText(new RegExp(`${titulo} · #`))).toBeVisible()

  // El panel de logística: «<lote> · <título>».
  const vehiculo = await vehiculoPorTitulo(titulo)
  expect(vehiculo).not.toBeNull()
  await page.goto(`/logistica/vehiculo/${vehiculo?.id ?? ''}`)
  await expect(page.getByRole('heading', { name: `${LOTE} · ${titulo}` })).toBeVisible()
})

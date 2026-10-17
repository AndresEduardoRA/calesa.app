import { expect, test } from './soporte/prueba'
import {
  cicloDeUnaConfirmacion,
  dobleClicManda,
  sinRedNoConfirma,
} from './soporte/confirmar-por-url'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarOrigenes, crearOrigenDePrueba, origenPorClave } from './soporte/origenes'
import { ingresar } from './soporte/pasos'

// «Eliminar origen» de un origen de vehículos, con su URL (cierre 2): `?panel=eliminar-origen` en la página del origen. Pide tipear
// el nombre; se abre con su URL, Esc devuelve el foco, «atrás» y la recarga funcionan, sin red no deja confirmar y un doble clic
// manda un solo pedido. Los casos de qué se elimina y qué no están en `origenes.spec.ts`.
test.describe.configure({ mode: 'serial' })

const CLAVE_DE_PERSONA = 'Clave-e2e-2026'
const CLAVE_DEL_ORIGEN = 'eliminar_url'
const NOMBRE = 'Origen para eliminar'

let duena = ''

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await borrarOrigenes([CLAVE_DEL_ORIGEN])
  duena = correoDePrueba(`duena-eliminar-origen-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE_DE_PERSONA, nombre: 'Dalia Eliminar' })
  await crearOrigenDePrueba(NOMBRE, CLAVE_DEL_ORIGEN)
})

test.afterAll(async () => {
  await borrarOrigenes([CLAVE_DEL_ORIGEN])
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('eliminar un origen: su URL, Esc, atrás, recarga, sin red y un solo pedido', async ({
  page,
  context,
}) => {
  await page.goto('/ingreso')
  await ingresar(page, duena, CLAVE_DE_PERSONA)
  await expect(page).toHaveURL('/')
  await page.goto('/configuracion/origenes')
  await page.getByRole('link', { name: new RegExp(NOMBRE) }).click()
  await expect(page.getByRole('heading', { name: NOMBRE, level: 1 })).toBeVisible()
  const disparador = page.getByRole('button', { name: 'Eliminar origen' })
  const dialogo = page.getByRole('dialog')
  await cicloDeUnaConfirmacion(page, {
    abrir: () => disparador.click(),
    dialogo,
    disparador,
    url: /panel=eliminar-origen/,
  })
  const confirmar = dialogo.getByRole('button', { name: 'Eliminar origen' })
  await expect(confirmar).toBeDisabled()
  await dialogo.getByLabel(/Para confirmar/).fill(NOMBRE)
  await sinRedNoConfirma(context, dialogo, confirmar)
  expect(await dobleClicManda(page, confirmar)).toBe(1)
  await expect(page.getByText(`Origen «${NOMBRE}» eliminado`)).toBeVisible()
  expect(await origenPorClave(`e2e_${CLAVE_DEL_ORIGEN}`)).toBeNull()
})

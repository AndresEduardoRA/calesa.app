// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { sql } from './soporte/sql'

// Configuración › Repuestos › «Cotizador» (8.12-2): quien tiene `repuestos.configurar` ve las dos pestañas, publica la fórmula (la vigente sale primera en el
// historial y «Publicar cambios» se apaga hasta que algo cambie), agrega un tramo de logística en USD y uno que se cruza con él no se agrega: la base lo
// dice en «Desde». Los tramos de la prueba van desde 900 000 para no cruzarse con los de otro spec (D27); la configuración publicada la borra
// `borrarPersonasDePrueba()` (su `creado_por` es la dueña de prueba). Lo que escribe cada rol lo prueba `supabase/tests/areas/repuestos/cotizador-configuracion.sql`.
test.describe.configure({ mode: 'serial' })

let duena = ''
const limpiarTramos = () => {
  sql('delete from public.repuestos_tramos_logistica where costo_min >= 900000')
}

test.beforeAll(async ({}, info) => {
  limpiarTramos()
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-cotizador-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Rita Repuestos' })
})

test.afterAll(async () => {
  limpiarTramos()
  await borrarPersonasDePrueba()
})

test('publicar la fórmula y agregar un tramo; uno que se cruza no se agrega', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/repuestos')
  await expect(page.getByRole('tab')).toHaveCount(2)
  await page.getByRole('tab', { name: 'Cotizador' }).click()
  await expect(page).toHaveURL(/seccion=cotizador/)
  await expect(page.getByRole('heading', { name: 'Fórmula', level: 2 })).toBeVisible()

  await page.getByLabel('Factor de importado').fill('1,4321')
  await page.getByLabel('Recargo local (%)').fill('12,5')
  await page.getByLabel('Redondeo').fill('1')
  const publicar = page.getByRole('button', { name: 'Publicar cambios' })
  await publicar.click()
  await expect(page.getByText('Configuración publicada.')).toBeVisible()
  const vigente = page.getByRole('listitem').filter({ hasText: 'Vigente' })
  await expect(vigente).toContainText('1,4321')
  await expect(vigente).toContainText(/12,5\s?%/)
  await expect(publicar).toBeDisabled()

  const tramos = page.getByRole('region', { name: 'Tramos en USD' })
  const dialogo = page.getByRole('dialog', { name: 'Agregar tramo en USD' })
  await tramos.getByRole('button', { name: 'Agregar tramo en USD' }).click()
  await dialogo.getByLabel('Desde').fill('910000')
  await dialogo.getByLabel('Hasta').fill('920000')
  await dialogo.getByLabel('Logística').fill('15')
  await dialogo.getByRole('button', { name: 'Agregar', exact: true }).click()
  await expect(dialogo).toBeHidden()
  await expect(tramos.getByRole('listitem').filter({ hasText: '910.000,00' })).toContainText(
    '920.000,00',
  )

  await tramos.getByRole('button', { name: 'Agregar tramo en USD' }).click()
  await dialogo.getByLabel('Desde').fill('915000')
  await dialogo.getByLabel('Hasta').fill('930000')
  await dialogo.getByLabel('Logística').fill('20')
  await dialogo.getByRole('button', { name: 'Agregar', exact: true }).click()
  await expect(
    dialogo.getByText('Ese tramo se cruza con otro de USD (de 910000,00 a 920000,00).'),
  ).toBeVisible()
  await expect(dialogo).toBeVisible()
})

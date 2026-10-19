import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { idDe } from './soporte/leads'
import { rpcComo } from './soporte/leads-cartera'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { irAFicha, nuevoLead } from './soporte/leads-ficha'
import {
  limpiarPortal,
  otorgarComo,
  pestanaPortal,
  prepararPortal,
  seccionPortal,
  type TerrenoDelPortal,
} from './soporte/leads-portal'

// @sin-celular-archivo: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)

// Quién tiene la sección «Portal»: con el lead en la cartera y `leads.portal.gestionar`. Sin el permiso
// (aunque tenga la cartera), sin la cartera (aunque vea «todos» y tenga el permiso) o la dueña con
// «todos», ni la pestaña ni `?seccion=portal` escrito a mano: abre «Datos», como lo que no existe.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelPortal

test.beforeAll(async ({}, info) => {
  t = await prepararPortal(info.project.name)
})

test.afterAll(async () => {
  await limpiarPortal(t)
})

async function leadCompartido(corto: string) {
  const lead = await nuevoLead({
    corto,
    telefono: completoCon(t, nacional()),
    deQuien: t.pia.email,
  })
  for (const email of [t.paco.email, t.personas.berta]) {
    const { error } = await rpcComo(t.pia.email, 'lead_compartir', {
      p_lead: lead.id,
      p_usuario: await idDe(email),
    })
    expect(error).toBeNull()
  }
  await otorgarComo(t.pia.email, lead.id, 'clave-acceso-1')
  return lead
}

test('un compartido con el permiso ve la pestaña y el estado', async ({ page }, info) => {
  const lead = await leadCompartido(`Portal Compartido ${info.project.name}`)
  await entrar(page, t.paco.email)
  await irAFicha(page, lead.id)
  await pestanaPortal(page).click()
  await expect(page).toHaveURL(/seccion=portal/)
  await expect(seccionPortal(page).getByText('Activo', { exact: true })).toBeVisible()
  await expect(seccionPortal(page).getByText(/, por Pía Portal/)).toBeVisible()
})

test('sin el permiso, aunque tenga la cartera: ni la pestaña ni la sección por la URL', async ({
  page,
}, info) => {
  const lead = await leadCompartido(`Portal Sin Permiso ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irAFicha(page, lead.id, '?seccion=portal')
  await expect(page.getByText('Teléfonos', { exact: true }).first()).toBeVisible()
  await expect(pestanaPortal(page)).toHaveCount(0)
  await expect(seccionPortal(page)).toHaveCount(0)
})

for (const quien of ['supervision', 'duena'] as const) {
  test(`${quien === 'supervision' ? 'la supervisión con el permiso en «todos»' : 'la dueña'}, sin la cartera: ni la pestaña ni la sección`, async ({
    page,
  }, info) => {
    const lead = await leadCompartido(`Portal Sin Cartera ${quien} ${info.project.name}`)
    await entrar(page, quien === 'supervision' ? t.supervision.email : t.personas.duena)
    await irAFicha(page, lead.id, '?seccion=portal')
    await expect(page.getByText('Teléfonos', { exact: true }).first()).toBeVisible()
    await expect(pestanaPortal(page)).toHaveCount(0)
    await expect(seccionPortal(page)).toHaveCount(0)
    // Ni por la base: el estado (con el código) no se le entrega.
    const { error } = await rpcComo(
      quien === 'supervision' ? t.supervision.email : t.personas.duena,
      'portal_estado',
      { p_lead: lead.id },
    )
    expect(error?.message).toBe('No encontramos este lead o no tienes acceso.')
  })
}

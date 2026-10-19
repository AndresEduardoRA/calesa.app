import { formatearNumero } from '../src/shared/lib/formato'
import { expect, test } from './soporte/prueba'
import { Teclado, entrar } from './soporte/alta'
import { idDe } from './soporte/leads'
import { rpcComo } from './soporte/leads-cartera'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { irAFicha, nuevoLead, tituloDeLaFicha } from './soporte/leads-ficha'
import {
  accesoEnLaBase,
  dialogoDeOtorgar,
  limpiarPortal,
  otorgarComo,
  pestanaPortal,
  prepararPortal,
  seccionPortal,
  type TerrenoDelPortal,
} from './soporte/leads-portal'

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

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('un compartido con el permiso ve la pestaña y el estado', async ({ page }, info) => {
  const lead = await leadCompartido(`Portal Compartido ${info.project.name}`)
  await entrar(page, t.paco.email)
  await irAFicha(page, lead.id)
  await pestanaPortal(page).click()
  await expect(page).toHaveURL(/seccion=portal/)
  await expect(seccionPortal(page).getByText('Activo', { exact: true })).toBeVisible()
  await expect(seccionPortal(page).getByText(/, por Pía Portal/)).toBeVisible()
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
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

// Tarea de oro 4 (`docs/UX.md`): otorgar el portal desde la ficha del lead en ≤ 30 s. Sólo con el teclado y sin un clic: de la ficha del lead
// a la sección «Portal», «Dar acceso», «Generar clave y dar acceso» y el texto para WhatsApp copiado. Lo que no cambia de una máquina a
// otra es lo pulsado; el reloj del robot es un tope generoso; la hora de una persona se estima con KLM (`Teclado.klm`).
const CONTROLES_MAXIMOS = 32

test('tarea de oro 4: de la ficha al texto para WhatsApp copiado, sólo con el teclado', async ({
  page,
  context,
}, info) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const lead = await nuevoLead({
    corto: `Portal Oro ${info.project.name}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.pia.email,
  })
  await entrar(page, t.pia.email)
  await irAFicha(page, lead.id)
  await expect(tituloDeLaFicha(page, lead.nombre)).toBeVisible()
  const teclado = new Teclado(page)
  const inicio = performance.now()

  // «Saltar al contenido» y de ahí a la pestaña «Portal».
  await teclado.pulsar('Tab')
  await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused()
  await teclado.pulsar('Enter')
  await teclado.tabularHasta(pestanaPortal(page))
  await teclado.pulsar('Enter')
  await expect(page).toHaveURL(/seccion=portal/)

  // «Dar acceso» abre el diálogo con el foco en la clave; vacía, el Enter genera una.
  await teclado.tabularHasta(seccionPortal(page).getByRole('button', { name: 'Dar acceso' }))
  await teclado.pulsar('Enter')
  await expect(dialogoDeOtorgar(page).getByLabel('Clave temporal')).toBeFocused()
  await teclado.pulsar('Enter')
  const listo = page.getByRole('dialog', { name: `${lead.nombre} ya tiene acceso al portal` })
  await expect(listo).toBeVisible()

  // El texto listo: «Copiar texto» con el teclado.
  await teclado.tabularHasta(listo.getByRole('button', { name: 'Copiar texto' }))
  await teclado.pulsar('Enter')
  await expect(listo.getByRole('button', { name: 'Copiado' })).toBeVisible()
  const fin = performance.now()

  const texto = (await listo.getByLabel('Texto para WhatsApp').textContent()) ?? ''
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(texto)
  expect(texto).toContain('Código: ')
  expect((await accesoEnLaBase(lead.id))?.codigo).toMatch(/^[A-Z]{2,4}-/)

  const controles = teclado.pulsaciones
  const klm = teclado.klm(3)
  const robot = (fin - inicio) / 1000
  const seg = (valor: number) => `${formatearNumero(valor, { decimales: 1 })} s`
  const resumen = `${seg(robot)} el robot · ${String(controles)} teclas de control · KLM ${seg(klm)} · 0 clics`
  console.warn(`[tarea de oro 4] ${info.project.name}: ${resumen}`)
  info.annotations.push({ type: 'meta de 30 s', description: resumen })
  expect(controles).toBeLessThanOrEqual(CONTROLES_MAXIMOS)
  expect(robot).toBeLessThan(15)
  expect(klm).toBeLessThanOrEqual(30)
})

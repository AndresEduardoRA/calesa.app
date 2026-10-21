import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { abrirConN, dialogo, entrar } from './soporte/alta'
import { abrirOrigenes } from './soporte/origenes-de-lead'
import { abrirTipos } from './soporte/tipos-de-lead'
import { irAFicha } from './soporte/leads-ficha'
import { irALeads } from './soporte/leads-listado'
import { sql } from './soporte/sql'
import {
  capturar,
  limpiarRecorrido,
  prepararRecorrido,
  sinScrollHorizontal,
  type TerrenoDelRecorrido,
} from './soporte/recorrido'

// Las capturas de «Configuración de leads»: las pestañas de Configuración › Leads, el alta, el listado, la ficha y el drawer rápido, al 100 % y
// al 200 %, para mirar antes y después (`E2E_CAPTURAS=e2e-capturas/config-de-leads/{antes,despues}`). Lo que se puede afirmar sin mirar vive
// en los specs de cada pantalla; este recorre y deja las imágenes.
test.describe.configure({ mode: 'serial' })

let r: TerrenoDelRecorrido

test.beforeAll(async ({}, info) => {
  r = await prepararRecorrido(info.project.name, 'Capturas')
  // Un lead con origen y un seguimiento público de un tipo: lo que las pantallas dibujan junto al nombre.
  sql(`
    update public.origenes_lead set por_defecto = true where clave = 'web';
    update public.leads set origen_lead_id = (select id from public.origenes_lead where activo order by orden, nombre limit 1)
      where id = '${r.uno.id}';
    insert into public.seguimientos (lead_id, usuario_id, tipo_id, titulo, visibilidad)
      select '${r.uno.id}', (select id from public.perfiles order by creado_en limit 1),
             (select id from public.tipos_seguimiento where clave = 'llamada'), 'Primera llamada de las capturas', 'publico';
  `)
})

test.afterAll(async () => {
  sql(`update public.origenes_lead set por_defecto = false where por_defecto;`)
  await limpiarRecorrido(r)
})

const alDoscientos = (page: Page) =>
  page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })

for (const zoom of ['100', '200'] as const) {
  test(`las pestañas de Configuración › Leads al ${zoom} %`, async ({ page }, info) => {
    await entrar(page, r.t.personas.duena)
    await abrirOrigenes(page)
    if (zoom === '200') await alDoscientos(page)
    await capturar(page, info, `pestana-origenes-${zoom}`)
    await abrirTipos(page)
    if (zoom === '200') await alDoscientos(page)
    await capturar(page, info, `pestana-tipos-${zoom}`)
    if (await page.getByRole('tab', { name: 'Tipos de seguimiento' }).count()) {
      await page.getByRole('tab', { name: 'Tipos de seguimiento' }).click()
      await expect(
        page.getByRole('heading', { name: 'Tipos de seguimiento', level: 2 }),
      ).toBeVisible()
      if (zoom === '200') await alDoscientos(page)
      await sinScrollHorizontal(page)
      await capturar(page, info, `pestana-seguimientos-${zoom}`)
      // El selector de icono, en el modal de «Nuevo tipo» (a este mismo tamaño de texto).
      await page.getByRole('button', { name: 'Nuevo tipo' }).first().click()
      const modal = page.getByRole('dialog', { name: 'Nuevo tipo de seguimiento' })
      await expect(modal).toBeVisible()
      await sinScrollHorizontal(page)
      await capturar(page, info, `selector-de-icono-${zoom}`)
      await page.keyboard.press('Escape')
      await expect(modal).toBeHidden()
    }
  })
}

test('el alta, el listado, la ficha y el rápido', async ({ page }, info) => {
  await entrar(page, r.t.personas.duena)
  await irALeads(page)
  await page.goto(`/leads?alcance=todos&q=${encodeURIComponent(r.uno.nombre)}`)
  await expect(page.getByText(r.uno.nombre).first()).toBeVisible()
  await capturar(page, info, 'listado')
  // Sin un último origen, el alta propone el «por defecto» de la empresa.
  sql(`delete from public.preferencias_usuario where clave = 'leads.ultimo_origen_lead';`)
  await abrirConN(page)
  await expect(dialogo(page)).toBeVisible()
  await expect(dialogo(page).getByLabel('Origen del lead')).toHaveValue(
    sql(`select id from public.origenes_lead where clave = 'web'`).trim(),
  )
  await capturar(page, info, 'alta-con-el-origen-por-defecto')
  await page.keyboard.press('Escape')
  await expect(dialogo(page)).toBeHidden()
  await page.goto(`/leads?lead=${r.uno.id}`)
  await expect(page.getByRole('dialog', { name: r.uno.nombre })).toBeVisible()
  await capturar(page, info, 'rapido')
  await irAFicha(page, r.uno.id)
  await expect(page.getByRole('heading', { name: r.uno.nombre, level: 1 })).toBeVisible()
  await capturar(page, info, 'ficha')
  await irAFicha(page, r.uno.id, '?seccion=seguimientos')
  await expect(page.getByRole('region', { name: 'Seguimientos' })).toBeVisible()
  await capturar(page, info, 'ficha-seguimientos')
  // El kanban no nombra el origen ni el tipo de un lead: no dibuja iconos (se mira para decirlo).
  await page.goto('/leads?vista=embudo')
  await page.waitForLoadState('networkidle')
  await capturar(page, info, 'kanban')
})

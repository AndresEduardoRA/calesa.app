import { expect, test, type Page, type TestInfo } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { irAFicha } from './soporte/leads-ficha'
import { rpcComo } from './soporte/leads-cartera'
import { idDePersona } from './soporte/leads-alta'
import { irALeads, nombre } from './soporte/leads-listado'
import { admin } from './soporte/base'
import { esMovil } from './soporte/inventario'
import { vehiculoDe } from './soporte/leads-vehiculos'
import {
  embudoPorDefecto,
  etapa,
  irAlEmbudo,
  moverA,
  muchasOportunidades,
  oportunidad,
  tarjeta,
  verEtapa,
} from './soporte/leads-oportunidades'
import { nuevoLead } from './soporte/leads-ficha'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import {
  capturar,
  limpiarRecorrido,
  prepararRecorrido,
  sinScrollHorizontal,
  type TerrenoDelRecorrido,
} from './soporte/recorrido'

// El recorrido del cierre 2 con la dueña y una asesora (la de la semilla): lo que cambió, en claro y en oscuro, con el texto normal y
// al 200 %, en escritorio y en el celular. Las capturas (`E2E_CAPTURAS=e2e-capturas/cierre-2`) se miran; lo que se puede afirmar sin
// mirar está en los e2e de cada defecto.
test.describe.configure({ mode: 'serial' })

let r: TerrenoDelRecorrido

test.beforeAll(async ({}, info) => {
  r = await prepararRecorrido(info.project.name, 'Cierre dos')
})

test.afterAll(async () => {
  await limpiarRecorrido(r)
})

// Claro, oscuro y, si se pide, claro con el texto al 200 %.
async function variantes(page: Page, info: TestInfo, nombreDeCaptura: string, al200 = false) {
  await page.emulateMedia({ colorScheme: 'light' })
  await capturar(page, info, `${nombreDeCaptura}-claro`)
  await page.emulateMedia({ colorScheme: 'dark' })
  await capturar(page, info, `${nombreDeCaptura}-oscuro`)
  await page.emulateMedia({ colorScheme: 'light' })
  if (al200) {
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%'
    })
    await capturar(page, info, `${nombreDeCaptura}-200`)
    await page.evaluate(() => {
      document.documentElement.style.fontSize = ''
    })
  }
}

test('Ana · el listado con un nombre largo y la barra superior', async ({ page }, info) => {
  await nuevoLead({
    corto: `Cliente con nombre largo ${info.project.name}`.slice(0, 40),
    telefono: completoCon(r.t, nacional()),
    deQuien: r.ana.email,
  })
  await entrar(page, r.ana.email)
  await irALeads(page)
  await expect(
    page.getByText(nombre(r.uno.nombre.replace('E2E ', '')), { exact: false }).first(),
  ).toBeVisible()
  await variantes(page, info, 'ana-listado', true)
})

// 5b-2: el kanban ensanchaba la página al 200 % en el celular con una tarjeta (el buscador, el aviso y «Ventas» llegaban cortados al borde).
// En el celular se mide con el texto al 200 %; en escritorio, al 100 % (el 200 % ahí es otro diseño). Cada caso suma a lo que ya hay.
test('Ana · el kanban no ensancha la página: sin tarjetas, con una, con diez, con un nombre de 80 letras y con un vehículo largo', async ({
  page,
}, info) => {
  const proyecto = info.project.name
  const ana = await idDePersona(r.ana.email)
  const embudo = await embudoPorDefecto(r.ana.email)
  let vehiculoId = ''
  try {
    await entrar(page, r.ana.email)
    const cabe = async (caso: string, captura?: { nombre: string; tarjeta: string }) => {
      if (esMovil(page)) {
        await page.evaluate(() => {
          document.documentElement.style.fontSize = '200%'
        })
      }
      if (captura) {
        // La tarjeta a la vista: con el texto al 200 % queda debajo de la barra y el aviso.
        await tarjeta(page, captura.tarjeta).scrollIntoViewIfNeeded()
        await capturar(page, info, captura.nombre)
      }
      await sinScrollHorizontal(page).catch((e: unknown) => {
        throw new Error(`${caso}: ${e instanceof Error ? e.message : String(e)}`)
      })
    }
    const ver = async () => {
      await irAlEmbudo(page)
      await verEtapa(page, 'Nuevo')
    }

    await ver()
    await cabe('sin tarjetas')

    await oportunidad(r.ana.email, r.uno.id, { titulo: `Camioneta de una sola ${proyecto}` })
    await ver()
    await expect(tarjeta(page, `Camioneta de una sola ${proyecto}`)).toBeVisible()
    await cabe('con una tarjeta', {
      nombre: 'kanban-una-tarjeta',
      tarjeta: `Camioneta de una sola ${proyecto}`,
    })

    await muchasOportunidades({
      usuarioId: ana,
      leadId: r.uno.id,
      embudo,
      etapaId: etapa(embudo, 'Nuevo'),
      cantidad: 9,
    })
    await ver()
    await cabe('con diez tarjetas')

    const largo = await nuevoLead({
      corto: `${'Larguísimo'.repeat(8)}`,
      telefono: completoCon(r.t, nacional()),
      deQuien: r.ana.email,
    })
    await oportunidad(r.ana.email, largo.id, { titulo: `Compra de ${proyecto}` })
    await ver()
    await cabe('con un nombre de 80 letras sin espacios', {
      nombre: 'kanban-nombre-largo',
      tarjeta: `Compra de ${proyecto}`,
    })

    const origen = await admin().from('origenes').select('id').limit(1).single<{ id: string }>()
    vehiculoId = await vehiculoDe(
      origen.data?.id ?? '',
      'Toyota Land Cruiser Prado VX-L Diésel Automática 4x4 Edición Especial Aniversario 2024',
      r.ana.email,
    )
    await oportunidad(r.ana.email, r.dos.id, {
      titulo: `Con vehículo largo ${proyecto}`,
      vehiculo_id: vehiculoId,
    })
    await ver()
    await cabe('con un vehículo de título largo', {
      nombre: 'kanban-vehiculo-largo',
      tarjeta: `Con vehículo largo ${proyecto}`,
    })
  } finally {
    // Lo que sigue en el spec parte de un kanban sin estas tarjetas.
    await admin().from('oportunidades').delete().eq('usuario_id', ana)
    if (vehiculoId) await admin().from('vehiculos').delete().eq('id', vehiculoId)
  }
})

// Las demás pantallas que comparten el contenedor de la página (`<main>` del marco) tampoco se ensanchan al 200 % en el celular.
test('el listado, el inventario y las dos papeleras no ensanchan la página (al 200 % en el celular)', async ({
  page,
}) => {
  await entrar(page, r.t.personas.duena)
  for (const ruta of ['/leads', '/vehiculos', '/leads/papelera', '/vehiculos/papelera']) {
    await page.goto(ruta)
    await expect(page.locator('main')).toBeVisible()
    if (esMovil(page)) {
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%'
      })
    }
    await sinScrollHorizontal(page).catch((e: unknown) => {
      throw new Error(`${ruta}: ${e instanceof Error ? e.message : String(e)}`)
    })
  }
})

test('Ana · el kanban con «Mover a…» en una línea y el modal del motivo', async ({
  page,
}, info) => {
  const titulo = `Camioneta del recorrido ${info.project.name}`
  await oportunidad(r.ana.email, r.uno.id, { titulo })
  await entrar(page, r.ana.email)
  await irAlEmbudo(page)
  await verEtapa(page, 'Nuevo')
  await expect(tarjeta(page, titulo)).toBeVisible()
  await variantes(page, info, 'ana-kanban', true)
  await moverA(page, titulo, 'Perdido')
  const modal = page.getByRole('dialog', { name: 'Mover a «Perdido»' })
  await modal.getByLabel('Motivo (opcional)').fill('Compró en otra parte')
  await variantes(page, info, 'ana-kanban-modal-del-motivo')
  await page.keyboard.press('Escape')
  await expect(modal.getByText('Tienes cambios sin guardar.')).toBeVisible()
  await capturar(page, info, 'ana-kanban-modal-pregunta')
})

test('Ana · la ficha: la barra de secciones del celular, «Portal» a la vista', async ({
  page,
}, info) => {
  await entrar(page, r.ana.email)
  await irAFicha(page, r.uno.id)
  await expect(page.getByRole('navigation', { name: 'Secciones del lead' })).toBeVisible()
  await variantes(page, info, 'ana-ficha-barra', true)
  await irAFicha(page, r.uno.id, '?seccion=portal')
  await expect(page.getByRole('link', { name: 'Portal' })).toHaveAttribute('aria-current', 'page')
  await variantes(page, info, 'ana-ficha-portal')
})

test('Ana · salir de un lead que le comparten: la confirmación con su URL', async ({
  page,
}, info) => {
  const carlos = await rpcComo(r.t.personas.carlos, 'lead_compartir', {
    p_lead: r.deCarlos,
    p_usuario: await idDePersona(r.ana.email),
  })
  expect(carlos.error).toBeNull()
  await entrar(page, r.ana.email)
  await irAFicha(page, r.deCarlos)
  await page.getByRole('button', { name: 'Salir de este lead' }).click()
  await expect(page.getByRole('dialog', { name: /^Salir de/ })).toBeVisible()
  await variantes(page, info, 'ana-salir-del-lead')
  await page.keyboard.press('Escape')
})

test('Ana · un aviso con el panel «Nuevo lead» a medio escribir pregunta en el pie', async ({
  page,
}, info) => {
  await entrar(page, r.ana.email)
  await irALeads(page)
  await expect(async () => {
    await page.getByRole('button', { name: 'Nuevo lead' }).click()
    await expect(page.getByRole('dialog', { name: 'Nuevo lead' })).toBeVisible({ timeout: 1000 })
  }).toPass()
  const alta = page.getByRole('dialog', { name: 'Nuevo lead' })
  await alta.getByLabel('Teléfono principal').fill(nacional())
  await alta.getByLabel('Nombre').fill(nombre(`Recorrido alta ${info.project.name}`))
  await page.keyboard.press('Control+s')
  const aviso = page.locator('[data-sonner-toast]').filter({ hasText: /Abrir ficha/ })
  await expect(aviso.getByRole('button', { name: 'Abrir ficha' })).toBeVisible()
  await capturar(page, info, 'ana-aviso-tipografia')
  await alta.getByLabel('Teléfono principal').fill(nacional())
  await aviso.getByRole('button', { name: 'Abrir ficha' }).click()
  await expect(alta.getByText('Tienes cambios sin guardar.')).toBeVisible()
  await variantes(page, info, 'ana-alta-pregunta')
})

test('Dalia · el panel de un tipo de cambio guardando, y el aviso con la tipografía de la app', async ({
  page,
}, info) => {
  await entrar(page, r.t.personas.duena)
  await page.goto('/configuracion/empresa?seccion=monedas')
  await page.getByRole('button', { name: /^Oficial/ }).click()
  const panel = page.getByRole('dialog')
  await expect(panel.getByRole('heading', { name: 'Oficial' })).toBeVisible()
  const valor = panel.getByLabel(/^Valor/)
  const actual = await valor.inputValue()
  await valor.fill(actual)
  let soltar = () => {}
  const retenida = new Promise<void>((resolver) => {
    soltar = resolver
  })
  await page.route(
    (url) => url.pathname === '/configuracion/empresa',
    async (ruta) => {
      if (ruta.request().method() === 'POST' && 'next-action' in ruta.request().headers()) {
        await retenida
      }
      await ruta.fallback()
    },
  )
  await panel.getByRole('button', { name: 'Guardar' }).click()
  await expect(panel.getByRole('button', { name: 'Guardando…' })).toBeVisible()
  await expect(valor).toBeDisabled()
  await variantes(page, info, 'dalia-tipo-de-cambio-guardando')
  soltar()
  await expect(page.getByText('Tipo de cambio «Oficial» guardado')).toBeVisible()
  await capturar(page, info, 'dalia-tipo-de-cambio-aviso')
})

test('Dalia · la papelera: purgar con su confirmación', async ({ page }, info) => {
  const envio = await rpcComo(r.ana.email, 'leads_papelera_enviar', {
    p_lote: crypto.randomUUID(),
    p_leads: [r.dos.id],
  })
  expect(envio.error).toBeNull()
  await entrar(page, r.t.personas.duena)
  await page.goto('/leads/papelera')
  await page.getByRole('button', { name: new RegExp(`^Purgar ${r.dos.nombre}`) }).click()
  await expect(page.getByRole('dialog', { name: /^Purgar/ })).toBeVisible()
  await variantes(page, info, 'dalia-purgar', true)
  await page.keyboard.press('Escape')
})

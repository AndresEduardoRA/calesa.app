import { expect, test, type Locator, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { aLaVista } from './soporte/inventario'
import {
  PROPIO_DALIA,
  irALeads,
  limpiarListado,
  nombre,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { dialogoDeEtiquetas, menuDelLead, selectorDeEtiquetas } from './soporte/leads-marcas'
import { embudoPorDefecto, irAlEmbudo } from './soporte/leads-oportunidades'
import { abrirPestanaDeSeguimientos } from './soporte/leads-seguimientos'
import { abrirRecargarYVolver } from './soporte/vuelta-del-foco'

// La vuelta del foco en los paneles del listado de leads (4-49, paso 4.14-2a4): tras recargar con el panel abierto, «atrás» lo cierra y el foco vuelve a
// quien lo abrió. La sonda del paso midió que, sin la vuelta, el foco quedaba en `body` en cada uno. Anotar y agendar desde el «⋯» de una fila y
// «Editar» del lead rápido ya volvían (su modal busca a quien lo abrió): los cubre Vitest. Abajo, lo del 4.14-2a5 en el rápido: anotar o agendar
// desde el «⋯» del resumen (4-58) y el segundo «atrás» tras recargar con un panel encima (4-59).
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado
const DALIA = nombre(PROPIO_DALIA)

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
  await embudoPorDefecto(t.personas.duena)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

async function alListado(page: Page): Promise<void> {
  await entrar(page, t.personas.duena, { fresco: true })
  await irALeads(page)
}

test('«Nuevo lead»: abrir, recargar y «atrás» devuelve el foco al botón', async ({ page }) => {
  await alListado(page)
  await abrirRecargarYVolver(page, {
    boton: aLaVista(page.getByRole('button', { name: 'Nuevo lead' })).first(),
    dialogo: page.getByRole('dialog', { name: 'Nuevo lead' }),
  })
})

test('«Gestionar etiquetas», desde los filtros: abrir, recargar y «atrás» devuelve el foco al botón', async ({
  page,
}) => {
  // Los filtros al costado, no en la hoja (`?panel=filtros` es otro caso).
  await page.setViewportSize({ width: 1280, height: 900 })
  await alListado(page)
  await abrirRecargarYVolver(page, {
    boton: page
      .getByRole('complementary', { name: 'Filtros' })
      .getByRole('button', { name: 'Gestionar etiquetas' }),
    dialogo: dialogoDeEtiquetas(page),
  })
})

test('«Gestionar etiquetas», desde el selector del «⋯» de una fila: abrir, recargar y «atrás» devuelve el foco al «⋯»', async ({
  page,
}) => {
  await alListado(page)
  const masAcciones = menuDelLead(page, DALIA).first()
  await abrirRecargarYVolver(page, {
    boton: masAcciones,
    dialogo: dialogoDeEtiquetas(page),
    abrir: async () => {
      await expect(async () => {
        await masAcciones.click()
        await expect(page.getByRole('menu')).toBeVisible({ timeout: 1000 })
      }).toPass()
      await page.getByRole('menuitem', { name: 'Etiquetas…' }).click()
      await selectorDeEtiquetas(page).getByRole('option', { name: 'Gestionar etiquetas' }).click()
    },
  })
})

test('exportar, desde el menú «CSV»: abrir, recargar y «atrás» devuelve el foco a «CSV»', async ({
  page,
}) => {
  await alListado(page)
  const csv = aLaVista(page.getByRole('button', { name: 'CSV', exact: true })).first()
  const dialogo = page.getByRole('dialog', { name: 'Exportar leads' })
  await abrirRecargarYVolver(page, {
    boton: csv,
    dialogo,
    abrir: async () => {
      await expect(async () => {
        await csv.click()
        await expect(page.getByRole('menu')).toBeVisible({ timeout: 1000 })
      }).toPass()
      await page.getByRole('menuitem', { name: 'Exportar…' }).click()
    },
  })
})

test('el lead rápido, desde el nombre de la fila: abrir, recargar y «atrás» devuelve el foco al nombre', async ({
  page,
}) => {
  await alListado(page)
  const abrir = aLaVista(page.getByRole('button', { name: `Abrir ${DALIA}`, exact: true })).first()
  await abrirRecargarYVolver(page, {
    boton: abrir,
    dialogo: page.getByRole('dialog', { name: DALIA }),
    clave: 'lead',
    abrir: async () => {
      await abrir.focus()
      await page.keyboard.press('Enter')
    },
  })
})

test('«Etapas», en el embudo: abrir, recargar y «atrás» devuelve el foco al botón', async ({
  page,
}) => {
  await entrar(page, t.personas.duena, { fresco: true })
  await irAlEmbudo(page)
  await abrirRecargarYVolver(page, {
    boton: aLaVista(page.getByRole('button', { name: 'Etapas', exact: true })).first(),
    dialogo: page.getByRole('dialog', { name: /^Etapas de/ }),
  })
})

test('«Nuevo embudo»: abrir, recargar y «atrás» devuelve el foco al botón', async ({ page }) => {
  await entrar(page, t.personas.duena, { fresco: true })
  await irAlEmbudo(page)
  await abrirRecargarYVolver(page, {
    boton: aLaVista(page.getByRole('button', { name: 'Nuevo embudo', exact: true })).first(),
    dialogo: page.getByRole('dialog', { name: 'Nuevo embudo' }),
  })
})

async function alResumen(page: Page) {
  await alListado(page)
  const nombreDeLaFila = aLaVista(
    page.getByRole('button', { name: `Abrir ${DALIA}`, exact: true }),
  ).first()
  await nombreDeLaFila.focus()
  await page.keyboard.press('Enter')
  const resumen = page.getByRole('dialog', { name: DALIA })
  await expect(resumen).toBeVisible()
  return { resumen, nombreDeLaFila }
}

// Abre anotar o agendar desde el «⋯» del resumen; devuelve el «⋯» (a donde vuelve el foco).
function desdeElMasAcciones(page: Page, resumen: Locator, item: string, dialogo: Locator) {
  const masAcciones = resumen.getByRole('button', { name: `Más acciones de ${DALIA}`, exact: true })
  const abrir = async () => {
    await expect(async () => {
      await masAcciones.click()
      await expect(page.getByRole('menu')).toBeVisible({ timeout: 1000 })
    }).toPass()
    await page.getByRole('menuitem', { name: item }).click()
    await expect(dialogo).toBeVisible()
  }
  return { masAcciones, abrir }
}

for (const [item, titulo] of [
  ['Anotar seguimiento…', 'Anotar seguimiento'],
  ['Agendar recordatorio…', 'Agendar recordatorio'],
] as const) {
  test(`«${item}» desde el «⋯» del resumen: abrir, recargar y «atrás» devuelve el foco al «⋯»`, async ({
    page,
  }) => {
    const { resumen } = await alResumen(page)
    const dialogo = page.getByRole('dialog', { name: titulo })
    const { masAcciones, abrir } = desdeElMasAcciones(page, resumen, item, dialogo)
    await abrirRecargarYVolver(page, { boton: masAcciones, dialogo, abrir })
  })

  test(`«${item}» desde el «⋯» del resumen: sin recargar, «atrás» devuelve el foco al «⋯»`, async ({
    page,
  }) => {
    const { resumen } = await alResumen(page)
    const dialogo = page.getByRole('dialog', { name: titulo })
    const { masAcciones, abrir } = desdeElMasAcciones(page, resumen, item, dialogo)
    await abrir()
    await page.goBack()
    await expect(dialogo).toBeHidden()
    await expect(masAcciones).toBeFocused()
  })
}

// Tras recargar con el panel encima, el segundo «atrás» cierra el rápido y devuelve el foco al nombre de la fila.
async function segundoAtras(page: Page, resumen: Locator, nombreDeLaFila: Locator) {
  await page.goBack()
  await expect(resumen).toBeHidden()
  expect(new URL(page.url()).searchParams.get('lead')).toBeNull()
  await expect(nombreDeLaFila).toBeFocused()
}

test('el lead rápido, «Editar»: abrir, recargar y dos «atrás» devuelve el foco al nombre de la fila', async ({
  page,
}) => {
  const { resumen, nombreDeLaFila } = await alResumen(page)
  const editar = resumen.getByRole('button', { name: 'Editar', exact: true })
  const dialogo = page.getByRole('dialog', { name: /^Editar / })
  await abrirRecargarYVolver(page, {
    boton: editar,
    dialogo,
    abrir: async () => {
      await expect(async () => {
        await editar.click()
        await expect(dialogo).toBeVisible({ timeout: 1000 })
      }).toPass()
    },
  })
  await segundoAtras(page, resumen, nombreDeLaFila)
})

// Desde el «⋯» del resumen el primer «atrás» lleva a `?lead=<id>` (la URL de la apertura), donde la ficha de `lead` se recupera. Desde el botón de la
// pestaña, la entrada anterior ya es `&pestana=` y no: es el límite que dice DECISIONES.
test('el lead rápido, «Anotar seguimiento…» desde el «⋯» del resumen: abrir, recargar y dos «atrás» devuelve el foco al nombre de la fila', async ({
  page,
}) => {
  const { resumen, nombreDeLaFila } = await alResumen(page)
  const dialogo = page.getByRole('dialog', { name: 'Anotar seguimiento' })
  const { masAcciones, abrir } = desdeElMasAcciones(page, resumen, 'Anotar seguimiento…', dialogo)
  await abrirRecargarYVolver(page, { boton: masAcciones, dialogo, abrir })
  await segundoAtras(page, resumen, nombreDeLaFila)
})

// Guardia de 4-59: sin recargar, cerrar con Esc y dos «atrás» ya devolvía el foco al nombre de la fila; no puede dejar de hacerlo.
test('el lead rápido, «Editar» y Esc: sin recargar, dos «atrás» devuelve el foco al nombre de la fila', async ({
  page,
}) => {
  const { resumen, nombreDeLaFila } = await alResumen(page)
  const dialogo = page.getByRole('dialog', { name: /^Editar / })
  await expect(async () => {
    await resumen.getByRole('button', { name: 'Editar', exact: true }).click()
    await expect(dialogo).toBeVisible({ timeout: 1000 })
  }).toPass()
  await page.keyboard.press('Escape')
  await expect(dialogo).toBeHidden()
  await page.goBack()
  await expect(resumen).toBeVisible()
  await segundoAtras(page, resumen, nombreDeLaFila)
})

test('el lead rápido, «Anotar seguimiento» y Esc: sin recargar, dos «atrás» devuelve el foco al nombre de la fila', async ({
  page,
}) => {
  const { resumen, nombreDeLaFila } = await alResumen(page)
  await abrirPestanaDeSeguimientos(page, resumen)
  const dialogo = page.getByRole('dialog', { name: 'Anotar seguimiento' })
  await expect(async () => {
    await resumen.getByRole('button', { name: 'Anotar seguimiento' }).click()
    await expect(dialogo).toBeVisible({ timeout: 1000 })
  }).toPass()
  await page.keyboard.press('Escape')
  await expect(dialogo).toBeHidden()
  await page.goBack()
  await expect(resumen).toBeVisible()
  await segundoAtras(page, resumen, nombreDeLaFila)
})

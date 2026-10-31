import { expect, test, type Locator, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { idDePersona } from './soporte/leads-alta'
import { aLaVista } from './soporte/inventario'
import { bloqueDeCartera, panelDeCartera } from './soporte/leads-cartera'
import {
  botonCambiar,
  botonEditar,
  idDeLead,
  irAFicha,
  nuevoLead,
  panelDeEdicion,
  panelDeTelefono,
  tituloDeLaFicha,
} from './soporte/leads-ficha'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import {
  PROPIO_DALIA,
  limpiarListado,
  nombre,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { abrirMenuDeLaFicha, menuDeLaFicha } from './soporte/leads-marcas'
import { embudoPorDefecto, oportunidad } from './soporte/leads-oportunidades'
import { dialogoDeOtorgar, otorgarComo, seccionPortal } from './soporte/leads-portal'
import { compartirCon, modalDeRecordatorio, modalDeSeguimiento } from './soporte/leads-seguimientos'
import { abrirRecargarYVolver } from './soporte/vuelta-del-foco'

// La vuelta del foco en los paneles de la ficha del lead (4-49, paso 4.14-2a5): tras recargar con el panel abierto, «atrás» lo cierra y el foco vuelve a
// quien lo abrió. La sonda del paso midió que, sin la vuelta, el foco quedaba en `body` en cada uno de estos. «Agregar teléfono», anotar, agendar y
// sus «Editar» ya volvían, y «Gestionar etiquetas» también (su modal busca a quien lo abrió): los cubre Vitest.
let t: TerrenoDelListado
let leadId = ''
const DALIA = nombre(PROPIO_DALIA)
const TITULO_OP = 'E2E vuelta oportunidad'

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
  await embudoPorDefecto(t.personas.duena)
  leadId = await idDeLead(PROPIO_DALIA)
  await oportunidad(t.personas.duena, leadId, { titulo: TITULO_OP })
})

test.afterAll(async () => {
  await limpiarListado(t)
})

async function alaFicha(page: Page, id: string, consulta = ''): Promise<void> {
  await entrar(page, t.personas.duena, { fresco: true })
  await irAFicha(page, id, consulta)
}

// Pulsa hasta que el panel esté (la página hidrata antes de que el clic valga).
const hastaAbrir = (page: Page, dialogo: Locator, pulsar: () => Promise<void>) => async () => {
  await expect(async () => {
    await pulsar()
    await expect(dialogo).toBeVisible({ timeout: 1000 })
  }).toPass()
  void page
}

type Caso = {
  titulo: string
  consulta?: string
  dialogo: (page: Page) => Locator
  // Quien abre: a donde vuelve el foco.
  boton: (page: Page) => Locator
  // Cómo se abre, si no es un clic en `boton`.
  pulsar?: (page: Page) => Promise<void>
}

const itemDeOportunidad = (page: Page) =>
  aLaVista(page.getByRole('article', { name: TITULO_OP })).getByRole('button', {
    name: `Más acciones de «${TITULO_OP}»`,
  })

const CASOS: Caso[] = [
  { titulo: '«Editar»', dialogo: panelDeEdicion, boton: botonEditar },
  { titulo: '«Cambiar» el teléfono', dialogo: panelDeTelefono, boton: botonCambiar },
  {
    titulo: '«Compartir»',
    dialogo: (page) => panelDeCartera(page, 'Compartir lead'),
    boton: (page) => bloqueDeCartera(page).getByRole('button', { name: 'Compartir', exact: true }),
  },
  {
    titulo: '«Transferir»',
    dialogo: (page) => panelDeCartera(page, 'Transferir lead'),
    boton: (page) => bloqueDeCartera(page).getByRole('button', { name: 'Transferir', exact: true }),
  },
  {
    titulo: '«Nueva oportunidad»',
    consulta: '?seccion=oportunidades',
    dialogo: (page) => page.getByRole('dialog', { name: 'Nueva oportunidad' }),
    boton: (page) => page.getByRole('button', { name: 'Nueva oportunidad' }),
  },
  {
    titulo: '«Editar» una oportunidad, desde su «⋯»',
    consulta: '?seccion=oportunidades',
    dialogo: (page) => page.getByRole('dialog', { name: 'Editar oportunidad' }),
    boton: itemDeOportunidad,
    pulsar: async (page) => {
      await itemDeOportunidad(page).click()
      await page.getByRole('menuitem', { name: 'Editar' }).click()
    },
  },
  {
    titulo: '«Dar acceso» al portal',
    consulta: '?seccion=portal',
    dialogo: dialogoDeOtorgar,
    boton: (page) => seccionPortal(page).getByRole('button', { name: 'Dar acceso' }),
  },
]

for (const caso of CASOS) {
  test(`${caso.titulo}: abrir, recargar y «atrás» devuelve el foco a quien lo abrió`, async ({
    page,
  }) => {
    await alaFicha(page, leadId, caso.consulta)
    await expect(tituloDeLaFicha(page, DALIA)).toBeVisible()
    const dialogo = caso.dialogo(page)
    const boton = caso.boton(page)
    await abrirRecargarYVolver(page, {
      boton,
      dialogo,
      abrir: hastaAbrir(page, dialogo, async () => {
        await (caso.pulsar ? caso.pulsar(page) : boton.click())
      }),
    })
  })
}

test('«Revocar» el acceso al portal: abrir, recargar y «atrás» devuelve el foco al botón', async ({
  page,
}, info) => {
  const lead = await nuevoLead({
    corto: `Vuelta Portal ${info.project.name}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.duena,
  })
  await otorgarComo(t.personas.duena, lead.id, 'clave-vuelta-1')
  await alaFicha(page, lead.id, '?seccion=portal')
  await expect(seccionPortal(page)).toBeVisible()
  const boton = seccionPortal(page).getByRole('button', { name: 'Revocar' })
  const dialogo = page.getByRole('dialog', { name: /^Revocar el acceso de/ })
  await abrirRecargarYVolver(page, {
    boton,
    dialogo,
    abrir: hastaAbrir(page, dialogo, () => boton.click()),
  })
})

// «Salir de este lead» ya volvía desde el 4.14-2a5 (`abre(PANEL_SALIR)` marca): la sonda del 4.14-2a6 midió que, si abre sin marcar, el foco queda en
// `body`. Berta, con un lead propio del caso compartido.
test('«Salir de este lead»: abrir, recargar y «atrás» devuelve el foco al botón', async ({
  page,
}, info) => {
  const lead = await nuevoLead({
    corto: `Vuelta Salir ${info.project.name}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.duena,
  })
  await compartirCon(
    lead.id,
    await idDePersona(t.personas.berta),
    await idDePersona(t.personas.duena),
  )
  await entrar(page, t.personas.berta, { fresco: true })
  await irAFicha(page, lead.id)
  await expect(tituloDeLaFicha(page, lead.nombre)).toBeVisible()
  const boton = page.getByRole('button', { name: 'Salir de este lead' })
  const dialogo = page.getByRole('dialog', { name: `Salir de «${lead.nombre}»` })
  await abrirRecargarYVolver(page, {
    boton,
    dialogo,
    abrir: hastaAbrir(page, dialogo, () => boton.click()),
  })
})

// Anotar y agendar desde el «⋯» de la cabecera llegan por `router.push` (navegación del servidor, sin marca): sin recargar, «atrás» devuelve el foco
// al «⋯» (Base UI) y la vuelta no lo cambia. Tras recargar, el foco queda en `body`: abierto nuevo (docs/PLAN.md).
for (const [item, dialogo] of [
  ['Anotar seguimiento…', (page: Page) => modalDeSeguimiento(page, 'Anotar')],
  ['Agendar recordatorio…', (page: Page) => modalDeRecordatorio(page, 'Agendar')],
] as const) {
  test(`«${item}» desde el «⋯» de la ficha: sin recargar, «atrás» devuelve el foco al «⋯»`, async ({
    page,
  }) => {
    await alaFicha(page, leadId)
    await expect(tituloDeLaFicha(page, DALIA)).toBeVisible()
    await expect(async () => {
      const menu = await abrirMenuDeLaFicha(page)
      await menu.getByRole('menuitem', { name: item }).click()
      await expect(dialogo(page)).toBeVisible({ timeout: 2000 })
    }).toPass()
    await page.goBack()
    await expect(dialogo(page)).toBeHidden()
    await expect(menuDeLaFicha(page)).toBeFocused()
  })
}

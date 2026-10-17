import { expect, test, type Locator, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { aLaVista } from './soporte/inventario'
import { abrirEdicion, irAFicha } from './soporte/leads-ficha'
import { nacional } from './soporte/leads-ficha-telefonos'
import { nombre } from './soporte/leads-listado'
import { irAlEmbudo } from './soporte/leads-oportunidades'
import {
  capturar,
  limpiarRecorrido,
  prepararRecorrido,
  type TerrenoDelRecorrido,
} from './soporte/recorrido'

// Los paneles con formulario preguntan al salir desde un aviso (cierre 3, hallazgo 2): con algo escrito en el panel, pulsar «Abrir ficha»
// de un aviso (`sale: true`) pregunta en su pie («Tienes cambios sin guardar.»), «Seguir editando» no tira nada y «Descartar» sigue.
// El aviso sale del alta de lead (la única acción cotidiana con `sale: true`), que se cierra: el panel de abajo es otro. Cada panel
// va por una de las dos formas de dibujar su pie: dentro del cuerpo (`<PieDelPanel>`) o en la ranura `pie` del `<Drawer>`. Los demás
// paneles están en `src/shared/ui/drawer-con-cambios.test.tsx` y en la guarda `scripts/guardas/drawers-con-salida.test.ts`.
test.describe.configure({ mode: 'serial' })

let r: TerrenoDelRecorrido

test.beforeAll(async ({}, info) => {
  r = await prepararRecorrido(info.project.name, 'SalidaPaneles')
})

test.afterAll(async () => {
  await limpiarRecorrido(r)
})

// Crea un lead desde el panel «Nuevo lead», lo cierra y deja el aviso con «Abrir ficha» a la vista.
async function avisoConSalida(page: Page, corto: string): Promise<Locator> {
  const alta = page.getByRole('dialog', { name: 'Nuevo lead' })
  await expect(async () => {
    await aLaVista(page.getByRole('button', { name: /^Nuevo lead/ }))
      .first()
      .click()
    await expect(alta).toBeVisible({ timeout: 1000 })
  }).toPass()
  await alta.getByLabel('Teléfono principal').fill(nacional())
  await alta.getByLabel('Nombre').fill(nombre(corto))
  await page.keyboard.press('Control+s')
  const aviso = page.locator('[data-sonner-toast]').filter({ hasText: /Abrir ficha/ })
  await expect(aviso.getByRole('button', { name: 'Abrir ficha' })).toBeVisible()
  await expect(alta.getByLabel('Teléfono principal')).toHaveValue('')
  await page.keyboard.press('Escape')
  await expect(alta).toHaveCount(0)
  return aviso
}

type Panel = {
  nombre: string
  // Va a la pantalla donde está el panel.
  ir: (page: Page) => Promise<void>
  // Lo abre y devuelve su diálogo.
  abrir: (page: Page) => Promise<Locator>
  // Escribe algo en él.
  escribir: (panel: Locator) => Promise<void>
}

const PANELES: Panel[] = [
  {
    nombre: 'Editar el lead (pie dentro del cuerpo)',
    ir: (page) => irAFicha(page, r.dos.id),
    abrir: (page) => abrirEdicion(page),
    escribir: (panel) => panel.getByLabel('Nombre').fill('Otro nombre escrito'),
  },
  {
    nombre: 'Cambiar teléfono (pie dentro del cuerpo)',
    ir: (page) => irAFicha(page, r.dos.id),
    abrir: async (page) => {
      const panel = page.getByRole('dialog', { name: 'Cambiar teléfono principal' })
      await expect(async () => {
        await aLaVista(page.getByRole('button', { name: 'Cambiar', exact: true })).click()
        await expect(panel).toBeVisible({ timeout: 1000 })
      }).toPass()
      return panel
    },
    escribir: (panel) => panel.getByLabel('Teléfono nuevo').fill(`+${nacional()}`),
  },
  {
    nombre: 'Nueva oportunidad (pie en la ranura del Drawer)',
    ir: (page) => irAFicha(page, r.dos.id, '?seccion=oportunidades'),
    abrir: async (page) => {
      const panel = page.getByRole('dialog', { name: 'Nueva oportunidad' })
      await expect(async () => {
        await aLaVista(page.getByRole('button', { name: 'Nueva oportunidad' })).click()
        await expect(panel).toBeVisible({ timeout: 1000 })
      }).toPass()
      return panel
    },
    escribir: (panel) => panel.getByLabel('Título').fill('Una oportunidad sin guardar'),
  },
  {
    nombre: 'Etapas del embudo (pie en la ranura del Drawer)',
    ir: (page) => irAlEmbudo(page),
    abrir: async (page) => {
      const panel = page.getByRole('dialog', { name: /^Etapas de/ })
      await expect(async () => {
        await aLaVista(page.getByRole('button', { name: 'Etapas', exact: true })).click()
        await expect(panel).toBeVisible({ timeout: 1000 })
      }).toPass()
      return panel
    },
    escribir: (panel) => panel.getByLabel('Nombre del embudo').fill('Un nombre sin guardar'),
  },
]

for (const panel of PANELES) {
  test(`${panel.nombre}: con algo escrito, «Abrir ficha» pregunta y «Seguir editando» no tira nada`, async ({
    page,
  }, info) => {
    await entrar(page, r.ana.email)
    await panel.ir(page)
    const aviso = await avisoConSalida(
      page,
      `Salida ${info.project.name} ${panel.nombre.slice(0, 6)}`,
    )
    const abierto = await panel.abrir(page)
    await panel.escribir(abierto)
    const antes = page.url()
    await aviso.getByRole('button', { name: 'Abrir ficha' }).click()
    await expect(abierto.getByText('Tienes cambios sin guardar.')).toBeVisible()
    await expect(abierto.getByRole('button', { name: 'Seguir editando' })).toBeFocused()
    await capturar(
      page,
      info,
      `pregunta-${panel.nombre.slice(0, 8).trim().toLowerCase().replaceAll(' ', '-')}`,
    )
    expect(page.url()).toBe(antes)
    await abierto.getByRole('button', { name: 'Seguir editando' }).click()
    await expect(abierto.getByText('Tienes cambios sin guardar.')).toHaveCount(0)
    await expect(abierto).toBeVisible()
  })

  test(`${panel.nombre}: «Descartar» sigue a la ficha del lead nuevo`, async ({ page }, info) => {
    await entrar(page, r.ana.email)
    await panel.ir(page)
    const corto = `Descarta ${info.project.name} ${panel.nombre.slice(0, 6)}`
    const aviso = await avisoConSalida(page, corto)
    const abierto = await panel.abrir(page)
    await panel.escribir(abierto)
    await aviso.getByRole('button', { name: 'Abrir ficha' }).click()
    await abierto.getByRole('button', { name: 'Descartar' }).click()
    await expect(page).toHaveURL(/\/leads\/[0-9a-f-]{36}/)
    await expect(page.getByRole('heading', { name: nombre(corto), level: 1 })).toBeVisible()
  })

  test(`${panel.nombre}: sin nada escrito, el aviso sale directo`, async ({ page }, info) => {
    await entrar(page, r.ana.email)
    await panel.ir(page)
    const corto = `Directo ${info.project.name} ${panel.nombre.slice(0, 6)}`
    const aviso = await avisoConSalida(page, corto)
    const abierto = await panel.abrir(page)
    await aviso.getByRole('button', { name: 'Abrir ficha' }).click()
    await expect(page).toHaveURL(/\/leads\/[0-9a-f-]{36}/)
    await expect(abierto.getByText('Tienes cambios sin guardar.')).toHaveCount(0)
  })
}

import type { TestInfo } from '@playwright/test'
import { expect, test, type Locator, type Page } from './soporte/prueba'
import { entrar, limpiarAlta, prepararAlta } from './soporte/alta'
import { esMovil } from './soporte/inventario'
import { irAlEmbudo } from './soporte/leads-oportunidades'
import { capturar } from './soporte/recorrido'

// Un modal en el celular con el texto al 200 % (cierre 5b, defecto 4.4): el cuerpo quedaba en una cuarta parte de la pantalla —el pie, con dos
// botones apilados, ocupaba casi la mitad, y con la pregunta de descartar más— y la descripción, fija arriba, le quitaba lo que quedaba.
// Ahora la descripción se desplaza con el cuerpo, los botones miden 44 px (no 2,75 rem) y el pie reparte sus botones en una fila si caben.
// Lo que se mide: lo que ocupa el pie, lo que queda de cuerpo, que lo último del cuerpo se alcance y que los botones se toquen.
test.describe.configure({ mode: 'serial' })

let terreno: Awaited<ReturnType<typeof prepararAlta>>

test.beforeAll(async ({}, info) => {
  terreno = await prepararAlta(info.project.name)
})

test.afterAll(async () => {
  await limpiarAlta(terreno.restaurarCatalogos)
})

type Medida = {
  pantalla: number
  modal: number
  pie: number
  cuerpoVisible: number
  ultimoAlcanzable: boolean
  botones: number[]
}

// Cuánto ocupa cada parte del modal y si se alcanza lo último del cuerpo (se desplaza hasta el final y mira que no quede bajo el pie).
const medir = (dialogo: Locator): Promise<Medida> =>
  dialogo.evaluate((modal) => {
    const pie = modal.querySelector('[data-slot=dialog-footer]')
    const cuerpo = [...modal.children].find(
      (hijo) => getComputedStyle(hijo).overflowY === 'auto',
    ) as HTMLElement | undefined
    if (cuerpo) {
      cuerpo.scrollTop = cuerpo.scrollHeight
    }
    const ultimo = cuerpo?.lastElementChild
    return {
      pantalla: window.innerHeight,
      modal: modal.getBoundingClientRect().height,
      pie: pie?.getBoundingClientRect().height ?? 0,
      cuerpoVisible: cuerpo?.clientHeight ?? 0,
      ultimoAlcanzable:
        !ultimo ||
        !cuerpo ||
        ultimo.getBoundingClientRect().bottom <= cuerpo.getBoundingClientRect().bottom + 1,
      botones: [...(pie?.querySelectorAll('button') ?? [])].map(
        (boton) => boton.getBoundingClientRect().height,
      ),
    }
  })

const al200 = (page: Page) =>
  page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })

async function exigirModalAprovechable(
  page: Page,
  dialogo: Locator,
  nombre: string,
  { info, pieMaximo, cuerpoMinimo }: { info: TestInfo; pieMaximo: number; cuerpoMinimo: number },
) {
  const m = await medir(dialogo)
  const resumen = `pie ${String(Math.round(m.pie))} px (${String(Math.round((100 * m.pie) / m.pantalla))} % de la pantalla), cuerpo ${String(Math.round(m.cuerpoVisible))} px (${String(Math.round((100 * m.cuerpoVisible) / m.modal))} % del modal), botones ${m.botones.map((b) => String(Math.round(b))).join('/')} px`
  info.annotations.push({ type: nombre, description: resumen })
  expect(m.pie / m.pantalla, `${nombre}: el pie ocupa poco (${resumen})`).toBeLessThanOrEqual(
    pieMaximo,
  )
  expect(m.cuerpoVisible / m.modal, `${nombre}: queda cuerpo (${resumen})`).toBeGreaterThanOrEqual(
    cuerpoMinimo,
  )
  expect(m.ultimoAlcanzable, `${nombre}: lo último del cuerpo se alcanza (${resumen})`).toBe(true)
  for (const alto of m.botones) {
    expect(alto, `${nombre}: los botones se tocan (${resumen})`).toBeGreaterThanOrEqual(44)
  }
  await capturar(page, info, nombre.replaceAll(' ', '-'))
}

const MODALES = [
  {
    nombre: 'nuevo rol',
    persona: 'duena',
    abrir: async (page: Page) => {
      await page.goto('/configuracion/roles')
      await page.getByRole('button', { name: 'Nuevo rol' }).click()
      return { dialogo: page.getByRole('dialog', { name: 'Nuevo rol' }), campo: 'Nombre del rol' }
    },
  },
  {
    nombre: 'invitar',
    persona: 'duena',
    abrir: async (page: Page) => {
      await page.goto('/configuracion/equipo')
      await page.getByRole('button', { name: 'Invitar' }).click()
      return {
        dialogo: page.getByRole('dialog', { name: 'Invitar a una persona' }),
        campo: 'Correo',
      }
    },
  },
  {
    nombre: 'nuevo embudo',
    persona: 'berta',
    abrir: async (page: Page) => {
      await irAlEmbudo(page)
      await page.getByRole('button', { name: 'Nuevo embudo' }).click()
      return { dialogo: page.getByRole('dialog', { name: 'Nuevo embudo' }), campo: 'Nombre' }
    },
  },
] as const

for (const modal of MODALES) {
  test(`${modal.nombre} en el celular al 200 %: el pie no se come el modal, con y sin la pregunta de descartar`, async ({
    page,
  }, info) => {
    test.skip(!esMovil(page), 'El pie apilado es del celular: el escritorio lo pone en una fila.')
    await entrar(page, terreno.personas[modal.persona])
    const { dialogo, campo } = await modal.abrir(page)
    await expect(dialogo).toBeVisible()
    await al200(page)
    await exigirModalAprovechable(page, dialogo, `${modal.nombre} 200`, {
      info,
      pieMaximo: 0.26,
      cuerpoMinimo: 0.45,
    })

    // Con algo escrito, Esc pregunta en el mismo pie: más alto (la pregunta y sus botones), pero también aprovechable.
    await dialogo.getByLabel(campo, { exact: true }).fill('algo escrito')
    await page.keyboard.press('Escape')
    await expect(dialogo.getByText('Tienes cambios sin guardar.')).toBeVisible()
    await exigirModalAprovechable(page, dialogo, `${modal.nombre} pregunta 200`, {
      info,
      pieMaximo: 0.36,
      cuerpoMinimo: 0.3,
    })
  })
}

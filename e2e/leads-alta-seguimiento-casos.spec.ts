import { expect, test, type Locator, type Page } from './soporte/prueba'
import {
  abrirConN,
  dialogo,
  entrar,
  limpiarAlta,
  prepararAlta,
  type PersonasDelAlta,
} from './soporte/alta'
import { crearLead } from './soporte/leads'
import {
  apagarTodosLosTipos,
  codigoDePaisDeLaEmpresa,
  leadsConTelefono,
  mandarAlLimbo,
  seguimientosDe,
  telefonoAlAzar,
} from './soporte/leads-alta'

// Los casos de borde del primer seguimiento del alta (parte 9b): el editor diferido, el borrador con
// formato, «Tomar lead», sin tipos de seguimiento activos y el modo oscuro.
test.describe.configure({ mode: 'serial' })

let personas: PersonasDelAlta
let restaurar = async () => {}
let codigo = ''

test.beforeAll(async ({}, info) => {
  const terreno = await prepararAlta(`${info.project.name}-seg2`)
  personas = terreno.personas
  restaurar = terreno.restaurarCatalogos
  codigo = await codigoDePaisDeLaEmpresa()
})

test.afterAll(async () => {
  await limpiarAlta(restaurar)
})

const nuevoNumero = () => {
  const nacional = telefonoAlAzar()
  return { nacional, normalizado: `${codigo}${nacional}` }
}

async function llenarDatos(page: Page, nacional: string, nombre: string) {
  const panel = dialogo(page)
  await panel.getByLabel('Teléfono principal').fill(nacional)
  await panel.getByLabel('Nombre', { exact: true }).fill(nombre)
}

const editorDelAlta = (page: Page): Locator =>
  dialogo(page).getByRole('textbox', { name: 'Detalle (opcional)' })

test('el editor y los campos del seguimiento no se piden hasta abrir el paso 2', async ({
  page,
}) => {
  const conEditor: string[] = []
  page.on('response', (respuesta) => {
    const url = respuesta.url()
    if (url.includes('/_next/static/') && url.endsWith('.js')) {
      void respuesta
        .text()
        .then((texto) => {
          if (texto.includes('ProseMirror')) {
            conEditor.push(url)
          }
        })
        .catch(() => undefined)
    }
  })
  await entrar(page, personas.duena)
  await page.goto('/leads')
  await page.waitForLoadState('networkidle')
  expect(conEditor).toEqual([])

  await abrirConN(page)
  await dialogo(page).getByLabel('Teléfono principal').fill('+54 9 11 5555-0000')
  await page.waitForLoadState('networkidle')
  expect(conEditor).toEqual([])

  await dialogo(page).getByLabel('Nombre', { exact: true }).fill('E2E Chunk')
  await page.keyboard.press('Control+Enter')
  await expect(dialogo(page).getByLabel('Resumen')).toBeVisible()
  await expect.poll(() => conEditor.length).toBeGreaterThan(0)
})

test('lo escrito del seguimiento, con su formato, vuelve tras recargar', async ({ page }, info) => {
  const { nacional } = nuevoNumero()
  await entrar(page, personas.duena)
  await abrirConN(page)
  const panel = dialogo(page)
  await llenarDatos(page, nacional, `E2E Borrador ${info.project.name}`)
  await page.keyboard.press('Control+Enter')
  await panel.getByLabel('Resumen').fill('Lo dejé a medias')
  const editor = editorDelAlta(page)
  await editor.click()
  await panel.getByRole('button', { name: 'Negrita' }).click()
  await editor.pressSequentially('Con formato')

  await page.reload()
  await expect(page.getByText('Recuperamos lo que habías escrito y no guardaste.')).toBeVisible()
  await abrirConN(page)
  // Sin abrir el paso 2 el pie ya sabe que hay un seguimiento escrito.
  await expect(
    dialogo(page).getByText('Se guardará con el primer seguimiento que escribiste.'),
  ).toBeVisible()
  await dialogo(page).getByRole('button', { name: 'Seguir con el seguimiento' }).click()
  await expect(dialogo(page).getByLabel('Resumen')).toHaveValue('Lo dejé a medias')
  await expect(editorDelAlta(page).locator('strong')).toHaveText('Con formato')
})

test('«Tomar lead» con seguimiento enriquecido y sin seguimiento', async ({ page }, info) => {
  await entrar(page, personas.duena)
  for (const conSeguimiento of [true, false]) {
    const { nacional, normalizado } = nuevoNumero()
    const leadId = await crearLead({
      nombre: `Limbo9b ${conSeguimiento ? 'con' : 'sin'} ${info.project.name}`,
      telefono: normalizado,
      deQuien: personas.berta,
    })
    await mandarAlLimbo(leadId)
    await page.goto('/leads')
    await abrirConN(page)
    const panel = dialogo(page)
    await panel.getByLabel('Teléfono principal').fill(nacional)
    await expect(panel.getByText('Sin dueño.')).toBeVisible()
    await panel.getByLabel('Nombre', { exact: true }).fill('Nombre que no pisa')
    await panel.getByRole('button', { name: 'Tomar lead' }).click()
    if (conSeguimiento) {
      await page.keyboard.press('Control+Enter')
      await panel.getByLabel('Resumen').fill('Retomé el contacto')
      await editorDelAlta(page).click()
      await editorDelAlta(page).pressSequentially('Volvió a escribir')
      await page.keyboard.press('Control+Enter')
      await expect(page.getByText(/^Lead tomado(?! sin seguimiento)/)).toBeVisible()
      const [seguimiento] = await seguimientosDe(leadId)
      expect(seguimiento?.detalle_texto).toBe('Volvió a escribir')
    } else {
      await page.keyboard.press('Control+s')
      await expect(page.getByText(/Lead tomado sin seguimiento/)).toBeVisible()
      expect(await seguimientosDe(leadId)).toEqual([])
    }
  }
})

test('sin tipos de seguimiento activos se guarda sin seguimiento y no se bloquea', async ({
  page,
}, info) => {
  const { nacional, normalizado } = nuevoNumero()
  const volver = await apagarTodosLosTipos()
  try {
    await entrar(page, personas.duena)
    await page.goto('/leads')
    await abrirConN(page)
    const panel = dialogo(page)
    await llenarDatos(page, nacional, `E2E Sin Tipos ${info.project.name}`)
    await expect(
      panel.getByText(
        'No hay tipos de seguimiento activos: se creará sin primer seguimiento. Podrás anotarlo después desde la ficha.',
      ),
    ).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Seguir con el seguimiento' })).toHaveCount(0)
    await page.keyboard.press('Control+Enter')
    await expect(page.getByText(/Lead creado sin seguimiento/)).toBeVisible()
    const [lead] = await leadsConTelefono(normalizado)
    expect(await seguimientosDe(lead?.id ?? '')).toEqual([])
  } finally {
    await volver()
  }
})

test('en modo oscuro el editor y su ayuda se leen', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await entrar(page, personas.duena)
  await abrirConN(page)
  await dialogo(page).getByLabel('Teléfono principal').fill(nuevoNumero().nacional)
  await dialogo(page).getByLabel('Nombre', { exact: true }).fill('E2E Oscuro')
  await page.keyboard.press('Control+Enter')
  await expect(dialogo(page).getByLabel('Resumen')).toBeFocused()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await dialogo(page).getByRole('button', { name: 'Programar próximo contacto' }).click()
  const razones = await dialogo(page).evaluate((panel) => {
    const rgb = (texto: string) =>
      /\d+(\.\d+)?/g.exec(texto) ? (texto.match(/\d+(\.\d+)?/g)?.map(Number) ?? []) : []
    const luz = (texto: string) => {
      const [r = 0, g = 0, b = 0] = rgb(texto).map((c) => {
        const v = c / 255
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const contraste = (a: string, b: string) => {
      const [x, y] = [luz(a), luz(b)].sort((m, n) => n - m)
      return ((x ?? 0) + 0.05) / ((y ?? 0) + 0.05)
    }
    const fondo = (el: Element): string => {
      for (let nodo: Element | null = el; nodo; nodo = nodo.parentElement) {
        const color = getComputedStyle(nodo).backgroundColor
        if (!/rgba\(.*, 0\)|transparent/.test(color)) {
          return color
        }
      }
      return 'rgb(0, 0, 0)'
    }
    const medir = (selector: string) => {
      const el = panel.querySelector(selector)
      return el ? contraste(getComputedStyle(el).color, fondo(el)) : 0
    }
    return {
      editor: medir('.documento-de-seguimiento'),
      ayuda: medir('[id$="-recordatorio-ayuda"]'),
    }
  })
  expect(razones.editor).toBeGreaterThanOrEqual(4.5)
  expect(razones.ayuda).toBeGreaterThanOrEqual(4.5)
})

test('sin red, guardar desde el paso 1 con un seguimiento escrito sale solo al volver, una vez', async ({
  page,
  context,
}, info) => {
  const { nacional, normalizado } = nuevoNumero()
  await entrar(page, personas.duena)
  await abrirConN(page)
  const panel = dialogo(page)
  await panel.getByLabel('Teléfono principal').fill(nacional)
  await panel.getByLabel('Nombre', { exact: true }).fill(`E2E Sin red 9b ${info.project.name}`)
  await page.keyboard.press('Control+Enter')
  await panel.getByLabel('Resumen').fill('Escribió sin señal')
  await editorDelAlta(page).click()
  await editorDelAlta(page).pressSequentially('Detalle con formato')
  await panel.getByRole('button', { name: 'Volver a los datos' }).click()

  await context.setOffline(true)
  await page.keyboard.press('Control+s')
  await expect(panel.getByText(/No hay conexión\. Lo que escribiste sigue acá/)).toBeVisible()
  expect(await leadsConTelefono(normalizado)).toHaveLength(0)

  await context.setOffline(false)
  await expect(page.getByText(/^Lead creado(?! sin seguimiento)/)).toBeVisible()
  const [lead] = await leadsConTelefono(normalizado)
  const guardados = await seguimientosDe(lead?.id ?? '')
  expect(guardados.map((s) => s.titulo)).toEqual(['Escribió sin señal'])
  expect(guardados[0]?.detalle_texto).toBe('Detalle con formato')
})

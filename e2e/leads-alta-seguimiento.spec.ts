import { expect, test, type Locator, type Page } from './soporte/prueba'
import {
  abrirConN,
  dialogo,
  entrar,
  limpiarAlta,
  prepararAlta,
  type PersonasDelAlta,
} from './soporte/alta'
import {
  codigoDePaisDeLaEmpresa,
  leadsConTelefono,
  recordatoriosDe,
  seguimientosDe,
  telefonoAlAzar,
} from './soporte/leads-alta'

// El primer seguimiento del alta es opcional y enriquecido (parte 9b): se guarda el lead solo, con un
// seguimiento con formato y fecha pasada, y «Próximo contacto» sale plegado. El editor se pide recién al
// abrir el paso 2.
test.describe.configure({ mode: 'serial' })

let personas: PersonasDelAlta
let restaurar = async () => {}
let codigo = ''

test.beforeAll(async ({}, info) => {
  const terreno = await prepararAlta(`${info.project.name}-seg`)
  personas = terreno.personas
  restaurar = terreno.restaurarCatalogos
  codigo = await codigoDePaisDeLaEmpresa()
})

test.afterAll(async () => {
  await limpiarAlta(restaurar)
})

const AVISO_SIN = 'Se creará sin primer seguimiento. Podrás anotarlo después desde la ficha.'

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

// Pega algo en el editor como lo haría el portapapeles (el navegador lo trata como un pegado de verdad).
async function pegar(editor: Locator, texto: string, html?: string) {
  await editor.evaluate(
    (el, datos) => {
      const transferencia = new DataTransfer()
      transferencia.setData('text/plain', datos.texto)
      if (datos.html) {
        transferencia.setData('text/html', datos.html)
      }
      el.dispatchEvent(
        new ClipboardEvent('paste', {
          clipboardData: transferencia,
          bubbles: true,
          cancelable: true,
        }),
      )
    },
    { texto, html: html ?? null },
  )
}

test('se guarda el lead desde el paso 1, sin diálogo, y el aviso lo dice', async ({
  page,
}, info) => {
  const { nacional, normalizado } = nuevoNumero()
  await entrar(page, personas.duena)
  await abrirConN(page)
  const panel = dialogo(page)
  await llenarDatos(page, nacional, `E2E Sin Seg ${info.project.name}`)
  await expect(panel.getByText(AVISO_SIN)).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Seguir con el seguimiento' })).toBeVisible()

  // `Ctrl/Cmd+S`: guarda y deja el drawer listo para el siguiente, sin preguntar nada.
  await page.keyboard.press('Control+s')
  await expect(page.getByText(/Lead creado sin seguimiento/)).toBeVisible()
  await expect(panel.getByLabel('Teléfono principal')).toHaveValue('')
  await expect(panel.getByLabel('Teléfono principal')).toBeFocused()

  const [lead] = await leadsConTelefono(normalizado)
  expect(lead).toBeDefined()
  expect(await seguimientosDe(lead?.id ?? '')).toEqual([])
  expect(await recordatoriosDe(lead?.id ?? '')).toEqual([])

  // «Abrir ficha» lleva a donde se anota después.
  await page.getByRole('button', { name: 'Abrir ficha' }).click()
  await expect(page).toHaveURL(new RegExp(`/leads/${lead?.id ?? ''}\\?seccion=seguimientos`))
})

test('con el paso 2 abierto y vacío también se guarda sin seguimiento, con el mismo aviso', async ({
  page,
}, info) => {
  const { nacional, normalizado } = nuevoNumero()
  await entrar(page, personas.duena)
  await abrirConN(page)
  const panel = dialogo(page)
  await llenarDatos(page, nacional, `E2E Paso Vacio ${info.project.name}`)
  await page.keyboard.press('Control+Enter')
  await expect(panel.getByLabel('Resumen')).toBeFocused()
  await expect(panel.getByText(AVISO_SIN)).toBeVisible()
  // Cambiar sólo el tipo no cuenta como escribir.
  await panel.getByLabel('Tipo de seguimiento').selectOption({ index: 1 })
  await expect(panel.getByText(AVISO_SIN)).toBeVisible()

  await panel.getByRole('button', { name: 'Guardar lead' }).click()
  await expect(page.getByText(/Lead creado sin seguimiento/)).toBeVisible()
  const [lead] = await leadsConTelefono(normalizado)
  expect(await seguimientosDe(lead?.id ?? '')).toEqual([])
})

test('un seguimiento enriquecido con fecha pasada se guarda como documento y se dibuja en la ficha', async ({
  page,
}, info) => {
  const { nacional, normalizado } = nuevoNumero()
  await entrar(page, personas.duena)
  await abrirConN(page)
  const panel = dialogo(page)
  await llenarDatos(page, nacional, `E2E Enriquecido ${info.project.name}`)
  await page.keyboard.press('Control+Enter')
  await expect(panel.getByLabel('Resumen')).toBeFocused()
  await panel.getByLabel('Resumen').fill('Hablamos por teléfono')
  await panel.getByRole('button', { name: 'Otra fecha' }).click()
  await panel.getByLabel('Cuándo fue').fill('2020-03-04T10:30')

  const editor = editorDelAlta(page)
  await editor.click()
  await panel.getByRole('button', { name: 'Negrita' }).click()
  await editor.pressSequentially('Urgente')
  await panel.getByRole('button', { name: 'Negrita' }).click()
  await editor.press('Enter')
  await panel.getByRole('button', { name: 'Lista con viñetas' }).click()
  await editor.pressSequentially('RAV4 2019')
  await expect(
    panel.getByText('Se guardará con el primer seguimiento que escribiste.'),
  ).toBeVisible()
  await panel.getByRole('button', { name: 'Guardar lead' }).click()
  await expect(page.getByText(/^Lead creado(?! sin seguimiento)/)).toBeVisible()

  const [lead] = await leadsConTelefono(normalizado)
  const [seguimiento] = await seguimientosDe(lead?.id ?? '')
  expect(seguimiento?.titulo).toBe('Hablamos por teléfono')
  expect(seguimiento?.ocurrido_en.startsWith('2020-03-04')).toBe(true)
  expect(seguimiento?.detalle_texto).toContain('Urgente')
  expect(seguimiento?.detalle_texto).toContain('RAV4 2019')
  const doc = JSON.stringify(seguimiento?.detalle_doc)
  expect(doc).toContain('"bold"')
  expect(doc).toContain('bulletList')
  expect(await recordatoriosDe(lead?.id ?? '')).toEqual([])

  await page.goto(`/leads/${lead?.id ?? ''}?seccion=seguimientos`)
  const anotado = page
    .getByRole('region', { name: 'Seguimientos' })
    .getByRole('article', { name: 'Hablamos por teléfono' })
  await expect(anotado.locator('strong')).toHaveText('Urgente')
  await expect(anotado.locator('ul li')).toHaveText(['RAV4 2019'])
})

test('«Próximo contacto» nace plegado y se programa con el teclado; uno en el pasado se dice junto al campo', async ({
  page,
}, info) => {
  const { nacional, normalizado } = nuevoNumero()
  await entrar(page, personas.duena)
  await abrirConN(page)
  const panel = dialogo(page)
  await llenarDatos(page, nacional, `E2E Proximo ${info.project.name}`)
  await page.keyboard.press('Control+Enter')
  await expect(panel.getByLabel('Resumen')).toBeFocused()
  await expect(panel.getByLabel('Fecha y hora')).toHaveCount(0)
  await expect(panel.getByText('Recordatorio (opcional)')).toHaveCount(0)
  await panel.getByLabel('Resumen').fill('Quedó en confirmar')

  // Resumen → la barra del editor (una sola parada) → el editor → «Programar próximo contacto».
  await page.keyboard.press('Tab')
  await expect(panel.getByRole('button', { name: 'Negrita' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(editorDelAlta(page)).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(panel.getByRole('button', { name: 'Programar próximo contacto' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(panel.getByRole('button', { name: 'Mañana 09:00' })).toBeFocused()
  await expect(
    panel.getByText('Un recordatorio para ti: cuándo volver a contactar a este lead.'),
  ).toBeVisible()

  // Una fecha pasada se rechaza junto al campo y no guarda nada.
  await panel.getByLabel('Fecha y hora').fill('2020-01-01T09:00')
  await page.keyboard.press('Control+Enter')
  await expect(panel.getByText('El recordatorio tiene que ser en el futuro.')).toBeVisible()
  await expect(panel.getByLabel('Fecha y hora')).toBeFocused()
  expect(await leadsConTelefono(normalizado)).toHaveLength(0)

  await panel.getByRole('button', { name: 'Mañana 09:00' }).click()
  await page.keyboard.press('Control+Enter')
  await expect(page.getByText(/^Lead creado(?! sin seguimiento)/)).toBeVisible()
  const [lead] = await leadsConTelefono(normalizado)
  const [recordatorio] = await recordatoriosDe(lead?.id ?? '')
  expect(recordatorio?.titulo).toBe('Quedó en confirmar')
  expect(Date.parse(recordatorio?.recordar_en ?? '')).toBeGreaterThan(Date.now())
})

test('un detalle o un próximo contacto sin resumen pide el resumen: no lo deriva', async ({
  page,
}, info) => {
  const { nacional, normalizado } = nuevoNumero()
  await entrar(page, personas.duena)
  await abrirConN(page)
  const panel = dialogo(page)
  await llenarDatos(page, nacional, `E2E Sin Resumen ${info.project.name}`)
  // Desde el paso 1: lo escrito en el 2 manda, y se vuelve a él.
  await page.keyboard.press('Control+Enter')
  await expect(panel.getByLabel('Resumen')).toBeFocused()
  await editorDelAlta(page).click()
  await editorDelAlta(page).pressSequentially('Sólo un detalle')
  await panel.getByRole('button', { name: 'Volver a los datos' }).click()
  await expect(panel.getByLabel('Teléfono principal')).toBeVisible()

  await panel.getByRole('button', { name: 'Guardar lead' }).click()
  await expect(panel.getByText('Escribe un resumen del seguimiento.')).toBeVisible()
  await expect(panel.getByLabel('Resumen')).toBeFocused()
  expect(await leadsConTelefono(normalizado)).toHaveLength(0)

  await panel.getByLabel('Resumen').fill('Ahora sí')
  await page.keyboard.press('Control+Enter')
  await expect(page.getByText(/^Lead creado(?! sin seguimiento)/)).toBeVisible()
})

test('lo pegado conserva sólo lo admitido y un detalle demasiado largo se dice junto al campo', async ({
  page,
}, info) => {
  const { nacional, normalizado } = nuevoNumero()
  await entrar(page, personas.duena)
  await abrirConN(page)
  const panel = dialogo(page)
  await llenarDatos(page, nacional, `E2E Pegado ${info.project.name}`)
  await page.keyboard.press('Control+Enter')
  await panel.getByLabel('Resumen').fill('Pegué cosas')
  const editor = editorDelAlta(page)
  await editor.click()
  await pegar(
    editor,
    'Título texto',
    '<h1>Título</h1><p>texto <b>negrita</b> <img src=x onerror="window.__xss=1"></p><script>window.__xss=2</script>',
  )
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined()
  await expect(editor.locator('strong')).toHaveText('negrita')
  await expect(editor.locator('h1, img, script')).toHaveCount(0)

  // Más de 5000 caracteres.
  await editor.press('Control+a')
  await pegar(editor, 'a'.repeat(5001))
  await page.keyboard.press('Control+Enter')
  await expect(panel.getByText('El detalle admite hasta 5000 caracteres.')).toBeVisible()
  expect(await leadsConTelefono(normalizado)).toHaveLength(0)

  // Pocos caracteres pero demasiados nodos (más de 20 000 octetos).
  await editor.press('Control+a')
  await pegar(editor, Array.from({ length: 900 }, () => 'x').join('\n\n'))
  await page.keyboard.press('Control+Enter')
  await expect(panel.getByText('El detalle es demasiado largo.')).toBeVisible()
  expect(await leadsConTelefono(normalizado)).toHaveLength(0)
  // Lo escrito sigue ahí.
  await expect(panel.getByLabel('Resumen')).toHaveValue('Pegué cosas')
})

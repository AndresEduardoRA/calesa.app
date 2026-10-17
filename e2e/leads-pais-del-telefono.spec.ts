import { expect, test } from './soporte/prueba'
import {
  abrirConN,
  dialogo,
  entrar,
  limpiarAlta,
  prepararAlta,
  type PersonasDelAlta,
} from './soporte/alta'
import { admin } from './soporte/base'
import { exigir } from './soporte/leads'
import { codigoDePaisDeLaEmpresa, leadsConTelefono, telefonoAlAzar } from './soporte/leads-alta'
import { abrirAgregarTelefono } from './soporte/leads-ficha-telefonos'

// El país del teléfono, contra la app compilada y el Supabase local: se dice al tipear (sin pedir
// nada), «País» lo sigue mientras la persona no lo toque, la ficha lo muestra y la tabla no viaja
// hasta que se abre el alta.
test.describe.configure({ mode: 'serial' })

let personas: PersonasDelAlta
let restaurar = async () => {}
let codigo = ''
let paisDeLaEmpresa = ''

test.beforeAll(async ({}, info) => {
  const terreno = await prepararAlta(`${info.project.name}-pais`)
  personas = terreno.personas
  restaurar = terreno.restaurarCatalogos
  codigo = await codigoDePaisDeLaEmpresa()
  const { data, error } = await admin()
    .from('ajustes_empresa')
    .select('pais')
    .eq('id', 1)
    .single<{ pais: string }>()
  exigir(error, 'leer el país de la empresa')
  paisDeLaEmpresa = data?.pais ?? ''
})

test.afterAll(async () => {
  await limpiarAlta(restaurar)
})

const COMO = (texto: string) => `Se guardará como ${texto}.`

test('al tipear dice de qué país es el número, y sin «+» es el de la empresa', async ({ page }) => {
  await entrar(page, personas.duena)
  await abrirConN(page)
  const panel = dialogo(page)
  const telefono = panel.getByLabel('Teléfono principal')

  await telefono.fill('+54 9 11 5555-0000')
  await expect(panel.getByText(COMO('+54 91155550000 · Argentina'))).toBeVisible()
  await telefono.fill('0056 9 6123 4567')
  await expect(panel.getByText(COMO('+56 961234567 · Chile'))).toBeVisible()

  // Sin «+» ni «00»: el número es de la empresa y dice su país.
  const nacional = telefonoAlAzar()
  await telefono.fill(nacional)
  await expect(panel.getByText(COMO(`+${codigo} ${nacional} · ${paisDeLaEmpresa}`))).toBeVisible()
})

test('un prefijo a medio tipear, desconocido o compartido', async ({ page }) => {
  await entrar(page, personas.duena)
  await abrirConN(page)
  const panel = dialogo(page)
  const telefono = panel.getByLabel('Teléfono principal')

  // «+59» todavía no es un teléfono: ni país ni línea.
  await telefono.fill('+59')
  await expect(panel.getByText('Se guardará como')).toHaveCount(0)

  await telefono.fill('+999 1234 5678')
  await expect(panel.getByText(COMO('+99912345678 · Código de país desconocido'))).toBeVisible()

  // +1 sin área propia no se adivina.
  await telefono.fill('+1 305 555 0100')
  await expect(panel.getByText(COMO('+1 3055550100 · Estados Unidos o Canadá'))).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Es de Estados Unidos' })).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Es de Canadá' })).toBeVisible()

  // Un área propia del Caribe sí.
  await telefono.fill('+1 809 555 1234')
  await expect(panel.getByText(COMO('+1 8095551234 · República Dominicana'))).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Es de Canadá' })).toHaveCount(0)
})

test('«País» sigue al número, respeta lo que se escribe y vuelve a seguirlo si se borra', async ({
  page,
}) => {
  await entrar(page, personas.duena)
  await abrirConN(page)
  const panel = dialogo(page)
  const telefono = panel.getByLabel('Teléfono principal')
  await panel.getByText('Más datos').click()
  const pais = panel.getByLabel('País', { exact: true })
  await expect(pais).toHaveValue(paisDeLaEmpresa)

  await telefono.fill('+54 9 11 5555-0000')
  await expect(pais).toHaveValue('Argentina')
  await telefono.fill('+56 9 6123 4567')
  await expect(pais).toHaveValue('Chile')

  // Lo que la persona escribe no se pisa.
  await pais.fill('Perú')
  await telefono.fill('+54 9 11 5555-0000')
  await expect(panel.getByText(COMO('+54 91155550000 · Argentina'))).toBeVisible()
  await expect(pais).toHaveValue('Perú')

  // Borrado, vuelve a seguir al número.
  await pais.fill('')
  await telefono.fill('+56 9 6123 4567')
  await expect(pais).toHaveValue('Chile')

  // Un prefijo compartido deja «País» vacío y se elige con un botón, que después sigue al número.
  await telefono.fill('+1 305 555 0100')
  await expect(pais).toHaveValue('')
  await panel.getByRole('button', { name: 'Es de Canadá' }).click()
  await expect(pais).toHaveValue('Canadá')
  await telefono.fill('+54 9 11 5555-0000')
  await expect(pais).toHaveValue('Argentina')
})

test('lo guardado lleva el país, y la ficha lo muestra en cada teléfono, también los de otro país', async ({
  page,
}, info) => {
  const cola = telefonoAlAzar()
  const normalizado = `549${cola}`
  await entrar(page, personas.duena)
  await abrirConN(page)
  const panel = dialogo(page)
  await panel.getByLabel('Teléfono principal').fill(`+54 9 ${cola}`)
  await expect(panel.getByText(`+54 9${cola} · Argentina`)).toBeVisible()
  await panel.getByLabel('Nombre', { exact: true }).fill(`E2E País ${info.project.name}`)
  await page.keyboard.press('Control+Enter')
  await panel.getByLabel('Resumen').fill('Escribió desde Argentina')
  await page.keyboard.press('Control+Enter')
  await expect(page.getByText(/Lead creado/)).toBeVisible()

  const [lead] = await leadsConTelefono(normalizado)
  expect(lead?.atributos).toMatchObject({ pais: 'Argentina' })

  await page.goto(`/leads/${lead?.id ?? ''}`)
  await expect(page.getByText('· Argentina', { exact: false }).first()).toBeVisible()
  const extra = await abrirAgregarTelefono(page)
  await extra.getByLabel('Teléfono extra').fill('+1 809 555 1234')
  await expect(extra.getByText(COMO('+1 8095551234 · República Dominicana'))).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Teléfono agregado.')).toBeVisible()
  await expect(page.getByText('· República Dominicana')).toBeVisible()
})

test('la tabla de países no viaja con /leads: se pide al abrir el alta y escribir un número', async ({
  page,
}) => {
  const conTabla: string[] = []
  page.on('response', (respuesta) => {
    const url = respuesta.url()
    if (url.includes('/_next/static/') && url.endsWith('.js')) {
      void respuesta
        .text()
        .then((texto) => {
          if (texto.includes('Kazajist')) {
            conTabla.push(url)
          }
        })
        .catch(() => undefined)
    }
  })
  await entrar(page, personas.duena)
  await page.goto('/leads')
  await page.waitForLoadState('networkidle')
  expect(conTabla).toEqual([])

  await abrirConN(page)
  await dialogo(page).getByLabel('Teléfono principal').fill('+54 9 11 5555-0000')
  await expect(dialogo(page).getByText(COMO('+54 91155550000 · Argentina'))).toBeVisible()
  await expect.poll(() => conTabla.length).toBeGreaterThan(0)
})

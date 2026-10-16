import type { Locator, Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar, limpiarAlta, prepararAlta, type PersonasDelAlta } from './soporte/alta'
import { admin } from './soporte/base'
import { aLaVista } from './soporte/inventario'
import { borrarLeadsDePrueba, exigir } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { borrarLotesDePrueba } from './soporte/papelera'

// Deshacer una importación (parte 8b) contra la app compilada y el Supabase local: completo, con una
// parte que ya cambió, desde «Tus importaciones recientes» y fuera de plazo. Cada caso con otra persona:
// la lista de recientes es de cada quien.
test.describe.configure({ mode: 'serial' })

let personas: PersonasDelAlta
let restaurar = async () => {}

test.beforeAll(async ({}, info) => {
  const terreno = await prepararAlta(`${info.project.name}-deshacer`)
  personas = terreno.personas
  restaurar = terreno.restaurarCatalogos
})

test.afterAll(async () => {
  await borrarLeadsDePrueba()
  await borrarLotesDePrueba()
  await limpiarAlta(restaurar)
})

const csv = (lineas: string[]) => Buffer.from(`﻿${lineas.join('\r\n')}\r\n`, 'utf8')

// Sube un CSV de nombres (con teléfonos al azar) e importa todo.
async function importar(page: Page, nombres: string[]): Promise<void> {
  await page.goto('/leads/importar')
  await page.locator('input[type=file]').setInputFiles({
    name: 'leads.csv',
    mimeType: 'text/csv',
    buffer: csv(['Nombre;Teléfono', ...nombres.map((n) => `${n};${telefonoAlAzar()}`)]),
  })
  await page.getByRole('button', { name: 'Ver la vista previa' }).click()
  const leads = nombres.length === 1 ? 'lead' : 'leads'
  await page.getByRole('button', { name: `Importar ${String(nombres.length)} ${leads}` }).click()
  await expect(
    page.getByText(`Entraron ${String(nombres.length)} ${leads} a tu cartera.`),
  ).toBeVisible()
}

const resultado = (page: Page): Locator =>
  page.getByRole('region', { name: 'Resultado de la importación' })
const recientes = (page: Page): Locator =>
  page.getByRole('region', { name: 'Tus importaciones recientes' })
const confirmacion = (page: Page): Locator =>
  page.getByRole('dialog', { name: 'Deshacer la importación' })

type Lead = { id: string; nombre: string; eliminado_en: string | null }
async function leadsDe(patron: string): Promise<Lead[]> {
  const { data, error } = await admin()
    .from('leads')
    .select('id, nombre, eliminado_en')
    .like('nombre', patron)
    .order('nombre')
    .returns<Lead[]>()
  exigir(error, 'leer los leads importados')
  return data ?? []
}

test('deshacer completo: lo importado va a la papelera, en un lote de quien importó', async ({
  page,
}, info) => {
  const nombre = `E2E Deshacer Todo ${info.project.name}`
  await entrar(page, personas.duena)
  await importar(page, [`${nombre} 1`, `${nombre} 2`, `${nombre} 3`])
  const enElResultado = resultado(page)
  await expect(enElResultado.getByText('Quedan 24 h para deshacerla.')).toBeVisible()
  await enElResultado.getByRole('button', { name: 'Deshacer importación' }).click()
  await expect(
    confirmacion(page).getByText('Se moverán 3 leads a la papelera, donde puedes restaurarlos.'),
  ).toBeVisible()
  await confirmacion(page).getByRole('button', { name: 'Mover a la papelera' }).click()
  await expect(enElResultado.getByText('Se movieron 3 leads a la papelera.')).toBeVisible()
  await expect(confirmacion(page)).toBeHidden()
  const leads = await leadsDe(`${nombre}%`)
  expect(leads).toHaveLength(3)
  expect(leads.every((l) => l.eliminado_en !== null)).toBe(true)

  // Nada del archivo quedó en el navegador.
  const guardado = await page.evaluate(() =>
    JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]),
  )
  expect(guardado).not.toContain(nombre)

  // La papelera lo muestra, y quien importó lo puede restaurar desde ahí.
  await enElResultado.getByRole('link', { name: 'Ver la papelera' }).click()
  await expect(page).toHaveURL(/\/leads\/papelera/)
  await expect(aLaVista(page.getByText(`${nombre} 1`))).toBeVisible()
})

test('con una parte que ya cambió: sale lo intacto y lo editado se queda, con su fila', async ({
  page,
}, info) => {
  const nombre = `E2E Deshacer Parte ${info.project.name}`
  await entrar(page, personas.carlos)
  await importar(page, [`${nombre} 1`, `${nombre} 2`, `${nombre} 3`])
  // Otra pestaña edita el primero (fila 2 del archivo) antes de deshacer.
  const [primero] = await leadsDe(`${nombre} 1`)
  exigir(
    (
      await admin()
        .from('leads')
        .update({ nombre: `${nombre} 1 editado` })
        .eq('id', primero?.id ?? '')
    ).error,
    'editar el primero',
  )
  const enElResultado = resultado(page)
  await enElResultado.getByRole('button', { name: 'Deshacer importación' }).click()
  await confirmacion(page).getByRole('button', { name: 'Mover a la papelera' }).click()
  await expect(
    enElResultado.getByText('Se movieron 2 leads a la papelera. 1 se quedó en tu cartera.'),
  ).toBeVisible()
  await expect(enElResultado.getByText('Ya lo editaste: 1 (fila 2)')).toBeVisible()
  const leads = await leadsDe(`${nombre}%`)
  expect(leads.filter((l) => l.eliminado_en === null).map((l) => l.nombre)).toEqual([
    `${nombre} 1 editado`,
  ])
})

test('«Tus importaciones recientes» sobrevive a cerrar la pantalla y deshace desde ahí, también en oscuro', async ({
  page,
}, info) => {
  const nombre = `E2E Deshacer Lista ${info.project.name}`
  await page.emulateMedia({ colorScheme: 'dark' })
  await entrar(page, personas.berta)
  await page.goto('/leads/importar')
  await expect(
    recientes(page).getByText('No importaste nada en las últimas 24 horas'),
  ).toBeVisible()
  await importar(page, [`${nombre} 1`, `${nombre} 2`])

  // Se recarga: el asistente vuelve a empezar y la importación sigue en la lista.
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
  const fila = recientes(page).getByRole('listitem').filter({ hasText: '2 importados' })
  await expect(fila.getByText('2 importados · 0 ya existían · 0 rechazados')).toBeVisible()
  await expect(fila.getByText('Terminada')).toBeVisible()
  await expect(fila.getByText(/Quedan 2[34] h para deshacerla\./)).toBeVisible()
  await fila.getByRole('button', { name: 'Deshacer importación' }).click()
  await expect(
    confirmacion(page).getByText('Se moverán 2 leads a la papelera, donde puedes restaurarlos.'),
  ).toBeVisible()
  await confirmacion(page).getByRole('button', { name: 'Mover a la papelera' }).click()
  await expect(fila.getByText('Se movieron 2 leads a la papelera.')).toBeVisible()
  await expect(fila.getByText('Deshecha')).toBeVisible()
  expect((await leadsDe(`${nombre}%`)).every((l) => l.eliminado_en !== null)).toBe(true)
})

test('fuera de plazo: la base lo rechaza sin tocar nada y la lista ya no la ofrece', async ({
  page,
}, info) => {
  const nombre = `E2E Deshacer Tarde ${info.project.name}`
  await entrar(page, personas.veTodos)
  await importar(page, [`${nombre} 1`])
  // Pasaron 25 horas desde que terminó (la pantalla todavía no lo sabe).
  const [lead] = await leadsDe(`${nombre}%`)
  const vinculo = await admin()
    .from('importaciones_leads')
    .select('importacion_id')
    .eq('lead_id', lead?.id ?? '')
    .single<{ importacion_id: string }>()
  exigir(vinculo.error, 'leer la importación')
  exigir(
    (
      await admin()
        .from('importaciones')
        .update({ terminada_en: new Date(Date.now() - 25 * 3_600_000).toISOString() })
        .eq('id', vinculo.data?.importacion_id ?? '')
    ).error,
    'mover el plazo',
  )
  await resultado(page).getByRole('button', { name: 'Deshacer importación' }).click()
  await confirmacion(page).getByRole('button', { name: 'Mover a la papelera' }).click()
  await expect(
    confirmacion(page).getByText(
      'Pasaron más de 24 horas desde esta importación: ya no se puede deshacer.',
    ),
  ).toBeVisible()
  expect((await leadsDe(`${nombre}%`))[0]?.eliminado_en).toBeNull()
  await page.keyboard.press('Escape')
  await page.reload()
  await expect(
    recientes(page).getByText('No importaste nada en las últimas 24 horas'),
  ).toBeVisible()
})

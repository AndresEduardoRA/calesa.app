import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { esMovil } from './soporte/inventario'
import { telefonoAlAzar } from './soporte/leads-alta'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import { capturar, sinScrollHorizontal } from './soporte/recorrido'

// La vista previa de la importación (`/leads/importar`, paso 3) en escritorio: el nombre de una fila no se parte cuando hay sitio, la columna
// del motivo empieza en el mismo lugar en todas las filas y con el texto al 200 % la página no se ensancha (cierre 5b, defecto 4.3: la fila
// partía «…escritorio B / 1» con la mitad del ancho vacía, porque la columna del nombre era un tercio de lo que sobraba). Sólo mira la vista
// previa: no importa nada.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(`${info.project.name}-previa`)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

const csv = (lineas: string[]) => Buffer.from(`﻿${lineas.join('\r\n')}\r\n`, 'utf8')
const NOMBRE_LARGO =
  'E2E Previa con un nombre larguísimo de más de ochenta caracteres para ver cómo se parte sin ensanchar nada'

async function aLaVistaPrevia(page: Page): Promise<void> {
  await entrar(page, t.personas.duena)
  await page.goto('/leads/importar')
  await expect(page.getByRole('heading', { name: 'Importar leads', level: 1 })).toBeVisible()
  await page.locator('input[type=file]').setInputFiles({
    name: 'previa.csv',
    mimeType: 'text/csv',
    buffer: csv([
      'Nombre;Teléfono',
      `E2E Previa José Ñandú escritorio B 1;+54 9 ${telefonoAlAzar()}`,
      `E2E Previa José Ñandú escritorio B 2;+54 9 ${telefonoAlAzar()}`,
      `${NOMBRE_LARGO};+54 9 ${telefonoAlAzar()}`,
      'E2E Previa sin teléfono;',
    ]),
  })
  await page.getByRole('button', { name: 'Ver la vista previa' }).click()
  await expect(page.getByText(/4 filas/).first()).toBeVisible()
}

// De cada fila: cuántas líneas ocupa el nombre y dónde empieza la columna del motivo.
const medirFilas = (page: Page) =>
  page.getByRole('list', { name: 'Filas del archivo' }).evaluate((lista) =>
    [...lista.children].map((fila) => {
      const fila1 = fila.children[0] as HTMLElement
      const nombre = fila.children[1] as HTMLElement
      const motivo = fila.children[2] as HTMLElement
      const letra = Number.parseFloat(getComputedStyle(nombre).fontSize)
      // La celda «Fila N + distintivo» mide lo que su contenido: ni se parte («Fila / 2») ni se mete en la columna del nombre.
      const textoDeLaFila = fila1.firstElementChild as HTMLElement
      return {
        texto: nombre.textContent,
        lineas: Math.round(nombre.getBoundingClientRect().height / (letra * 1.5)),
        xDelMotivo: Math.round(motivo.getBoundingClientRect().x),
        filaEnUnaLinea:
          Math.round(textoDeLaFila.getBoundingClientRect().height / (letra * 1.5)) === 1,
        distintivoPisaAlNombre:
          (fila1.lastElementChild as HTMLElement).getBoundingClientRect().right >
          nombre.getBoundingClientRect().left + 0.5,
      }
    }),
  )

test('escritorio al 100 %: los nombres que caben no se parten y el motivo empieza en el mismo lugar', async ({
  page,
}, info) => {
  test.skip(esMovil(page), 'La fila en dos columnas es de escritorio; el celular apila.')
  await aLaVistaPrevia(page)
  const filas = await medirFilas(page)
  const resumen = filas
    .map((f) => `${String(f.lineas)} línea(s), motivo en x ${String(f.xDelMotivo)}`)
    .join(' · ')
  info.annotations.push({ type: 'filas de la vista previa', description: resumen })
  await capturar(page, info, 'vista-previa-100')
  for (const fila of filas.slice(0, 2)) {
    expect(fila.lineas, `«${fila.texto}» en una línea (${resumen})`).toBe(1)
  }
  for (const fila of filas) {
    expect(fila.filaEnUnaLinea, `«Fila N» en una línea (${resumen})`).toBe(true)
    expect(fila.distintivoPisaAlNombre, `el distintivo no pisa al nombre (${resumen})`).toBe(false)
  }
  // El nombre largo se parte, pero no empuja al motivo fuera de su columna.
  expect(
    new Set(filas.map((f) => f.xDelMotivo)).size,
    `la columna del motivo se alinea (${resumen})`,
  ).toBe(1)
  await sinScrollHorizontal(page)
})

test('con el texto al 200 % la vista previa no ensancha la página, en escritorio y en el celular', async ({
  page,
}, info) => {
  await aLaVistaPrevia(page)
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await sinScrollHorizontal(page)
  await capturar(page, info, 'vista-previa-200')
})

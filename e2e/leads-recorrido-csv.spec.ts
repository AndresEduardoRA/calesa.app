import { readFileSync, writeFileSync } from 'node:fs'
import type { Page, TestInfo } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { admin } from './soporte/base'
import { aLaVista } from './soporte/inventario'
import { exigir } from './soporte/leads'
import { idDePersona } from './soporte/leads-alta'
import { nuevoLead } from './soporte/leads-ficha'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import {
  capturar,
  csvDe,
  limpiarRecorrido,
  origenActivo,
  prepararRecorrido,
  type TerrenoDelRecorrido,
  volcarArbol,
} from './soporte/recorrido'

// El recorrido de la IA (9d-3), el CSV: la dueña exporta su cartera (y la IA lee el archivo), y cada
// cuenta importa un archivo de 20 filas con de todo —buenas, con tildes, un teléfono repetido en el
// archivo, uno que ya está en la base, un origen inventado, sin nombre, un país que no existe—, lee el
// informe, lo ve en «Tus importaciones recientes» y lo deshace. Un archivo de 501 filas no entra.
test.describe.configure({ mode: 'serial' })

let r: TerrenoDelRecorrido
// Los leads con un nombre que empieza como una fórmula no llevan el prefijo «E2E »: se borran por id.
const sinPrefijo: string[] = []

test.beforeAll(async ({}, info) => {
  r = await prepararRecorrido(info.project.name, 'CSV')
})

test.afterAll(async () => {
  if (sinPrefijo.length > 0) {
    const { error } = await admin().from('leads').delete().in('id', sinPrefijo)
    exigir(error, 'borrar los leads con nombre de fórmula')
  }
  await limpiarRecorrido(r)
})

async function vivosDe(email: string): Promise<number> {
  const { count, error } = await admin()
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('creado_por', await idDePersona(email))
    .is('eliminado_en', null)
  exigir(error, 'contar los leads vivos')
  return count ?? 0
}

// Un lead de la dueña cuyo nombre empieza con un carácter de fórmula.
async function leadConNombre(nombre: string, proyecto: string): Promise<void> {
  const lead = await nuevoLead({
    corto: `Fórmula ${proyecto}`,
    telefono: completoCon(r.t, nacional()),
    deQuien: r.t.personas.duena,
  })
  const { error } = await admin().from('leads').update({ nombre }).eq('id', lead.id)
  exigir(error, 'renombrar el lead')
  sinPrefijo.push(lead.id)
}

// Las 20 filas: 13 buenas (con tildes y eñes) y 7 que no entran o ya están.
async function veinteFilas(proyecto: string): Promise<string[]> {
  const origen = await origenActivo()
  const repetido = nacional()
  const buenas = Array.from({ length: 13 }, (_, i) => {
    const telefono = i === 0 ? repetido : nacional()
    return `E2E Imp José Ñandú ${proyecto} ${String(i + 1)}|${telefono}|${i % 2 ? 'Cliente' : 'Prospecto'}|${origen}`
  })
  return [
    'Nombre|Teléfono|Tipo|Origen',
    ...buenas,
    `E2E Imp Repetida ${proyecto}|${repetido}|Prospecto|${origen}`,
    `E2E Imp De Carlos ${proyecto}|+${r.t.telefonoDeCarlos}|Prospecto|${origen}`,
    `E2E Imp Ya Mía ${proyecto}|${r.uno.telefono.replace(r.t.codigo, '')}|Prospecto|${origen}`,
    `E2E Imp Origen Inventado ${proyecto}|${nacional()}|Prospecto|Origen que no existe 9d3`,
    `|${nacional()}|Prospecto|${origen}`,
    `E2E Imp País Raro ${proyecto}|+999 7654321|Prospecto|${origen}`,
    `E2E Imp Tipo Raro ${proyecto}|${nacional()}|Proveedor|${origen}`,
  ]
}

async function subirArchivo(page: Page, info: TestInfo, nombre: string, contenido: Buffer) {
  const ruta = info.outputPath(nombre)
  writeFileSync(ruta, contenido)
  await page.locator('input[type=file]').setInputFiles(ruta)
}

const resultado = (page: Page) => page.getByRole('region', { name: 'Resultado de la importación' })
const recientes = (page: Page) => page.getByRole('region', { name: 'Tus importaciones recientes' })
// Los tres números del informe, cada uno en su renglón.
async function cuentasDel(
  page: Page,
): Promise<{ importados: number; yaEstaban: number; rechazados: number }> {
  const texto = await resultado(page).innerText()
  const numero = (patron: RegExp) => Number(patron.exec(texto)?.[1] ?? 'NaN')
  return {
    importados: numero(/(\d+) importados?/),
    yaEstaban: numero(/(\d+) ya existían?/),
    rechazados: numero(/(\d+) rechazados?/),
  }
}

async function importarYDeshacer(page: Page, info: TestInfo, cuenta: string, archivo: Buffer) {
  const antes = await vivosDe(cuenta)
  await entrar(page, cuenta)
  await page.goto('/leads/importar')
  await expect(page.getByRole('heading', { name: 'Importar leads', level: 1 })).toBeVisible()
  await subirArchivo(page, info, `veinte-${cuenta.split('@')[0] ?? ''}.csv`, archivo)
  await capturar(page, info, 'emparejar')
  await page.getByRole('button', { name: 'Ver la vista previa' }).click()
  await expect(page.getByText(/20 filas/).first()).toBeVisible()
  await capturar(page, info, 'vista-previa')
  await volcarArbol(page.getByRole('main'), info, `vista-previa-${info.project.name}`)
  await page.getByRole('button', { name: /^Importar \d+ leads?$/ }).click()
  await expect(resultado(page)).toBeVisible({ timeout: 20_000 })
  await capturar(page, info, 'resultado')
  await volcarArbol(resultado(page), info, `resultado-${cuenta.split('@')[0] ?? ''}`)
  const { importados, yaEstaban, rechazados } = await cuentasDel(page)
  info.annotations.push({
    type: `F: informe de ${cuenta.split('@')[0] ?? ''}`,
    description: `${String(importados)} importados · ${String(yaEstaban)} ya existían · ${String(rechazados)} rechazados`,
  })
  expect(importados + yaEstaban + rechazados).toBe(20)
  expect(importados).toBeGreaterThan(0)
  expect(await vivosDe(cuenta)).toBe(antes + importados)

  // «Tus importaciones recientes» dice lo mismo, y deshacerla deja la cartera como estaba.
  await expect(
    recientes(page)
      .getByText(`${String(importados)} importados`)
      .first(),
  ).toBeVisible()
  await recientes(page).getByRole('button', { name: 'Deshacer importación' }).first().click()
  const dialogo = page.getByRole('dialog', { name: 'Deshacer la importación' })
  await expect(dialogo).toBeVisible()
  await capturar(page, info, 'deshacer-confirmar')
  await dialogo.getByRole('button', { name: 'Mover a la papelera' }).click()
  await expect(recientes(page).getByText(/Se movieron \d+ leads a la papelera/)).toBeVisible()
  // El «Deshacer» del resultado, arriba, también se enteró: no ofrece deshacer lo ya deshecho.
  await expect(resultado(page).getByRole('button', { name: 'Deshacer importación' })).toHaveCount(0)
  await expect(resultado(page).getByText(/Se movieron \d+ leads a la papelera/)).toBeVisible()
  await capturar(page, info, 'deshecha')
  expect(await vivosDe(cuenta)).toBe(antes)
}

test('F · la dueña exporta su cartera: UTF-8 con BOM, las columnas del layout y las fórmulas neutralizadas', async ({
  page,
}, info) => {
  await leadConNombre('=SUMA(1+1) Recorrido', info.project.name)
  await leadConNombre('@Recorrido Arroba', info.project.name)
  await entrar(page, r.t.personas.duena)
  await page.goto('/leads')
  const dialogo = page.getByRole('dialog', { name: 'Exportar leads' })
  await expect(async () => {
    if (!(await dialogo.isVisible())) {
      const renglon = page.getByRole('menuitem', { name: 'Exportar…' })
      if (await renglon.isVisible()) await renglon.click()
      else await aLaVista(page.getByRole('button', { name: /^Exportar$|^CSV$/ })).click()
    }
    await expect(dialogo).toBeVisible({ timeout: 1500 })
  }).toPass()
  await capturar(page, info, 'exportar')
  await volcarArbol(dialogo, info, `exportar-${info.project.name}`)
  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    dialogo.getByRole('button', { name: 'Descargar' }).click(),
  ])
  const ruta = info.outputPath(descarga.suggestedFilename())
  await descarga.saveAs(ruta)
  const texto = readFileSync(ruta, 'utf8')
  if (process.env['E2E_CAPTURAS']) {
    writeFileSync(`${process.env['E2E_CAPTURAS']}/${info.project.name}/exportado.csv`, texto)
  }
  // La dueña tiene `leads.numero_global.ver`: el global y el propio van antes del nombre.
  expect(texto.startsWith('﻿N.º;N.º propio;Nombre;Teléfono;Tipo;Origen;')).toBe(true)
  const lineas = texto.split('\r\n')
  const celdas = lineas.map((l) => l.split(';').slice(2))
  expect(celdas.some(([nombre]) => nombre === "'=SUMA(1+1) Recorrido")).toBe(true)
  expect(celdas.some(([nombre]) => nombre === "'@Recorrido Arroba")).toBe(true)
  expect(celdas.flat().some((c) => c.startsWith('=') || c.startsWith('@'))).toBe(false)
})

test('F · la asesora importa 20 filas (coma, sin BOM): el informe suma 20 y deshacer lo deja como estaba', async ({
  page,
}, info) => {
  await importarYDeshacer(
    page,
    info,
    r.ana.email,
    csvDe(await veinteFilas(info.project.name), ',', false),
  )
})

test('F · la dueña importa las 20 filas con punto y coma y BOM', async ({ page }, info) => {
  await importarYDeshacer(
    page,
    info,
    r.t.personas.duena,
    csvDe(await veinteFilas(`${info.project.name} B`), ';', true),
  )
})

test('F · 501 filas no entran: se dice cuántas y no se importa nada', async ({ page }, info) => {
  const antes = await vivosDe(r.ana.email)
  const filas = Array.from(
    { length: 501 },
    (_, i) => `E2E Imp Tope ${String(i)}|${nacional()}|Prospecto|`,
  )
  await entrar(page, r.ana.email)
  await page.goto('/leads/importar')
  await subirArchivo(
    page,
    info,
    'quinientas-una.csv',
    csvDe(['Nombre|Teléfono|Tipo|Origen', ...filas], ',', false),
  )
  await expect(
    page.getByText(
      'El archivo tiene 501 filas y se admiten hasta 500. Divídelo en varios archivos.',
    ),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ver la vista previa' })).toHaveCount(0)
  await capturar(page, info, 'quinientas-una')
  expect(await vivosDe(r.ana.email)).toBe(antes)
})

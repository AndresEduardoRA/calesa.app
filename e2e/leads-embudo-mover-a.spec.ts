import { expect, test, type Locator } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { esMovil } from './soporte/inventario'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { nuevoLead } from './soporte/leads-ficha'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import { irAlEmbudo, oportunidad, tarjeta, verEtapa } from './soporte/leads-oportunidades'

// «Mover a…» en la tarjeta del kanban de escritorio (columna de 18 rem): el texto del botón no se parte en dos líneas, ni a
// tamaño normal ni con el texto al 200 %, y la columna no se ensancha para que quepa.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

// Cuántas líneas ocupa el texto «Mover a…»: los renglones distintos que miden sus rectángulos.
async function lineasDelTexto(boton: Locator): Promise<number> {
  return boton.evaluate((el) => {
    const texto = [...el.childNodes].find(
      (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim(),
    )
    if (!texto) {
      return 0
    }
    const rango = document.createRange()
    rango.selectNodeContents(texto)
    return new Set([...rango.getClientRects()].map((r) => Math.round(r.top))).size
  })
}

test('«Mover a…» queda en una línea en la tarjeta, también con el texto al 200 %', async ({
  page,
}, info) => {
  test.skip(esMovil(page), 'En el celular la columna ocupa todo el ancho: no se parte.')
  const lead = await nuevoLead({
    corto: `Mover una línea ${info.project.name}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.berta,
  })
  const titulo = `Mover a ${info.project.name}`
  await oportunidad(t.personas.berta, lead.id, { titulo })
  await entrar(page, t.personas.berta)
  await irAlEmbudo(page)
  await verEtapa(page, 'Nuevo')
  const boton = tarjeta(page, titulo).getByRole('button', {
    name: `Mover «${titulo}» a otra etapa`,
  })
  await expect(boton).toBeVisible()
  expect(await lineasDelTexto(boton)).toBe(1)

  // La columna sigue en 18 rem: no se ensanchó para que el botón quepa.
  const columna = page.getByRole('region', { name: /^Nuevo:/ })
  const ancho = await columna.evaluate(
    (el) => (el.parentElement as HTMLElement).getBoundingClientRect().width,
  )
  expect(ancho).toBe(288)

  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  expect(await lineasDelTexto(boton)).toBe(1)
})

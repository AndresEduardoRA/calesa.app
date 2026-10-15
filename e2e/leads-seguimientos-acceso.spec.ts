import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { esMovil, otraPersona } from './soporte/inventario'
import { idDePersona, sesionDe } from './soporte/leads-alta'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import { NO_DISPONIBLE, nuevoLead, revocarCartera } from './soporte/leads-ficha'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import {
  abrirRedactor,
  compartirCon,
  editorDe,
  irASeguimientos,
  meterSeguimientoMalicioso,
  seguimiento,
  seguimientosEnLaBase,
  tipoDeSeguimiento,
} from './soporte/leads-seguimientos'

// Quién ve qué de los seguimientos (privado = sólo su autor) y la lista blanca del detalle: por la
// pantalla, por la RPC llamada a mano y con una fila escrita por fuera, que se dibuja inerte.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

async function leadDeBerta(corto: string) {
  return nuevoLead({ corto, telefono: completoCon(t, nacional()), deQuien: t.personas.berta })
}

test('la lista blanca: un enlace javascript no entra por la pantalla ni por la RPC, y una fila escrita por fuera se dibuja inerte', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Seg XSS ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irASeguimientos(page, lead.id)
  const formulario = await abrirRedactor(page)
  await formulario.getByRole('button', { name: 'Enlace' }).click()
  await formulario.getByLabel('Dirección del enlace').fill('javascript:alert(1)')
  await formulario.getByRole('button', { name: 'Aplicar' }).click()
  await expect(formulario.getByText(/Usa una dirección web/)).toBeVisible()

  // La RPC, llamada a mano con la sesión de Berta: se rechaza con el motivo junto al detalle.
  const sesion = await sesionDe(t.personas.berta, CONTRASENA)
  const tipo = await tipoDeSeguimiento('nota')
  for (const detalle of [
    {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'x',
              marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
            },
          ],
        },
      ],
    },
    {
      type: 'doc',
      content: [
        { type: 'paragraph', attrs: { style: 'x' }, content: [{ type: 'text', text: 'x' }] },
      ],
    },
    { type: 'doc', content: [{ type: 'image', attrs: { src: 'x', onerror: 'alert(1)' } }] },
    '<script>alert(1)</script>',
  ]) {
    const { error } = await sesion.rpc('seguimiento_crear', {
      p_id: crypto.randomUUID(),
      p_lead: lead.id,
      p_seguimiento: { tipo_id: tipo.id, titulo: 'A mano', detalle },
    })
    expect(error?.hint).toBe('detalle')
  }
  expect(await seguimientosEnLaBase(lead.id)).toEqual([])

  // Una fila escrita por fuera de las RPC: nada se ejecuta y no queda ni el enlace ni la imagen.
  const berta = await idDePersona(t.personas.berta)
  await meterSeguimientoMalicioso(lead.id, berta, 'Escrito por fuera')
  let dialogos = 0
  page.on('dialog', (dialogo) => {
    dialogos++
    void dialogo.dismiss()
  })
  await page.reload()
  const malicioso = seguimiento(page, 'Escrito por fuera')
  await expect(malicioso).toBeVisible()
  await expect(
    malicioso.getByText('<img src=x onerror="window.__xss=1">', { exact: false }),
  ).toBeVisible()
  await expect(malicioso.locator('a')).toHaveCount(0)
  await expect(malicioso.locator('img, script')).toHaveCount(0)
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined()
  expect(dialogos).toBe(0)
})

test('pegar contenido con imágenes y encabezados deja sólo lo admitido, y el detalle tiene tope', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Seg Pegar ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irASeguimientos(page, lead.id)
  const formulario = await abrirRedactor(page)
  const editor = editorDe(formulario)
  await editor.click()
  await editor.evaluate((nodo) => {
    const datos = new DataTransfer()
    datos.setData(
      'text/html',
      '<h1 style="color:red">Título</h1><p onclick="x()">Hola <img src=x onerror="window.__xss=1"><u>subrayado</u></p><script>window.__xss=2</script>',
    )
    nodo.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: datos, bubbles: true, cancelable: true }),
    )
  })
  await expect(editor).toContainText('Título')
  await expect(editor.locator('img, h1, u, script')).toHaveCount(0)
  await formulario.getByLabel('Resumen').fill('Pegado')
  await formulario.getByRole('button', { name: 'Guardar' }).click()
  await expect(seguimiento(page, 'Pegado')).toBeVisible()
  const [pegado] = await seguimientosEnLaBase(lead.id)
  expect(JSON.stringify(pegado?.detalle_doc)).not.toMatch(/image|heading|underline|onclick|style/)
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined()

  // Más de 5000 caracteres: se dice junto al detalle y no se guarda nada.
  const otro = await abrirRedactor(page)
  await otro.getByLabel('Resumen').fill('Muy largo')
  await editorDe(otro).fill('a'.repeat(5001))
  // Una palabra larguísima se parte: la página no se ensancha (en el celular, ni un píxel).
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBe(0)
  await otro.getByRole('button', { name: 'Guardar' }).click()
  await expect(otro.getByText('El detalle admite hasta 5000 caracteres.')).toBeVisible()
  expect(await seguimientosEnLaBase(lead.id)).toHaveLength(1)
})

test('la co-asesora ve sólo lo «Visible para el cliente» de la otra, sin conteo, y al revocarle la cartera deja de verlo', async ({
  page,
  browser,
}, info) => {
  const lead = await leadDeBerta(`Seg Coasesora ${info.project.name}`)
  const [berta, carlos] = await Promise.all([
    idDePersona(t.personas.berta),
    idDePersona(t.personas.carlos),
  ])
  await compartirCon(lead.id, carlos, berta)
  await entrar(page, t.personas.berta)
  await irASeguimientos(page, lead.id)
  for (const [titulo, visible] of [
    ['Sólo para mí', false],
    ['Para el cliente', true],
  ] as const) {
    const formulario = await abrirRedactor(page)
    await formulario.getByLabel('Resumen').fill(titulo)
    if (visible) {
      await formulario.getByRole('switch', { name: 'Visible para el cliente' }).click()
    }
    await formulario.getByRole('button', { name: 'Guardar' }).click()
    await expect(seguimiento(page, titulo)).toBeVisible()
    if (esMovil(page)) {
      await page.keyboard.press('Escape')
    }
  }
  await expect(
    seguimiento(page, 'Para el cliente').getByText('Visible para el cliente'),
  ).toBeVisible()

  const otra = await otraPersona(browser, page)
  await entrar(otra, t.personas.carlos)
  await irASeguimientos(otra, lead.id)
  await expect(seguimiento(otra, 'Para el cliente')).toBeVisible()
  await expect(seguimiento(otra, 'Sólo para mí')).toHaveCount(0)
  await expect(otra.getByRole('navigation', { name: 'Secciones del lead' })).toHaveText(
    /^DatosSeguimientos$/,
  )
  // Lo de Berta no se edita desde acá; Carlos sí anota.
  await expect(
    seguimiento(otra, 'Para el cliente').getByRole('button', { name: 'Editar' }),
  ).toHaveCount(0)
  await expect(otra.getByRole('button', { name: 'Anotar seguimiento' })).toBeVisible()

  await revocarCartera(lead.id, carlos)
  await otra.reload()
  await expect(otra.getByText(NO_DISPONIBLE)).toBeVisible()
  await expect(otra.getByText('Para el cliente')).toHaveCount(0)
  await otra.context().close()
})

test('la dueña con «todos» ve sólo lo visible, sin acciones, y la RPC le responde como a un lead que no existe', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Seg Duena ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irASeguimientos(page, lead.id)
  for (const [titulo, visible] of [
    ['Nota privada', false],
    ['Nota visible', true],
  ] as const) {
    const formulario = await abrirRedactor(page)
    await formulario.getByLabel('Resumen').fill(titulo)
    if (visible) {
      await formulario.getByRole('switch', { name: 'Visible para el cliente' }).click()
    }
    await formulario.getByRole('button', { name: 'Guardar' }).click()
    await expect(seguimiento(page, titulo)).toBeVisible()
  }

  await page.context().clearCookies()
  await entrar(page, t.personas.duena)
  await irASeguimientos(page, lead.id)
  await expect(seguimiento(page, 'Nota visible')).toBeVisible()
  await expect(seguimiento(page, 'Nota privada')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Anotar seguimiento' })).toHaveCount(0)
  await expect(seguimiento(page, 'Nota visible').getByRole('button')).toHaveCount(0)

  const sesion = await sesionDe(t.personas.duena, CONTRASENA)
  const tipo = await tipoDeSeguimiento('nota')
  const { error } = await sesion.rpc('seguimiento_crear', {
    p_id: crypto.randomUUID(),
    p_lead: lead.id,
    p_seguimiento: { tipo_id: tipo.id, titulo: 'De la dueña' },
  })
  expect(error?.message).toBe(NO_DISPONIBLE)
  const [visible] = (await seguimientosEnLaBase(lead.id)).filter((s) => s.titulo === 'Nota visible')
  const editar = await sesion.rpc('seguimiento_guardar', {
    p_id: visible?.id ?? '',
    p_actualizado_en_esperado: new Date().toISOString(),
    p_cambios: { titulo: 'Pisado' },
  })
  expect(editar.error?.message).toBe('No encontramos este seguimiento o no tienes acceso.')
})

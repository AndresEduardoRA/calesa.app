import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import {
  abrirEdicion,
  edicionesRegistradas,
  nuevoLead,
  tituloDeLaFicha,
  versionDe,
} from './soporte/leads-ficha'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import {
  abrirRedactor,
  apagarTipo,
  edicion,
  editorDe,
  irASeguimientos,
  recordatoriosEnLaBase,
  redactor,
  seguimiento,
  seguimientosEnLaBase,
  tipoDeSeguimiento,
} from './soporte/leads-seguimientos'

// La sección «Seguimientos» de la ficha: anotar con formato, editar con versión, eliminar con
// «Deshacer», las reglas del tipo y la fecha, y que el editor no le robe los atajos al marco. Lo
// privado de cada quien y la lista blanca están en `leads-seguimientos-acceso.spec.ts`.
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

test('anota un seguimiento con formato, se dibuja igual y no mueve la versión del lead', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Seg Formato ${info.project.name}`)
  const version = await versionDe(lead.id)
  await entrar(page, t.personas.berta)
  await irASeguimientos(page, lead.id)
  await expect(page.getByText('Todavía no hay seguimientos')).toBeVisible()

  const formulario = await abrirRedactor(page)
  await formulario.getByLabel('Resumen').fill('Pidió el precio del RAV4')
  const editor = editorDe(formulario)
  await editor.click()
  await formulario.getByRole('button', { name: 'Negrita' }).click()
  await editor.pressSequentially('Urgente')
  await formulario.getByRole('button', { name: 'Negrita' }).click()
  await editor.press('Enter')
  await formulario.getByRole('button', { name: 'Lista con viñetas' }).click()
  await editor.pressSequentially('2019 o 2020')
  await editor.press('Enter')
  await editor.pressSequentially('Color gris')
  await editor.press('Enter')
  await editor.press('Enter')
  await formulario.getByRole('button', { name: 'Enlace' }).click()
  await formulario.getByLabel('Dirección del enlace').fill('ejemplo.com/rav4')
  await formulario.getByRole('button', { name: 'Aplicar' }).click()
  // Dos envíos seguidos (doble clic): uno solo.
  await formulario.getByRole('button', { name: 'Guardar' }).dblclick()

  const anotado = seguimiento(page, 'Pidió el precio del RAV4')
  await expect(anotado).toBeVisible()
  await expect(anotado.locator('strong')).toHaveText('Urgente')
  await expect(anotado.locator('ul li')).toHaveText(['2019 o 2020', 'Color gris'])
  const enlace = anotado.getByRole('link', { name: 'https://ejemplo.com/rav4' })
  await expect(enlace).toHaveAttribute('href', 'https://ejemplo.com/rav4')
  await expect(enlace).toHaveAttribute('rel', 'noopener noreferrer nofollow')
  await expect(anotado.getByText('Tú', { exact: false })).toBeVisible()
  await expect(redactor(page)).toHaveCount(0)

  const guardados = await seguimientosEnLaBase(lead.id)
  expect(guardados).toHaveLength(1)
  expect(guardados[0]).toMatchObject({
    titulo: 'Pidió el precio del RAV4',
    visibilidad: 'privado',
    detalle_texto: 'Urgente\n• 2019 o 2020\n• Color gris\nhttps://ejemplo.com/rav4',
  })
  // El documento guardado no trae nada fuera de la lista blanca (ni el `target` del enlace).
  expect(JSON.stringify(guardados[0]?.detalle_doc)).not.toMatch(/target|class|rel/)
  expect(await versionDe(lead.id)).toBe(version)
  expect(await edicionesRegistradas(lead.id)).toBe(0)

  // Recargar: sigue ahí, dibujado desde la base.
  await page.reload()
  await expect(seguimiento(page, 'Pidió el precio del RAV4').locator('strong')).toHaveText(
    'Urgente',
  )
})

test('un seguimiento anotado en otra pestaña no le da conflicto a quien edita los datos', async ({
  page,
  context,
}, info) => {
  const lead = await leadDeBerta(`Seg Sin Conflicto ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await page.goto(`/leads/${lead.id}`)
  await expect(tituloDeLaFicha(page, lead.nombre)).toBeVisible()
  const panel = await abrirEdicion(page)

  const otra = await context.newPage()
  await irASeguimientos(otra, lead.id)
  const formulario = await abrirRedactor(otra)
  await formulario.getByLabel('Resumen').fill('Llamó mientras editaban')
  await formulario.getByRole('button', { name: 'Guardar' }).click()
  await expect(seguimiento(otra, 'Llamó mientras editaban')).toBeVisible()
  await otra.close()

  await panel.getByLabel('Nombre').fill(`${lead.nombre} editado`)
  await panel.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(panel).toBeHidden()
  await expect(tituloDeLaFicha(page, `${lead.nombre} editado`)).toBeVisible()
})

test('editar con una versión vieja da el conflicto sin perder lo escrito; recargar lo guarda', async ({
  page,
  context,
}, info) => {
  const lead = await leadDeBerta(`Seg Version ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irASeguimientos(page, lead.id)
  const formulario = await abrirRedactor(page)
  await formulario.getByLabel('Resumen').fill('Primera versión')
  await formulario.getByRole('button', { name: 'Guardar' }).click()
  await expect(seguimiento(page, 'Primera versión')).toBeVisible()

  // La misma persona lo edita en otra ventana.
  const otra = await context.newPage()
  await irASeguimientos(otra, lead.id)
  await seguimiento(otra, 'Primera versión').getByRole('button', { name: 'Editar' }).click()
  await edicion(otra).getByLabel('Resumen').fill('Desde la otra ventana')
  await edicion(otra).getByRole('button', { name: 'Guardar' }).click()
  await expect(seguimiento(otra, 'Desde la otra ventana')).toBeVisible()
  await otra.close()

  await seguimiento(page, 'Primera versión').getByRole('button', { name: 'Editar' }).click()
  const editando = edicion(page)
  await editando.getByLabel('Resumen').fill('Lo que escribí acá')
  await editando.getByRole('button', { name: 'Guardar' }).click()
  await expect(editando.getByText(/Cambiaste este seguimiento .* desde otra ventana/)).toBeVisible()
  await expect(editando.getByLabel('Resumen')).toHaveValue('Lo que escribí acá')
  expect((await seguimientosEnLaBase(lead.id))[0]?.titulo).toBe('Desde la otra ventana')

  await editando.getByRole('button', { name: 'Recargar' }).click()
  await expect(editando.getByLabel('Resumen')).toHaveValue('Lo que escribí acá')
  await editando.getByRole('button', { name: 'Guardar' }).click()
  await expect(seguimiento(page, 'Lo que escribí acá')).toBeVisible()
  expect((await seguimientosEnLaBase(lead.id))[0]?.titulo).toBe('Lo que escribí acá')
})

test('un tipo apagado no se ofrece, y una fecha futura se dice junto al campo', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Seg Reglas ${info.project.name}`)
  const visita = await tipoDeSeguimiento('visita')
  const encender = await apagarTipo('visita')
  try {
    await entrar(page, t.personas.berta)
    await irASeguimientos(page, lead.id)
    const formulario = await abrirRedactor(page)
    const tipos = formulario.getByLabel('Tipo de seguimiento')
    await expect(tipos.locator('option', { hasText: visita.nombre })).toHaveCount(0)

    await formulario.getByLabel('Resumen').fill('Del futuro')
    await formulario.getByRole('button', { name: 'Otra fecha' }).click()
    await formulario.getByLabel('Cuándo fue').fill('2099-01-01T10:00')
    await formulario.getByRole('button', { name: 'Guardar' }).click()
    await expect(formulario.getByText(/no puede ser en el futuro/)).toBeVisible()
    await expect(formulario.getByLabel('Cuándo fue')).toBeFocused()
    expect(await seguimientosEnLaBase(lead.id)).toEqual([])

    // Una fecha pasada sí.
    await formulario.getByLabel('Cuándo fue').fill('2026-01-05T10:00')
    await formulario.getByRole('button', { name: 'Guardar' }).click()
    await expect(seguimiento(page, 'Del futuro')).toBeVisible()
  } finally {
    await encender()
  }
})

test('eliminar se hace al instante y «Deshacer» lo devuelve', async ({ page }, info) => {
  const lead = await leadDeBerta(`Seg Eliminar ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irASeguimientos(page, lead.id)
  const formulario = await abrirRedactor(page)
  await formulario.getByLabel('Resumen').fill('Para eliminar')
  await formulario.getByRole('button', { name: 'Guardar' }).click()
  await expect(seguimiento(page, 'Para eliminar')).toBeVisible()

  await seguimiento(page, 'Para eliminar').getByRole('button', { name: 'Eliminar' }).click()
  await expect(page.getByText('Seguimiento eliminado.')).toBeVisible()
  await expect(seguimiento(page, 'Para eliminar')).toHaveCount(0)
  expect((await seguimientosEnLaBase(lead.id))[0]?.eliminado_en).not.toBeNull()
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.getByText('Seguimiento restituido.')).toBeVisible()
  await expect(seguimiento(page, 'Para eliminar')).toBeVisible()
  expect((await seguimientosEnLaBase(lead.id))[0]?.eliminado_en).toBeNull()
})

test('el editor no le roba la N ni los atajos al marco, y lo escrito sobrevive a recargar', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Seg Atajos ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irASeguimientos(page, lead.id)
  const formulario = await abrirRedactor(page)
  await formulario.getByLabel('Resumen').fill('Con atajos')
  const editor = editorDe(formulario)
  await editor.click()
  await editor.pressSequentially('Nunca nada')
  await expect(editor).toHaveText('Nunca nada')
  await expect(page.getByRole('dialog', { name: 'Nuevo lead' })).toHaveCount(0)

  // Recargar: el redactor vuelve abierto, con lo escrito.
  await page.reload()
  const repuesto = redactor(page)
  await expect(repuesto.getByLabel('Resumen')).toHaveValue('Con atajos')
  await expect(editorDe(repuesto)).toHaveText('Nunca nada')

  // Esc lo pliega y el borrador queda; Ctrl/Cmd+Enter guarda (y no mete un salto).
  await editorDe(repuesto).click()
  await page.keyboard.press('Escape')
  await expect(redactor(page)).toHaveCount(0)
  const deVuelta = await abrirRedactor(page)
  await expect(editorDe(deVuelta)).toHaveText('Nunca nada')
  await editorDe(deVuelta).click()
  await page.keyboard.press('ControlOrMeta+Enter')
  await expect(seguimiento(page, 'Con atajos')).toBeVisible()
  const [guardado] = await seguimientosEnLaBase(lead.id)
  expect(guardado?.detalle_texto).toBe('Nunca nada')
})

test('«Próximo contacto» nace plegado, se explica y se guarda junto con el seguimiento', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Seg Proximo ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irASeguimientos(page, lead.id)

  const formulario = await abrirRedactor(page)
  // Plegado: ni fecha ni atajos, y ninguna palabra sobre un «recordatorio (opcional)».
  await expect(formulario.getByRole('button', { name: 'Programar próximo contacto' })).toBeVisible()
  await expect(formulario.getByLabel('Fecha y hora')).toHaveCount(0)
  await expect(formulario.getByText('Recordatorio (opcional)')).toHaveCount(0)

  await formulario.getByLabel('Resumen').fill('Quedó en confirmar el precio')
  await formulario.getByRole('button', { name: 'Programar próximo contacto' }).click()
  await expect(formulario.getByRole('group', { name: 'Próximo contacto' })).toBeVisible()
  await expect(
    formulario.getByText('Un recordatorio para ti: cuándo volver a contactar a este lead.'),
  ).toBeVisible()
  await expect(formulario.getByRole('button', { name: 'Mañana 09:00' })).toBeFocused()
  await formulario.getByRole('button', { name: 'Mañana 09:00' }).click()
  await formulario.getByRole('button', { name: 'Guardar' }).click()

  await expect(seguimiento(page, 'Quedó en confirmar el precio')).toBeVisible()
  const agendados = await recordatoriosEnLaBase(lead.id)
  expect(agendados.map((r) => r.titulo)).toEqual(['Quedó en confirmar el precio'])
  expect(Date.parse(agendados[0]?.recordar_en ?? '')).toBeGreaterThan(Date.now())

  // «Quitar» lo vacía y lo pliega, y devuelve el foco al botón.
  const otro = await abrirRedactor(page)
  await otro.getByRole('button', { name: 'Programar próximo contacto' }).click()
  await otro.getByRole('button', { name: 'Quitar' }).click()
  await expect(otro.getByRole('button', { name: 'Programar próximo contacto' })).toBeFocused()
})

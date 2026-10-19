import { expect, test } from './soporte/prueba'
import { formatearNumero } from '../src/shared/lib/formato'
import {
  Teclado,
  abrirConN,
  dialogo,
  entrar,
  limpiarAlta,
  prepararAlta,
  variantesDe,
  type PersonasDelAlta,
} from './soporte/alta'
import { crearLead } from './soporte/leads'
import { tipoDeFabrica } from './soporte/tipos-de-lead'
import {
  carteraDe,
  codigoDePaisDeLaEmpresa,
  constanciasDeAdopcion,
  idDePersona,
  leadsConTelefono,
  mandarAlLimbo,
  origenDeLead,
  recordatoriosDe,
  seguimientosDe,
  telefonoAlAzar,
} from './soporte/leads-alta'

// El alta rápida de un lead (tarea de oro 1) contra la app compilada y el Supabase local: el
// recorrido medido, el teléfono pegado de distintas maneras y los tres duplicados.
test.describe.configure({ mode: 'serial' })

let personas: PersonasDelAlta
let restaurar = async () => {}
let codigo = ''

test.beforeAll(async ({}, info) => {
  const terreno = await prepararAlta(info.project.name)
  personas = terreno.personas
  restaurar = terreno.restaurarCatalogos
  codigo = await codigoDePaisDeLaEmpresa()
})

test.afterAll(async () => {
  await limpiarAlta(restaurar)
})

// Un lead nuevo: cada test usa su teléfono y nombres «E2E …» (es lo que borra la limpieza).
const nuevoNumero = () => {
  const nacional = telefonoAlAzar()
  return { nacional, normalizado: `${codigo}${nacional}` }
}

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('tarea de oro 1: de N al lead guardado con seguimiento, sólo con el teclado', async ({
  page,
}, info) => {
  const { nacional, normalizado } = nuevoNumero()
  const nombre = `E2E Oro ${info.project.name}`
  const resumen = 'Pidió precio del RAV4'
  await entrar(page, personas.duena)

  const teclado = new Teclado(page)
  const { inicio } = await abrirConN(page, teclado)
  const panel = dialogo(page)
  await expect(panel.getByLabel('Teléfono principal')).toBeFocused()
  const abierto = performance.now()

  // Teléfono, nombre (el origen y el tipo traen su valor), y a los datos del seguimiento.
  await teclado.escribir(nacional)
  await teclado.pulsar('Tab')
  await teclado.escribir(nombre)
  await teclado.pulsar('Control+Enter')
  await expect(panel.getByLabel('Resumen')).toBeFocused()
  await teclado.escribir(resumen)
  // El próximo contacto está plegado: anotar un seguimiento no lo pide.
  await expect(panel.getByLabel('Fecha y hora')).toHaveCount(0)
  await teclado.pulsar('Control+Enter')
  await expect(page.getByText(/Lead creado/)).toBeVisible()
  const fin = performance.now()

  // Lo que quedó: el lead y su seguimiento (sin recordatorio), y la persona es la dueña.
  const [lead] = await leadsConTelefono(normalizado)
  // Sin tocar el tipo, el alta propone el de la clase prospecto (el primero activo por orden).
  expect(lead).toMatchObject({
    nombre,
    tipo_lead_id: (await tipoDeFabrica('prospecto')).id,
    telefono_cc: `+${codigo}`,
  })
  expect(lead?.origen_lead_id).not.toBeNull()
  expect((await seguimientosDe(lead?.id ?? '')).map((s) => s.titulo)).toEqual([resumen])
  expect(await recordatoriosDe(lead?.id ?? '')).toEqual([])
  expect((await carteraDe(lead?.id ?? '')).find((c) => c.tipo_acceso === 'dueno')?.usuario_id).toBe(
    await idDePersona(personas.duena),
  )

  // El drawer queda listo para el siguiente: teléfono vacío y con el foco.
  await expect(panel.getByLabel('Teléfono principal')).toHaveValue('')
  await expect(panel.getByLabel('Teléfono principal')).toBeFocused()

  // La medida. Lo pulsado (sin contar lo que se tipea) y cero clics son lo que no cambia de una
  // máquina a otra; el reloj del robot es un tope generoso, no la hora de una persona. La hora de
  // una persona se estima con KLM: 0,28 s por tecla, 1,35 s por cada decisión (teléfono, nombre y
  // resumen).
  const controles = teclado.pulsaciones
  const klm = (teclado.caracteres + controles) * 0.28 + 3 * 1.35
  const robot = (fin - inicio) / 1000
  const seg = (valor: number) => `${formatearNumero(valor, { decimales: 1 })} s`
  const resumenDeLaMedida =
    `${seg(robot)} en total (${seg((fin - abierto) / 1000)} desde que abrió) · ` +
    `${String(controles)} teclas de control + ${String(teclado.caracteres)} caracteres · ` +
    `estimación de una persona (KLM): ${seg(klm)} · 0 clics`
  console.warn(`[tarea de oro 1] ${info.project.name}: ${resumenDeLaMedida}`)
  info.annotations.push({
    type: 'meta de 25 s',
    description: `robot ${seg(robot)}; KLM ${seg(klm)}; ${String(controles)} teclas de control`,
  })
  expect(controles).toBeLessThanOrEqual(8)
  expect(robot).toBeLessThan(15)
  expect(klm).toBeLessThanOrEqual(25)
})

test('el teléfono pegado con espacios, guiones, paréntesis, «+» y «00» llega al mismo número', async ({
  page,
}) => {
  await entrar(page, personas.duena)
  await abrirConN(page)
  const panel = dialogo(page)
  const telefono = panel.getByLabel('Teléfono principal')
  const { nacional } = nuevoNumero()
  for (const escrito of variantesDe(nacional, codigo)) {
    await telefono.fill(escrito)
    // Dice cómo va a quedar, con su país, apenas es un teléfono.
    await expect(panel.getByText(`Se guardará como +${codigo} ${nacional} · `)).toBeVisible()
  }
  // De otro país: «+» y «00» mantienen su código.
  await telefono.fill('+54 9 11 5555-0000')
  await expect(panel.getByText('Se guardará como +54 91155550000 · Argentina.')).toBeVisible()
  await telefono.fill('0054 9 11 5555-0000')
  await expect(panel.getByText('Se guardará como +54 91155550000 · Argentina.')).toBeVisible()
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('lo que no es un teléfono se dice junto al campo, al salir de él', async ({ page }) => {
  await entrar(page, personas.duena)
  await abrirConN(page)
  const panel = dialogo(page)
  const telefono = panel.getByLabel('Teléfono principal')
  const casos: [string, string][] = [
    ['70abc123', 'El teléfono sólo lleva números'],
    ['700', 'Al teléfono le faltan dígitos'],
    ['1234567890123456', 'Al teléfono le sobran dígitos'],
    ['7001+1002', 'El «+» va sólo al inicio'],
  ]
  for (const [escrito, motivo] of casos) {
    await telefono.fill(escrito)
    await panel.getByLabel('Nombre', { exact: true }).focus()
    await expect(panel.getByText(motivo)).toBeVisible()
    await expect(telefono).toHaveAttribute('aria-invalid', 'true')
  }
  // Lo escrito sigue: nada se pierde por un error.
  await expect(telefono).toHaveValue('7001+1002')
})

test('un teléfono que ya es mío: se dice al terminar de tipear y no deja crear otro', async ({
  page,
}, info) => {
  const { nacional, normalizado } = nuevoNumero()
  const nombre = `E2E Existe ${info.project.name}`
  await crearLead({
    nombre: `Existe ${info.project.name}`,
    telefono: normalizado,
    deQuien: personas.duena,
  })
  await entrar(page, personas.duena)
  await abrirConN(page)
  const panel = dialogo(page)

  await panel.getByLabel('Teléfono principal').fill(nacional)
  const tipeado = performance.now()
  await expect(
    panel.getByText(/Ya existe: E2E Existe .* \((?:N\.º|Tu n\.º) [\d.]+\), y es tuyo\./),
  ).toBeVisible()
  const tardo = performance.now() - tipeado
  console.warn(
    `[duplicado] avisado ${formatearNumero(tardo, { decimales: 0 })} ms después de tipear (debounce 400 ms)`,
  )
  expect(tardo).toBeLessThan(4000)

  // No se puede seguir: el motivo queda junto al teléfono y todo lo escrito sigue.
  await panel.getByLabel('Nombre', { exact: true }).fill(nombre)
  await page.keyboard.press('Control+Enter')
  await expect(panel.getByText('No se puede crear otro lead con este teléfono.')).toBeVisible()
  await expect(panel.getByLabel('Resumen')).toBeHidden()
  await expect(panel.getByLabel('Nombre', { exact: true })).toHaveValue(nombre)
  expect(await leadsConTelefono(normalizado)).toHaveLength(1)
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('el de otra persona dice de quién es y nada más del lead', async ({ page }, info) => {
  const { nacional, normalizado } = nuevoNumero()
  const secreto = `E2E Ajeno ${info.project.name}`
  await crearLead({
    nombre: `Ajeno ${info.project.name}`,
    telefono: normalizado,
    deQuien: personas.berta,
  })
  await entrar(page, personas.carlos)
  await abrirConN(page)
  const panel = dialogo(page)

  await panel.getByLabel('Teléfono principal').fill(nacional)
  await expect(panel.getByText(`Lo tiene ${personas.nombres.berta}.`)).toBeVisible()
  // Ni el nombre del lead ni su número aparecen en ningún lado.
  expect(await page.content()).not.toContain(secreto)
  expect(await page.content()).not.toMatch(/Ya existe/)
  // Escribirle por chat llega con el chat: acá no hay ninguna acción.
  await expect(panel.getByRole('button', { name: /chat/i })).toHaveCount(0)

  await panel.getByLabel('Nombre', { exact: true }).fill(`E2E Intruso ${info.project.name}`)
  await page.keyboard.press('Control+Enter')
  await expect(panel.getByText('No se puede crear otro lead con este teléfono.')).toBeVisible()
  expect(await leadsConTelefono(normalizado)).toHaveLength(1)
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('un lead sin dueño se toma al guardar, no pisa lo que tiene y deja constancia', async ({
  page,
}, info) => {
  const { nacional, normalizado } = nuevoNumero()
  const original = `E2E Limbo ${info.project.name}`
  const leadId = await crearLead({
    nombre: `Limbo ${info.project.name}`,
    telefono: normalizado,
    deQuien: personas.berta,
  })
  await mandarAlLimbo(leadId)
  await entrar(page, personas.duena)
  await abrirConN(page)
  const panel = dialogo(page)

  await panel.getByLabel('Teléfono principal').fill(nacional)
  await expect(panel.getByText('Sin dueño.')).toBeVisible()
  // Sin tomarlo no se avanza.
  await panel.getByLabel('Nombre', { exact: true }).fill('Otro Nombre Que No Pisa')
  await page.keyboard.press('Control+Enter')
  await expect(
    panel.getByText('Este teléfono está sin dueño: toma el lead para seguir.'),
  ).toBeVisible()

  await panel.getByRole('button', { name: 'Tomar lead' }).click()
  await expect(panel.getByText(/Se conserva lo que ya tiene/)).toBeVisible()
  await page.keyboard.press('Control+Enter')
  await panel.getByLabel('Resumen').fill('Retomé el contacto')
  await page.keyboard.press('Control+Enter')
  await expect(page.getByText(/Lead tomado/)).toBeVisible()

  const [lead] = await leadsConTelefono(normalizado)
  expect(lead?.id).toBe(leadId)
  // El nombre que tenía se conserva; quien lo toma queda de dueña.
  expect(lead?.nombre).toBe(original)
  const duenaId = await idDePersona(personas.duena)
  expect(
    (await carteraDe(leadId)).filter((c) => c.usuario_id === duenaId && c.revocado_en === null),
  ).toMatchObject([{ tipo_acceso: 'dueno' }])
  expect(await constanciasDeAdopcion(leadId)).toHaveLength(1)
  expect((await seguimientosDe(leadId)).map((s) => s.titulo)).toEqual(['Retomé el contacto'])
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('el último origen que la persona usó queda elegido para el siguiente lead', async ({
  page,
}, info) => {
  const { nacional, normalizado } = nuevoNumero()
  const facebook = await origenDeLead('facebook')
  await entrar(page, personas.duena)
  await abrirConN(page)
  const panel = dialogo(page)
  await panel.getByLabel('Origen del lead').selectOption(facebook.id)
  await panel.getByLabel('Teléfono principal').fill(nacional)
  await panel.getByLabel('Nombre', { exact: true }).fill(`E2E Último origen ${info.project.name}`)
  await page.keyboard.press('Control+Enter')
  await panel.getByLabel('Resumen').fill('Vino de Facebook')
  await page.keyboard.press('Control+Enter')
  await expect(page.getByText(/Lead creado/)).toBeVisible()
  expect((await leadsConTelefono(normalizado))[0]?.origen_lead_id).toBe(facebook.id)

  // Otra carga de la pantalla: el origen que la persona usó por última vez.
  await page.reload()
  await abrirConN(page)
  await expect(dialogo(page).getByLabel('Origen del lead')).toHaveValue(facebook.id)
})

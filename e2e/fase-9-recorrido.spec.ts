// @sin-celular-archivo: el recorrido encadena tablero, actividad, datos y el dinero de la unidad, pantallas de escritorio por sus propios specs; las cuatro tareas de oro en el celular las midió el 9.14-1
import { readFileSync } from 'node:fs'
import { expect, test } from './soporte/prueba'
import { abrirConN, dialogo } from './soporte/alta'
import {
  tarjetaGuardada,
  tipearEnLaHoja,
  totalDeLaHoja,
  vigilarGuardados,
} from './soporte/cotizar-guardar'
import { barraDelVehiculo, panelDelVehiculo } from './soporte/cotizar-recorrido'
import {
  barraDelCliente,
  cambiarDeCuenta,
  cambiarElNombre,
  cifra,
  confirmarElPago,
  importarUnLead,
  instalarLaApp,
  leerCifra,
  leerCsv,
  leerMargen,
  margenConMonto,
  pagosDeLaUnidad,
  panelDelCliente,
  registrarElPago,
} from './soporte/fase-9-pasos'
import {
  codigoDelToken,
  limpiarFase9,
  prepararFase9,
  tokenDe,
  type TerrenoDeLaFase9,
} from './soporte/fase-9-recorrido'
import { carteraDe, leadsConTelefono, seguimientosDe, telefonoAlAzar } from './soporte/leads-alta'
import { irAFicha, tituloDeLaFicha } from './soporte/leads-ficha'
import { abrirMenuDeLaFicha } from './soporte/leads-marcas'
import { pedirComoVisitante } from './soporte/web-publica'
import { literal, sql } from './soporte/sql'

// El recorrido del «Terminado cuando» de la Fase 9 (9.14-2), con dos cuentas y sin sembrar lo que el recorrido produce: (R1) la asesora registra un lead
// con «N»; (R2) lo cotiza con un vehículo del inventario; (R3) la marca final y el lead pasa a cliente; (R4) la asesora registra el pago de la unidad y la
// dueña lo confirma (quien carga no confirma); (R5) la dueña ve en el tablero subir «Convertidos» y el margen del mes; (R5b) el turno de la web que la
// asesora contactó se cuenta en «Cola de la web»; (R6) la dueña encuentra en `/actividad` el cambio que hizo la asesora, con su diff, y (R6b) la asesora ve que hubo un
// cambio en un lead ajeno pero no su detalle; (R7) la dueña exporta los leads y vuelve a importar el del recorrido, que regresa a la cartera de su asesora; (R8) «Instalar la app».
// El detalle de cada pieza lo prueban sus specs y `supabase/tests/` (la tabla de criterios de la fase, `docs/PENDIENTES.md`).
test.describe.configure({ mode: 'serial' })

let t: TerrenoDeLaFase9 | undefined
let elLead: { id: string; nombre: string; nacional: string } | undefined
let laCotizacion = ''
let antes: { convertidos: number; margen: number } | undefined

const terreno = () => {
  if (!t) throw new Error('Falta el terreno del recorrido.')
  return t
}
const lead = () => {
  if (!elLead) throw new Error('R1 no dejó el lead del recorrido.')
  return elLead
}
const elTableroDeAntes = () => {
  if (!antes) throw new Error('R3 no leyó el tablero de antes.')
  return antes
}

const RESUMEN = 'Pidió precio del RAV4'
const CONCEPTO = 'Venta del recorrido 9'
const MONTO = 1500

test.beforeAll(async ({}, info) => {
  t = await prepararFase9(info.project.name)
})

test.afterAll(async () => {
  await limpiarFase9(t)
})

test('E2E R1 la asesora registra un lead con «N» y su seguimiento', async ({ page }) => {
  const tr = terreno()
  const nacional = telefonoAlAzar()
  const nombre = `E2E Recorrido 9 ${tr.proyecto}`
  await cambiarDeCuenta(page, tr.asesora.email)
  await page.goto('/')
  await abrirConN(page)
  const panel = dialogo(page)

  await page.keyboard.type(nacional)
  await page.keyboard.press('Tab')
  await page.keyboard.type(nombre)
  await page.keyboard.press('Control+Enter')
  await expect(panel.getByLabel('Resumen')).toBeFocused()
  await page.keyboard.type(RESUMEN)
  await page.keyboard.press('Control+Enter')
  await expect(page.getByText(/Lead creado/)).toBeVisible()

  // Lo que quedó: el lead en la cartera de la asesora, con su seguimiento. Lo creó la interfaz, no `sql()`.
  const [fila] = await leadsConTelefono(`${tr.codigoDePais}${nacional}`)
  expect(fila?.nombre).toBe(nombre)
  const id = fila?.id ?? ''
  expect(id).not.toBe('')
  expect((await seguimientosDe(id)).map((s) => s.titulo)).toEqual([RESUMEN])
  expect((await carteraDe(id)).find((c) => c.tipo_acceso === 'dueno')?.usuario_id).toBe(
    tr.asesora.id,
  )
  elLead = { id, nombre, nacional }
})

test('E2E R2 la asesora cotiza ese lead con un vehículo del inventario', async ({ page }) => {
  test.setTimeout(120_000)
  const tr = terreno()
  const guardados = await vigilarGuardados(page)
  await cambiarDeCuenta(page, tr.asesora.email)
  await page.goto(`/cotizaciones/nuevo?origen=${tr.subasta}`)
  await expect(page.locator('[data-hoja]')).toBeVisible()

  await barraDelVehiculo(page).click()
  await panelDelVehiculo(page).getByRole('searchbox').fill(tr.vehiculo.titulo)
  const tarjeta = panelDelVehiculo(page)
    .getByRole('list', { name: 'Vehículos' })
    .getByRole('button')
    .first()
  await expect(tarjeta).toContainText(tr.vehiculo.titulo)
  await tarjeta.click()
  await expect(page).toHaveURL(new RegExp(`vehiculo=${tr.vehiculo.id}`))

  await barraDelCliente(page).click()
  await panelDelCliente(page).getByRole('searchbox').fill(lead().nombre)
  const suFila = panelDelCliente(page)
    .getByRole('list', { name: 'Leads' })
    .getByRole('listitem')
    .filter({ hasText: lead().nombre })
    .getByRole('button')
  await expect(suFila).toHaveCount(1)
  await suFila.click()
  await expect(panelDelCliente(page)).toBeHidden()
  await expect(page).toHaveURL(new RegExp(`lead=${lead().id}`))

  await tipearEnLaHoja(page, 'remate', '9500')
  await tipearEnLaHoja(page, 'grua', '450')
  await expect(page.getByLabel('Resumen')).toHaveAttribute('aria-busy', 'false')
  await expect(totalDeLaHoja(page)).toContainText(/\d/)
  await page.keyboard.press('ControlOrMeta+s')
  await expect(tarjetaGuardada(page)).toContainText(/Cotización n\.º \d+ guardada/)

  // El id sale del pedido que guardó la hoja, como `comprobarLoGuardado`.
  const deLaHoja = guardados.pedidos.filter((visto) => Object.hasOwn(visto, 'intento'))
  expect(deLaHoja).toHaveLength(1)
  laCotizacion = deLaHoja[0]?.intento ?? ''
  expect(
    sql(`select creado_por || '|' || lead_id || '|' || vehiculo_id
           from public.cotizaciones where id = ${literal(laCotizacion)}::uuid`),
  ).toBe(`${terreno().asesora.id}|${lead().id}|${terreno().vehiculo.id}`)
})

test('E2E R3 la asesora marca final su cotización y el lead pasa a cliente', async ({ page }) => {
  const tr = terreno()
  // El antes del tablero lo lee la dueña (es quien tiene `tablero.metricas.ver`): lo que sube es de R3 (la final) y de R4 (el pago).
  await cambiarDeCuenta(page, tr.duena)
  await page.goto('/tablero')
  await expect(page.getByRole('heading', { name: 'Tablero', level: 1 })).toBeVisible()
  await expect(cifra(page, 'Convertidos')).toBeVisible()
  antes = { convertidos: await leerCifra(page, 'Convertidos'), margen: await leerMargen(page) }

  // La marca quien está en la cartera del lead: marcar final exige `puede_actuar_lead` › `en_cartera`, no alcanza con `leads.editar` de
  // todos. La dueña no está en la cartera de un lead que registró su asesora, así que la final es de la asesora (D11).
  await cambiarDeCuenta(page, tr.asesora.email)
  await page.goto(`/cotizaciones/${laCotizacion}`)
  await expect(page.getByRole('button', { name: 'Revisiones' })).toBeVisible()
  await page.getByRole('button', { name: 'Marcar final' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Marcar final' }).click()
  await expect(page.getByText(/Marcaste la n\.º \d+ como final\./)).toBeVisible()
  expect(
    sql(`select clase::text from public.cotizaciones where id = ${literal(laCotizacion)}::uuid`),
  ).toBe('final')
  // La final convierte: el lead queda cliente y el vehículo, vinculado a él.
  expect(
    sql(
      `select (cliente_desde is not null)::text from public.leads where id = ${literal(lead().id)}::uuid`,
    ),
  ).toBe('true')
  expect(
    sql(
      `select coalesce(lead_id::text, '') from public.vehiculos where id = ${literal(terreno().vehiculo.id)}::uuid`,
    ),
  ).toBe(lead().id)
})

test('E2E R4 la asesora registra el pago de esa unidad y la dueña lo confirma', async ({
  page,
}) => {
  test.setTimeout(120_000)
  const tr = terreno()
  await cambiarDeCuenta(page, tr.asesora.email)
  await page.goto(`/logistica/vehiculo/${tr.vehiculo.id}`)
  await registrarElPago(page, { concepto: CONCEPTO, monto: MONTO })
  // Quien carga el pago no tiene la clave de confirmar.
  await expect(page.getByRole('button', { name: 'Confirmar pago' })).toHaveCount(0)

  await cambiarDeCuenta(page, tr.duena)
  await page.goto(`/logistica/vehiculo/${tr.vehiculo.id}`)
  await confirmarElPago(page, CONCEPTO)
  await expect(
    pagosDeLaUnidad(page).getByText(`Confirmado por ${tr.nombreDeLaDuena}`),
  ).toBeVisible()
  await expect(pagosDeLaUnidad(page).getByText('Sin confirmar')).toHaveCount(0)
})

test('E2E R5 la dueña ve en el tablero subir «Convertidos» y el margen del mes', async ({
  page,
}) => {
  await cambiarDeCuenta(page, terreno().duena)
  await page.goto('/tablero')
  await expect(cifra(page, 'Convertidos')).toBeVisible()
  // Se compara el aumento, no un total: otros specs convierten leads y confirman pagos el mismo mes.
  expect(
    (await leerCifra(page, 'Convertidos')) - elTableroDeAntes().convertidos,
  ).toBeGreaterThanOrEqual(1)
  await expect(margenConMonto(page)).toBeVisible()
  expect((await leerMargen(page)) - elTableroDeAntes().margen).toBeGreaterThanOrEqual(MONTO * 100)
  // El monto va por `<Monto>`: no queda en el nombre accesible del grupo.
  expect((await margenConMonto(page).getAttribute('aria-label')) ?? '').not.toMatch(/\d/)
})

test('E2E R5b la cola de la web del tablero cuenta el turno que la asesora contactó', async ({
  page,
}) => {
  const tr = terreno()
  const token = tokenDe(tr.proyecto, 1)
  const respuesta = await pedirComoVisitante(token)
  expect(respuesta).toEqual({ esRespaldo: false, nombre: tr.asesora.nombre })
  const codigo = codigoDelToken(token)
  expect(codigo).not.toBe('')

  await cambiarDeCuenta(page, tr.asesora.email)
  await page.goto('/')
  const tarjeta = page
    .getByRole('region', { name: 'Turnos de la web sin confirmar' })
    .getByRole('article', { name: `Turno ${codigo}` })
  await expect(tarjeta).toBeVisible()
  await tarjeta.getByRole('button', { name: 'Contacté' }).click()
  await expect(tarjeta).toHaveCount(0)

  await cambiarDeCuenta(page, tr.duena)
  await page.goto('/tablero')
  const cola = page.getByRole('region', { name: 'Cola de la web' })
  await expect(cola).toBeVisible()
  await expect(cifra(cola, 'Turnos')).toBeVisible()
  expect(await leerCifra(cola, 'Turnos')).toBeGreaterThanOrEqual(1)
  await expect(cifra(cola, 'Tasa de contacto')).toBeVisible()
  await cola.getByText('Ver como tabla').click()
  await expect(cola.getByRole('row').filter({ hasText: tr.asesora.nombre })).toHaveCount(1)
})

test('E2E R6 la dueña encuentra en /actividad el cambio del lead con su diff', async ({ page }) => {
  const tr = terreno()
  const despues = `${lead().nombre} editado`
  // Lo cambia quien está en la cartera: editar un lead, como marcar final, exige `puede_actuar_lead` › `en_cartera` (D11).
  await cambiarDeCuenta(page, tr.asesora.email)
  await cambiarElNombre(page, lead().id, despues)
  await expect(tituloDeLaFicha(page, despues)).toBeVisible()

  // La dueña lo encuentra: `actividad.ver` no tiene alcance, ve lo que hicieron los demás.
  await cambiarDeCuenta(page, tr.duena)
  await irAFicha(page, lead().id)
  const menu = await abrirMenuDeLaFicha(page)
  await menu.getByRole('menuitem', { name: 'Ver actividad' }).click()
  await expect(page).toHaveURL(new RegExp(`/actividad\\?entidad=leads&registro=${lead().id}$`))
  await expect(page.getByText('Mostrando la actividad de un solo registro de lead.')).toBeVisible()
  await expect(page.locator('th', { hasText: /^Hoy$/ })).toBeVisible()

  // El alta también la hizo la asesora, y marcar final dejó su propia fila («Tipo de lead», el lead pasó a cliente): la del nombre es la
  // que lleva ese campo.
  const fila = page
    .getByRole('row')
    .filter({ has: page.getByRole('button', { name: /^Abrir Cambió/ }) })
    .filter({ hasText: 'Nombre' })
  await expect(fila).toHaveCount(1)
  await expect(fila).toContainText(tr.asesora.nombre)
  await fila.getByRole('button', { name: /^Abrir Cambió/ }).click()
  const diff = page.getByRole('dialog', { name: 'Detalle del cambio' })
  await expect(diff).toBeVisible()
  await expect(diff.getByRole('term')).toHaveText(['Nombre'])
  await expect(diff.getByRole('definition')).toContainText(`Antes${lead().nombre}`)
  await expect(diff.getByRole('definition')).toContainText(`Después${despues}`)
  await page.keyboard.press('Escape')
  await expect(diff).toBeHidden()
  elLead = { ...lead(), nombre: despues }
})

test('E2E R6b la asesora no ve el detalle del cambio de un lead ajeno', async ({ page }) => {
  const tr = terreno()
  // La dueña cambia el nombre de SU lead (está en su cartera): así hay actividad ajena que mirar.
  await cambiarDeCuenta(page, tr.duena)
  await cambiarElNombre(page, tr.leadDeLaDuena, `E2E Fase 9 ajeno ${tr.proyecto} editado`)

  await cambiarDeCuenta(page, tr.asesora.email)
  await page.goto(`/actividad?entidad=leads&registro=${tr.leadDeLaDuena}`)
  await expect(page.getByText('Mostrando la actividad de un solo registro de lead.')).toBeVisible()
  // El recorte no esconde que hubo un cambio: esconde el qué. Ni los campos ni el diff.
  const ajena = page.getByRole('row').filter({ hasText: tr.nombreDeLaDuena })
  await expect(ajena).toHaveCount(1)
  await expect(ajena).toContainText('Sin acceso al detalle')
  await expect(ajena.getByRole('button', { name: /^Abrir Cambió/ })).toHaveCount(0)

  // El control: de lo suyo sí ve los campos y puede abrir el diff.
  await page.goto(`/actividad?entidad=leads&registro=${lead().id}`)
  const propia = page.getByRole('row').filter({ hasText: 'Nombre' })
  await expect(propia).toHaveCount(1)
  await expect(propia.getByRole('button', { name: /^Abrir Cambió/ })).toHaveCount(1)
})

test('E2E R7 la dueña exporta los leads y vuelve a importar el del recorrido', async ({ page }) => {
  test.setTimeout(150_000)
  const tr = terreno()
  await cambiarDeCuenta(page, tr.duena)
  await page.goto('/datos')
  const leads = page.getByRole('region', { name: 'Leads', exact: true })
  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    leads.getByRole('button', { name: 'Descargar' }).click(),
  ])
  expect(descarga.suggestedFilename()).toMatch(/^leads-todos-\d{4}-\d{2}-\d{2}\.csv$/)
  const texto = readFileSync(await descarga.path(), 'utf8')
  const { encabezado, lineas, columna } = leerCsv(texto)

  // El lead es de la cartera de la asesora: para la dueña es ajeno, así que su teléfono sale enmascarado (lo que promete el 9.05).
  const suya = lineas.find((linea) => linea.includes(lead().nombre)) ?? ''
  expect(suya, 'la línea del lead del recorrido en el CSV').not.toBe('')
  expect(columna(suya, 'Dueño')).toBe(tr.asesora.nombre)
  expect(columna(suya, 'Teléfono')).toMatch(/^.{3}•{2,}\d{2}$/)
  expect(encabezado).toContain('Nombre')

  // «Importar en una base limpia»: se borra el lead del recorrido y se vuelve a traer desde el archivo. El teléfono es el que tipeó R1 (el del
  // archivo viene enmascarado, justamente porque es ajeno).
  sql(`delete from public.actividad where tabla = 'leads' and registro_id = ${literal(lead().id)};
       delete from public.leads where id = ${literal(lead().id)}::uuid`)
  expect(await leadsConTelefono(`${tr.codigoDePais}${lead().nacional}`)).toHaveLength(0)

  await importarUnLead(page, {
    destino: tr.asesora.nombre,
    nombre: lead().nombre,
    telefono: lead().nacional,
  })

  // Volvió, y con su asesora.
  const [vuelto] = await leadsConTelefono(`${tr.codigoDePais}${lead().nacional}`)
  expect(vuelto?.nombre).toBe(lead().nombre)
  expect(
    (await carteraDe(vuelto?.id ?? '')).find((c) => c.tipo_acceso === 'dueno')?.usuario_id,
  ).toBe(tr.asesora.id)
  await cambiarDeCuenta(page, tr.asesora.email)
  await page.goto('/leads')
  await expect(page.getByText(lead().nombre).first()).toBeVisible()
})

test('E2E R8 «Instalar la app» llama a prompt() una vez y desaparece', async ({ page }) => {
  const tr = terreno()
  await cambiarDeCuenta(page, tr.duena)
  await instalarLaApp(page, tr.nombreDeLaDuena)
})

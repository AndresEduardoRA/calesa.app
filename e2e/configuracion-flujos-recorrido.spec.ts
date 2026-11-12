// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import {
  agregarEsperaA,
  agregarRequisito,
  agregarSalida,
  aviso,
  comoPersona,
  crearFase,
  fasesDelOrigen,
  fijarEsperas,
  franjaAbierta,
  idDeFase as faseDe,
  inspectorDe,
  leerEsperas,
  limpiarRecorrido,
  nombresDeFases,
  quitarRequisito,
} from './soporte/flujos-recorrido'
import { aLaVista } from './soporte/inventario'
import { elegirDelMenu } from './soporte/lista-de-catalogo'
import { literal, sql } from './soporte/sql'

// El cierre de la Fase 5 (5.13, `docs/PLAN.md` › «Fase 5» › «Terminado cuando»): la dueña, sin SQL para configurar, crea un origen (nace sin fases), arma 5
// fases con sus salidas, pide un dato, un documento y una espera contra el flujo de repuestos; «Revisar» marca la fase sin salida y la espera cruzada, y
// ella las corrige. Un vehículo nuevo nace en la inicial, se mueve por SQL como la dueña (mover no tiene pantalla hasta la Fase 6) y, al jubilar esa fase
// con historial, deja de ser destino («jubilada») mientras `/vehiculos` y la ficha la siguen nombrando. Lo de cada regla lo prueba la base
// (`supabase/tests/areas/flujos/*.sql`, `supabase/tests/flujos-*.sql`); esto es el camino feliz entero, en serie.
test.describe.configure({ mode: 'serial' })

const P = 'E2E 5.13'
const ORIGEN = `${P} Recorrido`
const COMPRA = `${P} Compra`
const PUERTO = `${P} Puerto`
const TRANSITO = `${P} Tránsito`
const LLEGADA = `${P} Llegada`
const ENTREGA = `${P} Entrega`
const VEHICULO = `${P} Vehículo`

let duena = ''
let origenId = ''
let flujoDeRepuestos = ''
let esperasDeRepuestosAntes: string | null = null

const delOrigen = fasesDelOrigen(ORIGEN)
const idDeFase = (nombre: string): string => faseDe(ORIGEN, nombre)
const urlDeFase = (nombre: string) =>
  `/configuracion/flujos?origen=${origenId}&fase=${idDeFase(nombre)}`
const comoDuena = (consulta: string): string => comoPersona(duena, consulta)

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await limpiarRecorrido(ORIGEN)
  // El flujo de repuestos es el de la semilla: su regla «Esperas» se enciende para la espera inversa y se devuelve como estaba.
  flujoDeRepuestos = sql(
    `select id from public.flujos where ambito = 'repuestos' order by nombre limit 1`,
  )
  esperasDeRepuestosAntes = leerEsperas(flujoDeRepuestos)
  fijarEsperas(flujoDeRepuestos, 'true')
  duena = correoDePrueba(`duena-recorrido-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Rocío Recorrido' })
})

test.afterAll(async () => {
  await limpiarRecorrido(ORIGEN)
  if (flujoDeRepuestos !== '') fijarEsperas(flujoDeRepuestos, esperasDeRepuestosAntes)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test(`${P} la dueña crea un origen y arma 5 fases con sus salidas`, async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/origenes')
  await page.getByRole('button', { name: 'Nuevo origen' }).click()
  const panel = page.getByRole('dialog')
  await panel.getByLabel('Nombre', { exact: true }).fill(ORIGEN)
  await panel.getByLabel('Lo que entra por acá se llama').fill('unidad')
  await panel.getByRole('button', { name: 'Crear origen' }).click()
  await expect(page.getByText(`Origen «${ORIGEN}» creado`)).toBeVisible()

  // «Siguientes pasos» lleva al flujo del origen, que nace sin fases.
  const pasos = page.getByRole('region', { name: `Siguientes pasos para ${ORIGEN}` })
  await pasos.getByRole('link', { name: 'Abrir' }).first().click()
  await expect(page).toHaveURL(/\/configuracion\/flujos\?origen=/)
  origenId = new URL(page.url()).searchParams.get('origen') ?? ''
  expect(origenId).toBe(sql(`select id from public.origenes where nombre = ${literal(ORIGEN)}`))
  await expect(page.getByRole('heading', { name: 'Fases', level: 2 })).toBeVisible()
  await expect(nombresDeFases(page)).toHaveCount(0)

  await crearFase(page, COMPRA, 'Inicial')
  await crearFase(page, PUERTO, 'Intermedia')
  await crearFase(page, TRANSITO, 'Intermedia')
  await crearFase(page, LLEGADA, 'Intermedia')
  await crearFase(page, ENTREGA, 'Final')
  await expect(nombresDeFases(page)).toHaveText([COMPRA, PUERTO, TRANSITO, LLEGADA, ENTREGA])

  // Las salidas; «Llegada» queda sin salida a propósito (la corrige «Revisar»).
  await agregarSalida(await inspectorDe(page, urlDeFase(COMPRA), COMPRA), PUERTO, 'Embarcar')
  await agregarSalida(await inspectorDe(page, urlDeFase(PUERTO), PUERTO), TRANSITO, 'Zarpar')
  const transito = await inspectorDe(page, urlDeFase(TRANSITO), TRANSITO)
  await agregarSalida(transito, LLEGADA, 'Arribar')
  await agregarSalida(transito, ENTREGA, 'Entregar directo')
  expect(
    sql(`select count(*) from public.fases_transiciones where de_fase_id in ${delOrigen}`),
  ).toBe('4')
})

test(`${P} la dueña pide un documento, un dato y una espera; Revisar marca la fase sin salida y la espera cruzada, y las corrige`, async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })

  // Un dato y un documento en «Tránsito».
  const transito = await inspectorDe(page, urlDeFase(TRANSITO), TRANSITO)
  const dato = await agregarRequisito(transito, 'Dato')
  await dato.getByLabel('Dato que se pide').selectOption('vehiculo.vin')
  await dato.getByRole('button', { name: 'Agregar requisito' }).click()
  await expect(dato).toBeHidden()
  await expect(transito.getByText('VIN del vehículo', { exact: true })).toBeVisible()
  const documento = await agregarRequisito(transito, 'Documento')
  const tipos = documento.getByLabel('Tipo de documento').locator('option:not([value=""])')
  const tipo = (await tipos.first().textContent())?.trim() ?? ''
  await documento.getByLabel('Tipo de documento').selectOption({ label: tipo })
  await documento.getByLabel('Mínimo de archivos').fill('1')
  await documento.getByLabel('Máximo de archivos').fill('3')
  await documento.getByRole('checkbox', { name: 'PDF' }).check()
  await documento.getByRole('button', { name: 'Agregar requisito' }).click()
  await expect(documento).toBeHidden()
  await expect(transito.getByText(`${tipo} · 1 a 3 archivos · PDF`, { exact: true })).toBeVisible()

  // «Llegada» espera a que un repuesto llegue a la primera fase de repuestos.
  const r = sql(
    `select id || '|' || nombre from public.fases where flujo_id = '${flujoDeRepuestos}' and activa order by orden limit 1`,
  )
  const [faseDeRepuestos = '', ...partes] = r.split('|')
  const nombreDeRepuestos = partes.join('|')
  const llegada = await inspectorDe(page, urlDeFase(LLEGADA), LLEGADA)
  const espera = await agregarRequisito(llegada, 'Espera')
  await espera.getByLabel('Fase que se espera').selectOption(faseDeRepuestos)
  await espera.getByRole('button', { name: 'Agregar requisito' }).click()
  await expect(espera).toBeHidden()
  await expect(
    llegada.getByText(`Espera a que un repuesto llegue a «${nombreDeRepuestos}»`, { exact: true }),
  ).toBeVisible()

  // Desde el flujo de repuestos, esa fase espera a «Llegada»: las dos se esperan mutuamente.
  const urlDeRepuestos = `/configuracion/flujos?ambito=repuestos&fase=${faseDeRepuestos}`
  const deRepuestos = await inspectorDe(page, urlDeRepuestos, nombreDeRepuestos)
  const descripcionInversa = await agregarEsperaA(deRepuestos, LLEGADA)
  expect(descripcionInversa).not.toBe('')

  // «Revisar» marca las dos.
  let franja = await franjaAbierta(page, origenId)
  await expect(franja.getByRole('button', { name: /^Revisar:/ })).toHaveText(/\d+ avisos/)
  await expect(aviso(franja, LLEGADA, 'no tiene salida')).toHaveCount(1)
  await expect(aviso(franja, LLEGADA, 'Esperas cruzadas')).toHaveCount(1)

  // La fase sin salida: el aviso abre su inspector y ahí se le agrega la salida.
  await franja
    .getByRole('button', { name: `Abrir la fase «${LLEGADA}»` })
    .first()
    .click()
  await expect(page).toHaveURL(new RegExp(`fase=${idDeFase(LLEGADA)}`))
  const desdeElAviso = page.getByRole('dialog').filter({ hasText: 'Salidas y quién mueve' })
  await expect(desdeElAviso.getByRole('heading', { name: LLEGADA })).toBeVisible()
  await agregarSalida(desdeElAviso, ENTREGA, 'Entregar')
  await page.keyboard.press('Escape')
  await expect(desdeElAviso).toBeHidden()
  await expect(aviso(franja, LLEGADA, 'no tiene salida')).toHaveCount(0)
  await expect(aviso(franja, LLEGADA, 'Esperas cruzadas')).toHaveCount(1)

  // La espera cruzada: se quita la inversa en repuestos; la de «Llegada» queda.
  await inspectorDe(page, urlDeRepuestos, nombreDeRepuestos)
  await quitarRequisito(page, descripcionInversa)
  franja = await franjaAbierta(page, origenId)
  await expect(aviso(franja, LLEGADA, 'Esperas cruzadas')).toHaveCount(0)
  await expect(aviso(franja, LLEGADA, 'no tiene salida')).toHaveCount(0)
  expect(
    sql(
      `select string_agg(tipo::text, ',' order by tipo::text) from public.fases_requisitos where fase_id in ${delOrigen}`,
    ),
  ).toBe('dato,documento,espera')
})

test(`${P} un vehículo nuevo nace en la inicial, se mueve por SQL y jubilar su fase la saca de los destinos sin dejar de nombrarla`, async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/vehiculos?origen=${origenId}&panel=nuevo`)
  const panel = page.getByRole('dialog', { name: 'Nueva unidad' })
  await panel.getByLabel('Título (obligatorio)').fill(VEHICULO)
  await panel.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(panel).toBeHidden()
  const compra = idDeFase(COMPRA)
  const puerto = idDeFase(PUERTO)
  await expect
    .poll(() => sql(`select fase_id from public.vehiculos where titulo = ${literal(VEHICULO)}`))
    .toBe(compra)
  const vehiculo = sql(`select id from public.vehiculos where titulo = ${literal(VEHICULO)}`)
  const fila = aLaVista(page.getByRole('row').filter({ hasText: VEHICULO }))
  await expect(fila).toContainText(COMPRA)

  // Mover no tiene pantalla hasta la Fase 6: por SQL, como la dueña.
  const previa = (destino: string) =>
    `select previsualizar_cambio_fase('${vehiculo}', null, '${destino}')`
  expect(comoDuena(`select (${previa(puerto)})->>'ok'`)).toBe('true')
  expect(
    comoDuena(`select cambiar_fase('${vehiculo}', null, '${puerto}', null, '${compra}')`),
  ).toMatch(/^\d+$/)
  expect(sql(`select fase_id from public.vehiculos where id = '${vehiculo}'`)).toBe(puerto)

  // Con historial y una unidad adentro, «Puerto» no se elimina: se jubila.
  await page.goto(`/configuracion/flujos?origen=${origenId}`)
  await elegirDelMenu(page, PUERTO, 'Jubilar o eliminar')
  const dialogo = page.getByRole('dialog', { name: new RegExp(`Jubilar fase «${PUERTO}»`) })
  await expect(dialogo).toContainText(`Se jubila «${PUERTO}»`)
  await expect(dialogo).toContainText('1 unidad sigue en ella y deja de ser destino')
  await dialogo.getByRole('button', { name: 'Jubilar fase' }).click()
  await expect(dialogo).toBeHidden()
  await expect(page.getByRole('row', { name: `Abrir ${PUERTO}` })).toContainText('Jubilada')

  // Deja de ser destino…
  const despues = comoDuena(
    `select (${previa(puerto)})->>'ok' || '|' || ((${previa(puerto)})->'motivos' ? 'La fase destino está jubilada.')::text`,
  )
  expect(despues).toBe('false|true')

  // …y la lista y la ficha la siguen nombrando.
  await page.goto(`/vehiculos?origen=${origenId}`)
  await expect(aLaVista(page.getByRole('row').filter({ hasText: VEHICULO }))).toContainText(PUERTO)
  await page.goto(`/vehiculos/${vehiculo}`)
  await expect(page.getByRole('heading', { name: VEHICULO, level: 1 })).toBeVisible()
  await expect(aLaVista(page.getByText(PUERTO, { exact: true })).first()).toBeVisible()
})

// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { masAccionesDe, menuDe } from './soporte/lista-de-catalogo'
import { origenDeLaSubasta } from './soporte/tipos-de-documento'
import {
  PREFIJO_DE_REQUISITO_E2E,
  abrirForma,
  abrirInspector,
  borrarRequisitosDePrueba,
  borrarVehiculosDePrueba,
  borrarTiposDeRequisitoDePrueba,
  descripcionesDeLaLista,
  estadoDeLaRegla,
  faseDeRepuestos,
  faseSinRequisitos,
  filaDeRequisito,
  fijarRegla,
  requisitosEnLaBase,
  sembrarDatoInformativo,
  sembrarTipoActivo,
  sembrarVehiculosEnLaFase,
  vehiculosSinVinEnLaFase,
} from './soporte/requisitos'

// Configuración › Flujos › inspector de una fase › «Requisitos para entrar» (5.08-1, `docs/UX.md` › «Flujos: requisitos para entrar (estados propios)»): la
// dueña agrega un dato (con y sin porcentaje), lo ve «Informativo», sube uno y quita otro desde la URL; quien sólo configura el flujo también puede. Un solo
// recorrido del camino feliz: la base ya tiene sus pruebas de cada regla (`supabase/tests/areas/flujos/requisitos.sql`).
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let duena = ''
let configuradora = ''
let fase = { id: '', nombre: '' }
let tipo = { id: '', nombre: '' }
let esperasAntes: boolean | null = null
const notas = (resto: string) => `${PREFIJO_DE_REQUISITO_E2E} ${resto} ${proyecto}`

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarVehiculosDePrueba()
  borrarRequisitosDePrueba()
  borrarTiposDeRequisitoDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  fase = faseSinRequisitos()
  tipo = { nombre: `${PREFIJO_DE_REQUISITO_E2E} Documento`, id: '' }
  tipo.id = sembrarTipoActivo(tipo.nombre)
  esperasAntes = estadoDeLaRegla('esperas')
  duena = correoDePrueba(`duena-requisitos-${proyecto}`)
  configuradora = correoDePrueba(`configuradora-requisitos-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Rita Requisitos' })
  await crearPersona({
    email: configuradora,
    contrasena: CONTRASENA,
    nombre: 'Flor Flujos',
    invitada: true,
  })
  await darRolDePrueba({
    email: configuradora,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Requisitos ${proyecto}`,
      clave: `e2e_requisitos_${proyecto}`,
    },
    permisos: ['flujos.configurar'],
  })
})

test.afterAll(async () => {
  fijarRegla('esperas', esperasAntes)
  borrarVehiculosDePrueba()
  borrarRequisitosDePrueba()
  borrarTiposDeRequisitoDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('la dueña agrega dos datos, sube uno y quita el otro', async ({ page }) => {
  const antes = requisitosEnLaBase(fase.id)
  await entrar(page, duena, { fresco: true })
  const inspector = await abrirInspector(page, fase.id)
  const formulario = inspector.getByRole('form', { name: 'Agregar requisito de dato' })

  // Un dato simple: nace informativo, al final de la fase.
  await abrirForma(inspector, 'Dato')
  await expect(page).toHaveURL(/forma=dato/)
  await formulario.getByLabel('Dato que se pide').selectOption('vehiculo.vin')
  await formulario.getByLabel('Notas (opcional)').fill(notas('VIN'))
  await formulario.getByRole('button', { name: 'Agregar requisito' }).click()
  await expect(formulario).toBeHidden()
  await expect(inspector.getByText('VIN del vehículo', { exact: true })).toBeVisible()
  expect(requisitosEnLaBase(fase.id)).toEqual([...antes, 'vehiculo.vin:false:'])

  // Con porcentaje: sin él, el motivo va junto al campo y no se llama a la base.
  await abrirForma(inspector, 'Dato')
  await formulario.getByLabel('Dato que se pide').selectOption('pagos.umbral_pct')
  await formulario.getByLabel('Notas (opcional)').fill(notas('pagos'))
  await formulario.getByRole('button', { name: 'Agregar requisito' }).click()
  await expect(formulario.getByText('Escribe el porcentaje, de 1 a 100.')).toBeVisible()
  expect(requisitosEnLaBase(fase.id)).toHaveLength(antes.length + 1)
  await formulario.getByLabel('Porcentaje del precio').fill('50')
  await formulario.getByRole('button', { name: 'Agregar requisito' }).click()
  await expect(formulario).toBeHidden()
  const pagos = 'Pagos confirmados: 50 % del precio'
  await expect(inspector.getByText(pagos, { exact: true })).toBeVisible()
  expect(requisitosEnLaBase(fase.id)).toEqual([
    ...antes,
    'vehiculo.vin:false:',
    'pagos.umbral_pct:false:50',
  ])
  await expect(inspector.getByText('Informativo')).toHaveCount(
    antes.length === 0 ? 2 : 2 + antes.length,
  )

  // Subir: con el teclado; el de pagos pasa antes que el VIN.
  const subir = inspector.getByRole('button', { name: `Subir ${pagos}`, exact: true })
  await subir.focus()
  await page.keyboard.press('Enter')
  await expect
    .poll(() => requisitosEnLaBase(fase.id))
    .toEqual([...antes, 'pagos.umbral_pct:false:50', 'vehiculo.vin:false:'])
  // La base ya cambió; la lista se vuelve a dibujar un instante después: se espera el orden, no se lee una vez (caía en CI: el 9.04, dos veces).
  await expect
    .poll(async () => (await descripcionesDeLaLista(inspector)).slice(-2))
    .toEqual([pagos, 'VIN del vehículo'])

  // Quitar: lo pide el «⋯», confirma el diálogo (en la URL) y el requisito se va.
  await masAccionesDe(page, 'VIN del vehículo').click()
  await menuDe(page, 'VIN del vehículo').getByRole('menuitem', { name: 'Quitar' }).click()
  const confirmar = page.getByRole('dialog', { name: 'Quitar el requisito «VIN del vehículo»' })
  await expect(confirmar).toBeVisible()
  await expect(page).toHaveURL(/eliminar=requisito&quitar=/)
  await confirmar.getByRole('button', { name: 'Quitar requisito' }).click()
  await expect(confirmar).toBeHidden()
  await expect(inspector.getByText('VIN del vehículo', { exact: true })).toBeHidden()
  expect(requisitosEnLaBase(fase.id)).toEqual([...antes, 'pagos.umbral_pct:false:50'])
})

test('quien sólo configura el flujo también agrega un requisito', async ({ page }) => {
  const antes = requisitosEnLaBase(fase.id)
  await entrar(page, configuradora, { fresco: true })
  const inspector = await abrirInspector(page, fase.id)
  await abrirForma(inspector, 'Dato')
  const formulario = inspector.getByRole('form', { name: 'Agregar requisito de dato' })
  await formulario.getByLabel('Dato que se pide').selectOption('transporte.naviera')
  await formulario.getByLabel('Notas (opcional)').fill(notas('naviera'))
  await formulario.getByRole('button', { name: 'Agregar requisito' }).click()
  await expect(formulario).toBeHidden()
  await expect(inspector.getByText('Naviera', { exact: true })).toBeVisible()
  expect(requisitosEnLaBase(fase.id)).toEqual([...antes, 'transporte.naviera:false:'])
})

test('la dueña agrega un documento y una espera', async ({ page }) => {
  const antes = requisitosEnLaBase(fase.id)
  await entrar(page, duena, { fresco: true })

  // Con la regla «Esperas» apagada, «Espera» queda apagada y dice por qué.
  fijarRegla('esperas', null)
  let inspector = await abrirInspector(page, fase.id)
  await inspector.getByRole('button', { name: 'Agregar requisito' }).click()
  const selector = inspector.getByRole('group', { name: 'Qué requisito agregar' })
  await expect(selector.getByRole('button', { name: 'Espera', exact: true })).toBeDisabled()
  await expect(
    selector.getByText('Enciende la regla «Esperas» del flujo para pedir una espera.'),
  ).toBeVisible()

  // Documento: con un máximo de 0 el motivo va junto al campo y la base no cambia.
  await selector.getByRole('button', { name: 'Documento', exact: true }).click()
  const documento = inspector.getByRole('form', { name: 'Agregar requisito de documento' })
  await documento.getByLabel('Tipo de documento').selectOption(tipo.id)
  await documento.getByLabel('Máximo de archivos').fill('0')
  await documento.getByRole('button', { name: 'Agregar requisito' }).click()
  await expect(documento.getByText('Pide al menos 1 archivo.')).toBeVisible()
  expect(requisitosEnLaBase(fase.id)).toEqual(antes)
  await documento.getByLabel('Mínimo de archivos').fill('1')
  await documento.getByLabel('Máximo de archivos').fill('3')
  await documento.getByRole('checkbox', { name: 'PDF' }).check()
  await documento.getByLabel('Notas (opcional)').fill(notas('documento'))
  await documento.getByRole('button', { name: 'Agregar requisito' }).click()
  await expect(documento).toBeHidden()
  await expect(
    inspector.getByText(`${tipo.nombre} · 1 a 3 archivos · PDF`, { exact: true }),
  ).toBeVisible()
  expect(filaDeRequisito(fase.id, 'documento')).toBe(
    `1|3|application/pdf|false||${notas('documento')}`,
  )

  // Espera: con la regla encendida, una fase del flujo de repuestos.
  fijarRegla('esperas', true)
  inspector = await abrirInspector(page, fase.id)
  await abrirForma(inspector, 'Espera')
  const espera = inspector.getByRole('form', { name: 'Agregar requisito de espera' })
  const faseEsperada = faseDeRepuestos()
  await espera.getByLabel('Fase que se espera').selectOption({ label: faseEsperada })
  await espera.getByLabel('Notas (opcional)').fill(notas('espera'))
  await espera.getByRole('button', { name: 'Agregar requisito' }).click()
  await expect(espera).toBeHidden()
  await expect(
    inspector.getByText(`Espera a que un repuesto llegue a «${faseEsperada}»`, { exact: true }),
  ).toBeVisible()
  expect(filaDeRequisito(fase.id, 'espera')).toBe(`|||false|hijos|${notas('espera')}`)
})

test('la dueña edita un documento, un porcentaje y no guarda sin cambios', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  const inspector = await abrirInspector(page, fase.id)
  const documento = `${tipo.nombre} · 1 a 3 archivos · PDF`
  const editar = inspector.getByRole('form', { name: 'Editar requisito' })

  // Sin tocar nada: lo dice el formulario y no se llama a la base.
  const antes = filaDeRequisito(fase.id, 'documento')
  await masAccionesDe(page, documento).click()
  await menuDe(page, documento).getByRole('menuitem', { name: 'Editar', exact: true }).click()
  await expect(page).toHaveURL(/editar=requisito&requisito=/)
  await editar.getByRole('button', { name: 'Guardar' }).click()
  await expect(editar.getByText('No hay nada que guardar.')).toBeVisible()
  expect(filaDeRequisito(fase.id, 'documento')).toBe(antes)

  // El máximo baja a 2 y se vacían las notas.
  await editar.getByLabel('Máximo de archivos').fill('2')
  await editar.getByLabel('Notas (opcional)').fill('')
  await editar.getByRole('button', { name: 'Guardar' }).click()
  await expect(editar).toBeHidden()
  await expect(
    inspector.getByText(`${tipo.nombre} · 1 a 2 archivos · PDF`, { exact: true }),
  ).toBeVisible()
  expect(filaDeRequisito(fase.id, 'documento')).toBe('1|2|application/pdf|false||')

  // El porcentaje de pagos.
  const pagos = 'Pagos confirmados: 50 % del precio'
  await masAccionesDe(page, pagos).click()
  await menuDe(page, pagos).getByRole('menuitem', { name: 'Editar', exact: true }).click()
  await editar.getByLabel('Porcentaje del precio').fill('60')
  await editar.getByRole('button', { name: 'Guardar' }).click()
  await expect(editar).toBeHidden()
  await expect(
    inspector.getByText('Pagos confirmados: 60 % del precio', { exact: true }),
  ).toBeVisible()
})

test('la dueña vuelve bloqueante un dato, ve el impacto y las unidades fuera de regla', async ({
  page,
}) => {
  const titulos = [
    `${PREFIJO_DE_REQUISITO_E2E} Auto A ${proyecto}`,
    `${PREFIJO_DE_REQUISITO_E2E} Auto B ${proyecto}`,
  ]
  sembrarVehiculosEnLaFase(fase.id, titulos)
  sembrarDatoInformativo(fase.id, 'vehiculo.vin', notas('vin bloqueante'))
  const n = vehiculosSinVinEnLaFase(fase.id)
  expect(n).toBeGreaterThanOrEqual(2)
  await entrar(page, duena, { fresco: true })
  const inspector = await abrirInspector(page, fase.id)
  const interruptor = inspector.getByRole('switch', { name: 'Bloqueante: VIN del vehículo' })
  const confirmar = inspector.getByRole('group', { name: 'Volver bloqueante el requisito' })

  // Encender: antes de guardar dice cuántas unidades quedan fuera de regla; cancelar no cambia nada.
  await interruptor.click()
  await expect(
    confirmar.getByText(
      `${String(n)} vehículos que ya están en «${fase.nombre}» quedarán fuera de regla. No se mueven: quedan marcados.`,
    ),
  ).toBeVisible()
  expect(requisitosEnLaBase(fase.id)).toContain('vehiculo.vin:false:')
  await confirmar.getByRole('button', { name: 'Cancelar' }).click()
  await expect(confirmar).toBeHidden()
  expect(requisitosEnLaBase(fase.id)).toContain('vehiculo.vin:false:')

  // Confirmar: queda bloqueante.
  await interruptor.click()
  await confirmar.getByRole('button', { name: 'Volver bloqueante' }).click()
  await expect(confirmar).toBeHidden()
  await expect.poll(() => requisitosEnLaBase(fase.id)).toContain('vehiculo.vin:true:')
  await expect(interruptor).toBeChecked()

  // El aviso sobre la lista de fases, con su panel: los dos títulos, la fase y el camino al inventario.
  await page.goto(`/configuracion/flujos?origen=${origenDeLaSubasta()}`)
  await expect(page.getByText(/unidades? fuera de regla/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Ver cuáles' }).click()
  await expect(page).toHaveURL(/panel=fuera-de-regla/)
  const panel = page.getByRole('dialog', { name: 'Unidades fuera de regla' })
  await expect(panel).toBeVisible()
  for (const titulo of titulos) {
    await expect(panel.getByText(titulo, { exact: true })).toBeVisible()
  }
  await expect(panel.getByText('Le falta 1 requisito').first()).toBeVisible()
  await expect(
    panel.getByRole('link', { name: 'Verlas en el inventario' }).first(),
  ).toHaveAttribute('href', new RegExp(`fase=${fase.id}`))
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await expect(page).not.toHaveURL(/panel=fuera-de-regla/)

  // Apagar guarda sin preguntar.
  const otra = await abrirInspector(page, fase.id)
  await otra.getByRole('switch', { name: 'Bloqueante: VIN del vehículo' }).click()
  await expect.poll(() => requisitosEnLaBase(fase.id)).toContain('vehiculo.vin:false:')
})

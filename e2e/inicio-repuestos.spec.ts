import type { Page } from '@playwright/test'
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
import { borrarOrigenes, crearOrigenDePrueba } from './soporte/origenes'
import { sql } from './soporte/sql'
import { borrarVehiculosDe } from './soporte/vehiculos'

// Los bloques de repuestos de Inicio (8.13-4): un vehículo con un proyecto de repuestos y un ítem «En tránsito» → la dueña lo ve en «Repuestos por mover» y en «Esperas que destraban
// vehículos» (ésta con el título del vehículo), abre la fila y llega al panel del ítem, y «Ver todas» lleva a la Cadena; quien sólo tiene `repuestos.ver` no ve «Repuestos por mover»
// pero sí las esperas. El ítem nace con una fase_desde antigua para quedar entre los primeros cinco aunque la base traiga otros.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let claveDelOrigen = ''
let duena = ''
let lectora = ''
let proyectoDeRepuestos = ''
let numeroDelProyecto = ''
let item = ''
const REPUESTO = 'Amortiguador trasero'

const limpiar = () => {
  if (claveDelOrigen === '') return
  sql(
    `delete from repuestos_proyectos where vehiculo_id in (select v.id from vehiculos v join origenes o on o.id = v.origen_id where o.clave like 'e2e_${claveDelOrigen}%')`,
  )
}

async function sembrar(): Promise<void> {
  const origen = await crearOrigenDePrueba(`E2E Inicio ${proyecto}`, claveDelOrigen)
  const transito = sql(
    `select f.id from fases f join flujos fl on fl.id = f.flujo_id where fl.ambito = 'repuestos' and f.nombre = 'En tránsito'`,
  )
  const salida = sql(`
    with v as (insert into vehiculos (origen_id, titulo) values ('${origen.id}', 'E2E Inicio ${proyecto}') returning id),
    p as (insert into repuestos_proyectos (vehiculo_id) select id from v returning id, numero),
    i as (insert into repuestos_items (proyecto_id, descripcion, fase_id, fase_desde) select p.id, '${REPUESTO}', '${transito}', timestamptz '1971-01-01' from p returning id)
    select (select id from v) || ',' || (select id from p) || ',' || (select numero from p) || ',' || (select id from i)`)
  ;[, proyectoDeRepuestos = '', numeroDelProyecto = '', item = ''] = salida.split(',')
}

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  claveDelOrigen = `inicio_rep_${proyecto}`
  limpiar()
  await borrarVehiculosDe([`e2e_${claveDelOrigen}`])
  await borrarOrigenes([`e2e_${claveDelOrigen}`])
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-inicio-rep-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Rita Inicio' })
  lectora = correoDePrueba(`lectora-inicio-rep-${proyecto}`)
  await crearPersona({
    email: lectora,
    contrasena: CONTRASENA,
    nombre: 'Lola Inicio',
    invitada: true,
  })
  await darRolDePrueba({
    email: lectora,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Ve repuestos inicio ${proyecto}`,
      clave: `e2e_ve_repuestos_inicio_${proyecto}`,
    },
    permisos: ['repuestos.ver'],
  })
  await sembrar()
})

test.afterAll(async () => {
  limpiar()
  await borrarVehiculosDe([`e2e_${claveDelOrigen}`])
  await borrarOrigenes([`e2e_${claveDelOrigen}`])
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const region = (page: Page, nombre: string) => page.getByRole('region', { name: nombre })

test('la dueña ve el ítem en los dos bloques, abre su panel y «Ver todas» lleva a la Cadena', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/')
  const porMover = region(page, 'Repuestos por mover')
  const fila = porMover.getByRole('link', { name: REPUESTO })
  await expect(fila).toBeVisible()
  await expect(fila).toContainText(`En tránsito · Proyecto #${numeroDelProyecto}`)
  await expect(
    porMover.getByText(/repuestos? por mover|más de 5 repuestos por mover/),
  ).toBeVisible()

  const esperas = region(page, 'Esperas que destraban vehículos')
  await expect(
    esperas.getByRole('link', { name: `E2E Inicio ${proyecto} · ${REPUESTO}` }),
  ).toBeVisible()

  await porMover.getByRole('link', { name: 'Ver todas' }).click()
  await expect(page).toHaveURL(/\/repuestos\?vista=cadena/)

  await page.goto('/')
  await region(page, 'Repuestos por mover').getByRole('link', { name: REPUESTO }).click()
  await expect(page).toHaveURL(new RegExp(`/repuestos/${proyectoDeRepuestos}\\?item=${item}`))
  await expect(
    page.getByRole('dialog', { name: 'Repuesto' }).getByRole('heading', { name: REPUESTO }),
  ).toBeVisible()
})

test('con sólo repuestos.ver no hay «Repuestos por mover» pero sí las esperas', async ({
  page,
}) => {
  await entrar(page, lectora, { fresco: true })
  await page.goto('/')
  await expect(
    // Sin ver el vehículo (su RLS), la fila dice sólo el repuesto: nunca el título.
    region(page, 'Esperas que destraban vehículos').getByRole('link', { name: REPUESTO }),
  ).toBeVisible()
  await expect(page.getByText(`E2E Inicio ${proyecto} ·`)).toHaveCount(0)
  await expect(region(page, 'Repuestos por mover')).toHaveCount(0)
})

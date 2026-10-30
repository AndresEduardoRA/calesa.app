import { expect, test, type Page } from './soporte/prueba'
import { aLaVista, entrar, limpiarInventario, prepararInventario } from './soporte/inventario'
import {
  irAVehiculos,
  leadDe,
  limpiarVehiculosDelLead,
  panelAgregar,
  prepararVehiculosDelLead,
} from './soporte/leads-vehiculos'
import { TITULO, filaDe, resumenDe } from './soporte/vehiculos-resumen'
import { vehiculoPorTitulo } from './soporte/vehiculos'
import { abrirVitrina, cerrarVitrina } from './soporte/vitrina'
import { abrirRecargarYVolver } from './soporte/vuelta-del-foco'

// La vuelta del foco en los paneles de vehículos (4-49, paso 4.14-2a3): tras recargar con el panel abierto, «atrás» lo cierra y el foco vuelve a quien
// lo abrió. La sonda del paso midió que, sin la vuelta, el foco quedaba en `body` en los cinco.
test.describe.configure({ mode: 'serial' })

test.describe('el inventario y la ficha', () => {
  let duena = ''
  let corea = ''
  let id = ''

  test.beforeAll(async ({}, info) => {
    const terreno = await prepararInventario(info.project.name, ['vehiculos.vitrina'])
    duena = terreno.duena
    corea = terreno.corea.id
    await abrirVitrina([corea])
    id = (await vehiculoPorTitulo(TITULO))?.id ?? ''
  })

  test.afterAll(async () => {
    await cerrarVitrina()
    await limpiarInventario()
  })

  async function alInventario(page: Page): Promise<void> {
    await entrar(page, duena, { fresco: true })
    await page.goto(`/vehiculos?origen=${corea}`)
    await expect(filaDe(page, TITULO)).toBeVisible()
  }

  async function aLaFicha(page: Page): Promise<void> {
    await entrar(page, duena, { fresco: true })
    await page.goto(`/vehiculos/${id}`)
    await expect(page.getByRole('heading', { name: TITULO, level: 1 })).toBeVisible()
  }

  test('«Nuevo vehículo»: abrir, recargar y «atrás» devuelve el foco al botón', async ({
    page,
  }) => {
    await alInventario(page)
    await abrirRecargarYVolver(page, {
      boton: aLaVista(page.getByRole('button', { name: 'Nuevo vehículo' })).first(),
      dialogo: page.getByRole('dialog', { name: 'Nuevo vehículo' }),
    })
  })

  test('editar, en la ficha: abrir, recargar y «atrás» devuelve el foco a «Editar»', async ({
    page,
  }) => {
    await aLaFicha(page)
    await abrirRecargarYVolver(page, {
      boton: aLaVista(page.getByRole('button', { name: 'Editar', exact: true })).first(),
      dialogo: page.getByRole('dialog', { name: `Editar ${TITULO}` }),
      clave: 'editar',
    })
  })

  test('el resumen, desde el nombre de la fila: abrir, recargar y «atrás» devuelve el foco al nombre', async ({
    page,
  }) => {
    await alInventario(page)
    const nombre = aLaVista(
      page.getByRole('button', { name: `Abrir ${TITULO}`, exact: true }),
    ).first()
    await abrirRecargarYVolver(page, {
      boton: nombre,
      dialogo: resumenDe(page, TITULO),
      clave: 'vehiculo',
      abrir: async () => {
        await nombre.focus()
        await page.keyboard.press('Enter')
      },
    })
  })

  test('«Publicar en la web…», desde el «⋯» de la ficha: abrir, recargar y «atrás» devuelve el foco al «⋯»', async ({
    page,
  }) => {
    await aLaFicha(page)
    const masAcciones = aLaVista(
      page.getByRole('button', { name: `Más acciones de ${TITULO}` }),
    ).first()
    await abrirRecargarYVolver(page, {
      boton: masAcciones,
      dialogo: page.getByRole('dialog', { name: 'Publicar en la web' }),
      abrir: async () => {
        await masAcciones.click()
        await page.getByRole('menuitem', { name: 'Publicar en la web…' }).click()
      },
    })
  })
})

test.describe('la ficha del lead', () => {
  let ada = ''

  test.beforeAll(async ({}, info) => {
    ;({ ada } = await prepararVehiculosDelLead(info.project.name))
  })

  test.afterAll(async () => {
    await limpiarVehiculosDelLead()
  })

  test('«Agregar vehículo»: abrir, recargar y «atrás» devuelve el foco al botón', async ({
    page,
  }, info) => {
    const lead = await leadDe(ada, `Vuelta ${info.project.name}`)
    await entrar(page, ada, { fresco: true })
    await irAVehiculos(page, lead.id)
    await abrirRecargarYVolver(page, {
      boton: aLaVista(page.getByRole('button', { name: 'Agregar vehículo' })).first(),
      dialogo: panelAgregar(page),
    })
  })
})

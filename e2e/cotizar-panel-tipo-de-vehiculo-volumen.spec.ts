import { expect, test, type Locator, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarOrigenesDeCotizar, crearOrigenDeSubastaDeCotizar } from './soporte/cotizar-formula'
import { literal, sql } from './soporte/sql'
import { cargarVehiculos, vehiculoPorTitulo } from './soporte/vehiculos'

// El tipo de vehículo en el panel con volumen (paso 4.14-2c3, `.claude/rules/escala.md`): las dos tablas de transporte con 1.000 claves distintas cada una (la fórmula de
// `subasta_usa` copiada en un origen de prueba, las filas por `generate_series`). El grupo dibuja a lo sumo 50 opciones, con «Buscar en las opciones» como camino a las
// demás y el aviso del tope; la lectura de cada tabla cabe en su tope (`docs/RENDIMIENTO.md`) y volver a abrir el panel con la misma hoja no la repite.
// Presupuesto previo del grupo: ≈ 4 nodos por botón × 50 + 60 de estructura = 260. Medido el 2026-10-30 (los dos proyectos): ver la anotación; el tope es eso más 5 %.
test.describe.configure({ mode: 'serial' })

const FILAS = 1000
const TOPE_DE_NODOS = 59
// El de una lectura de `cotizacion_tabla` con 1.000 filas como la dueña (`docs/RENDIMIENTO.md`, la ayuda de una tabla).
const TOPE_DE_BYTES = 569_352

let duena = ''
let origen = { id: '', nombre: '' }
let vehiculo = ''

// La fórmula publicada de `subasta_usa` en el origen de prueba, con las dos tablas de transporte de 1.000 claves y sus copias vivas (de ahí sale la etiqueta del grupo).
function publicarTransporteConVolumen(origenId: string): void {
  const o = `${literal(origenId)}::uuid`
  sql(`
    do $f$
    declare v public.formulas; v_par jsonb; v_filas jsonb; v_usa uuid;
    begin
      select id into v_usa from public.origenes where clave = 'subasta_usa';
      select * into v from public.formulas where origen_id = v_usa and estado = 'publicada';
      select jsonb_agg(jsonb_build_object('tipo', 'tipo_' || lpad(g::text, 4, '0'), 'oficina', g, 'cliente', g) order by g) into v_filas
        from generate_series(1, ${String(FILAS)}) g;
      v_par := jsonb_set(jsonb_set(v.params, '{tablas,transporte_usa_bolivia}', v_filas), '{tablas,transporte_usa_chile}', v_filas);
      delete from public.formulas where origen_id = ${o};
      insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
      values (${o}, 1, 'publicada', v.definicion, v_par, v.diseno, public._preparar_publicacion(v.definicion, v_par, v.diseno, false), 'E2E 4.14-2c3', now());
      delete from public.tablas_referencia where origen_id = ${o};
      insert into public.tablas_referencia (origen_id, clave, nombre, columnas)
        select ${o}, clave, nombre, columnas from public.tablas_referencia where origen_id = v_usa;
    end $f$`)
}

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-tipo-vol-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dora Volumen' })
  origen = await crearOrigenDeSubastaDeCotizar(proyecto, 'tipovol')
  publicarTransporteConVolumen(origen.id)
  // El tipo es un campo de texto del catálogo de subasta: el origen de prueba lo tiene activo.
  expect(
    sql(
      `select activo::text || '|' || tipo from public.origenes_campos where origen_id = ${literal(origen.id)}::uuid and clave = 'tipo_vehiculo'`,
    ),
  ).toBe('true|texto')
  const titulo = `E2E tipo volumen ${proyecto}`
  await cargarVehiculos(origen.id, [
    { titulo, anio: 2021, atributos: { tipo_vehiculo: 'AUTOMOBILE' } },
  ])
  vehiculo = (await vehiculoPorTitulo(titulo))?.id ?? ''
  expect(vehiculo).not.toBe('')
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const panel = (page: Page): Locator => page.getByRole('dialog', { name: 'Vehículo' })
const grupo = (page: Page): Locator => panel(page).getByRole('group', { name: 'Tipo de vehículo' })

test('E6: con 1.000 claves por tabla, 50 botones, el buscador como camino y la lectura en su tope, sin repetirla', async ({
  page,
}, info) => {
  const bytes: number[] = []
  page.on('response', (respuesta) => {
    if (respuesta.url().includes('/rpc/cotizacion_tabla')) {
      void respuesta.body().then((cuerpo) => bytes.push(cuerpo.length))
    }
  })
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${origen.id}&vehiculo=${vehiculo}`)
  await expect(page.locator('[data-hoja]')).toBeVisible()
  const barra = page.getByRole('button', { name: /^Vehículo:/ })
  await barra.click()
  await expect(grupo(page).getByRole('button')).toHaveCount(50)
  await expect(grupo(page).getByRole('button').first()).toHaveText('tipo_0001')
  await expect(grupo(page).getByText('Se muestran 50. Escribe para acotar.')).toBeVisible()
  const nodos = await grupo(page).evaluate((el) => el.querySelectorAll('*').length + 1)
  await expect.poll(() => bytes.length).toBe(2)

  await grupo(page).getByRole('searchbox', { name: 'Buscar en las opciones' }).fill('tipo_0900')
  await expect(grupo(page).getByRole('button')).toHaveText(['tipo_0900'])

  await page.keyboard.press('Escape')
  await expect(panel(page)).toBeHidden()
  await barra.click()
  await expect(grupo(page).getByRole('button').first()).toBeVisible()
  expect(bytes).toHaveLength(2)

  const medida = `grupo con ${String(FILAS)} claves por tabla: ${String(nodos)} nodos (tope ${String(TOPE_DE_NODOS)}); bytes de cotizacion_tabla: ${bytes.join(' y ')} (tope ${String(TOPE_DE_BYTES)} cada una)`
  console.warn(`[tipo de vehículo, volumen] ${info.project.name}: ${medida}`)
  info.annotations.push({ type: 'medida', description: medida })
  expect(nodos).toBeLessThanOrEqual(TOPE_DE_NODOS)
  for (const b of bytes) {
    expect(b).toBeLessThanOrEqual(TOPE_DE_BYTES)
  }
})

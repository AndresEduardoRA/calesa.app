// La espera de repuestos que destraba al vehículo (8.13), sembrada en la base del Supabase LOCAL sin pasar por la pantalla: un origen propio (`e2e_…`)
// con su flujo «En taller» → «Listo», la espera bloqueante de «Listo» a que los repuestos lleguen a «Recibido», el vehículo en «En taller» y su proyecto
// con un ítem «En tránsito». Las fases «En tránsito» y «Recibido» son las del flujo de repuestos de la semilla. La usan el recorrido de la espera y el de
// la Fase 8.
import { borrarOrigenes, crearOrigenDePrueba } from './origenes'
import { sql } from './sql'
import { borrarVehiculosDe } from './vehiculos'

export const REPUESTO_DE_LA_ESPERA = 'Pastillas de freno'

export type EsperaSembrada = {
  vehiculo: string
  proyectoDeRepuestos: string
  item: string
  // Las fases del flujo de repuestos.
  transito: string
  recibido: string
}

// Lo de ese origen, en orden: los proyectos de repuestos (con sus ítems), los vehículos y el origen.
export async function limpiarEspera(claveDelOrigen: string): Promise<void> {
  sql(
    `delete from repuestos_proyectos where vehiculo_id in (select v.id from vehiculos v join origenes o on o.id = v.origen_id where o.clave like 'e2e_${claveDelOrigen}%')`,
  )
  await borrarVehiculosDe([`e2e_${claveDelOrigen}`])
  await borrarOrigenes([`e2e_${claveDelOrigen}`])
}

export async function sembrarEspera(
  proyecto: string,
  claveDelOrigen: string,
): Promise<EsperaSembrada> {
  const origen = await crearOrigenDePrueba(`E2E Espera ${proyecto}`, claveDelOrigen)
  const fase = (nombre: string) =>
    sql(
      `select f.id from fases f join flujos fl on fl.id = f.flujo_id where fl.ambito = 'repuestos' and f.nombre = '${nombre}'`,
    )
  const transito = fase('En tránsito')
  const recibido = fase('Recibido')
  const salida = sql(`
    with flujo as (select id from flujos where origen_id = '${origen.id}' and ambito = 'vehiculos'),
    taller as (insert into fases (flujo_id, nombre, orden, es_inicial) select id, 'En taller', 1, true from flujo returning id, flujo_id),
    listo as (insert into fases (flujo_id, nombre, orden) select id, 'Listo', 2 from flujo returning id, flujo_id),
    salida as (insert into fases_transiciones (flujo_id, de_fase_id, a_fase_id) select t.flujo_id, t.id, l.id from taller t, listo l returning 1),
    espera as (insert into fases_requisitos (fase_id, tipo, bloqueante, espera_fase_id, espera_ambito) select l.id, 'espera', true, '${recibido}', 'hijos' from listo l returning 1),
    v as (insert into vehiculos (origen_id, titulo, fase_id, fase_desde) select '${origen.id}', 'E2E Espera ${proyecto}', t.id, now() - interval '2 days' from taller t returning id),
    p as (insert into repuestos_proyectos (vehiculo_id) select id from v returning id),
    i as (insert into repuestos_items (proyecto_id, descripcion, fase_id, fase_desde) select p.id, '${REPUESTO_DE_LA_ESPERA}', '${transito}', now() from p returning id, proyecto_id)
    select (select id from v) || ',' || (select id from p) || ',' || (select id from i)
      from salida, espera limit 1`)
  const [vehiculo = '', proyectoDeRepuestos = '', item = ''] = salida.split(',')
  sql(
    `insert into historial_fases (flujo_id, repuesto_id, de_fase_id, a_fase_id) select f.flujo_id, '${item}', null, f.id from fases f where f.id = '${transito}'`,
  )
  return { vehiculo, proyectoDeRepuestos, item, transito, recibido }
}

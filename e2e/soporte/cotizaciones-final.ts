// El terreno de «Marcar final» en la guardada (paso 4.25-2): el de la papelera (un origen con su fórmula, la dueña, Ana «propios» sin `final.gestionar`) y, por
// prueba, un vehículo y un lead de la dueña con preventas sembradas por SQL. Marcar manda preventas a un lote de la papelera de quien marca: lo deshace
// `limpiarPapelera()` (los lotes antes que las personas) y los leads los borra `borrarLeadsDePrueba()`.
import { idDePersona, sembrarCotizaciones } from './cotizaciones-sembradas'
import { prepararPapelera } from './cotizaciones-papelera'
import { crearLead } from './leads'
import { telefonoAlAzar } from './leads-alta'
import { crearVehiculoEn } from './listado-de-cotizaciones'
import { literal, sql } from './sql'

export { limpiarPapelera as limpiarFinal } from './cotizaciones-papelera'

export type TerrenoDeLaFinal = Awaited<ReturnType<typeof prepararPapelera>> & { proyecto: string }

export async function prepararFinal(proyecto: string): Promise<TerrenoDeLaFinal> {
  return { ...(await prepararPapelera(proyecto)), proyecto }
}

// Un vehículo del origen, un lead de la dueña y `cuantas` preventas de la dueña con los dos (las ids por número). Sin vehículo, la preventa no lo lleva.
export async function sembrarParaMarcar(
  t: TerrenoDeLaFinal,
  nombre: string,
  opciones: { cuantas?: number; sinVehiculo?: boolean; creadoPor?: string } = {},
): Promise<{ ids: string[]; vehiculoId: string | null; leadId: string }> {
  const { cuantas = 1, sinVehiculo = false, creadoPor = t.duena } = opciones
  const vehiculoId = sinVehiculo ? null : crearVehiculoEn(t.origen.id, `${nombre} ${t.proyecto}`)
  const leadId = await crearLead({
    nombre: `${nombre} ${t.proyecto}`,
    telefono: telefonoAlAzar(),
    deQuien: t.duena,
  })
  sembrarCotizaciones({
    origenId: t.origen.id,
    vehiculoId,
    leadId,
    creadoPor: idDePersona(creadoPor),
    cuantas,
  })
  const ids = sql(
    `select id from public.cotizaciones where lead_id = ${literal(leadId)}::uuid order by numero`,
  )
  return { ids: ids.split('\n').filter((id) => id !== ''), vehiculoId, leadId }
}

// Cómo quedó lo que marcar toca, leído de la base.
export function estadoDeLaFinal(datos: { id: string; otra?: string; vehiculoId: string }): {
  clase: string
  otraEnPapelera: boolean
  vehiculoLead: string
  leadClase: string
} {
  const [clase = '', otra = '', vehiculoLead = '', leadClase = ''] = sql(`
    select c.clase::text, coalesce((select (o.eliminado_en is not null)::text from public.cotizaciones o where o.id = ${literal(datos.otra ?? datos.id)}::uuid), ''),
           coalesce(v.lead_id::text, ''), coalesce(t.clase::text, '')
      from public.cotizaciones c
      join public.vehiculos v on v.id = ${literal(datos.vehiculoId)}::uuid
      left join public.leads l on l.id = c.lead_id
      left join public.tipos_lead t on t.id = l.tipo_lead_id
     where c.id = ${literal(datos.id)}::uuid`).split('|')
  return { clase, otraEnPapelera: otra === 'true', vehiculoLead, leadClase }
}

// Vincula el vehículo a otro lead, como lo haría otra persona (para el rechazo de P4).
export async function vincularAOtroLead(t: TerrenoDeLaFinal, vehiculoId: string): Promise<string> {
  const otro = await crearLead({
    nombre: `Otro ${t.proyecto}`,
    telefono: telefonoAlAzar(),
    deQuien: t.duena,
  })
  sql(
    `update public.vehiculos set lead_id = ${literal(otro)}::uuid where id = ${literal(vehiculoId)}::uuid`,
  )
  return otro
}

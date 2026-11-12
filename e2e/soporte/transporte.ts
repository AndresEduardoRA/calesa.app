// El terreno de los e2e del transporte (6.08): el de `sembrarLogistica` (un origen con una fase que permite contenedor y dos vehículos) con la regla `transporte` encendida en el flujo del origen,
// una naviera `E2E Naviera …` y una persona que ve la logística del origen y edita su transporte. Todo lo que ve la base se siembra por la API de administración.
import { CONTRASENA } from './alta'
import { admin, correoDePrueba, crearPersona, darRolDePrueba, PREFIJO_ROL_E2E } from './base'
import { borrarLogistica, sembrarLogistica, type TerrenoDeLogistica } from './logistica'
import { PREFIJO_CLAVE_E2E } from './origenes'

export type TerrenoDeTransporte = TerrenoDeLogistica & {
  naviera: { id: string; nombre: string }
  // Ve la logística del origen y edita su transporte.
  conTransporte: string
}

export const PREFIJO_DE_NAVIERA_E2E = 'E2E Naviera '

function exigir(error: { message: string } | null, que: string): void {
  if (error) throw new Error(`No se pudo ${que}: ${error.message}`)
}

export async function sembrarTransporte(proyecto: string): Promise<TerrenoDeTransporte> {
  const terreno = await sembrarLogistica(proyecto)
  const cliente = admin()
  const { data: flujo, error: errorDelFlujo } = await cliente
    .from('flujos')
    .select('id')
    .eq('origen_id', terreno.origen.id)
    .eq('ambito', 'vehiculos')
    .single<{ id: string }>()
  exigir(errorDelFlujo, 'leer el flujo del origen')
  const { error: errorDeLaRegla } = await cliente
    .from('flujos_reglas')
    .upsert(
      { flujo_id: flujo?.id ?? '', regla: 'transporte', activa: true },
      { onConflict: 'flujo_id,regla' },
    )
  exigir(errorDeLaRegla, 'encender la regla de transporte')
  const nombre = `${PREFIJO_DE_NAVIERA_E2E}${proyecto}`
  const { data: naviera, error: errorDeLaNaviera } = await cliente
    .from('navieras')
    .insert({ nombre })
    .select('id')
    .single<{ id: string }>()
  exigir(errorDeLaNaviera, 'crear la naviera')
  const email = correoDePrueba(`con-transporte-${proyecto}`)
  await crearPersona({
    email,
    contrasena: CONTRASENA,
    nombre: 'Persona con transporte',
    invitada: true,
  })
  const origenId = terreno.origen.id
  await darRolDePrueba({
    email,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}con transporte ${proyecto}`,
      clave: `e2e_con_transporte_${proyecto}`,
    },
    permisos: [
      { clave: 'logistica.ver', origenId },
      { clave: 'vehiculos.ver', origenId },
      { clave: 'logistica.transporte.editar', origenId },
    ],
  })
  return { ...terreno, naviera: { id: naviera?.id ?? '', nombre }, conTransporte: email }
}

// Lo que el spec crea a mano: el transporte de un vehículo (como lo haría otra persona) y su lectura de vuelta.
export async function crearTransporteDe(vehiculoId: string, notas: string): Promise<void> {
  const { error } = await admin().from('transportes').insert({ vehiculo_id: vehiculoId, notas })
  exigir(error, 'crear el transporte de otra persona')
}

export async function transporteDe(vehiculoId: string) {
  const { data, error } = await admin()
    .from('transportes')
    .select('contenedor, eta_el, zarpe_el, naviera_id, notas')
    .eq('vehiculo_id', vehiculoId)
    .limit(1)
    .returns<
      {
        contenedor: string | null
        eta_el: string | null
        zarpe_el: string | null
        naviera_id: string | null
        notas: string | null
      }[]
    >()
  exigir(error, 'leer el transporte')
  return data?.[0] ?? null
}

// Pone a una unidad en un contenedor como lo haría la base de otra persona (por la API de administración, sin pasar por la regla de la fase): crea su transporte o corrige el que ya tiene.
export async function ponerEnElContenedorDe(
  vehiculoId: string,
  datos: { contenedor: string; naviera_id: string; eta_el: string },
): Promise<void> {
  const cliente = admin()
  const { data, error } = await cliente
    .from('transportes')
    .update(datos)
    .eq('vehiculo_id', vehiculoId)
    .select('id')
  exigir(error, 'poner la unidad en el contenedor')
  if ((data ?? []).length === 0) {
    const { error: errorAlCrear } = await cliente
      .from('transportes')
      .insert({ vehiculo_id: vehiculoId, ...datos })
    exigir(errorAlCrear, 'crear el transporte con contenedor')
  }
}

// Suma una tercera unidad (un vehículo del origen, sin fase) a un contenedor, con su propia ETA: el grupo de «Editar grupo» con una ETA distinta (6.08-4). Devuelve el id del vehículo; el
// terreno lo borra al quitar los vehículos del origen.
export async function agregarUnidadAlContenedor(
  terreno: TerrenoDeTransporte,
  titulo: string,
  datos: { contenedor: string; naviera_id: string; eta_el: string },
): Promise<string> {
  const { data, error } = await admin()
    .from('vehiculos')
    .insert({ origen_id: terreno.origen.id, titulo })
    .select('id')
    .single<{ id: string }>()
  exigir(error, 'crear la tercera unidad')
  const id = data?.id ?? ''
  await ponerEnElContenedorDe(id, datos)
  return id
}

// Quita lo que el spec creó: los transportes de los vehículos del terreno y las navieras de prueba (antes del terreno: la FK), y luego el terreno. Las personas y los roles los limpia el spec.
export async function borrarTransporte(proyecto: string): Promise<void> {
  const cliente = admin()
  const { data: origen } = await cliente
    .from('origenes')
    .select('id')
    .eq('clave', `${PREFIJO_CLAVE_E2E}logistica_${proyecto}`)
    .limit(1)
    .returns<{ id: string }[]>()
  const origenId = origen?.[0]?.id
  if (origenId) {
    const { data: vehiculos } = await cliente
      .from('vehiculos')
      .select('id')
      .eq('origen_id', origenId)
      .limit(100)
      .returns<{ id: string }[]>()
    const ids = (vehiculos ?? []).map((v) => v.id)
    if (ids.length > 0) {
      await cliente.from('transportes').delete().in('vehiculo_id', ids)
    }
  }
  await cliente.from('navieras').delete().like('nombre', `${PREFIJO_DE_NAVIERA_E2E}%`)
  await borrarLogistica(proyecto)
}

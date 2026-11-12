// El terreno de los e2e de aduana (6.09): el de `sembrarLogistica` (un origen con una fase y dos vehículos) con la regla `aduana` encendida en el flujo del origen, la fase marcada «permite aduana»,
// un tercer vehículo en esa fase y una persona que ve la logística del origen y gestiona la aduana (`logistica.aduana.gestionar` es global: no se acota a un origen).
// Todo lo que ve la base (regla, fase, categoría de tributos, moneda base) se lee o se siembra por la API de administración; el spec no escribe por SQL suelto.
import { CONTRASENA } from './alta'
import { admin, correoDePrueba, crearPersona, darRolDePrueba, PREFIJO_ROL_E2E } from './base'
import { borrarDinero } from './dinero'
import { sembrarLogistica, type TerrenoDeLogistica } from './logistica'

export type TerrenoDeAduana = TerrenoDeLogistica & {
  // Un tercer vehículo en la fase que permite aduana.
  tercero: { id: string; titulo: string }
  // Ve la logística del origen y gestiona la aduana.
  conAduana: string
  // Ve la logística del origen y no gestiona la aduana.
  sinGestionar: string
}

export const PREFIJO_DE_NUMERO_E2E = 'E2E-ADU-'

function exigir(error: { message: string } | null, que: string): void {
  if (error) throw new Error(`No se pudo ${que}: ${error.message}`)
}

async function persona(
  proyecto: string,
  etiqueta: string,
  claves: { clave: string; origenId?: string }[],
) {
  const email = correoDePrueba(`${etiqueta}-aduana-${proyecto}`)
  await crearPersona({
    email,
    contrasena: CONTRASENA,
    nombre: `Persona ${etiqueta} aduana`,
    invitada: true,
  })
  await darRolDePrueba({
    email,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}${etiqueta} aduana ${proyecto}`,
      clave: `e2e_${etiqueta}_aduana_${proyecto}`,
    },
    permisos: claves,
  })
  return email
}

export async function sembrarAduana(proyecto: string): Promise<TerrenoDeAduana> {
  const terreno = await sembrarLogistica(proyecto)
  const cliente = admin()
  const { data: flujo, error: errorDelFlujo } = await cliente
    .from('flujos')
    .select('id')
    .eq('origen_id', terreno.origen.id)
    .eq('ambito', 'vehiculos')
    .single<{ id: string }>()
  exigir(errorDelFlujo, 'leer el flujo del origen')
  // Primero la regla y después la fase: la base no deja marcar una fase de aduana si el flujo no la lleva.
  const { error: errorDeLaRegla } = await cliente
    .from('flujos_reglas')
    .upsert(
      { flujo_id: flujo?.id ?? '', regla: 'aduana', activa: true },
      { onConflict: 'flujo_id,regla' },
    )
  exigir(errorDeLaRegla, 'encender la regla de aduana')
  const { error: errorDeLaFase } = await cliente
    .from('fases')
    .update({ permite_aduana: true })
    .eq('id', terreno.fase.id)
  exigir(errorDeLaFase, 'marcar la fase como de aduana')
  const titulo = `E2E Hilux tercera ${proyecto}`
  const { data, error } = await cliente
    .from('vehiculos')
    .insert({ origen_id: terreno.origen.id, titulo, fase_id: terreno.fase.id })
    .select('id')
    .single<{ id: string }>()
  exigir(error, 'crear el tercer vehículo')
  const origenId = terreno.origen.id
  return {
    ...terreno,
    tercero: { id: data?.id ?? '', titulo },
    conAduana: await persona(proyecto, 'con', [
      { clave: 'logistica.ver', origenId },
      { clave: 'vehiculos.ver', origenId },
      { clave: 'logistica.aduana.gestionar' },
    ]),
    sinGestionar: await persona(proyecto, 'sin', [
      { clave: 'logistica.ver', origenId },
      { clave: 'vehiculos.ver', origenId },
    ]),
  }
}

// El gasto de tributos de un vehículo, en la moneda base y ya convertido: es lo que hace «pagada» a una declaración (la base lo lee; ningún monto se muestra en la pantalla de aduana).
export async function sembrarTributos(vehiculoId: string): Promise<void> {
  const cliente = admin()
  const { data: ajustes, error: errorDeAjustes } = await cliente
    .from('ajustes_empresa')
    .select('moneda_base')
    .eq('id', 1)
    .single<{ moneda_base: string }>()
  exigir(errorDeAjustes, 'leer la moneda base')
  const { data: categoria, error: errorDeCategoria } = await cliente
    .from('categorias_gasto')
    .select('id')
    .eq('proposito', 'tributos')
    .eq('activo', true)
    .limit(1)
    .single<{ id: string }>()
  exigir(errorDeCategoria, 'leer la categoría de tributos')
  const { error } = await cliente.from('gastos').insert({
    vehiculo_id: vehiculoId,
    categoria_id: categoria?.id ?? '',
    moneda: ajustes?.moneda_base ?? '',
    monto: 100,
    monto_base: 100,
  })
  exigir(error, 'sembrar el gasto de tributos')
}

// Quita las declaraciones del spec (y sus vehículos) antes del terreno de dinero: un vehículo declarado no se borra.
export async function borrarAduana(proyecto: string): Promise<void> {
  const cliente = admin()
  const { data } = await cliente
    .from('declaraciones_aduana')
    .select('id')
    .like('numero', `${PREFIJO_DE_NUMERO_E2E}%`)
    .limit(100)
    .returns<{ id: string }[]>()
  const ids = (data ?? []).map((d) => d.id)
  if (ids.length > 0) {
    await cliente.from('declaraciones_vehiculos').delete().in('declaracion_id', ids)
    await cliente.from('declaraciones_aduana').delete().in('id', ids)
  }
  await borrarDinero(proyecto)
}

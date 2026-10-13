// Lo que los e2e de Configuración › Orígenes miran y limpian en la base del Supabase LOCAL. Los
// orígenes se crean por la pantalla; acá sólo se comprueba lo que quedó y se borra al terminar.
import { admin } from './base'

// Todo origen de prueba que crea un e2e a mano (sin pasar por la pantalla) lleva esta clave: es lo
// único, junto con las claves que los tests piden, que la limpieza borra.
export const PREFIJO_CLAVE_E2E = 'e2e_'

export type OrigenEnLaBase = {
  id: string
  clave: string
  nombre: string
  sustantivo: string
  genero: string
  tipo: string
  color: string
  activo: boolean
  apibara_plataformas: string[]
}

export async function origenPorClave(clave: string): Promise<OrigenEnLaBase | null> {
  const { data, error } = await admin()
    .from('origenes')
    .select('id, clave, nombre, sustantivo, genero, tipo, color, activo, apibara_plataformas')
    .eq('clave', clave)
    .maybeSingle<OrigenEnLaBase>()
  if (error) {
    throw new Error(`No se pudo leer el origen ${clave}: ${error.message}`)
  }
  return data
}

export async function origenDeLaBase(clave: string): Promise<OrigenEnLaBase> {
  const origen = await origenPorClave(clave)
  if (!origen) {
    throw new Error(`No existe el origen «${clave}».`)
  }
  return origen
}

// Borra por clave los orígenes que un e2e creó (cae con ellos su flujo, sus campos y categorías).
export async function borrarOrigenes(claves: string[]): Promise<void> {
  const cliente = admin()
  const { error } = await cliente.from('origenes').delete().in('clave', claves)
  if (error) {
    throw new Error(`No se pudo borrar los orígenes de prueba: ${error.message}`)
  }
  const { error: huerfanos } = await cliente
    .from('origenes')
    .delete()
    .like('clave', `${PREFIJO_CLAVE_E2E}%`)
  if (huerfanos) {
    throw new Error(`No se pudo borrar los orígenes de prueba: ${huerfanos.message}`)
  }
}

// Un origen creado sin pasar por la pantalla (lo que necesita otro e2e para acotar un permiso). Los
// triggers le crean su flujo y sus campos, como a cualquiera.
export async function crearOrigenDePrueba(
  nombre: string,
  clave: string,
): Promise<{ id: string; nombre: string }> {
  const { data, error } = await admin()
    .from('origenes')
    .insert({ clave: `${PREFIJO_CLAVE_E2E}${clave}`, nombre })
    .select('id, nombre')
    .single<{ id: string; nombre: string }>()
  if (error) {
    throw new Error(`No se pudo crear el origen ${nombre}: ${error.message}`)
  }
  return data
}

export type CampoEnLaBase = {
  id: string
  clave: string
  etiqueta: string
  tipo: string
  orden: number
  grupo: string | null
  requerido: boolean
  en_tarjeta: boolean
  filtrable: boolean
  publico_web: boolean
  clave_apibara: string | null
  es_sistema: boolean
  activo: boolean
  opciones: { clave: string; etiqueta: string }[]
}

// El layout de un origen, en su orden.
export async function camposDelOrigen(origenId: string): Promise<CampoEnLaBase[]> {
  const { data, error } = await admin()
    .from('origenes_campos')
    .select(
      'id, clave, etiqueta, tipo, orden, grupo, requerido, en_tarjeta, filtrable, publico_web, clave_apibara, es_sistema, activo, opciones',
    )
    .eq('origen_id', origenId)
    .order('orden')
    .returns<CampoEnLaBase[]>()
  if (error) {
    throw new Error(`No se pudo leer el layout: ${error.message}`)
  }
  return data
}

export async function campoDelOrigen(origenId: string, clave: string): Promise<CampoEnLaBase> {
  const campo = (await camposDelOrigen(origenId)).find((otro) => otro.clave === clave)
  if (!campo) {
    throw new Error(`El origen no tiene el campo «${clave}».`)
  }
  return campo
}

// El flujo que nació con el origen y las reglas que trae encendidas.
export async function flujoDelOrigen(
  origenId: string,
): Promise<{ nombre: string; fases: number; reglas: string[] }> {
  const cliente = admin()
  const { data: flujo, error } = await cliente
    .from('flujos')
    .select('id, nombre')
    .eq('origen_id', origenId)
    .single<{ id: string; nombre: string }>()
  if (error) {
    throw new Error(`El origen no tiene su flujo: ${error.message}`)
  }
  const { data: reglas } = await cliente
    .from('flujos_reglas')
    .select('regla')
    .eq('flujo_id', flujo.id)
    .eq('activa', true)
    .returns<{ regla: string }[]>()
  const { count } = await cliente
    .from('fases')
    .select('id', { count: 'exact', head: true })
    .eq('flujo_id', flujo.id)
  return {
    nombre: flujo.nombre,
    fases: count ?? 0,
    reglas: (reglas ?? []).map((fila) => fila.regla).sort(),
  }
}

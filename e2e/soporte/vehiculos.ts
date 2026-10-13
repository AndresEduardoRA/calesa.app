// Lo que los e2e del inventario preparan, miran y limpian en la base del Supabase LOCAL. El alta y
// la edición se prueban por la pantalla; acá se arma el terreno (un layout con opciones, vehículos
// ya cargados para filtrar) y se comprueba lo que quedó.
import { admin } from './base'

export type VehiculoEnLaBase = {
  id: string
  numero: number
  titulo: string
  marca: string | null
  anio: number | null
  vin: string | null
  fase_id: string | null
  creado_por: string | null
  atributos: Record<string, unknown>
  actualizado_en: string
}

const COLUMNAS =
  'id, numero, titulo, marca, anio, vin, fase_id, creado_por, atributos, actualizado_en'

// Vehículos ya cargados, sin pasar por el formulario (el cliente de servicio salta la RLS y los
// grants). En el orden dado: el primero es el más viejo.
export async function cargarVehiculos(
  origenId: string,
  vehiculos: { titulo: string; anio?: number; atributos?: Record<string, unknown> }[],
): Promise<void> {
  const cliente = admin()
  for (const vehiculo of vehiculos) {
    const { error } = await cliente.from('vehiculos').insert({ origen_id: origenId, ...vehiculo })
    if (error) {
      throw new Error(`No se pudo cargar ${vehiculo.titulo}: ${error.message}`)
    }
  }
}

export async function vehiculoPorTitulo(titulo: string): Promise<VehiculoEnLaBase | null> {
  const { data, error } = await admin()
    .from('vehiculos')
    .select(COLUMNAS)
    .eq('titulo', titulo)
    .maybeSingle<VehiculoEnLaBase>()
  if (error) {
    throw new Error(`No se pudo leer el vehículo ${titulo}: ${error.message}`)
  }
  return data
}

export async function vehiculosDelOrigen(origenId: string): Promise<VehiculoEnLaBase[]> {
  const { data, error } = await admin()
    .from('vehiculos')
    .select(COLUMNAS)
    .eq('origen_id', origenId)
    .returns<VehiculoEnLaBase[]>()
  if (error) {
    throw new Error(`No se pudo leer los vehículos: ${error.message}`)
  }
  return data
}

// Un origen con vehículos no se borra (`on delete restrict`): primero van ellos.
export async function borrarVehiculosDe(clavesDeOrigen: string[]): Promise<void> {
  const cliente = admin()
  const { data: origenes, error } = await cliente
    .from('origenes')
    .select('id')
    .in('clave', clavesDeOrigen)
    .returns<{ id: string }[]>()
  if (error) {
    throw new Error(`No se pudo leer los orígenes de prueba: ${error.message}`)
  }
  if (origenes.length === 0) {
    return
  }
  const { error: errorAlBorrar } = await cliente
    .from('vehiculos')
    .delete()
    .in(
      'origen_id',
      origenes.map((origen) => origen.id),
    )
  if (errorAlBorrar) {
    throw new Error(`No se pudo borrar los vehículos de prueba: ${errorAlBorrar.message}`)
  }
}

// Le pone opciones a un campo de opciones (los preconfigurados nacen sin ninguna).
export async function ponerOpciones(
  origenId: string,
  clave: string,
  opciones: { clave: string; etiqueta: string }[],
): Promise<void> {
  const { error } = await admin()
    .from('origenes_campos')
    .update({ opciones })
    .eq('origen_id', origenId)
    .eq('clave', clave)
  if (error) {
    throw new Error(`No se pudo poner opciones a ${clave}: ${error.message}`)
  }
}

// Un campo propio en el layout, sin pasar por la pantalla de orígenes.
export async function agregarCampo(
  origenId: string,
  campo: {
    clave: string
    etiqueta: string
    tipo: string
    grupo?: string
    filtrable?: boolean
    en_tarjeta?: boolean
    requerido?: boolean
    valor_defecto?: unknown
    orden?: number
  },
): Promise<void> {
  const { error } = await admin()
    .from('origenes_campos')
    .insert({ origen_id: origenId, orden: 900, ...campo })
  if (error) {
    throw new Error(`No se pudo agregar el campo ${campo.clave}: ${error.message}`)
  }
}

export async function cambiarCampo(
  origenId: string,
  clave: string,
  cambios: Record<string, unknown>,
): Promise<void> {
  const { error } = await admin()
    .from('origenes_campos')
    .update(cambios)
    .eq('origen_id', origenId)
    .eq('clave', clave)
  if (error) {
    throw new Error(`No se pudo cambiar el campo ${clave}: ${error.message}`)
  }
}

export async function cambiarOrigen(
  origenId: string,
  cambios: Record<string, unknown>,
): Promise<void> {
  const { error } = await admin().from('origenes').update(cambios).eq('id', origenId)
  if (error) {
    throw new Error(`No se pudo cambiar el origen: ${error.message}`)
  }
}

// Las vistas guardadas de una persona, leídas de la base.
export async function vistasDe(email: string): Promise<{ nombre: string; params: unknown }[]> {
  const cliente = admin()
  const { data: perfil, error } = await cliente
    .from('perfiles')
    .select('id')
    .eq('email', email)
    .single<{ id: string }>()
  if (error) {
    throw new Error(`No se pudo leer el perfil de ${email}: ${error.message}`)
  }
  const { data, error: errorDeVistas } = await cliente
    .from('vistas_guardadas')
    .select('nombre, params')
    .eq('usuario_id', perfil.id)
    .returns<{ nombre: string; params: unknown }[]>()
  if (errorDeVistas) {
    throw new Error(`No se pudo leer las vistas: ${errorDeVistas.message}`)
  }
  return data
}

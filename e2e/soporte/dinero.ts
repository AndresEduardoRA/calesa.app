// El terreno de los e2e de dinero de logística (6.11): el de `sembrarLogistica` (un origen con una fase y dos vehículos) más una persona que ve y edita gastos y ve el margen del origen.
// El tipo de cambio y la moneda se leen de la base: el spec no asume códigos de moneda ni valores fijos.
import { CONTRASENA } from './alta'
import { admin, correoDePrueba, crearPersona, darRolDePrueba, PREFIJO_ROL_E2E } from './base'
import { borrarLogistica, sembrarLogistica, type TerrenoDeLogistica } from './logistica'

export type TerrenoDeDinero = TerrenoDeLogistica & {
  // Ve y edita gastos y ve el margen en el origen.
  conDinero: string
}

export type TipoDeCambioDePrueba = {
  moneda: string
  base: string
  // Cuántas unidades de la otra moneda valen una de la base (11,68 Bs por 1 USD).
  monedaPorBase: number
  nombre: string
}

const CLAVES_DE_DINERO = [
  'logistica.ver',
  'vehiculos.ver',
  'logistica.gastos.ver',
  'logistica.gastos.editar',
  'logistica.margen.ver',
]

export async function sembrarDinero(proyecto: string): Promise<TerrenoDeDinero> {
  const terreno = await sembrarLogistica(proyecto)
  const email = correoDePrueba(`con-dinero-${proyecto}`)
  await crearPersona({
    email,
    contrasena: CONTRASENA,
    nombre: 'Persona con dinero',
    invitada: true,
  })
  await darRolDePrueba({
    email,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}con dinero ${proyecto}`,
      clave: `e2e_con_dinero_${proyecto}`,
    },
    permisos: CLAVES_DE_DINERO.map((clave) => ({ clave, origenId: terreno.origen.id })),
  })
  return { ...terreno, conDinero: email }
}

// Lo que se hizo en el terreno de dinero se quita antes del de logística: un vehículo con gastos no se borra.
export async function borrarDinero(proyecto: string): Promise<void> {
  const cliente = admin()
  const { data: origen } = await cliente
    .from('origenes')
    .select('id')
    .eq('clave', `e2e_logistica_${proyecto}`)
    .maybeSingle<{ id: string }>()
  if (origen) {
    const { data: vehiculos } = await cliente
      .from('vehiculos')
      .select('id')
      .eq('origen_id', origen.id)
      .limit(100)
      .returns<{ id: string }[]>()
    const ids = (vehiculos ?? []).map((v) => v.id)
    if (ids.length > 0) {
      await cliente.from('gastos').delete().in('vehiculo_id', ids)
    }
  }
  await borrarLogistica(proyecto)
}

// El tipo de cambio por defecto de la empresa entre la moneda base y otra: lo que un gasto en esa otra moneda convierte. Lee la base, no un valor escrito aquí.
export async function tipoDeCambioPorDefecto(): Promise<TipoDeCambioDePrueba> {
  const cliente = admin()
  const { data: ajustes, error } = await cliente
    .from('ajustes_empresa')
    .select('moneda_base')
    .eq('id', 1)
    .single<{ moneda_base: string }>()
  if (error) throw new Error(`No se pudo leer la moneda base: ${error.message}`)
  const { data: tipo, error: errorDelTipo } = await cliente
    .from('tipos_cambio')
    .select('nombre, moneda_de, moneda_a, valor')
    .eq('es_default', true)
    .eq('activo', true)
    .or(`moneda_a.eq.${ajustes.moneda_base},moneda_de.eq.${ajustes.moneda_base}`)
    .order('orden')
    .limit(1)
    .single<{ nombre: string; moneda_de: string; moneda_a: string; valor: number }>()
  if (errorDelTipo) throw new Error(`No se pudo leer el tipo de cambio: ${errorDelTipo.message}`)
  const base = ajustes.moneda_base
  // El par se guarda en un sentido y sirve en los dos (D20 de 6.10-1).
  return tipo.moneda_de === base
    ? { moneda: tipo.moneda_a, base, monedaPorBase: tipo.valor, nombre: tipo.nombre }
    : { moneda: tipo.moneda_de, base, monedaPorBase: 1 / tipo.valor, nombre: tipo.nombre }
}

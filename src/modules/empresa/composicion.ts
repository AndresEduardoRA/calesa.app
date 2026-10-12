// Composición del módulo en el servidor: acá se decide qué implementación recibe cada interfaz
// de `entities/repositorios`. Los casos de uso de `features/` importan de este archivo, nunca de
// `infra/` (lo verifica eslint-plugin-boundaries).
import 'server-only'
import type {
  LectorDeAjustes,
  LectorDeHistorial,
  LectorDeIntegraciones,
  LectorDeMonedasYTiposCambio,
  RepositorioEmpresa,
  RepositorioIntegraciones,
  RepositorioTiposCambio,
} from './entities/repositorios'
import { empresaSupabase } from './infra/empresa'
import { integracionesSupabase } from './infra/integraciones'
import { getAjustes, getAjustesParaEditar } from './infra/queries/ajustes'
import { getIntegraciones, integracionActiva } from './infra/queries/integraciones'
import { getHistorial, getMonedasYTiposCambio, getTiposCambio } from './infra/queries/tipos-cambio'
import { tiposCambioSupabase } from './infra/tipos-cambio'

export const repositorioEmpresa: RepositorioEmpresa = empresaSupabase
export const repositorioTiposCambio: RepositorioTiposCambio = tiposCambioSupabase
export const repositorioIntegraciones: RepositorioIntegraciones = integracionesSupabase

export const leerAjustes: LectorDeAjustes = getAjustesParaEditar
export const leerMonedasYTiposCambio: LectorDeMonedasYTiposCambio = getMonedasYTiposCambio
export const leerHistorial: LectorDeHistorial = getHistorial
export const leerIntegraciones: LectorDeIntegraciones = getIntegraciones

// Lo que consumen el shell y otros módulos: nunca tumban una pantalla.
export { getAjustes, getTiposCambio, integracionActiva }

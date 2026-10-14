// Composición del módulo en el servidor: acá se decide qué implementación recibe cada interfaz
// de `entities/repositorios`. Los casos de uso de `features/` importan de este archivo, nunca de
// `infra/` (lo verifica eslint-plugin-boundaries).
import 'server-only'
import type {
  LectorDeContextoDeAlta,
  LectorDeLayoutDeLeads,
  RepositorioCamposDeLead,
  RepositorioDeAlta,
} from './entities/repositorios'
import { altaSupabase } from './infra/alta'
import { camposDeLeadSupabase } from './infra/campos'
import { getContextoDeAlta } from './infra/queries/alta'
import { getLayoutDeLeads } from './infra/queries/campos'

export const repositorioCamposDeLead: RepositorioCamposDeLead = camposDeLeadSupabase

export const leerLayoutDeLeads: LectorDeLayoutDeLeads = getLayoutDeLeads

export const repositorioDeAlta: RepositorioDeAlta = altaSupabase

export const leerContextoDeAlta: LectorDeContextoDeAlta = getContextoDeAlta

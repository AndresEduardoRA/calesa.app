// Composición del módulo en el servidor: acá se decide qué implementación recibe cada interfaz
// de `entities/repositorios`. Los casos de uso de `features/` importan de este archivo, nunca de
// `infra/` (lo verifica eslint-plugin-boundaries).
import 'server-only'
import type {
  BuscadorDeLeads,
  LectorDeContextoDeAlta,
  LectorDeLayoutDeLeads,
  LectorDeOrigenesDeLead,
  RepositorioCamposDeLead,
  RepositorioDeAlta,
} from './entities/repositorios'
import { altaSupabase } from './infra/alta'
import { camposDeLeadSupabase } from './infra/campos'
import { getContextoDeAlta } from './infra/queries/alta'
import { getLayoutDeLeads } from './infra/queries/campos'
import { buscarLeads as buscarLeadsEnBase } from './infra/queries/listado'
import { getOrigenesDeLead } from './infra/queries/origenes'

export const repositorioCamposDeLead: RepositorioCamposDeLead = camposDeLeadSupabase

export const leerLayoutDeLeads: LectorDeLayoutDeLeads = getLayoutDeLeads

export const repositorioDeAlta: RepositorioDeAlta = altaSupabase

export const leerContextoDeAlta: LectorDeContextoDeAlta = getContextoDeAlta

export const buscarLeads: BuscadorDeLeads = buscarLeadsEnBase

export const leerOrigenesDeLead: LectorDeOrigenesDeLead = getOrigenesDeLead

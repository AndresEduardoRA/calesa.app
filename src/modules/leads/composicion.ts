// Composición del módulo en el servidor: acá se decide qué implementación recibe cada interfaz
// de `entities/repositorios`. Los casos de uso de `features/` importan de este archivo, nunca de
// `infra/` (lo verifica eslint-plugin-boundaries).
import 'server-only'
import type {
  BuscadorDeLeads,
  LectorDeContextoDeAlta,
  LectorDeFicha,
  LectorDeLayoutDeLeads,
  LectorDeOrigenesDeLead,
  RepositorioCamposDeLead,
  RepositorioDeAlta,
  RepositorioDeFicha,
  RepositorioDeTelefonos,
} from './entities/repositorios'
import { altaSupabase } from './infra/alta'
import { camposDeLeadSupabase } from './infra/campos'
import { fichaSupabase } from './infra/ficha'
import { getContextoDeAlta } from './infra/queries/alta'
import { getLayoutDeLeads } from './infra/queries/campos'
import { getFicha } from './infra/queries/ficha'
import { buscarLeads as buscarLeadsEnBase } from './infra/queries/listado'
import { getOrigenesDeLead } from './infra/queries/origenes'
import { telefonosSupabase } from './infra/telefonos'

export const repositorioCamposDeLead: RepositorioCamposDeLead = camposDeLeadSupabase

export const leerLayoutDeLeads: LectorDeLayoutDeLeads = getLayoutDeLeads

export const repositorioDeAlta: RepositorioDeAlta = altaSupabase

export const leerContextoDeAlta: LectorDeContextoDeAlta = getContextoDeAlta

export const buscarLeads: BuscadorDeLeads = buscarLeadsEnBase

export const leerOrigenesDeLead: LectorDeOrigenesDeLead = getOrigenesDeLead

export const leerFicha: LectorDeFicha = getFicha

export const repositorioDeFicha: RepositorioDeFicha = fichaSupabase

export const repositorioDeTelefonos: RepositorioDeTelefonos = telefonosSupabase

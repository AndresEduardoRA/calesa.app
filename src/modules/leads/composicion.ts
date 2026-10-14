// Composición del módulo en el servidor: acá se decide qué implementación recibe cada interfaz
// de `entities/repositorios`. Los casos de uso de `features/` importan de este archivo, nunca de
// `infra/` (lo verifica eslint-plugin-boundaries).
import 'server-only'
import type { LectorDeLayoutDeLeads, RepositorioCamposDeLead } from './entities/repositorios'
import { camposDeLeadSupabase } from './infra/campos'
import { getLayoutDeLeads } from './infra/queries/campos'

export const repositorioCamposDeLead: RepositorioCamposDeLead = camposDeLeadSupabase

export const leerLayoutDeLeads: LectorDeLayoutDeLeads = getLayoutDeLeads

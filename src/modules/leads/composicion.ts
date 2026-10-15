// Composición del módulo en el servidor: acá se decide qué implementación recibe cada interfaz
// de `entities/repositorios`. Los casos de uso de `features/` importan de este archivo, nunca de
// `infra/` (lo verifica eslint-plugin-boundaries).
import 'server-only'
import type {
  BuscadorDeLeads,
  ContadorDeLeads,
  LectorDeCartera,
  LectorDeContextoDeAlta,
  LectorDeEtiquetas,
  LectorDeFicha,
  LectorDeLayoutDeLeads,
  LectorDeOrigenesDeLead,
  LectorDeRecordatoriosDelLead,
  LectorDeSeguimientos,
  LectorDeTiposDeSeguimiento,
  RepositorioCamposDeLead,
  RepositorioDeAlta,
  RepositorioDeCartera,
  RepositorioDeEtiquetas,
  RepositorioDeFicha,
  RepositorioDeMarcas,
  RepositorioDeRecordatorios,
  RepositorioDeSeguimientos,
  RepositorioDeTelefonos,
} from './entities/repositorios'
import { altaSupabase } from './infra/alta'
import { carteraSupabase } from './infra/cartera'
import { camposDeLeadSupabase } from './infra/campos'
import { etiquetasSupabase } from './infra/etiquetas'
import { fichaSupabase } from './infra/ficha'
import { marcasSupabase } from './infra/marcas'
import { getContextoDeAlta } from './infra/queries/alta'
import { getCartera } from './infra/queries/cartera'
import { getLayoutDeLeads } from './infra/queries/campos'
import { getEtiquetas } from './infra/queries/etiquetas'
import { getFicha } from './infra/queries/ficha'
import {
  buscarLeads as buscarLeadsEnBase,
  contarLeads as contarEnBase,
} from './infra/queries/listado'
import { getOrigenesDeLead } from './infra/queries/origenes'
import { getRecordatoriosDelLead } from './infra/queries/recordatorios'
import { recordatoriosSupabase } from './infra/recordatorios'
import { getSeguimientos, getTiposDeSeguimiento } from './infra/queries/seguimientos'
import { seguimientosSupabase } from './infra/seguimientos'
import { telefonosSupabase } from './infra/telefonos'

export const repositorioCamposDeLead: RepositorioCamposDeLead = camposDeLeadSupabase

export const leerLayoutDeLeads: LectorDeLayoutDeLeads = getLayoutDeLeads

export const repositorioDeAlta: RepositorioDeAlta = altaSupabase

export const leerContextoDeAlta: LectorDeContextoDeAlta = getContextoDeAlta

export const buscarLeads: BuscadorDeLeads = buscarLeadsEnBase

export const contarLeads: ContadorDeLeads = contarEnBase

export const leerOrigenesDeLead: LectorDeOrigenesDeLead = getOrigenesDeLead

export const leerFicha: LectorDeFicha = getFicha

export const repositorioDeFicha: RepositorioDeFicha = fichaSupabase

export const repositorioDeTelefonos: RepositorioDeTelefonos = telefonosSupabase

export const repositorioDeSeguimientos: RepositorioDeSeguimientos = seguimientosSupabase

export const leerSeguimientos: LectorDeSeguimientos = getSeguimientos

export const leerTiposDeSeguimiento: LectorDeTiposDeSeguimiento = getTiposDeSeguimiento

export const repositorioDeRecordatorios: RepositorioDeRecordatorios = recordatoriosSupabase

export const leerRecordatoriosDelLead: LectorDeRecordatoriosDelLead = getRecordatoriosDelLead

export const repositorioDeMarcas: RepositorioDeMarcas = marcasSupabase

export const repositorioDeEtiquetas: RepositorioDeEtiquetas = etiquetasSupabase

export const leerEtiquetas: LectorDeEtiquetas = getEtiquetas

export const repositorioDeCartera: RepositorioDeCartera = carteraSupabase

export const leerCartera: LectorDeCartera = getCartera

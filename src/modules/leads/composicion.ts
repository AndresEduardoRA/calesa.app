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
  LectorDePapeleraDeLeads,
  LectorDeSeguimientos,
  LectorDeTiposDeSeguimiento,
  RepositorioCamposDeLead,
  RepositorioDeAlta,
  RepositorioDeCartera,
  RepositorioDeEtiquetas,
  RepositorioDeExportacion,
  RepositorioDeFicha,
  RepositorioDeMarcas,
  RepositorioDePapeleraDeLeads,
  RepositorioDeRecordatorios,
  RepositorioDeSeguimientos,
  RepositorioDeTelefonos,
} from './entities/repositorios'
import type {
  LectorDeEmbudos,
  LectorDeOportunidadesDelLead,
  LectorDeTablero,
  RepositorioDeEmbudos,
  RepositorioDeOportunidades,
} from './entities/repositorios-de-oportunidades'
import type { RepositorioDeImportacion } from './entities/repositorios-de-importacion'
import type {
  LectorDeAccesoDelCliente,
  RepositorioDelPortal,
} from './entities/repositorios-de-portal'
import { altaSupabase } from './infra/alta'
import { carteraSupabase } from './infra/cartera'
import { camposDeLeadSupabase } from './infra/campos'
import { embudosSupabase } from './infra/embudos'
import { etiquetasSupabase } from './infra/etiquetas'
import { exportacionSupabase } from './infra/exportacion'
import { fichaSupabase } from './infra/ficha'
import { importacionSupabase } from './infra/importacion'
import { marcasSupabase } from './infra/marcas'
import { oportunidadesSupabase } from './infra/oportunidades'
import { getContextoDeAlta } from './infra/queries/alta'
import { getCartera } from './infra/queries/cartera'
import { getLayoutDeLeads } from './infra/queries/campos'
import { getEmbudos, getTablero } from './infra/queries/embudos'
import { getOportunidadesDelLead } from './infra/queries/oportunidades'
import { getEtiquetas } from './infra/queries/etiquetas'
import { getFicha } from './infra/queries/ficha'
import {
  buscarLeads as buscarLeadsEnBase,
  contarLeads as contarEnBase,
} from './infra/queries/listado'
import { getOrigenesDeLead } from './infra/queries/origenes'
import { getPapeleraDeLeads } from './infra/queries/papelera'
import { getAccesoDelCliente } from './infra/queries/portal'
import { portalSupabase } from './infra/portal'
import { papeleraDeLeadsSupabase } from './infra/papelera'
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

export const repositorioDeMarcas: RepositorioDeMarcas = marcasSupabase

export const repositorioDeEtiquetas: RepositorioDeEtiquetas = etiquetasSupabase

export const leerEtiquetas: LectorDeEtiquetas = getEtiquetas

export const repositorioDeCartera: RepositorioDeCartera = carteraSupabase

export const leerCartera: LectorDeCartera = getCartera

export const repositorioDePapeleraDeLeads: RepositorioDePapeleraDeLeads = papeleraDeLeadsSupabase

export const leerPapeleraDeLeads: LectorDePapeleraDeLeads = getPapeleraDeLeads

export const repositorioDeEmbudos: RepositorioDeEmbudos = embudosSupabase

export const leerEmbudos: LectorDeEmbudos = getEmbudos

export const leerTablero: LectorDeTablero = getTablero

export const repositorioDeOportunidades: RepositorioDeOportunidades = oportunidadesSupabase

export const leerOportunidadesDelLead: LectorDeOportunidadesDelLead = getOportunidadesDelLead

// El acceso del cliente al portal (clase 1: la cartera y `leads.portal.gestionar`).
export const leerAccesoDelCliente: LectorDeAccesoDelCliente = getAccesoDelCliente

export const repositorioDelPortal: RepositorioDelPortal = portalSupabase

// Exportar a CSV (parte 8): la constancia y el límite por hora. Las filas salen de `buscarLeads`.
export const repositorioDeExportacion: RepositorioDeExportacion = exportacionSupabase

// Importar leads desde un CSV (parte 8): lotes por RPC, cada fila por su cuenta.
export const repositorioDeImportacion: RepositorioDeImportacion = importacionSupabase

// Composición del módulo en el servidor: acá se decide qué implementación recibe cada interfaz
// de `entities/repositorios`. Los casos de uso de `features/` importan de este archivo, nunca de
// `infra/` (lo verifica eslint-plugin-boundaries).
import 'server-only'
import type { LectorDeLeadsSinSeguimiento, LectorDeRecordatoriosDeHoy } from './entities/bandeja'
import type { LectorDeClienteElegido } from './entities/panel-para-cotizar'
import type { BuscadorDeLeads, ContadorDeLeads } from './entities/repositorios-del-listado'
import type {
  LectorDeCartera,
  LectorDeContextoDeAlta,
  LectorDeEtiquetas,
  LectorDeFicha,
  LectorDeLayoutDeLeads,
  LectorDeCatalogosDeLead,
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
  EscritorDeAjustesDeLeads,
  LectorDeAjustesDeLeads,
  LectorDeChoques,
} from './entities/ajustes-de-leads'
import type {
  LectorDeOrigenesDeLeadConUso,
  RepositorioDeOrigenesDeLead,
} from './entities/repositorios-de-origenes'
import type {
  LectorDeTiposDeLeadConUso,
  RepositorioDeTiposDeLead,
} from './entities/repositorios-de-tipos'
import type {
  LectorDeTiposDeSeguimientoConUso,
  RepositorioDeTiposDeSeguimiento,
} from './entities/repositorios-de-tipos-de-seguimiento'
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
import { origenesDeLeadSupabase } from './infra/origenes'
import { tiposDeLeadSupabase } from './infra/tipos'
import { tiposDeSeguimientoSupabase } from './infra/tipos-de-seguimiento'
import { getContextoDeAlta } from './infra/queries/alta'
import { getCartera, getCarteraCorta } from './infra/queries/cartera'
import { getLayoutDeLeads } from './infra/queries/campos'
import { getEmbudos, getTablero } from './infra/queries/embudos'
import { getOportunidadesDelLead } from './infra/queries/oportunidades'
import { getClienteElegido } from './infra/queries/cliente-elegido'
import { getNombresDeLeads } from './infra/queries/nombres-de-leads'
import { getEtiquetas } from './infra/queries/etiquetas'
import { getFicha } from './infra/queries/ficha'
import {
  buscarLeads as buscarLeadsEnBase,
  contarLeadsHasta as contarEnBase,
} from './infra/queries/listado'
import type { LectorDeCarteraCorta } from './entities/fuente-del-listado'
import type { LectorDeIdsDelNumero } from './entities/numero'
import { getLeadsSinSeguimiento, getRecordatoriosDeHoy } from './infra/queries/bandeja'
import { getIdsDelNumero } from './infra/queries/numeros'
import { getCatalogosDeLead } from './infra/queries/catalogos'
import { getOrigenesDeLeadConUso } from './infra/queries/origenes'
import { getPapeleraDeLeads } from './infra/queries/papelera'
import { getTiposDeLeadConUso } from './infra/queries/tipos'
import { getTiposDeSeguimientoConUso } from './infra/queries/tipos-de-seguimiento'
import { getAccesoDelCliente } from './infra/queries/portal'
import { getAjustesDeLeads } from './infra/queries/ajustes-de-leads'
import { ajustesDeLeadsSupabase } from './infra/ajustes-de-leads'
import { getChoquesDeTelefonos } from './infra/queries/choques-de-telefonos'
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

export const contarLeadsHasta: ContadorDeLeads = contarEnBase

export const leerIdsDelNumero: LectorDeIdsDelNumero = getIdsDelNumero

export const leerCarteraCorta: LectorDeCarteraCorta = getCarteraCorta

// El lead de `?lead=` de la hoja de cotizar (4.14-3b).
export const leerClienteElegido: LectorDeClienteElegido = getClienteElegido

// Los nombres de los clientes de una página de otro listado (`/cotizaciones`, 4.16-4a): con la RLS de quien mira, el que no se ve no llega.
export const leerNombresDeLeads = getNombresDeLeads

// Los orígenes y los tipos con que se nombra a un lead, en un solo pedido.
export const leerCatalogosDeLead: LectorDeCatalogosDeLead = getCatalogosDeLead

export const leerOrigenesDeLeadConUso: LectorDeOrigenesDeLeadConUso = getOrigenesDeLeadConUso

export const repositorioDeOrigenesDeLead: RepositorioDeOrigenesDeLead = origenesDeLeadSupabase

export const leerTiposDeLeadConUso: LectorDeTiposDeLeadConUso = getTiposDeLeadConUso

export const repositorioDeTiposDeLead: RepositorioDeTiposDeLead = tiposDeLeadSupabase

export const leerTiposDeSeguimientoConUso: LectorDeTiposDeSeguimientoConUso =
  getTiposDeSeguimientoConUso

export const repositorioDeTiposDeSeguimiento: RepositorioDeTiposDeSeguimiento =
  tiposDeSeguimientoSupabase

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

// Las plantillas de la empresa (9.04): la del embudo y el mensaje del portal. Las lee toda cuenta activa.
export const leerAjustesDeLeads: LectorDeAjustesDeLeads = getAjustesDeLeads
export const leerChoquesDeTelefonos: LectorDeChoques = getChoquesDeTelefonos

export const repositorioDeAjustesDeLeads: EscritorDeAjustesDeLeads = ajustesDeLeadsSupabase

// Exportar a CSV (parte 8): la constancia y el límite por hora. Las filas salen de `buscarLeads`.
export const repositorioDeExportacion: RepositorioDeExportacion = exportacionSupabase

// Importar leads desde un CSV (parte 8): lotes por RPC, cada fila por su cuenta.
export const repositorioDeImportacion: RepositorioDeImportacion = importacionSupabase

// Inicio (9.02): lo mío que espera: los recordatorios de hoy y los leads de mi cartera sin ningún seguimiento.
export const leerRecordatoriosDeHoy: LectorDeRecordatoriosDeHoy = getRecordatoriosDeHoy

export const leerLeadsSinSeguimiento: LectorDeLeadsSinSeguimiento = getLeadsSinSeguimiento

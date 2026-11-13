// Lo que el servidor lee para la sección «Importar» de `/datos` (9.06-4b, D43): sólo el contexto de la entidad elegida en la URL. Tipos, sin I/O.
import type { CampoDeLead, ContextoDeImportacion } from '@/modules/leads/client'
import type { CampoDeLayout, Categoria, TipoDeOrigen } from '@/modules/origenes/client'

export type PersonaParaDestino = { id: string; nombre: string }

export type ContextoDeLeads = {
  entidad: 'leads'
  campos: readonly CampoDeLead[]
  contexto: ContextoDeImportacion
  // Sólo con `datos.importar.todo`: a quién darle los leads, además de «Yo».
  personas: readonly PersonaParaDestino[]
  hayMasPersonas: boolean
}

export type ContextoDeVehiculos = {
  entidad: 'vehiculos'
  origen: { id: string; nombre: string; tipo: TipoDeOrigen }
  campos: readonly CampoDeLayout[]
  categorias: readonly Categoria[]
}

export type ContextoDeLaSeccion = ContextoDeLeads | ContextoDeVehiculos

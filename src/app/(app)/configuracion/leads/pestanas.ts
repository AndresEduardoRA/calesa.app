// Las pestañas de Configuración › Leads. Cuál está abierta vive en la URL (`?seccion=`).
// «Campos» pide `leads.campos.gestionar`; las otras, `leads.configurar` (9-3). La que no puedes abrir no se esconde: se ve apagada con su motivo.
import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'
import type { AlMenosUna } from '../empresa/pestanas'

export const PESTANAS = [
  {
    clave: 'campos',
    titulo: 'Campos',
    permiso: 'leads.campos.gestionar',
    nombreDelPermiso: 'Gestionar los campos de los leads',
  },
  {
    clave: 'origenes',
    titulo: 'Orígenes del lead',
    permiso: 'leads.configurar',
    nombreDelPermiso: 'Configurar leads',
  },
  {
    clave: 'tipos',
    titulo: 'Tipos de lead',
    permiso: 'leads.configurar',
    nombreDelPermiso: 'Configurar leads',
  },
  {
    clave: 'seguimientos',
    titulo: 'Tipos de seguimiento',
    permiso: 'leads.configurar',
    nombreDelPermiso: 'Configurar leads',
  },
  {
    clave: 'embudo',
    titulo: 'Plantilla del embudo',
    permiso: 'leads.configurar',
    nombreDelPermiso: 'Configurar leads',
  },
  {
    clave: 'portal',
    titulo: 'Mensaje del portal',
    permiso: 'leads.configurar',
    nombreDelPermiso: 'Configurar leads',
  },
  {
    clave: 'telefonos',
    titulo: 'Teléfonos extra',
    permiso: 'leads.configurar',
    nombreDelPermiso: 'Configurar leads',
  },
] as const satisfies readonly {
  clave: string
  titulo: string
  permiso: ClavePermiso
  nombreDelPermiso: string
}[]

export type Pestana = (typeof PESTANAS)[number]['clave']

export const CLAVES_DE_PESTANA = PESTANAS.map((pestana) => pestana.clave)

// Con cualquiera de ellos se entra a Configuración › Leads.
export const PERMISOS_DE_LEADS: readonly ClavePermiso[] = [
  'leads.campos.gestionar',
  'leads.configurar',
]

export type PestanaDeLeads = { clave: Pestana; titulo: string; motivo?: string }

// Todas, en su orden; la que esta persona no puede abrir lleva el motivo.
export function pestanasPara(permisos: Permisos): PestanaDeLeads[] {
  return PESTANAS.map(({ clave, titulo, permiso, nombreDelPermiso }) =>
    puede(permisos, permiso)
      ? { clave, titulo }
      : { clave, titulo, motivo: `Te falta el permiso «${nombreDelPermiso}».` },
  )
}

// Lo que viene en la URL lo puede escribir cualquiera: lo que no es una pestaña habilitada abre la primera habilitada.
export function pestanaDe<T extends string>(
  valor: string | undefined,
  habilitadas: AlMenosUna<{ clave: T }>,
): T {
  return habilitadas.find((pestana) => pestana.clave === valor)?.clave ?? habilitadas[0].clave
}

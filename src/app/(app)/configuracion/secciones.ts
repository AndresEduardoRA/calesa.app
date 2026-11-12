import {
  Building2Icon,
  ContactRoundIcon,
  MapPinIcon,
  ShieldCheckIcon,
  UsersRoundIcon,
  type LucideIcon,
} from 'lucide-react'
import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { SECCION_DE_COTIZACION } from './cotizacion/seccion'
import { PERMISOS_DE_EMPRESA } from './empresa/pestanas'
import { SECCION_DE_FLUJOS } from './flujos/seccion'
import { SECCIONES_DE_LOGISTICA } from './logistica/seccion'
import { PERMISOS_DE_ORIGENES } from './origenes/acceso'
import { SECCION_DE_REPUESTOS } from './repuestos/seccion'

// Las secciones de Configuración que ya tienen pantalla. Cada una se abre con cualquiera de sus
// permisos (ver o gestionar): el hub muestra sólo las que esta persona puede abrir.
// secciones.test.ts falla si una sección apunta a una ruta sin `page.tsx`.
export type SeccionDeConfiguracion = {
  clave: string
  titulo: string
  descripcion: string
  ruta: string
  Icono: LucideIcon
  permisos: readonly ClavePermiso[]
}

export const SECCIONES = [
  {
    clave: 'empresa',
    titulo: 'Empresa',
    descripcion: 'La marca, los datos legales, la región, las monedas y las integraciones.',
    ruta: RUTAS.empresa,
    Icono: Building2Icon,
    permisos: PERMISOS_DE_EMPRESA,
  },
  {
    clave: 'origenes',
    titulo: 'Orígenes',
    descripcion: 'De dónde vienen los vehículos: su layout de campos y sus categorías.',
    ruta: RUTAS.origenes,
    Icono: MapPinIcon,
    permisos: PERMISOS_DE_ORIGENES,
  },
  {
    clave: 'leads',
    titulo: 'Leads',
    descripcion:
      'Los campos de los leads, quién los ve, de dónde llegan, qué es cada lead y cómo se contactó.',
    ruta: RUTAS.configuracionDeLeads,
    Icono: ContactRoundIcon,
    permisos: ['leads.configurar'],
  },
  SECCION_DE_COTIZACION,
  SECCION_DE_FLUJOS,
  ...SECCIONES_DE_LOGISTICA,
  SECCION_DE_REPUESTOS,
  {
    clave: 'equipo',
    titulo: 'Equipo',
    descripcion: 'Las personas, sus roles, las invitaciones, el bloqueo y la baja.',
    ruta: RUTAS.equipo,
    Icono: UsersRoundIcon,
    permisos: ['equipo.usuarios.ver', 'equipo.usuarios.gestionar'],
  },
  {
    clave: 'roles',
    titulo: 'Roles y permisos',
    descripcion: 'Qué puede hacer cada rol, por origen y con qué alcance.',
    ruta: RUTAS.roles,
    Icono: ShieldCheckIcon,
    permisos: ['equipo.roles.ver', 'equipo.roles.gestionar'],
  },
] as const satisfies readonly SeccionDeConfiguracion[]

export function seccionesVisibles(permisos: Permisos): SeccionDeConfiguracion[] {
  return SECCIONES.filter((seccion: SeccionDeConfiguracion) =>
    seccion.permisos.some((clave) => puede(permisos, clave)),
  )
}

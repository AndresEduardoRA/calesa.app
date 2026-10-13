import {
  Building2Icon,
  MapPinIcon,
  ShieldCheckIcon,
  UsersRoundIcon,
  type LucideIcon,
} from 'lucide-react'
import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { PERMISOS_DE_ORIGENES } from './origenes/acceso'

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
    permisos: ['empresa.ajustes.gestionar', 'empresa.tipos_cambio.gestionar'],
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

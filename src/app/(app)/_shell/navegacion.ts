// La navegación completa de la app (docs/UX.md › Pantallas), con el permiso que exige cada
// entrada. Se declara entera desde ya; lo que todavía no tiene pantalla no se muestra: ningún
// enlace lleva a un 404. `navegacion.test.ts` compara `disponible` con las rutas que existen en
// disco, así que quien agrega una pantalla tiene que prender su entrada (y viceversa).
import {
  ActivityIcon,
  BoxesIcon,
  CalculatorIcon,
  CalendarDaysIcon,
  CarFrontIcon,
  ChartColumnIcon,
  DatabaseIcon,
  HouseIcon,
  MessagesSquareIcon,
  RouteIcon,
  SettingsIcon,
  UserRoundIcon,
  UsersRoundIcon,
  type LucideIcon,
} from 'lucide-react'
import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'

export type ZonaNav =
  // La barra lateral: hasta 7 entradas de trabajo diario (más Repuestos, sólo con permiso).
  | 'principal'
  // El menú del usuario: lo que se visita de vez en cuando.
  | 'usuario'

export type EntradaNav = {
  clave: string
  titulo: string
  ruta: string
  Icono: LucideIcon
  zona: ZonaNav
  // null = cualquiera con sesión. Si no, alcanza con tener uno (en cualquier origen).
  permisos: readonly ClavePermiso[] | null
  // Existe su `page.tsx`.
  disponible: boolean
}

export const NAVEGACION = [
  {
    clave: 'inicio',
    titulo: 'Inicio',
    ruta: '/',
    Icono: HouseIcon,
    zona: 'principal',
    permisos: null,
    disponible: true,
  },
  {
    clave: 'leads',
    titulo: 'Leads',
    ruta: '/leads',
    Icono: UsersRoundIcon,
    zona: 'principal',
    permisos: ['leads.ver'],
    disponible: true,
  },
  {
    clave: 'vehiculos',
    titulo: 'Vehículos',
    ruta: '/vehiculos',
    Icono: CarFrontIcon,
    zona: 'principal',
    permisos: ['vehiculos.ver'],
    disponible: true,
  },
  {
    clave: 'cotizaciones',
    titulo: 'Cotizaciones',
    ruta: '/cotizaciones',
    Icono: CalculatorIcon,
    zona: 'principal',
    permisos: ['cotizaciones.ver'],
    disponible: false,
  },
  {
    clave: 'logistica',
    titulo: 'Logística',
    ruta: '/logistica',
    Icono: RouteIcon,
    zona: 'principal',
    permisos: ['logistica.ver'],
    disponible: false,
  },
  {
    clave: 'repuestos',
    titulo: 'Repuestos',
    ruta: '/repuestos',
    Icono: BoxesIcon,
    zona: 'principal',
    permisos: ['repuestos.ver'],
    disponible: false,
  },
  {
    clave: 'agenda',
    titulo: 'Agenda',
    ruta: '/agenda',
    Icono: CalendarDaysIcon,
    zona: 'principal',
    permisos: null,
    disponible: false,
  },
  {
    clave: 'chat',
    titulo: 'Chat',
    ruta: '/chat',
    Icono: MessagesSquareIcon,
    zona: 'principal',
    permisos: ['chat.participar'],
    disponible: false,
  },
  {
    clave: 'perfil',
    titulo: 'Mi perfil',
    ruta: '/perfil',
    Icono: UserRoundIcon,
    zona: 'usuario',
    permisos: null,
    disponible: true,
  },
  {
    clave: 'tablero',
    titulo: 'Tablero',
    ruta: '/tablero',
    Icono: ChartColumnIcon,
    zona: 'usuario',
    permisos: ['tablero.metricas.ver'],
    disponible: false,
  },
  {
    clave: 'configuracion',
    titulo: 'Configuración',
    ruta: '/configuracion',
    Icono: SettingsIcon,
    zona: 'usuario',
    // El hub se abre con el permiso de cualquiera de sus secciones.
    permisos: [
      'equipo.usuarios.ver',
      'equipo.usuarios.gestionar',
      'equipo.roles.ver',
      'equipo.roles.gestionar',
      'empresa.ajustes.gestionar',
      'empresa.tipos_cambio.gestionar',
      'origenes.gestionar',
      'leads.configurar',
      'cotizaciones.configurar',
      'flujos.configurar',
      'logistica.catalogos.gestionar',
      'repuestos.configurar',
      'web.ajustes.gestionar',
      'web.contenido.gestionar',
      'web.cola.gestionar',
    ],
    disponible: true,
  },
  {
    clave: 'actividad',
    titulo: 'Actividad',
    ruta: '/actividad',
    Icono: ActivityIcon,
    zona: 'usuario',
    permisos: ['actividad.ver'],
    disponible: false,
  },
  {
    clave: 'datos',
    titulo: 'Datos',
    ruta: '/datos',
    Icono: DatabaseIcon,
    zona: 'usuario',
    // Cada persona exporta e importa lo suyo; «todo» lo decide la pantalla con `datos.*.todo`.
    permisos: null,
    disponible: false,
  },
] as const satisfies readonly EntradaNav[]

// Lo que esta persona ve en una zona: la entrada tiene pantalla y ella tiene el permiso.
export function entradasVisibles(permisos: Permisos, zona: ZonaNav): EntradaNav[] {
  return NAVEGACION.filter(
    (entrada: EntradaNav) =>
      entrada.zona === zona &&
      entrada.disponible &&
      (entrada.permisos === null || entrada.permisos.some((clave) => puede(permisos, clave))),
  )
}

// La entrada a la que pertenece una ruta: `/leads/123` es de Leads; `/` sólo es Inicio.
export function estaEn(rutaActual: string, rutaDeLaEntrada: string): boolean {
  if (rutaDeLaEntrada === '/') {
    return rutaActual === '/'
  }
  return rutaActual === rutaDeLaEntrada || rutaActual.startsWith(`${rutaDeLaEntrada}/`)
}

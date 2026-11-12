// Los tipos de aviso que escribe la base (`notificaciones.tipo`) y lo que la interfaz hace con cada uno. Un tipo que
// este catálogo no conoce (una fase nueva, un aviso viejo) se dibuja con el genérico: la lista nunca se rompe.

export type TipoDeNotificacion = {
  // El nombre del icono de lucide: el componente lo resuelve el cliente (esta capa no importa interfaz).
  icono: string
  // Abrir el aviso (ir a su ruta) da por hecho lo que pedía: se marca accionado, además de leído.
  accionAlAbrir: boolean
  // Cómo se llama el tipo en las preferencias de push y qué avisa (una línea).
  etiqueta: string
  descripcion: string
  // El texto del botón propio del tipo, si lo tiene (lo dibuja el registro de acciones de `app/`).
  textoDeAccion?: string
}

const GENERICO: TipoDeNotificacion = {
  icono: 'Bell',
  accionAlAbrir: false,
  etiqueta: 'Otros avisos',
  descripcion: 'Avisos que no tienen un tipo propio.',
}

// `turno_web` se acciona sólo con `web_confirmar_contacto` (Fase 8) y `limpieza_pronto`, con «Conservar» (otra
// pantalla): abrirlos sólo los marca leídos.
export const TIPOS_DE_NOTIFICACION: Readonly<Record<string, TipoDeNotificacion>> = {
  tarea_asignada: {
    icono: 'ListChecks',
    accionAlAbrir: true,
    etiqueta: 'Tareas',
    descripcion: 'Cuando te asignan una tarea.',
  },
  recordatorio: {
    icono: 'AlarmClock',
    accionAlAbrir: true,
    etiqueta: 'Recordatorios',
    descripcion: 'Cuando llega la hora de un recordatorio tuyo.',
  },
  demora_fase: {
    icono: 'Hourglass',
    accionAlAbrir: true,
    etiqueta: 'Demoras',
    descripcion: 'Cuando una unidad lleva demasiado tiempo en una fase.',
  },
  lead_compartido: {
    icono: 'Share2',
    accionAlAbrir: false,
    etiqueta: 'Leads compartidos',
    descripcion: 'Cuando te comparten un lead.',
  },
  lead_transferido: {
    icono: 'ArrowRightLeft',
    accionAlAbrir: false,
    etiqueta: 'Leads transferidos',
    descripcion: 'Cuando te transfieren un lead.',
  },
  limpieza_pronto: {
    icono: 'Trash2',
    accionAlAbrir: false,
    etiqueta: 'Limpieza',
    descripcion: 'Cuando un vehículo importado se limpiará pronto.',
  },
  turno_web: {
    icono: 'Globe',
    accionAlAbrir: false,
    etiqueta: 'Turnos de la web',
    descripcion: 'Cuando alguien pide un turno desde la web pública.',
  },
  turno_web_perdido: {
    icono: 'GlobeLock',
    accionAlAbrir: false,
    etiqueta: 'Turnos perdidos de la web',
    descripcion: 'Cuando un turno de la web se pierde sin atender.',
  },
  evento: {
    icono: 'CalendarDays',
    accionAlAbrir: false,
    etiqueta: 'Agenda',
    descripcion: 'Cuando algo cambia en un evento de tu agenda.',
  },
  evento_invitacion: {
    icono: 'CalendarPlus',
    accionAlAbrir: false,
    etiqueta: 'Invitaciones',
    descripcion: 'Cuando te invitan a un evento.',
  },
  mensaje: {
    icono: 'MessageSquare',
    accionAlAbrir: false,
    etiqueta: 'Mensajes',
    descripcion: 'Cuando te escriben en el chat.',
  },
}

export function tipoDe(tipo: string): TipoDeNotificacion {
  return Object.hasOwn(TIPOS_DE_NOTIFICACION, tipo)
    ? (TIPOS_DE_NOTIFICACION[tipo] ?? GENERICO)
    : GENERICO
}

// ¿Abrir este aviso lo da por accionado? Sólo si la fila pedía acción y su tipo lo dice.
export function accionaAlAbrir(tipo: string, requiereAccion: boolean): boolean {
  return requiereAccion && tipoDe(tipo).accionAlAbrir
}

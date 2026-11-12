// Los tipos de aviso que escribe la base (`notificaciones.tipo`) y lo que la interfaz hace con cada uno. Un tipo que
// este catálogo no conoce (una fase nueva, un aviso viejo) se dibuja con el genérico: la lista nunca se rompe.

export type TipoDeNotificacion = {
  // El nombre del icono de lucide: el componente lo resuelve el cliente (esta capa no importa interfaz).
  icono: string
  // Abrir el aviso (ir a su ruta) da por hecho lo que pedía: se marca accionado, además de leído.
  accionAlAbrir: boolean
  // El texto del botón propio del tipo, si lo tiene (lo dibuja el registro de acciones de `app/`).
  textoDeAccion?: string
}

const GENERICO: TipoDeNotificacion = { icono: 'Bell', accionAlAbrir: false }

// `turno_web` se acciona sólo con `web_confirmar_contacto` (Fase 8) y `limpieza_pronto`, con «Conservar» (otra
// pantalla): abrirlos sólo los marca leídos.
export const TIPOS_DE_NOTIFICACION: Readonly<Record<string, TipoDeNotificacion>> = {
  tarea_asignada: { icono: 'ListChecks', accionAlAbrir: true },
  recordatorio: { icono: 'AlarmClock', accionAlAbrir: true },
  demora_fase: { icono: 'Hourglass', accionAlAbrir: true },
  lead_compartido: { icono: 'Share2', accionAlAbrir: false },
  lead_transferido: { icono: 'ArrowRightLeft', accionAlAbrir: false },
  limpieza_pronto: { icono: 'Trash2', accionAlAbrir: false },
  turno_web: { icono: 'Globe', accionAlAbrir: false },
  turno_web_perdido: { icono: 'GlobeLock', accionAlAbrir: false },
  evento: { icono: 'CalendarDays', accionAlAbrir: false },
  evento_invitacion: { icono: 'CalendarPlus', accionAlAbrir: false },
  mensaje: { icono: 'MessageSquare', accionAlAbrir: false },
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

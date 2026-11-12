// El estado de los avisos push en ESTE navegador. Puro: quien lo llama junta los hechos (permiso, integración, clave,
// navegador) y esta regla decide, con prioridad, qué se muestra y por qué un interruptor queda deshabilitado.
import {
  AYUDA_INTEGRACION_APAGADA,
  MOTIVO_INTEGRACION_APAGADA,
  MOTIVO_NEGADO,
  MOTIVO_SIN_CLAVE,
  MOTIVO_SIN_PERMISO_PUSH,
  MOTIVO_SIN_SOPORTE,
} from './motivos'

export type EstadoDelPush =
  | 'sin_permiso'
  | 'integracion_apagada'
  | 'sin_clave'
  | 'sin_soporte'
  | 'negado'
  | 'encendido'
  | 'apagado'

export type HechosDelPush = {
  // `puede(permisos, 'notificaciones.push')`.
  tienePermiso: boolean
  // La integración `push_web` de la empresa.
  integracionActiva: boolean
  clavePublica: string | null
  // `serviceWorker`, `PushManager` y `Notification` en este navegador.
  soporte: boolean
  permisoDelNavegador: NotificationPermission
  // Este navegador tiene una suscripción viva.
  suscrito: boolean
}

export type LecturaDelPush = { estado: EstadoDelPush; motivo: string | null; ayuda: string | null }

// El orden es la prioridad: lo que la persona no puede arreglar sola (su rol, la empresa) va antes que lo del navegador.
export function estadoDelPush(hechos: HechosDelPush): LecturaDelPush {
  if (!hechos.tienePermiso) {
    return { estado: 'sin_permiso', motivo: MOTIVO_SIN_PERMISO_PUSH, ayuda: null }
  }
  if (!hechos.integracionActiva) {
    return {
      estado: 'integracion_apagada',
      motivo: MOTIVO_INTEGRACION_APAGADA,
      ayuda: AYUDA_INTEGRACION_APAGADA,
    }
  }
  if (hechos.clavePublica === null || hechos.clavePublica === '') {
    return { estado: 'sin_clave', motivo: MOTIVO_SIN_CLAVE, ayuda: null }
  }
  if (!hechos.soporte) {
    return { estado: 'sin_soporte', motivo: MOTIVO_SIN_SOPORTE, ayuda: null }
  }
  if (hechos.permisoDelNavegador === 'denied') {
    return { estado: 'negado', motivo: MOTIVO_NEGADO, ayuda: null }
  }
  if (hechos.suscrito && hechos.permisoDelNavegador === 'granted') {
    return { estado: 'encendido', motivo: null, ayuda: null }
  }
  return { estado: 'apagado', motivo: null, ayuda: null }
}

// El interruptor del navegador sólo se puede mover en estos dos estados.
export function sePuedeMover(estado: EstadoDelPush): boolean {
  return estado === 'encendido' || estado === 'apagado'
}

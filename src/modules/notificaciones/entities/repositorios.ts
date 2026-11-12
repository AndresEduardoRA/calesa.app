// Lo que `features/` necesita de la base, como interfaces: las implementa `infra/` y las une `composicion.ts`.
import type { Resultado } from '@/shared/lib/errores'
import type { ApagadosDePush } from './preferencia-de-push'
import type { SuscripcionPropia } from './suscripcion'
import type {
  Notificacion,
  PaginaDeNotificaciones,
  PedidoDePagina,
  ResultadoDeMarcado,
} from './notificacion'

export type LectorDePaginaDeNotificaciones = (
  pedido: PedidoDePagina,
) => Promise<Resultado<PaginaDeNotificaciones>>

export type RepositorioDeNotificaciones = {
  // Marca leída (y accionada si `accionar`) la propia, una sola vez; devuelve la fila como quedó.
  abrir(usuarioId: string, id: number, accionar: boolean): Promise<Resultado<Notificacion | null>>
  // Lee la propia por su id (para decidir si abrirla acciona): null si no existe o no es suya.
  leer(usuarioId: string, id: number): Promise<Resultado<Notificacion | null>>
  // Marca leídas las no leídas, por lotes de `LOTE_DE_MARCADO`, hasta `lotes`.
  marcarTodasLeidas(usuarioId: string, lotes: number): Promise<Resultado<ResultadoDeMarcado>>
}

export type NuevaSuscripcion = {
  endpoint: string
  claves: { p256dh: string; auth: string }
  userAgent: string | null
}

// El push de la propia persona: sus navegadores (RPC `push_suscribir` / `push_desuscribir`) y su preferencia por tipo.
export type RepositorioDePush = {
  suscribir(nueva: NuevaSuscripcion): Promise<Resultado<null>>
  // `false` si no era suya o no existía: para quien quita no cambia nada.
  desuscribir(endpoint: string): Promise<Resultado<null>>
  // El jsonb guardado tal cual (`null` = sin fila). Quien lo usa lo valida con `apagadosDesde`.
  leerPreferencia(usuarioId: string): Promise<Resultado<unknown>>
  // `null` borra la fila: vuelve a «todo encendido».
  guardarPreferencia(usuarioId: string, apagados: ApagadosDePush | null): Promise<Resultado<null>>
}

export type LectorDeSuscripciones = (usuarioId: string) => Promise<Resultado<SuscripcionPropia[]>>
export type LectorDeApagadosDePush = (usuarioId: string) => Promise<Resultado<ApagadosDePush>>

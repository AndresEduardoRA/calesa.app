// La campana y «Ver más» de `/notificaciones`, leídos en el navegador (la fila de Realtime es sólo señal: ante ella
// se relee con estas funciones, que pasan por la RLS). Devuelven `Resultado`.
import type { ConteoAcotado } from '@/shared/lib/conteo'
import type { Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import type { PaginaDeNotificaciones } from '../entities/notificacion'
import type { LectorDePaginaDeNotificaciones } from '../entities/repositorios'
import { contarNoLeidas, leerPagina, leerParaLaCampana } from './consultas'

export const leerPaginaDeNotificaciones: LectorDePaginaDeNotificaciones = async (pedido) =>
  leerPagina(createClient(), pedido)

export const contarNotificacionesNoLeidas = (): Promise<Resultado<ConteoAcotado>> =>
  contarNoLeidas(createClient())

export const leerNotificacionesParaLaCampana = (): Promise<Resultado<PaginaDeNotificaciones>> =>
  leerParaLaCampana(createClient())

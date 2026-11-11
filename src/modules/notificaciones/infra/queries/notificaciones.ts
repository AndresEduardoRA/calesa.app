import 'server-only'
import { createClient } from '@/shared/lib/supabase/server'
import type { LectorDePaginaDeNotificaciones } from '../../entities/repositorios'
import { leerPagina } from '../consultas'

// La primera página de `/notificaciones`, en el servidor y bajo la RLS de quien mira.
export const getPaginaDeNotificaciones: LectorDePaginaDeNotificaciones = async (pedido) =>
  leerPagina(await createClient(), pedido)

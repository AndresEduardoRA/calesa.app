import 'server-only'
import { createClient } from '@/shared/lib/supabase/server'
import type { LectorDePaginaDeConversaciones } from '../entities/repositorios'
import { leerPagina } from './consultas'

// La primera página de `/chat`, en el servidor y con la sesión de quien mira.
export const getPaginaDeConversaciones: LectorDePaginaDeConversaciones = async (pedido) =>
  leerPagina(await createClient(), pedido)

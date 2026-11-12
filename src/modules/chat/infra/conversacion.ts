import 'server-only'
import { createClient } from '@/shared/lib/supabase/server'
import type { LectorDeUnaConversacion } from '../entities/repositorios'
import { leerUna } from './consultas'

// La conversación abierta (`?c=`), en el servidor: `null` si no es de quien mira.
export const getConversacion: LectorDeUnaConversacion = async (usuarioId, id) =>
  leerUna(await createClient(), usuarioId, id)

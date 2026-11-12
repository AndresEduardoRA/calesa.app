// La conversación abierta, releída en el navegador (la usa el hilo de la parte 3).
import { createClient } from '@/shared/lib/supabase/browser'
import type { LectorDeUnaConversacion } from '../entities/repositorios'
import { leerUna } from './consultas'

export const leerConversacion: LectorDeUnaConversacion = async (usuarioId, id) =>
  leerUna(createClient(), usuarioId, id)

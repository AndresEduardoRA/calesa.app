// «Ver más» y la relectura tras una señal de Realtime, en el navegador (la fila del canal nunca se pinta).
import { createClient } from '@/shared/lib/supabase/browser'
import type { LectorDePaginaDeConversaciones } from '../entities/repositorios'
import { leerPagina } from './consultas'

export const leerPaginaDeConversaciones: LectorDePaginaDeConversaciones = async (pedido) =>
  leerPagina(createClient(), pedido)

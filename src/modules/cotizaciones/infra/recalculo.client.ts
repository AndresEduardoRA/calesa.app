// El recálculo de la hoja desde el navegador, con la sesión de quien cotiza: `cotizacion_evaluar()` corre con su RLS, comprueba `cotizaciones.crear` del origen y recorta
// lo que su nivel no ve. Va por el cliente del navegador y no por una Server Action: no suma un salto por Next ni vuelve a leer la sesión en cada pausa de tecleo.
import { createClient } from '@/shared/lib/supabase/browser'
import type { Recalculador } from '../entities/repositorios-de-hoja'
import { argumentosDeEvaluar, resultadoDeEvaluar } from '../entities/pedido-de-recalculo'

export const recalcular: Recalculador = async (pedido) =>
  resultadoDeEvaluar(await createClient().rpc('cotizacion_evaluar', argumentosDeEvaluar(pedido)))

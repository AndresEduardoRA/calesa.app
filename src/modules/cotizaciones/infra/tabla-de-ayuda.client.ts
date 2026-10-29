// La tabla de referencia de una ayuda desde el navegador, con la sesión de quien cotiza: `cotizacion_tabla()` con la hoja abierta corre con su RLS y le recorta las filas y
// las columnas que su nivel no ve. Va por el cliente del navegador como el recálculo: se lee cuando se abre el panel, no con la hoja.
import { createClient } from '@/shared/lib/supabase/browser'
import type { LectorDeTablaDeAyuda } from '../entities/repositorios-de-hoja'
import { argumentosDeTabla, resultadoDeTabla } from '../entities/tabla-de-ayuda'

export const leerTablaDeAyuda: LectorDeTablaDeAyuda = async (pedido) =>
  resultadoDeTabla(await createClient().rpc('cotizacion_tabla', argumentosDeTabla(pedido)))

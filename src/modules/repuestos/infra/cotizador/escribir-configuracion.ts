import 'server-only'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  OTRA_CONFIGURACION_PUBLICADA,
  rechazoDeConfiguracion,
  sinFilasDeConfiguracion,
  type EntidadDeConfiguracion,
} from '../../entities/cotizador/errores-de-configuracion'
import {
  COLUMNAS_DE_CAJA,
  COLUMNAS_DE_CONFIGURACION,
  COLUMNAS_DE_TRAMO,
  cajasDesde,
  configuracionesDesde,
  tramosDesde,
} from '../../entities/cotizador/filas-de-configuracion'
import type { RepositorioDeConfiguracion } from '../../entities/cotizador/repositorio'

// La configuración, los tramos y las cajas del cotizador se escriben directo, con el cliente de quien pide, y el límite es la RLS
// (`repuestos.configurar`): no otorgan permisos, la configuración es append-only con `creado_por` verificado por la policy y el solape de tramos lo
// cuida el trigger (8.12-2, D28). Una escritura que la RLS deja en cero filas nunca es éxito: se relee por id para decir «sin permiso» o «ya no existe».
// Los decimales llegan como texto canónico con a lo sumo 15 cifras (los topes de `CAMPOS_DE_CONFIGURACION`): `Number` los lleva al JSON con su forma
// más corta, que es la misma cifra, y la base la lee exacta como `numeric` (D20).
const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

type Cliente = Awaited<ReturnType<typeof createClient>>
type Tabla = 'repuestos_tramos_logistica' | 'repuestos_cajas'

async function sinFilasDe(
  supabase: Cliente,
  tabla: Tabla,
  id: string,
  entidad: EntidadDeConfiguracion,
): Promise<ResultadoDeAccion<never>> {
  const { data, error } = await supabase.from(tabla).select('id').eq('id', id).limit(1)
  if (error) return rechazoDeConfiguracion(error)
  return sinFilasDeConfiguracion(data.length > 0, entidad)
}

// La fila que devolvió la escritura: `undefined` si no tiene la forma esperada, `null` si no volvió ninguna.
function primera<T>(lista: T[] | null): T | null | undefined {
  return lista === null ? undefined : (lista[0] ?? null)
}

export const configuracionSupabase: RepositorioDeConfiguracion = {
  publicar: async ({ factorImportado, recargoLocal, redondeo, vigenteEsperada, creadoPor }) => {
    const supabase = await createClient()
    // D23: un chequeo de buena fe, no atómico. La tabla es append-only: una carrera deja dos filas en el historial y no pierde nada.
    const ultima = await supabase
      .from('repuestos_cotizador_config')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
    if (ultima.error) return rechazoDeConfiguracion(ultima.error)
    if ((ultima.data[0]?.id ?? null) !== vigenteEsperada) {
      return fallo('conflicto', OTRA_CONFIGURACION_PUBLICADA)
    }
    const { data, error } = await supabase
      .from('repuestos_cotizador_config')
      .insert({
        factor_importado: Number(factorImportado),
        recargo_local: Number(recargoLocal),
        redondeo: Number(redondeo),
        creado_por: creadoPor,
      })
      .select(COLUMNAS_DE_CONFIGURACION)
      .limit(1)
    if (error) return rechazoDeConfiguracion(error)
    const fila = primera(configuracionesDesde(data))
    if (fila === undefined) return fallo('inesperado', NO_SE_LEYO)
    return fila === null ? sinFilasDeConfiguracion(true, 'configuracion') : { ok: true, data: fila }
  },
  guardarTramo: async ({ id, moneda, costoMin, costoMax, monto, activo }) => {
    const supabase = await createClient()
    const valores = {
      costo_min: Number(costoMin),
      costo_max: costoMax === null ? null : Number(costoMax),
      monto: Number(monto),
      activo,
    }
    const { data, error } =
      id === null
        ? await supabase
            .from('repuestos_tramos_logistica')
            .insert({ moneda, ...valores })
            .select(COLUMNAS_DE_TRAMO)
            .limit(1)
        : await supabase
            .from('repuestos_tramos_logistica')
            .update(valores)
            .eq('id', id)
            .select(COLUMNAS_DE_TRAMO)
            .limit(1)
    if (error) return rechazoDeConfiguracion(error)
    const fila = primera(tramosDesde(data))
    if (fila === undefined) return fallo('inesperado', NO_SE_LEYO)
    if (fila !== null) return { ok: true, data: fila }
    return id === null
      ? sinFilasDeConfiguracion(true, 'tramo')
      : sinFilasDe(supabase, 'repuestos_tramos_logistica', id, 'tramo')
  },
  guardarCaja: async ({ id, moneda, monto, activa }) => {
    const supabase = await createClient()
    const valores = { monto: Number(monto), activa }
    const { data, error } =
      id === null
        ? await supabase
            .from('repuestos_cajas')
            .insert({ moneda, ...valores })
            .select(COLUMNAS_DE_CAJA)
            .limit(1)
        : await supabase
            .from('repuestos_cajas')
            .update(valores)
            .eq('id', id)
            .select(COLUMNAS_DE_CAJA)
            .limit(1)
    if (error) return rechazoDeConfiguracion(error, { moneda })
    const fila = primera(cajasDesde(data))
    if (fila === undefined) return fallo('inesperado', NO_SE_LEYO)
    if (fila !== null) return { ok: true, data: fila }
    return id === null
      ? sinFilasDeConfiguracion(true, 'caja')
      : sinFilasDe(supabase, 'repuestos_cajas', id, 'caja')
  },
}

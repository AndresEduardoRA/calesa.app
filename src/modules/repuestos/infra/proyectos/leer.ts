import 'server-only'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  COLUMNAS_DE_PROYECTO,
  esIdDeProyecto,
  proyectoDetalladoDesde,
  type ProyectoDetallado,
} from '../../entities/proyectos/detalle'

const NO_SE_LEYO = 'No se pudo cargar el proyecto de repuestos.'

// Un proyecto por su clave (8.09-2, C1), con la sesión de quien mira: la RLS (`repuestos.ver` y no eliminado) decide qué se ve. Nulo = no existe o no se ve: la pantalla no revela
// cuál (D49). Un id que ni es guid no se consulta.
export async function leerProyecto(id: string): Promise<Resultado<ProyectoDetallado | null>> {
  if (!esIdDeProyecto(id)) {
    return ok(null)
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('repuestos_proyectos')
    .select(COLUMNAS_DE_PROYECTO)
    .eq('id', id)
    .maybeSingle()
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  if (data === null) {
    return ok(null)
  }
  const proyecto = proyectoDetalladoDesde(data)
  return proyecto === null ? fallo('inesperado', NO_SE_LEYO) : ok(proyecto)
}

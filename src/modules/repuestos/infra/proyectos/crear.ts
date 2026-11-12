import 'server-only'
import { z } from 'zod'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { createClient } from '@/shared/lib/supabase/server'
import { NO_SE_LEYO_EL_PROYECTO, rechazoDeProyecto } from '../../entities/proyectos/errores'
import type {
  DatosDeProyecto,
  ProyectoCreado,
  RepositorioDeProyectos,
} from '../../entities/proyectos/repositorio'
import { cerrarProyecto, reabrirProyecto } from './cierre'
import { eliminarProyecto, restaurarProyecto } from './eliminar'
import { leerProyectosDelListado } from './listar'

// Crear un proyecto es sólo por RPC (`repuesto_proyecto_crear`, 8.08-1): idempotente por `id`, pide `repuestos.editar` antes de tocar nada y mide si quien crea ve el vehículo o el lead.
// La base devuelve `{id, numero, actualizado_en}`; lo que rechaza vuelve con su mensaje escrito y su `hint` nombra el campo.
const esquemaDeCreado = z.object({
  id: z.guid(),
  numero: z.number().int().positive(),
  actualizado_en: z.string(),
})

// Sólo las claves que acepta `p_datos` (otra: 22023); un campo que no vino no se manda.
function datosParaLaBase(datos: DatosDeProyecto) {
  return {
    ...(datos.vehiculoId !== undefined && { vehiculo_id: datos.vehiculoId }),
    ...(datos.vehiculoEtiqueta !== undefined && { vehiculo_etiqueta: datos.vehiculoEtiqueta }),
    ...(datos.vin !== undefined && { vin: datos.vin }),
    ...(datos.leadId !== undefined && { lead_id: datos.leadId }),
    ...(datos.clienteNombre !== undefined && { cliente_nombre: datos.clienteNombre }),
    ...(datos.clienteTelefono !== undefined && { cliente_telefono: datos.clienteTelefono }),
    ...(datos.notas !== undefined && { notas: datos.notas }),
  }
}

async function crear({
  id,
  datos,
}: {
  id: string
  datos: DatosDeProyecto
}): Promise<ResultadoDeAccion<ProyectoCreado>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('repuesto_proyecto_crear', {
    p_id: id,
    p_datos: datosParaLaBase(datos),
  })
  if (error) {
    return rechazoDeProyecto(error)
  }
  const leido = esquemaDeCreado.safeParse(data)
  if (!leido.success) {
    return { ok: false, error: { codigo: 'inesperado', mensaje: NO_SE_LEYO_EL_PROYECTO } }
  }
  return {
    ok: true,
    data: {
      id: leido.data.id,
      numero: leido.data.numero,
      actualizadoEn: leido.data.actualizado_en,
    },
  }
}

export const proyectosSupabase: RepositorioDeProyectos = {
  listar: leerProyectosDelListado,
  crear,
  cerrar: cerrarProyecto,
  reabrir: reabrirProyecto,
  eliminar: eliminarProyecto,
  restaurar: restaurarProyecto,
}

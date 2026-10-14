'use server'

import { revalidatePath } from 'next/cache'
import { leerLayout } from '@/modules/origenes'
import { fallo, ok } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { leerSubasta, leerVehiculo, repositorioVehiculos } from '../../../composicion'
import { camposActivos } from '../../../entities/campo'
import { camposComunes } from '../../../entities/comunes'
import { datosDesdeSubasta, type ColumnasDeSubasta } from '../../../entities/subasta'
import {
  etiquetasDeConservados,
  fusionarRefresco,
  type DatosActuales,
} from '../../../entities/subasta-refresco'
import type { Vehiculo } from '../../../entities/vehiculo'
import { esquemaRefrescarSubasta } from '../schemas/ficha'

// Lo que el vehículo tiene hoy de lo que apibara llena como columna (lo vacío no cuenta).
function columnasActuales(vehiculo: Vehiculo): ColumnasDeSubasta {
  const columnas: ColumnasDeSubasta = {}
  if (vehiculo.titulo) columnas.titulo = vehiculo.titulo
  if (vehiculo.marca) columnas.marca = vehiculo.marca
  if (vehiculo.modelo) columnas.modelo = vehiculo.modelo
  if (vehiculo.anio !== null) columnas.anio = vehiculo.anio
  if (vehiculo.vin) columnas.vin = vehiculo.vin
  if (vehiculo.lote) columnas.lote = vehiculo.lote
  if (vehiculo.plataforma) columnas.plataforma = vehiculo.plataforma
  if (vehiculo.kilometraje !== null) columnas.kilometraje = vehiculo.kilometraje
  if (vehiculo.urlOrigen) columnas.url_origen = vehiculo.urlOrigen
  return columnas
}

// Cómo se llama en la pantalla cada columna que apibara llena (por su nombre en la base).
const COLUMNA_A_COMUN: Record<string, string> = {
  titulo: 'titulo',
  marca: 'marca',
  modelo: 'modelo',
  anio: 'anio',
  vin: 'vin',
  lote: 'lote',
  plataforma: 'plataforma',
  kilometraje: 'kilometraje',
  url_origen: 'urlOrigen',
}

// Vuelve a escribir la subasta de un vehículo con una respuesta nueva. La fecha, el estado y el
// bruto siempre se actualizan; del resto sólo lo que la persona no editó (`fusionarRefresco`: el
// bruto anterior es el testigo). El permiso se comprueba acá y de nuevo en la RPC, que además
// compara la versión: si alguien editó mientras tanto, es un conflicto y no se pisa nada.
export const refrescarSubasta = actionClient
  .inputSchema(esquemaRefrescarSubasta)
  .action(async ({ parsedInput, ctx }) => {
    const { vehiculoId, actualizadoEnEsperado, ficha } = parsedInput
    const leido = await leerVehiculo(vehiculoId)
    if (!leido.ok) {
      return leido
    }
    const vehiculo = leido.data
    if (!vehiculo) {
      return fallo('no_encontrado', 'Ese vehículo ya no existe o no tienes acceso.')
    }
    if (!puede(ctx.permisos, 'vehiculos.editar', vehiculo.origenId)) {
      return fallo('sin_permiso', 'No tienes permiso para editar este vehículo.')
    }
    const [subasta, layout] = await Promise.all([
      leerSubasta(vehiculoId),
      leerLayout(vehiculo.origenId, { conUso: false }),
    ])
    if (!subasta.ok) {
      return subasta
    }
    if (!layout.ok) {
      return layout
    }
    const campos = camposActivos(layout.data.campos)
    // Lo que había dicho apibara la vez anterior contra lo que dice ahora y lo que hay guardado.
    const previo = datosDesdeSubasta(subasta.data?.raw ?? {}, campos, null)
    const nuevo = datosDesdeSubasta(ficha, campos, null)
    const actual: DatosActuales = {
      columnas: columnasActuales(vehiculo),
      atributos: vehiculo.atributos,
    }
    const refresco = fusionarRefresco(previo, nuevo, actual)

    const escrito = await repositorioVehiculos.refrescarSubasta({
      id: vehiculoId,
      actualizadoEnEsperado,
      apibara: ficha,
      columnas: refresco.columnas,
      atributos: refresco.atributos,
    })
    if (!escrito.ok) {
      return { ok: false as const, error: escrito.error }
    }
    revalidatePath(RUTAS.vehiculos)
    revalidatePath(`${RUTAS.vehiculos}/${vehiculoId}`)

    const comunes = Object.fromEntries(
      camposComunes('subasta').map((comun) => [comun.clave, comun.etiqueta]),
    )
    const columnas = Object.fromEntries(
      Object.entries(COLUMNA_A_COMUN).flatMap(([columna, clave]) => {
        const etiqueta = comunes[clave]
        return etiqueta === undefined ? [] : [[columna, etiqueta]]
      }),
    )
    return ok({
      actualizadoEn: escrito.data.actualizadoEn,
      estado: escrito.data.estado,
      conservados: etiquetasDeConservados(refresco.conservados, { columnas, campos }),
      actualizados: Object.keys(refresco.columnas).length + Object.keys(refresco.atributos).length,
    })
  })

'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeConfiguracion } from '../../../areas/cotizador/composicion'
import { fraccionDesdePorcentaje } from '../../../entities/cotizador/configuracion'
import { SIN_PERMISO_PARA_EL_COTIZADOR } from '../../../entities/cotizador/errores-de-configuracion'
import type { ConfiguracionDelCotizador } from '../../../entities/cotizador/filas-de-configuracion'
import { esquemaPublicarConfiguracion } from '../schemas/configuracion'

// Publica una configuración nueva del cotizador (8.12-2, C5): agrega una fila (append-only) a nombre de quien pide. Sólo cambia las cotizaciones
// que se creen después (el snapshot). El permiso se mira antes de escribir; lo que protege es la RLS (`creado_por` y `repuestos.configurar`).
export const publicarConfiguracion = actionClient
  .inputSchema(esquemaPublicarConfiguracion)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<ConfiguracionDelCotizador>> => {
    if (!puede(ctx.permisos, 'repuestos.configurar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_EL_COTIZADOR)
    }
    const hecho = await repositorioDeConfiguracion.publicar({
      factorImportado: parsedInput.factorImportado,
      recargoLocal: fraccionDesdePorcentaje(parsedInput.recargoLocal),
      redondeo: parsedInput.redondeo,
      vigenteEsperada: parsedInput.vigenteEsperada,
      creadoPor: ctx.usuarioId,
    })
    if (hecho.ok) revalidatePath(RUTAS.configuracionDeRepuestos)
    return hecho
  })

'use server'

import { z } from 'zod'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { cumpleElMinimo } from '@/shared/lib/filtros'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeProyectos } from '../../../areas/proyectos/composicion'
import {
  MINIMO_DE_BUSQUEDA_DE_PROYECTOS,
  vehiculoDeLaFila,
} from '../../../entities/proyectos/listado'

// Una opción del buscador de proyecto destino: sólo lo que se muestra viaja al navegador.
export type OpcionDeProyecto = { id: string; titulo: string; apoyo?: string }

const esquema = z.object({ texto: z.string().trim().max(100), excluir: z.guid() })

// Los proyectos abiertos que quien mira ve (la RLS decide), por número, vehículo o cliente, para reasignar el stock (8.10-3, C5). Una página de `TAMANO_DE_VER_MAS` sin
// cursor; con menos del mínimo, ninguna lectura. Pide `repuestos.editar` (sólo la usa reasignar): no abre una lectura nueva a quien sólo ve.
export const buscarProyectosAbiertos = actionClient
  .inputSchema(esquema)
  .action(async ({ parsedInput, ctx }): Promise<Resultado<OpcionDeProyecto[]>> => {
    if (!puede(ctx.permisos, 'repuestos.editar')) {
      return fallo('sin_permiso', 'No tienes permiso para reasignar el stock.')
    }
    const { texto, excluir } = parsedInput
    if (!cumpleElMinimo(texto, MINIMO_DE_BUSQUEDA_DE_PROYECTOS)) {
      return ok([])
    }
    const leido = await repositorioDeProyectos.listar({
      cursor: null,
      tamano: TAMANO_DE_VER_MAS,
      q: texto,
      estado: 'abiertos',
    })
    if (!leido.ok) return leido
    return ok(
      leido.data.filas
        .filter((f) => f.id !== excluir)
        .map((f) => ({
          id: f.id,
          titulo: `#${String(f.numero)} · ${vehiculoDeLaFila(f).titulo}`,
          ...(f.clienteNombre ? { apoyo: f.clienteNombre } : {}),
        })),
    )
  })

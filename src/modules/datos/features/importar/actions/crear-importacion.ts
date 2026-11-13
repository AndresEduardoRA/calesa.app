'use server'

import { after } from 'next/server'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import {
  crearImportacionTotal,
  despertarImportacion,
  pedirPaseParaImportar,
} from '../../../composicion'
import { esquemaCrearImportacion } from '../schemas/importacion'
import { avisoDeEspera, crearConPermiso, type ImportacionCreada } from './crear'

// Crea la importación total después de que el navegador subió el archivo normalizado (9.06-4). El permiso se mira acá y de nuevo en
// `importacion_crear`; despertar `importar-csv` va en `after()`: nadie espera los 45 s, y un fallo lo retoma el job `importaciones-continuar`.
// Sin `revalidatePath`: la lista «Importaciones» y el avance se leen en el navegador y se recargan solos (D56 de 9.06-5).
export const crearImportacion = actionClient
  .inputSchema(esquemaCrearImportacion)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<ImportacionCreada>> =>
    crearConPermiso(ctx, parsedInput, {
      crear: (pedido) => crearImportacionTotal(ctx.supabase, pedido),
      pedirPase: (id) => pedirPaseParaImportar(ctx.supabase, id),
      despertar: (pase, id) => {
        after(async () => {
          const despierta = await despertarImportacion(pase)
          if (!despierta.ok) {
            console.warn(avisoDeEspera(id))
          }
        })
      },
    }),
  )

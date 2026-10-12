'use client'

import { useAction } from 'next-safe-action/hooks'
import type { z } from 'zod'
import { conRed, resultadoDeAccion } from '@/shared/lib/formularios'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { crearMoneda } from '../actions/crear-moneda'
import { crearTipoCambio } from '../actions/crear-tipo-cambio'
import { guardarMoneda } from '../actions/guardar-moneda'
import { guardarTipoCambio } from '../actions/guardar-tipo-cambio'
import type {
  esquemaCrearMoneda,
  esquemaCrearTipoCambio,
  esquemaGuardarMoneda,
  esquemaGuardarTipoCambio,
} from '../schemas/tipos-cambio'

type Hecho = { ok: boolean }

// Un error de validación ya está escrito al lado de su campo; el resto se avisa.
function cerrar(resultado: ReturnType<typeof resultadoDeAccion>, exito: string): Hecho {
  if (resultado.ok) {
    avisarExito(exito)
  } else if (resultado.error.codigo !== 'validacion') {
    avisarError(resultado.error)
  }
  return { ok: resultado.ok }
}

// Las cuatro ediciones de la pestaña «Monedas», cada una con su estado. Lo tipeado queda siempre:
// si una falla (también por falta de conexión), el panel sigue abierto.
export function useTiposCambio() {
  const creando = useAction(crearTipoCambio)
  const guardando = useAction(guardarTipoCambio)
  const creandoMoneda = useAction(crearMoneda)
  const guardandoMoneda = useAction(guardarMoneda)

  return {
    crear: async (nuevo: z.input<typeof esquemaCrearTipoCambio>) =>
      cerrar(
        resultadoDeAccion(await conRed(creando.executeAsync(nuevo))),
        `Tipo de cambio «${nuevo.nombre.trim()}» creado`,
      ),
    guardar: async (edicion: z.input<typeof esquemaGuardarTipoCambio>, nombre: string) =>
      cerrar(
        resultadoDeAccion(await conRed(guardando.executeAsync(edicion))),
        `Tipo de cambio «${nombre}» guardado`,
      ),
    crearMoneda: async (nueva: z.input<typeof esquemaCrearMoneda>) =>
      cerrar(
        resultadoDeAccion(await conRed(creandoMoneda.executeAsync(nueva))),
        `Moneda ${nueva.codigo.trim().toUpperCase()} creada`,
      ),
    guardarMoneda: async (edicion: z.input<typeof esquemaGuardarMoneda>) =>
      cerrar(
        resultadoDeAccion(await conRed(guardandoMoneda.executeAsync(edicion))),
        `Moneda ${edicion.codigo} guardada`,
      ),
    enCurso:
      creando.isPending ||
      guardando.isPending ||
      creandoMoneda.isPending ||
      guardandoMoneda.isPending,
    errores: {
      crear: creando.result.validationErrors?.fieldErrors,
      guardar: guardando.result.validationErrors?.fieldErrors,
      crearMoneda: creandoMoneda.result.validationErrors?.fieldErrors,
      guardarMoneda: guardandoMoneda.result.validationErrors?.fieldErrors,
    },
  }
}

export type EdicionesDeTiposCambio = ReturnType<typeof useTiposCambio>

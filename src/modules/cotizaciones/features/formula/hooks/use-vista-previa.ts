'use client'

import { useMemo } from 'react'
import type { Formula } from '../../../entities/formula'
import { clavesDeCambioDe, tablasVivasDe } from '../../../entities/formula/terreno-de-prueba'
import { calcularLaVistaPrevia, type VistaPrevia } from '../../../entities/formula/vista-previa'
import { validarFormula } from '../../../entities/validar'
import type { RechazoEnElEditor } from './use-editor-de-la-formula'
import {
  filaDelRechazo,
  paramsPlanos,
  type FilaParaDibujar,
} from './use-editor-de-la-formula.soporte'
import { useTerrenoDePrueba } from './use-terreno-de-prueba'

// La validación y la vista previa de la fórmula de trabajo del editor (4.21-3a-2): `validarFormula()` una vez por fórmula de trabajo (el rechazo va a su fila y, si valida,
// la fórmula calcula la vista previa), lo de prueba que se lee una vez por conjunto de lo que la fórmula nombra, y `evaluar()` una vez por cambio aplicado: nunca al tipear.
export function useVistaPrevia({
  origenId,
  trabajo,
  filas,
}: {
  origenId: string
  trabajo: Formula
  filas: readonly FilaParaDibujar[]
}) {
  const validacion = useMemo((): { rechazo: RechazoEnElEditor | null; formula: Formula | null } => {
    const v = validarFormula(trabajo.definicion, paramsPlanos(trabajo))
    return v.ok
      ? { rechazo: null, formula: v.formula }
      : {
          rechazo: { mensaje: v.error.mensaje, filaId: filaDelRechazo(v.error, filas) },
          formula: null,
        }
  }, [trabajo, filas])
  const tablas = useMemo(() => tablasVivasDe(trabajo), [trabajo])
  const cambios = useMemo(() => clavesDeCambioDe(trabajo), [trabajo])
  const lectura = useTerrenoDePrueba({ origenId, tablas, cambios })
  const vista = useMemo((): VistaPrevia | null => {
    return lectura.estado.tipo === 'lista'
      ? calcularLaVistaPrevia(validacion.formula, lectura.estado.terreno)
      : null
  }, [validacion, lectura.estado])
  return {
    rechazo: validacion.rechazo,
    lectura: lectura.estado,
    reintentarLaLectura: lectura.reintentar,
    vista,
  }
}

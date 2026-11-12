'use client'

import { useState } from 'react'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import type { DeclaracionLeida } from '../../../entities/aduana/declaracion'
import {
  borradorDeDeclaracion,
  borradorNuevoDeDeclaracion,
  cambiosDeDeclaracion,
  validarDeclaracion,
  type BorradorDeDeclaracion,
  type DeclaracionGuardada,
} from '../../../entities/aduana/escritura'
import { useEnvioDeDeclaracion } from './use-envio-de-declaracion'

type Args = {
  // Nulo = «Nueva declaración».
  original: DeclaracionLeida | null
  alGuardar: (guardada: DeclaracionGuardada) => void
}

// El estado del formulario de una declaración: el borrador (en `sessionStorage`, uno por declaración) y el motivo junto a cada campo; el envío es de `useEnvioDeDeclaracion`. Con
// «Recargar» tras un conflicto la declaración nueva llega como `original` y lo tipeado se queda: se compara contra la versión nueva.
export function useFormularioDeDeclaracion({ original, alGuardar }: Args) {
  const [inicial] = useState<BorradorDeDeclaracion>(() =>
    original ? borradorDeDeclaracion(original) : borradorNuevoDeDeclaracion(),
  )
  const [valores, setValores] = useState<BorradorDeDeclaracion>(inicial)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [aviso, setAviso] = useState<string | null>(null)

  function escribir(cambios: Partial<BorradorDeDeclaracion>) {
    setAviso(null)
    setValores((antes) => ({ ...antes, ...cambios }))
    setErrores((antes) => {
      const resto = { ...antes }
      for (const clave of Object.keys(cambios)) {
        delete resto[clave]
      }
      return resto
    })
  }

  const borrador = useBorradorDeEstado({
    clave: `declaracion-${original?.id ?? 'nueva'}`,
    valores,
    guardado: inicial,
    alReponer: (cambios) => {
      setValores((antes) => ({ ...antes, ...cambios }))
    },
  })
  const envio = useEnvioDeDeclaracion({
    original,
    alGuardar: (guardada) => {
      borrador.limpiar()
      alGuardar(guardada)
    },
    alRechazarCampos: setErrores,
  })

  async function enviar(): Promise<boolean> {
    if (envio.conflicto !== null || envio.enCurso) {
      return false
    }
    const validado = validarDeclaracion(valores)
    if (!validado.ok) {
      setErrores(validado.errores)
      return false
    }
    const cambios = cambiosDeDeclaracion(original, validado.datos)
    if (cambios === null) {
      setAviso('No hay nada que guardar.')
      return false
    }
    return envio.mandar(cambios)
  }

  return {
    valores,
    errores,
    aviso: aviso ?? envio.aviso,
    conflicto: envio.conflicto,
    enCurso: envio.enCurso,
    // Cerrar ahora perdería lo escrito: el drawer pregunta antes de salir por un aviso.
    hayCambios: JSON.stringify(valores) !== JSON.stringify(inicial),
    escribir,
    enviar,
    descartarBorrador: borrador.limpiar,
  }
}

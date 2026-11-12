'use client'

import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import type { DeclaracionLeida } from '../../../entities/aduana/declaracion'
import type { CambiosDeDeclaracion, DeclaracionGuardada } from '../../../entities/aduana/escritura'
import { guardarDeclaracion } from '../actions/guardar-declaracion'

type Args = {
  // Nulo = «Nueva declaración».
  original: DeclaracionLeida | null
  // Se guardó (o no había nada distinto): la persona vuelve al resumen de esa declaración.
  alGuardar: (guardada: DeclaracionGuardada) => void
  // La base rechazó campos concretos: el motivo junto a cada uno.
  alRechazarCampos: (porCampo: Record<string, string>) => void
}

const MENSAJE_DE_VALIDACION = 'Revisa los datos de la declaración.'
const SIN_RED = 'No pudimos llegar al servidor. Lo que escribiste sigue acá: vuelve a intentar.'

// El envío de una declaración (6.09-2): crear o corregir por su Server Action con la versión que se leyó. Un conflicto espera «Recargar» (guarda la versión con la que chocó: si la
// declaración que llega es otra, el conflicto ya no vale); un rechazo de la base se dice junto al campo o arriba del formulario.
export function useEnvioDeDeclaracion({ original, alGuardar, alRechazarCampos }: Args) {
  const [aviso, setAviso] = useState<string | null>(null)
  const [choque, setChoque] = useState<{ mensaje: string; version: string | null } | null>(null)
  const [enCurso, setEnCurso] = useState(false)
  const version = original?.actualizadoEn ?? null

  async function mandar(datos: CambiosDeDeclaracion): Promise<boolean> {
    setAviso(null)
    setEnCurso(true)
    const envio = await enviarAccion(
      guardarDeclaracion({
        id: original?.id ?? null,
        actualizadoEnEsperado: version,
        datos,
      }),
      MENSAJE_DE_VALIDACION,
    )
    setEnCurso(false)
    if (envio.ok) {
      avisarExito(original ? 'Declaración guardada.' : 'Declaración creada.')
      alGuardar(envio.data)
      return true
    }
    if ('sinRed' in envio) {
      setAviso(SIN_RED)
    } else if (envio.error.codigo === 'conflicto') {
      setChoque({ mensaje: envio.error.mensaje, version })
    } else if ('porCampo' in envio && envio.porCampo && Object.keys(envio.porCampo).length > 0) {
      alRechazarCampos(envio.porCampo)
    } else {
      setAviso(envio.error.mensaje)
    }
    return false
  }

  return {
    mandar,
    aviso,
    enCurso,
    // Sólo vale mientras la declaración sea la misma con la que se chocó.
    conflicto: choque !== null && choque.version === version ? choque.mensaje : null,
  }
}

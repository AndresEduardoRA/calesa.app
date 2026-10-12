'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { conRed, resultadoDeAccion } from '@/shared/lib/formularios'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import {
  descartarIconos,
  dibujarIconos,
  subirIconos,
  type IconoDibujado,
} from '../../../composicion.client'
import { colorDeFondo, type FondoDeIcono, type Iconos } from '../../../entities/iconos'
import { guardarIconos } from '../actions/guardar-iconos'
import { guardarIconosRegenerados } from '../regenerar-iconos'

type Opciones = {
  // URL pública del logo guardado, o null si la empresa no cargó uno.
  logoUrl: string | null
  colorAcento: string | null
  // Los íconos guardados hoy, o null si valen los neutros.
  iconos: Iconos | null
  actualizadoEn: string
}

// «Regenerar íconos»: se dibujan en el navegador y quedan a la vista; recién al confirmar se
// suben y se guardan (commit diferido). Si algo falla, no queda nada a medias.
export function useIconos({ logoUrl, colorAcento, iconos, actualizadoEn }: Opciones) {
  const { executeAsync, isPending } = useAction(guardarIconos)
  const [dibujados, setDibujados] = useState<IconoDibujado[] | null>(null)
  const [trabajando, setTrabajando] = useState(false)

  async function dibujar(fondo: FondoDeIcono): Promise<void> {
    if (!logoUrl) {
      return
    }
    setTrabajando(true)
    const resultado = await dibujarIconos(logoUrl, colorDeFondo(fondo, colorAcento))
    setTrabajando(false)
    if (resultado.ok) {
      setDibujados(resultado.data)
    } else {
      avisarError(resultado.error)
    }
  }

  async function guardar(nuevos: IconoDibujado[] | null, exito: string): Promise<void> {
    setTrabajando(true)
    const resultado = await guardarIconosRegenerados(
      {
        subir: subirIconos,
        descartar: descartarIconos,
        guardar: async (rutas) =>
          resultadoDeAccion(
            await conRed(executeAsync({ iconos: rutas, actualizadoEnEsperado: actualizadoEn })),
          ),
      },
      { dibujados: nuevos, anteriores: iconos },
    )
    setTrabajando(false)
    if (!resultado.ok) {
      avisarError(resultado.error)
      return
    }
    setDibujados(null)
    avisarExito(exito)
  }

  return {
    // Lo dibujado y todavía sin guardar.
    dibujados,
    dibujar,
    confirmar: () => (dibujados ? guardar(dibujados, 'Íconos de la app guardados') : undefined),
    descartar: () => {
      setDibujados(null)
    },
    volverALosNeutros: () => guardar(null, 'La app vuelve a usar los íconos neutros'),
    enCurso: trabajando || isPending,
  }
}

'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState, type RefObject } from 'react'
import { conRed, enfocarPrimerError, resultadoDeAccion, valoresDe } from '@/shared/lib/formularios'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { descartarLogo, subirLogo, type LogoListo } from '../../../composicion.client'
import { guardarAjustes } from '../actions/guardar-ajustes'
import { guardarConLogo, type CambioDeLogo } from '../guardar-con-logo'
import type { EntradaDeAjustes } from '../schemas/ajustes'

// Los campos de texto del formulario, por su `name`. Son también los que entran al borrador.
export const CAMPOS_DE_AJUSTES = [
  'nombre',
  'colorAcento',
  'razonSocial',
  'nit',
  'direccion',
  'ciudad',
  'telefono',
  'whatsapp',
  'email',
  'pais',
  'locale',
  'zonaHoraria',
  'monedaBase',
  'papeleraDias',
  'actividadDias',
  'limpiezaDiasGracia',
] as const

export type LogoElegido = CambioDeLogo<LogoListo>

type Opciones = {
  // Lo guardado al abrir la pantalla.
  logoRuta: string | null
  actualizadoEn: string
  // Con datos cargados la moneda base no viaja: el campo está deshabilitado.
  conDatosCargados: boolean
  formulario: RefObject<HTMLFormElement | null>
  alGuardar: () => void
}

// Guardar los ajustes: el logo nuevo se sube recién acá (commit diferido) y, si la fila no se
// guarda, se descarta. Lo tipeado queda siempre: si algo falla, el foco va al primer error.
export function useGuardarAjustes(opciones: Opciones) {
  const { logoRuta, actualizadoEn, conDatosCargados, formulario, alGuardar } = opciones
  const { executeAsync, result, isPending } = useAction(guardarAjustes)
  const [subiendo, setSubiendo] = useState(false)

  async function guardar(
    logo: LogoElegido,
    interruptores: { registroAbierto: boolean; limpiezaAutomatica: boolean },
  ): Promise<void> {
    const elemento = formulario.current
    if (!elemento) {
      return
    }
    const valores = valoresDe(elemento, CAMPOS_DE_AJUSTES)
    const entrada: Omit<EntradaDeAjustes, 'logoRuta'> = {
      ...valores,
      monedaBase: conDatosCargados ? undefined : valores.monedaBase,
      papeleraDias: Number(valores.papeleraDias),
      actividadDias: Number(valores.actividadDias),
      limpiezaDiasGracia: Number(valores.limpiezaDiasGracia),
      ...interruptores,
      actualizadoEnEsperado: actualizadoEn,
    }
    setSubiendo(true)
    const resultado = await guardarConLogo(
      {
        subir: subirLogo,
        descartar: descartarLogo,
        guardar: async (nuevaRuta) =>
          resultadoDeAccion(await conRed(executeAsync({ ...entrada, logoRuta: nuevaRuta }))),
      },
      { cambio: logo, rutaGuardada: logoRuta },
    )
    setSubiendo(false)
    if (!resultado.ok) {
      // Un error de validación ya está escrito al lado de su campo.
      if (resultado.error.codigo !== 'validacion') {
        avisarError(resultado.error)
      }
      enfocarPrimerError(elemento)
      return
    }
    avisarExito('Ajustes de la empresa guardados')
    alGuardar()
  }

  return {
    guardar,
    enCurso: subiendo || isPending,
    errores: result.validationErrors?.fieldErrors,
  }
}

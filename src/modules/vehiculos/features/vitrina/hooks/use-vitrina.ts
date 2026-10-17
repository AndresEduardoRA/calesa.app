'use client'

import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { conRed } from '@/shared/lib/formularios'
import { avisarExito } from '@/shared/ui/toasts'
import { useEnLinea } from '@/shared/ui/use-en-linea'
import type { Vehiculo } from '../../../entities/vehiculo'
import {
  validarVitrina,
  valoresDeVitrina,
  type CampoDeVitrina,
  type DatosDeVitrina,
  type ValoresDeVitrina,
} from '../../../entities/vitrina'
import { MENSAJE_DE_VALIDACION } from '../../alta/resultado'
import { publicarEnVitrina } from '../actions/publicar-en-vitrina'

type PorCampo = Partial<Record<CampoDeVitrina, string>>

function dicho(antes: boolean, datos: DatosDeVitrina): string {
  if (datos.publicado) {
    return antes ? 'Publicación guardada' : 'Publicado en la web'
  }
  return antes ? 'Quitado de la web' : 'Precio público guardado'
}

// El formulario de publicar: lo que la persona escribe, lo que no pasa (junto a su campo), el
// conflicto con otra persona y la conexión. Si el envío no sale, lo escrito queda.
export function useVitrina(vehiculo: Vehiculo, alGuardar: () => void) {
  const publicando = useAction(publicarEnVitrina)
  const enLinea = useEnLinea()
  const [valores, setValores] = useState<ValoresDeVitrina>(() => valoresDeVitrina(vehiculo))
  const [porCampo, setPorCampo] = useState<PorCampo>({})
  const [conflicto, setConflicto] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  function cambiar(cambios: Partial<ValoresDeVitrina>) {
    setValores((actuales) => ({ ...actuales, ...cambios }))
  }

  async function guardar() {
    const validacion = validarVitrina(valores)
    setAviso(null)
    setConflicto(null)
    if (!validacion.ok) {
      setPorCampo(validacion.porCampo)
      return
    }
    setPorCampo({})
    const respuesta = await conRed(
      publicando.executeAsync({
        vehiculoId: vehiculo.id,
        actualizadoEnEsperado: vehiculo.actualizadoEn,
        ...validacion.datos,
      }),
    )
    if (respuesta.serverError) {
      setAviso(respuesta.serverError.mensaje)
      return
    }
    const resultado = respuesta.data
    if (!resultado) {
      setAviso(MENSAJE_DE_VALIDACION)
      return
    }
    if (resultado.ok) {
      avisarExito(dicho(vehiculo.publicadoWeb, validacion.datos))
      alGuardar()
      return
    }
    if (resultado.error.codigo === 'conflicto') {
      setConflicto(resultado.error.mensaje)
    } else if (resultado.porCampo) {
      setPorCampo(resultado.porCampo)
    } else {
      setAviso(resultado.error.mensaje)
    }
  }

  return {
    valores,
    // Algo escrito que todavía no se guardó (un aviso que sale de la pantalla pregunta antes de irse).
    hayCambios: JSON.stringify(valores) !== JSON.stringify(valoresDeVitrina(vehiculo)),
    cambiar,
    guardar,
    porCampo,
    conflicto,
    aviso,
    enLinea,
    enCurso: publicando.isPending,
  }
}

'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { Bloque } from '@/shared/ui/bloque'
import { Opciones } from '@/shared/ui/opciones'
import { avisarError } from '@/shared/ui/toasts'
import { CLAVE_DE_VISTOS, DIAS_DE_VISTOS, type PreferenciaDeVistos } from '../../../entities/vistos'
import { guardarPreferencia } from '../../perfil/actions/guardar-preferencia'
import { usePreferenciaDeVistos } from './proveedor-de-vistos'

const SI_NO = [
  { valor: 'si', etiqueta: 'Sí' },
  { valor: 'no', etiqueta: 'No' },
] as const

const OPCIONES_DE_DIAS = DIAS_DE_VISTOS.map((dias) => ({
  valor: String(dias),
  etiqueta: dias === 365 ? '1 año' : `${String(dias)} días`,
}))

// «Vistos» en `/perfil`: si las listas marcan lo que abriste, cuánto se recuerda y si se marca el último. Se aplica al instante (optimista) y
// se guarda en `preferencias_usuario.vistos`; si no se guarda, vuelve a lo de antes y lo dice.
export function VistosDelPerfil() {
  const guardada = usePreferenciaDeVistos()
  const [actual, setActual] = useState<PreferenciaDeVistos>(guardada)
  const { executeAsync, isPending } = useAction(guardarPreferencia)
  const router = useRouter()

  async function cambiar(cambio: Partial<PreferenciaDeVistos>) {
    const anterior = actual
    const nueva = { ...actual, ...cambio }
    setActual(nueva)
    const envio = await enviarAccion(
      executeAsync({ clave: CLAVE_DE_VISTOS, valor: nueva }),
      'No se pudo guardar tu preferencia.',
    )
    if (envio.ok) {
      router.refresh()
    } else {
      setActual(anterior)
      avisarError(envio.error)
    }
  }

  return (
    <Bloque
      titulo="Vistos"
      descripcion="Las listas marcan lo que abriste en cada módulo, como los enlaces visitados."
    >
      <Opciones
        etiqueta="Marcar lo que abrí"
        opciones={SI_NO}
        valor={actual.activado ? 'si' : 'no'}
        deshabilitado={isPending}
        alCambiar={(valor) => void cambiar({ activado: valor === 'si' })}
      />
      <Opciones
        etiqueta="Recordarlo durante"
        opciones={OPCIONES_DE_DIAS}
        valor={String(actual.dias)}
        deshabilitado={isPending || !actual.activado}
        alCambiar={(valor) => {
          const dias = DIAS_DE_VISTOS.find((uno) => String(uno) === valor)
          if (dias !== undefined) void cambiar({ dias })
        }}
      />
      <Opciones
        etiqueta="Marcar el último que abrí"
        opciones={SI_NO}
        valor={actual.ultimo ? 'si' : 'no'}
        deshabilitado={isPending || !actual.activado}
        alCambiar={(valor) => void cambiar({ ultimo: valor === 'si' })}
      />
    </Bloque>
  )
}

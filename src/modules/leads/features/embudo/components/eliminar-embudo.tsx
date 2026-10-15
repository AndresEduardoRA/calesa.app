'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Confirmar } from '@/shared/ui/confirmar'
import { avisarExito } from '@/shared/ui/toasts'
import type { Embudo } from '../../../entities/embudo'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { eliminarEmbudo } from '../actions/eliminar-embudo'

// «Eliminar embudo» (irreversible: pide confirmar y nombra el embudo). Sólo sin oportunidades; si las
// tiene, la base lo dice dentro del diálogo. El de por defecto no se elimina: lo dice en su lugar.
export function EliminarEmbudo({ embudo, alTerminar }: { embudo: Embudo; alTerminar: () => void }) {
  const router = useRouter()
  const eliminar = useAction(eliminarEmbudo)
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (embudo.esDefault) {
    return (
      <p className="text-(length:--text-xs) text-(--color-ink-soft)">
        Es tu embudo por defecto: no se elimina, pero puedes renombrarlo.
      </p>
    )
  }

  async function confirmar() {
    const envio = await enviarAccion(
      eliminar.executeAsync({ id: embudo.id, actualizadoEnEsperado: embudo.actualizadoEn }),
      MENSAJE_DE_VALIDACION,
    )
    if (!envio.ok) {
      setError(envio.error.mensaje)
      return
    }
    setAbierto(false)
    avisarExito(`Se eliminó el embudo «${embudo.nombre}».`)
    alTerminar()
    router.refresh()
  }

  return (
    <>
      <Button
        variant="ghost"
        className="min-h-11 w-fit text-(--color-peligro-ink) md:min-h-8"
        onClick={() => {
          setError(null)
          setAbierto(true)
        }}
      >
        Eliminar embudo
      </Button>
      <Confirmar
        abierto={abierto}
        alCerrar={() => {
          setAbierto(false)
        }}
        alConfirmar={() => void confirmar()}
        titulo={`Eliminar el embudo «${embudo.nombre}»`}
        descripcion="Sólo se elimina si no tiene oportunidades. No se puede deshacer."
        etiquetaConfirmar="Eliminar embudo"
        enCurso={eliminar.isPending}
      >
        {error ? (
          <Aviso tono="peligro">
            <p>{error}</p>
          </Aviso>
        ) : null}
      </Confirmar>
    </>
  )
}

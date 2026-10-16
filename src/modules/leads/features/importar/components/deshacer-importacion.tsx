'use client'

import { Undo2Icon } from 'lucide-react'
import { useState } from 'react'
import { formatearNumero } from '@/shared/lib/formato'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Confirmar } from '@/shared/ui/confirmar'
import { useEnLinea } from '@/shared/ui/use-en-linea'
import { useRegional } from '@/shared/ui/regional'
import {
  textoDeConfirmacion,
  tiempoQueQueda,
  type ResultadoDeDeshacer,
} from '../../../entities/importacion/deshacer'
import { useAhora } from '../hooks/use-ahora'
import { useDeshacerImportacion } from '../hooks/use-deshacer-importacion'
import { ResultadoDelDeshacer } from './resultado-del-deshacer'

type Props = {
  importacionId: string
  // Lo que se movería ahora a la papelera, y lo que entró en total.
  intactos: number
  creadas: number
  venceEn: string
  // Contra qué instante se cuenta el plazo al dibujar (ISO).
  ahora: string
  // Lo que ya contestó la base, si esta importación ya se deshizo.
  resultado?: Omit<ResultadoDeDeshacer, 'repetido'> | null
}

// «Deshacer importación» con el tiempo que queda: confirma cuántos van a la papelera y, hecho, dice qué
// salió y qué se quedó. Lo dice la base: entre la confirmación y el envío pudo cambiar algo.
export function DeshacerImportacion(props: Props) {
  const { importacionId, intactos, creadas, venceEn } = props
  const { locale } = useRegional()
  const numero = (n: number) => formatearNumero(n, { locale })
  const ahora = useAhora(props.ahora)
  const enLinea = useEnLinea()
  const [abierto, setAbierto] = useState(false)
  const { deshacer, enCurso, resultado, error, limpiarError } =
    useDeshacerImportacion(importacionId)

  const hecho = resultado ?? props.resultado ?? null
  if (hecho) {
    return <ResultadoDelDeshacer resultado={hecho} />
  }
  const queda = tiempoQueQueda(venceEn, ahora)
  if (queda === null) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Pasaron las 24 horas: esta importación ya no se puede deshacer.
      </p>
    )
  }
  if (intactos === 0) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        No queda nada para deshacer: los leads que entraron ya cambiaron.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Button
        type="button"
        variant="outline"
        className="h-11 md:h-9"
        onClick={() => {
          limpiarError()
          setAbierto(true)
        }}
      >
        <Undo2Icon aria-hidden />
        Deshacer importación
      </Button>
      <span className="text-(length:--text-sm) text-(--color-ink-soft)">
        Quedan {queda} para deshacerla.
      </span>
      <Confirmar
        abierto={abierto}
        alCerrar={() => {
          setAbierto(false)
        }}
        alConfirmar={() => {
          void deshacer().then((listo) => {
            if (listo) {
              setAbierto(false)
            }
          })
        }}
        titulo="Deshacer la importación"
        descripcion={textoDeConfirmacion(intactos, creadas, numero)}
        etiquetaConfirmar="Mover a la papelera"
        enCurso={enCurso}
        deshabilitado={!enLinea}
      >
        {enLinea ? null : (
          <Aviso tono="aviso">
            No hay conexión. No se movió nada: vuelve a intentar cuando vuelva.
          </Aviso>
        )}
        {error ? <Aviso tono="peligro">{error.mensaje}</Aviso> : null}
      </Confirmar>
    </div>
  )
}

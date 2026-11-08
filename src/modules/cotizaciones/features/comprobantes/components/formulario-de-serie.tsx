'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRef, useState } from 'react'
import {
  conRed,
  enfocarPrimerError,
  errorDeCampo,
  resultadoDeAccion,
} from '@/shared/lib/formularios'
import { Bloque } from '@/shared/ui/bloque'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { avisarError, avisarExito } from '@/shared/ui/toasts'
import { numeroDeComprobante } from '../../../entities/comprobantes/comprobante'
import {
  esquemaDeSerie,
  proximoComprobante,
  SERIE_MAXIMA,
  type SerieVigente,
} from '../../../entities/comprobantes/serie'
import { cambiarSerie } from '../actions/cambiar-serie'

type Props = {
  vigente: SerieVigente
  // `empresa.ajustes.gestionar`: sin eso se lee y no se cambia.
  puedeCambiar: boolean
}

const AYUDA =
  'De 1 a 12 letras, números o guiones. Una serie nueva empieza en 1; volver a una usada sigue su numeración.'

// La serie de comprobantes en Configuración › Empresa (4.26-3): la vigente, el próximo número y el campo para cambiarla. Quien lo usa le pone de `key` la versión
// de la fila, así que lo guardado (aquí o por otra persona) lo vuelve a montar desde la base. Un cambio ajeno da PT409 con «Recargar» (`avisarError`); lo tipeado
// queda siempre.
export function FormularioDeSerie({ vigente, puedeCambiar }: Props) {
  const formulario = useRef<HTMLFormElement>(null)
  const [serie, setSerie] = useState(vigente.serie)
  const [motivo, setMotivo] = useState<string | null>(null)
  const { executeAsync, result, isPending } = useAction(cambiarSerie)
  const sinCambios = serie.trim().toUpperCase() === vigente.serie

  async function guardar(): Promise<void> {
    const leida = esquemaDeSerie.safeParse(serie)
    if (!leida.success) {
      setMotivo(leida.error.issues[0]?.message ?? '')
      enfocarPrimerError(formulario.current)
      return
    }
    const resultado = resultadoDeAccion(
      await conRed(executeAsync({ serie: leida.data, actualizadoEn: vigente.actualizadoEn })),
    )
    if (!resultado.ok) {
      if (resultado.error.codigo !== 'validacion') {
        avisarError(resultado.error)
      }
      enfocarPrimerError(formulario.current)
      return
    }
    avisarExito(
      `La serie vigente es ${resultado.data.serie}: el próximo comprobante es ${numeroDeComprobante(resultado.data.serie, resultado.data.siguiente)}.`,
    )
  }

  return (
    <Bloque titulo="Serie de comprobantes">
      <form
        ref={formulario}
        noValidate
        className="grid gap-4"
        onSubmit={(evento) => {
          evento.preventDefault()
          void guardar()
        }}
      >
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1">
          <dt className="text-(--color-ink-soft)">Serie vigente</dt>
          <dd className="font-medium text-(--color-ink)" data-serie-vigente="">
            {vigente.serie}
          </dd>
          <dt className="text-(--color-ink-soft)">Próximo comprobante</dt>
          <dd className="font-medium text-(--color-ink)" data-proximo-comprobante="">
            {proximoComprobante(vigente.serie, vigente.ultimo)}
          </dd>
        </dl>
        {puedeCambiar ? (
          <>
            <fieldset disabled={isPending} className="grid min-w-0 gap-4">
              <legend className="sr-only">Cambiar la serie</legend>
              <Campo
                nombre="serie"
                etiqueta="Serie"
                value={serie}
                maxLength={SERIE_MAXIMA}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                ayuda={AYUDA}
                error={motivo ?? errorDeCampo(result.validationErrors?.fieldErrors, 'serie')}
                onChange={(evento) => {
                  setSerie(evento.target.value)
                  setMotivo(null)
                }}
              />
            </fieldset>
            <div>
              <Button type="submit" className="h-11 md:h-9" disabled={isPending || sinCambios}>
                {isPending ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </>
        ) : null}
      </form>
    </Bloque>
  )
}

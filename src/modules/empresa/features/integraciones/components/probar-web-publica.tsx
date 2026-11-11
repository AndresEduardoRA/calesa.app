'use client'

import { useState } from 'react'
import { formatearNumero } from '@/shared/lib/formato'
import type { Resultado } from '@/shared/lib/errores'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import { MOTIVO_PROBAR_SIN_DIRECCION, MOTIVO_PROBAR_SIN_SECRETO } from '../../../entities/motivos'
import type { EdicionesDeWebPublica } from '../hooks/use-web-publica'

type Props = {
  conDireccion: boolean
  conSecreto: boolean
  ediciones: EdicionesDeWebPublica
}

type Prueba = Resultado<{ codigo: number; conHttps: boolean }>

function ResultadoDeLaPrueba({ prueba }: { prueba: Prueba }) {
  const { locale } = useRegional()
  if (!prueba.ok) {
    return <Aviso tono="peligro">{prueba.error.mensaje}</Aviso>
  }
  const { codigo, conHttps } = prueba.data
  const respondio = `Respondió ${formatearNumero(codigo, { locale, decimales: 0 })}.`
  return (
    <Aviso tono={codigo >= 200 && codigo < 300 ? 'positivo' : 'aviso'}>
      {respondio}
      {conHttps
        ? null
        : ' Con http:// sólo se prueba: el aviso de cada minuto sale sólo a https://.'}
    </Aviso>
  )
}

// «Probar»: el servidor manda a la dirección guardada un aviso vacío con el secreto y aquí se dice
// qué código respondió. Es la respuesta de lo que se pidió: va bajo el botón, no en un toast.
export function ProbarWebPublica({ conDireccion, conSecreto, ediciones }: Props) {
  const [prueba, setPrueba] = useState<Prueba | null>(null)
  const motivo = conDireccion
    ? conSecreto
      ? null
      : MOTIVO_PROBAR_SIN_SECRETO
    : MOTIVO_PROBAR_SIN_DIRECCION

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button
          type="button"
          variant="outline"
          className="h-11 md:h-9"
          disabled={motivo !== null || ediciones.probando}
          onClick={() => {
            void ediciones.probar().then(setPrueba)
          }}
        >
          {ediciones.probando ? 'Probando…' : 'Probar'}
        </Button>
        {motivo ? (
          <span className="text-(length:--text-sm) text-(--color-ink-faint)">{motivo}</span>
        ) : null}
      </div>
      {prueba ? <ResultadoDeLaPrueba prueba={prueba} /> : null}
    </div>
  )
}

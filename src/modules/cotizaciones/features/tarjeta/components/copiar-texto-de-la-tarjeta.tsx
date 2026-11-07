'use client'

import { CheckIcon, CopyIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import { avisar } from '@/shared/ui/toasts'
import type { AvisoDelTotal } from '../../../entities/tarjeta/aviso-del-total'
import type { ModeloDeTarjeta } from '../../../entities/tarjeta/modelo-de-la-tarjeta'
import { textoDeLaTarjeta } from '../../../entities/tarjeta/texto-de-la-tarjeta'

type Props = {
  modelo: ModeloDeTarjeta | null
  aviso: AvisoDelTotal
  // El id del «Total desactualizado.» que el cuerpo del modal dibuja: lo nombra el botón apagado.
  idDelDesactualizado: string
}

// «Copiar texto» (4.18-3b, C2 y C3): copia la tarjeta que dibuja el modal como texto, con cifras aunque Live esté encendido (P7 del 4.18-3). Apagado sin tarjeta (cargando,
// error, sin permiso), con el total desactualizado o sin total (P2): nunca le manda al cliente un total que no es el de la hoja.
export function CopiarTextoDeLaTarjeta({ modelo, aviso, idDelDesactualizado }: Props) {
  const { locale } = useRegional()
  const [copiado, setCopiado] = useState(false)
  const idSinTotal = useId()
  const apagado = modelo === null || aviso !== null
  async function copiar() {
    if (modelo === null) {
      return
    }
    try {
      await navigator.clipboard.writeText(textoDeLaTarjeta(modelo, { locale }))
      setCopiado(true)
    } catch {
      avisar('No se pudo copiar el texto: tu navegador no lo permite.')
    }
  }
  const describe =
    aviso === 'desactualizado'
      ? idDelDesactualizado
      : aviso === 'sin_total'
        ? idSinTotal
        : undefined
  return (
    <>
      {modelo !== null && aviso === 'sin_total' ? (
        <p id={idSinTotal} className="self-center text-(length:--text-sm) text-(--color-ink-soft)">
          Falta el total para copiarlo.
        </p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        disabled={apagado}
        aria-describedby={describe}
        onClick={() => void copiar()}
        onBlur={() => {
          setCopiado(false)
        }}
      >
        {copiado ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
        <span aria-live="polite">{copiado ? 'Copiado' : 'Copiar texto'}</span>
      </Button>
    </>
  )
}

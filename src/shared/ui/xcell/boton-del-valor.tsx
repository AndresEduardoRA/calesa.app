'use client'

import type { KeyboardEvent, RefObject } from 'react'
import { BOTON_DEL_VALOR } from './clases'
import { ID_DEL_ATAJO } from './simbolos-de-xcell'
import { TextoDeValor } from './texto-de-valor'
import type { DatosDeLado, Lado } from './use-edicion'

type Props = {
  lado: Lado
  datos: DatosDeLado
  moneda: string | undefined
  // Los ids que lo nombran: la etiqueta de la celda y él mismo.
  idDelBoton: string
  idDeLaEtiqueta: string
  idDeLaNota: string | undefined
  bloqueada: boolean
  conAtajo: boolean
  // Al cerrar con Enter o Esc este botón se monta de nuevo y, si es el lado marcado, recibe el foco una vez.
  volverARef: RefObject<Lado | null>
  principalRef: RefObject<HTMLElement | null>
  alAbrir: (lado: Lado) => void
  alTeclear: (lado: Lado, evento: KeyboardEvent<HTMLButtonElement>) => void
}

// El valor de un lado de la celda cuando no se edita. Deshabilitado es `aria-disabled`, no `disabled`: se alcanza con Tab y se lee.
export function BotonDelValor(props: Props) {
  const { lado, datos, moneda, idDelBoton, idDeLaEtiqueta, idDeLaNota, bloqueada, conAtajo } = props
  const { volverARef, principalRef, alAbrir, alTeclear } = props
  return (
    <button
      id={idDelBoton}
      type="button"
      data-parada={lado === 'principal' ? 0 : 1}
      className={BOTON_DEL_VALOR}
      aria-labelledby={`${idDeLaEtiqueta} ${idDelBoton}`}
      aria-describedby={
        conAtajo
          ? idDeLaNota === undefined
            ? ID_DEL_ATAJO
            : `${idDeLaNota} ${ID_DEL_ATAJO}`
          : idDeLaNota
      }
      aria-disabled={bloqueada || undefined}
      aria-keyshortcuts={conAtajo ? 'ArrowRight' : undefined}
      ref={(elemento) => {
        if (lado === 'principal') {
          principalRef.current = elemento
        }
        if (elemento && volverARef.current === lado) {
          volverARef.current = null
          elemento.focus()
        }
      }}
      onClick={() => {
        alAbrir(lado)
      }}
      onKeyDown={(evento) => {
        alTeclear(lado, evento)
      }}
    >
      <TextoDeValor
        valor={datos.valor}
        formato={datos.formato}
        moneda={moneda}
        decimales={datos.decimales}
      />
    </button>
  )
}

'use client'

import type { RefObject } from 'react'
import { BotonDelValor } from './boton-del-valor'
import { EntradaDeXCell } from './entrada-de-xcell'
import type { DatosDeLado, Lado, useEdicion } from './use-edicion'

type Props = {
  lado: Lado
  datos: DatosDeLado
  etiqueta: string
  moneda: string | undefined
  idDelBoton: string
  idDeLaEtiqueta: string
  // Lo que describe al botón de este lado y a la entrada abierta (que nunca nombra un candado).
  idDeLaNota: string | undefined
  idDeLaNotaDeLaEntrada: string | undefined
  bloqueada: boolean
  soloEsteLado: boolean
  conAtajo: boolean
  principalRef: RefObject<HTMLElement | null>
  edicion: ReturnType<typeof useEdicion>
}

// Un lado de la celda: la entrada si se está editando ese lado y, si no, el botón con su valor.
export function LadoDeXCell(props: Props) {
  const { lado, datos, etiqueta, edicion: e } = props
  if (e.edicion?.lado === lado) {
    return (
      <EntradaDeXCell
        texto={e.edicion.texto}
        seleccion={e.edicion.seleccion}
        nombre={lado === 'principal' ? etiqueta : `${etiqueta}, ${datos.formato}`}
        describedby={props.idDeLaNotaDeLaEntrada}
        invalido={e.edicion.aviso !== null}
        alEscribir={e.alEscribir}
        alCerrar={e.alCerrar}
        alPerderElFoco={e.alPerderElFoco}
      />
    )
  }
  return (
    <BotonDelValor
      lado={lado}
      datos={datos}
      moneda={props.moneda}
      idDelBoton={props.idDelBoton}
      idDeLaEtiqueta={props.idDeLaEtiqueta}
      idDeLaNota={props.idDeLaNota}
      bloqueada={props.bloqueada}
      soloEsteLado={props.soloEsteLado}
      conAtajo={props.conAtajo}
      volverARef={e.volverARef}
      principalRef={props.principalRef}
      alAbrir={(l) => {
        e.abrir(l, null, 'todo')
      }}
      alTeclear={e.alTeclearEnElValor}
    />
  )
}

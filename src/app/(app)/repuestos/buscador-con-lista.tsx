'use client'

import { useId } from 'react'
import { AvisosDelBuscador } from './avisos-del-buscador'
import { CampoDelBuscador } from './campo-del-buscador'
import { ElegidoDeUnBuscador } from './elegido-del-buscador'
import { OpcionesDelBuscador } from './opciones-del-buscador'
import { teclaDelBuscador } from './teclas-del-buscador'
import type { Buscar, PropsDelBuscador } from './tipos-del-buscador'
import { useEstadoDelBuscador } from './use-estado-del-buscador'

type Props = PropsDelBuscador & {
  nombre: string
  marcador: string
  buscar: Buscar
  // Lo que se escribe, ya pasado por la interpretación; nulo = no alcanza para buscar.
  interpretar: (texto: string) => string | null
  avisoDelMinimo: string
}

// Un buscador que se elige con el teclado (combobox: flechas, Enter, Esc) y que pide al escribir, de a una búsqueda (`useBusquedaCancelable`). Con menos del mínimo no llama a la
// base y lo dice. Elegido, muestra el nombre con «Cambiar». Lo compone `src/app`: `repuestos` no importa `buscador`.
export function BuscadorConLista(props: Props) {
  const { valor, alElegir, etiqueta, error, disabled = false, nombre } = props
  const idLista = useId()
  const b = useEstadoDelBuscador(props)
  const idDeLaOpcion = (i: number) => `${idLista}-${String(i)}`
  if (valor !== null) {
    return (
      <ElegidoDeUnBuscador
        etiqueta={etiqueta}
        elegido={valor}
        error={error}
        disabled={disabled}
        alCambiar={() => {
          alElegir(null)
          setTimeout(() => b.entrada.current?.focus(), 0)
        }}
      />
    )
  }
  return (
    <div className="grid gap-1.5">
      <CampoDelBuscador
        nombre={nombre}
        etiqueta={etiqueta}
        marcador={props.marcador}
        texto={b.texto}
        entrada={b.entrada}
        idLista={idLista}
        idActiva={b.hayLista ? idDeLaOpcion(b.activa) : undefined}
        hayLista={b.hayLista}
        error={error}
        disabled={disabled}
        alEscribir={b.escribir}
        alTeclear={(evento) => {
          teclaDelBuscador(evento, {
            abierta: b.hayLista,
            opciones: b.opciones,
            activa: b.activa,
            alCerrar: b.cerrar,
            alAbrir: b.abrir,
            alMover: b.mover,
            alElegir: b.elegir,
          })
        }}
      />
      {b.hayLista ? (
        <OpcionesDelBuscador
          id={idLista}
          etiqueta={etiqueta}
          opciones={b.opciones}
          activa={b.activa}
          idDeLaOpcion={idDeLaOpcion}
          alElegir={b.elegir}
        />
      ) : null}
      <AvisosDelBuscador
        estado={b.estado}
        faltaTexto={b.texto.trim() !== '' && b.interpretado === null}
        avisoDelMinimo={props.avisoDelMinimo}
        buscaConTexto={b.interpretado !== null}
        error={error}
        alReintentar={b.reintentar}
      />
    </div>
  )
}

'use client'

import { useId } from 'react'
import type { DefFiltro, ValorDeFiltro } from '@/shared/lib/filtros'
import { LEYENDA, OPCION } from './estilos'

type De<Tipo extends DefFiltro['tipo']> = Extract<DefFiltro, { tipo: Tipo }>
type Valor<Tipo extends ValorDeFiltro['tipo']> = Extract<ValorDeFiltro, { tipo: Tipo }>

type Props<Tipo extends DefFiltro['tipo']> = {
  def: De<Tipo>
  valor: Valor<Tipo> | null
  alCambiar: (valor: ValorDeFiltro | null) => void
}

const SI_O_NO = [
  ['', 'Todos'],
  ['si', 'Sí'],
  ['no', 'No'],
] as const

export function FiltroBooleano({ def, valor, alCambiar }: Props<'booleano'>) {
  const grupo = useId()
  const elegido = valor === null ? '' : valor.valor ? 'si' : 'no'
  return (
    <fieldset>
      <legend className={LEYENDA}>{def.etiqueta}</legend>
      <div className="flex flex-wrap gap-x-4">
        {SI_O_NO.map(([clave, etiqueta]) => (
          <label key={clave} className={OPCION}>
            <input
              type="radio"
              name={grupo}
              className="size-4 accent-(--color-primario)"
              checked={elegido === clave}
              onChange={() => {
                alCambiar(clave === '' ? null : { tipo: 'booleano', valor: clave === 'si' })
              }}
            />
            {etiqueta}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

// Una de varias, con su valor por defecto marcado cuando no hay nada en la URL. Elegirlo quita el
// filtro (la URL vuelve a no decir nada).
export function FiltroEleccion({ def, valor, alCambiar }: Props<'eleccion'>) {
  const grupo = useId()
  const elegido = valor?.valor ?? def.porDefecto
  return (
    <fieldset>
      <legend className={LEYENDA}>{def.etiqueta}</legend>
      <div className="grid">
        {def.opciones.map((opcion) => (
          <label key={opcion.valor} className={OPCION}>
            <input
              type="radio"
              name={grupo}
              className="size-4 accent-(--color-primario)"
              checked={elegido === opcion.valor}
              onChange={() => {
                alCambiar(
                  opcion.valor === def.porDefecto
                    ? null
                    : { tipo: 'eleccion', valor: opcion.valor },
                )
              }}
            />
            {opcion.etiqueta}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

'use client'

import type { ReactNode } from 'react'
import type { DefFiltro, ValorDeFiltro } from '@/shared/lib/filtros'
import {
  FiltroBooleano,
  FiltroDeOpciones,
  FiltroDeTexto,
  FiltroRangoFecha,
  FiltroRangoNumero,
} from './controles'
import { useFiltrosDelListado } from './contexto'

type PropsDeControl = {
  def: DefFiltro
  valor: ValorDeFiltro | null
  alCambiar: (valor: ValorDeFiltro | null, opciones?: { tipeando?: boolean }) => void
}

// Un valor de otro tipo no debería llegar (lo lee el mismo esquema): se trata como «sin filtrar».
function delTipo<Tipo extends ValorDeFiltro['tipo']>(
  valor: ValorDeFiltro | null,
  tipo: Tipo,
): Extract<ValorDeFiltro, { tipo: Tipo }> | null {
  return valor?.tipo === tipo ? (valor as Extract<ValorDeFiltro, { tipo: Tipo }>) : null
}

// El control que le toca a cada tipo de filtro.
function Control({ def, valor, alCambiar }: PropsDeControl) {
  switch (def.tipo) {
    case 'opciones':
      return <FiltroDeOpciones def={def} valor={delTipo(valor, 'opciones')} alCambiar={alCambiar} />
    case 'booleano':
      return <FiltroBooleano def={def} valor={delTipo(valor, 'booleano')} alCambiar={alCambiar} />
    case 'rango_numero':
      return (
        <FiltroRangoNumero def={def} valor={delTipo(valor, 'rango_numero')} alCambiar={alCambiar} />
      )
    case 'rango_fecha':
      return (
        <FiltroRangoFecha def={def} valor={delTipo(valor, 'rango_fecha')} alCambiar={alCambiar} />
      )
    case 'texto':
      return <FiltroDeTexto def={def} valor={delTipo(valor, 'texto')} alCambiar={alCambiar} />
  }
}

type Props = {
  filtros: readonly DefFiltro[]
  // Lo que el listado quiera decir al pie (por ejemplo, de dónde salen estos filtros).
  pie?: ReactNode
}

// Los filtros del listado, uno debajo del otro. Va en el panel lateral y en la hoja del celular.
export function PanelDeFiltros({ filtros, pie }: Props) {
  const estado = useFiltrosDelListado()
  return (
    <div className="grid gap-4">
      {filtros.map((def) => (
        <Control
          key={def.clave}
          def={def}
          valor={estado.valores.porClave[def.clave] ?? null}
          alCambiar={(valor, opciones) => {
            estado.cambiar(def, valor, opciones)
          }}
        />
      ))}
      {pie}
    </div>
  )
}

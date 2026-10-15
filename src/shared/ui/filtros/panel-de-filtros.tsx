'use client'

import type { ReactNode } from 'react'
import type { DefFiltro, SeccionDeFiltros, ValorDeFiltro } from '@/shared/lib/filtros'
import { FiltroDeOpciones, FiltroDeTexto, FiltroRangoFecha, FiltroRangoNumero } from './controles'
import { FiltroBooleano, FiltroEleccion } from './radios'
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
    case 'eleccion':
      return <FiltroEleccion def={def} valor={delTipo(valor, 'eleccion')} alCambiar={alCambiar} />
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

// Los filtros de un grupo, uno debajo del otro, cada uno con su ayuda.
function Filtros({ filtros }: { filtros: readonly DefFiltro[] }) {
  const estado = useFiltrosDelListado()
  return filtros.map((def) => (
    <div key={def.clave} className="grid gap-1">
      <Control
        def={def}
        valor={estado.valores.porClave[def.clave] ?? null}
        alCambiar={(valor, opciones) => {
          estado.cambiar(def, valor, opciones)
        }}
      />
      {def.ayuda ? (
        <p className="text-(length:--text-xs) text-(--color-ink-soft)">{def.ayuda}</p>
      ) : null}
    </div>
  ))
}

type Props = {
  filtros: readonly DefFiltro[]
  // Los grupos del panel, en orden. Sin secciones, una lista plana.
  secciones?: readonly SeccionDeFiltros[] | undefined
  // Algo que el listado pone al pie de una sección (por clave): «Gestionar etiquetas».
  accionesDeSeccion?: Readonly<Record<string, ReactNode>> | undefined
  // Lo que el listado quiera decir al pie (por ejemplo, de dónde salen estos filtros).
  pie?: ReactNode
}

// Los filtros del listado. Va en el panel lateral y en la hoja del celular. Con secciones, cada
// grupo lleva su título (y su aclaración); los filtros sin sección van al final, sin título.
export function PanelDeFiltros({ filtros, secciones = [], accionesDeSeccion = {}, pie }: Props) {
  const claves = new Set(secciones.map((seccion) => seccion.clave))
  const sueltos = filtros.filter((def) => def.seccion === undefined || !claves.has(def.seccion))
  return (
    <div className="grid gap-4">
      {secciones.map((seccion) => {
        const deLaSeccion = filtros.filter((def) => def.seccion === seccion.clave)
        if (deLaSeccion.length === 0) {
          return null
        }
        return (
          <section
            key={seccion.clave}
            aria-labelledby={`seccion-${seccion.clave}`}
            className="grid gap-3 border-b border-(--color-line) pb-4 last:border-b-0 last:pb-0"
          >
            <div className="grid gap-0.5">
              <h2
                id={`seccion-${seccion.clave}`}
                className="text-(length:--text-xs) font-semibold tracking-wide text-(--color-ink-soft) uppercase"
              >
                {seccion.titulo}
              </h2>
              {seccion.descripcion ? (
                <p className="text-(length:--text-xs) text-(--color-ink-soft)">
                  {seccion.descripcion}
                </p>
              ) : null}
            </div>
            <Filtros filtros={deLaSeccion} />
            {accionesDeSeccion[seccion.clave] ?? null}
          </section>
        )
      })}
      <Filtros filtros={sueltos} />
      {pie}
    </div>
  )
}

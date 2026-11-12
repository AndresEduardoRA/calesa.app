'use client'

import { PlusIcon } from 'lucide-react'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { ListaDeCatalogo } from '@/shared/ui/lista-de-catalogo/lista-de-catalogo'
import {
  TOPE_DE_VALORES_DE_CATALOGO,
  type CATALOGOS_DE_REPUESTOS,
  type ValorDeCatalogo,
} from '../../../entities/catalogos/catalogo'
import { filasDeValores } from './filas-de-valores'

type Props = {
  catalogo: (typeof CATALOGOS_DE_REPUESTOS)[number]
  valores: readonly ValorDeCatalogo[]
  hayMas: boolean
  alAgregar: () => void
  alEditar: (id: string) => void
  alActivar: (valor: ValorDeCatalogo, activo: boolean) => void
  alPedirEliminar: (id: string) => void
}

export const prefijoDeCatalogo = (clave: string) => `catalogo-${clave}`

// Un catálogo de repuestos en Configuración (8.08-3): su título, «Agregar …» y sus valores, también los desactivados. Cargar, el error y el sin permiso los
// resuelve la página; aquí, el vacío y el tope.
export function CatalogoDeValores({
  catalogo,
  valores,
  hayMas,
  alAgregar,
  alEditar,
  alActivar,
  alPedirEliminar,
}: Props) {
  const idDelTitulo = `titulo-de-catalogo-${catalogo.clave}`
  return (
    <section className="grid gap-3" aria-labelledby={idDelTitulo}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 id={idDelTitulo} className="text-(length:--text-lg) font-semibold text-(--color-ink)">
          {catalogo.nombre}
        </h2>
        <Button className="h-11 md:h-8" onClick={alAgregar}>
          <PlusIcon aria-hidden />
          Agregar {catalogo.nombreDelValor}
        </Button>
      </div>
      {valores.length === 0 ? (
        <EstadoVacio compacto titulo={`Todavía no hay valores en «${catalogo.nombre}».`} />
      ) : (
        <ListaDeCatalogo
          filas={filasDeValores(valores, { alEditar, alActivar, alPedirEliminar })}
          prefijo={prefijoDeCatalogo(catalogo.clave)}
          columnaDeUso="Orden"
          alAbrir={alEditar}
          alMover={() => undefined}
        />
      )}
      {hayMas ? (
        <AvisoDeTope
          texto={`Se muestran los primeros ${String(TOPE_DE_VALORES_DE_CATALOGO)} valores.`}
        />
      ) : null}
    </section>
  )
}

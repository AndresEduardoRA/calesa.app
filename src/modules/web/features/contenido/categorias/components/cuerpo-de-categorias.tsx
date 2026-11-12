'use client'

import { textoDelTope } from '@/shared/lib/conteo'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { EstadoVacio } from '@/shared/ui/estados'
import { ListaDeCatalogo } from '@/shared/ui/lista-de-catalogo/lista-de-catalogo'
import { useFocoTrasMover } from '@/shared/ui/lista-de-catalogo/use-foco-tras-mover'
import {
  TOPE_DE_CATEGORIAS,
  type ListaDeCategorias,
} from '../../../../entities/contenido/categorias'
import { useCategorias } from '../hooks/use-categorias'
import { useEliminarCategoriaPorUrl } from '../hooks/use-eliminar-categoria-por-url'
import { ConfirmarEliminarCategoria } from './confirmar-eliminar-categoria'
import { filasDeCategorias } from './filas-de-categorias'
import { FormularioDeCategoria } from './formulario-de-categoria'

const PREFIJO = 'categoria-de-guia'

// El cuerpo del panel «Categorías»: el formulario del nombre y la lista con su orden, activar y eliminar. Viaja diferido: no está en el hub.
export function CuerpoDeCategorias({ lista }: { lista: ListaDeCategorias }) {
  const categorias = useCategorias(lista)
  const eliminacion = useEliminarCategoriaPorUrl(lista.filas)
  useFocoTrasMover(PREFIJO, categorias.movimiento)

  const filas = filasDeCategorias(lista.filas, {
    alRenombrar: categorias.nombre.empezarARenombrar,
    alActivar: (categoria, activa) => void categorias.cambiarActiva(categoria, activa),
    alPedirEliminar: eliminacion.abrir,
  })

  return (
    <div className="grid gap-4">
      <FormularioDeCategoria
        nombre={categorias.nombre.nombre}
        alCambiar={categorias.nombre.cambiar}
        editando={categorias.nombre.editando}
        error={categorias.nombre.error}
        enCurso={categorias.enCurso}
        alEnviar={() => void categorias.nombre.enviar()}
        alCancelar={categorias.nombre.cancelar}
      />
      {filas.length === 0 ? (
        <EstadoVacio compacto titulo="Todavía no hay categorías. Crea la primera." />
      ) : (
        <ListaDeCatalogo
          filas={filas}
          prefijo={PREFIJO}
          columnaDeUso="Guías"
          alAbrir={(id) => {
            const categoria = lista.filas.find((fila) => fila.id === id)
            if (categoria) {
              categorias.nombre.empezarARenombrar(categoria)
            }
          }}
          alMover={(id, direccion) => {
            const categoria = lista.filas.find((fila) => fila.id === id)
            if (categoria) {
              void categorias.mover(categoria, direccion)
            }
          }}
        />
      )}
      {lista.hayMas ? (
        <AvisoDeTope
          texto={textoDelTope(TOPE_DE_CATEGORIAS, {
            sustantivo: 'categorías',
            articulo: 'las',
            orden: 'primeras por orden',
          })}
        />
      ) : null}
      <p role="status" aria-live="polite" className="sr-only">
        {categorias.anuncio}
      </p>
      <ConfirmarEliminarCategoria
        filas={lista.filas}
        enCurso={categorias.enCurso}
        alEliminar={categorias.eliminar}
      />
    </div>
  )
}

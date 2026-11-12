'use client'

import { PlusIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { EstadoError, EstadoVacio } from '@/shared/ui/estados'
import { ListaDeCatalogo } from '@/shared/ui/lista-de-catalogo/lista-de-catalogo'
import { Skeleton } from '@/shared/ui/skeleton'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useCategoriasDeGasto } from '../hooks/use-categorias-de-gasto'
import { useEliminarCategoriaPorUrl } from '../hooks/use-eliminar-categoria-por-url'
import { useModalDeCategoria } from '../hooks/use-modal-de-categoria'
import { EliminarCategoriaDiferido, ModalDeCategoriaDiferido } from './diferidos-de-categorias'
import { filasDeCategorias } from './filas-de-categorias'

const BOTON = 'h-11 md:h-8'
const PREFIJO = 'categoria-de-gasto'

function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando las categorías" className="grid gap-2">
      <Skeleton className="h-12" />
      <Skeleton className="h-12" />
      <Skeleton className="h-12" />
    </div>
  )
}

// Configuración › Logística › Categorías de gasto (6.11-4): se crean, renombran, eligen su propósito, ordenan (con un número), activan y desactivan; una con gastos no se elimina, se desactiva. Es un catálogo de
// la empresa (decenas de filas): no se pagina. Escribir lo exige `logistica.catalogos.gestionar` (la RLS de la tabla); la pestaña ya lo pide.
export function CategoriasDeGasto() {
  const datos = useCategoriasDeGasto()
  const { lectura } = datos
  const categorias = lectura.tipo === 'listo' ? lectura.categorias : null
  const modal = useModalDeCategoria(categorias)
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const eliminacion = useEliminarCategoriaPorUrl(categorias)
  const montarEliminar = useAbiertoAlgunaVez(eliminacion.abierto)

  return (
    <section className="grid gap-3" aria-labelledby="titulo-de-categorias">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="grid gap-0.5">
          <h2
            id="titulo-de-categorias"
            className="text-(length:--text-lg) font-semibold text-(--color-ink)"
          >
            Categorías de gasto
          </h2>
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            Es lo que se elige al registrar un gasto. El propósito «Tributos» es el que Aduana lee
            para dar por pagada una declaración.
          </p>
        </div>
        <Button className={BOTON} onClick={modal.abrirNuevo}>
          <PlusIcon aria-hidden />
          Nueva categoría
        </Button>
      </div>
      {lectura.tipo === 'cargando' ? <Cargando /> : null}
      {lectura.tipo === 'error' ? (
        <EstadoError
          titulo="No se pudieron cargar las categorías"
          descripcion={lectura.error.mensaje}
          alReintentar={datos.reintentar}
        />
      ) : null}
      {categorias !== null && categorias.length === 0 ? (
        <EstadoVacio compacto titulo="Todavía no hay categorías de gasto." />
      ) : null}
      {categorias !== null && categorias.length > 0 ? (
        <ListaDeCatalogo
          filas={filasDeCategorias(categorias, {
            alEditar: modal.abrirEdicion,
            alActivar: (categoria, activo) => void datos.activar(categoria, activo),
            alPedirEliminar: eliminacion.abrir,
          })}
          prefijo={PREFIJO}
          columnaDeUso="Propósito"
          alAbrir={modal.abrirEdicion}
          alMover={() => undefined}
        />
      ) : null}
      {montar ? (
        <ModalDeCategoriaDiferido
          key={modal.apertura}
          abierto={modal.abierto}
          alCerrar={modal.alCerrar}
          original={modal.original}
          noDisponible={modal.noDisponible}
          alGuardar={datos.recargar}
        />
      ) : null}
      {montarEliminar ? (
        <EliminarCategoriaDiferido
          abierto={eliminacion.abierto}
          alCerrar={eliminacion.cerrar}
          categoria={eliminacion.categoria}
          alEliminar={datos.eliminar}
          focoAlCerrar={() =>
            document.querySelector<HTMLElement>(
              `[data-mas-acciones="${PREFIJO}-${eliminacion.categoria?.id ?? ''}-mas"]`,
            ) ?? true
          }
        />
      ) : null}
    </section>
  )
}

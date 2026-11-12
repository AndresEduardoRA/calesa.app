'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import {
  CATALOGOS_DE_REPUESTOS,
  type CatalogosDeRepuestos as Catalogos,
} from '../../../entities/catalogos/catalogo'
import { useEliminarValorPorUrl } from '../hooks/use-eliminar-valor-por-url'
import { useEscrituraDeValores } from '../hooks/use-escritura-de-valores'
import { useModalDeValor } from '../hooks/use-modal-de-valor'
import { CatalogoDeValores, prefijoDeCatalogo } from './catalogo-de-valores'
import { EliminarValorDiferido, ModalDeValorDiferido } from './diferidos'

type Props = { catalogos: Catalogos }

// Configuración › Repuestos › Catálogos (8.08-3): los cuatro catálogos de los ítems, en su orden, con un solo modal para agregar o editar un valor y un solo diálogo para eliminarlo. Lo lee la
// página en el servidor; cada action renueva la ruta (`revalidatePath`). Escribir lo exige `repuestos.configurar` (la RLS de la tabla); la página ya lo pide.
export function CatalogosDeRepuestos({ catalogos }: Props) {
  const todos = CATALOGOS_DE_REPUESTOS.flatMap((c) => catalogos[c.clave].valores)
  const modal = useModalDeValor(todos)
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const escritura = useEscrituraDeValores()
  const eliminacion = useEliminarValorPorUrl(todos)
  const montarEliminar = useAbiertoAlgunaVez(eliminacion.abierto)
  const aEliminar = eliminacion.valor

  return (
    <div className="grid gap-8">
      {CATALOGOS_DE_REPUESTOS.map((catalogo) => (
        <CatalogoDeValores
          key={catalogo.clave}
          catalogo={catalogo}
          valores={catalogos[catalogo.clave].valores}
          hayMas={catalogos[catalogo.clave].hayMas}
          alAgregar={() => {
            modal.abrirNuevo(catalogo.clave)
          }}
          alEditar={modal.abrirEdicion}
          alActivar={(valor, activo) => void escritura.activar(valor, activo)}
          alPedirEliminar={eliminacion.abrir}
        />
      ))}
      {montar && modal.catalogo !== null ? (
        <ModalDeValorDiferido
          key={modal.apertura}
          abierto={modal.abierto}
          alCerrar={modal.alCerrar}
          catalogo={modal.catalogo}
          original={modal.original}
          valoresDelCatalogo={catalogos[modal.catalogo].valores}
          noDisponible={modal.noDisponible}
        />
      ) : null}
      {montarEliminar ? (
        <EliminarValorDiferido
          abierto={eliminacion.abierto}
          alCerrar={eliminacion.cerrar}
          valor={aEliminar}
          alEliminar={escritura.eliminar}
          focoAlCerrar={() =>
            (aEliminar &&
              document.querySelector<HTMLElement>(
                `[data-mas-acciones="${prefijoDeCatalogo(aEliminar.catalogo)}-${aEliminar.id}-mas"]`,
              )) ??
            true
          }
        />
      ) : null}
    </div>
  )
}

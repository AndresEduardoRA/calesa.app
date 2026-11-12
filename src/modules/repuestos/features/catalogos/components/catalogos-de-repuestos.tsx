'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import {
  CATALOGOS_DE_REPUESTOS,
  type CatalogosDeRepuestos as Catalogos,
} from '../../../entities/catalogos/catalogo'
import { useEscrituraDeValores } from '../hooks/use-escritura-de-valores'
import { useModalDeValor } from '../hooks/use-modal-de-valor'
import { CatalogoDeValores } from './catalogo-de-valores'
import { ModalDeValorDiferido } from './diferidos'

type Props = { catalogos: Catalogos }

// Configuración › Repuestos › Catálogos (8.08-3): los cuatro catálogos de los ítems, en su orden, con un solo modal para agregar o editar un valor. Lo lee la
// página en el servidor; cada action renueva la ruta (`revalidatePath`). Escribir lo exige `repuestos.configurar` (la RLS de la tabla); la página ya lo pide.
export function CatalogosDeRepuestos({ catalogos }: Props) {
  const todos = CATALOGOS_DE_REPUESTOS.flatMap((c) => catalogos[c.clave].valores)
  const modal = useModalDeValor(todos)
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const escritura = useEscrituraDeValores()

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
          alPedirEliminar={() => undefined}
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
    </div>
  )
}

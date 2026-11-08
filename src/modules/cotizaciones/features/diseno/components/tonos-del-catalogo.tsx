'use client'

import { PlusIcon, SwatchBookIcon } from 'lucide-react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { alTopeDeTonos, textoDelTopeDeTonos } from '../../../entities/diseno/panel-de-tonos'
import type { ListaDeTonos } from '../../../entities/diseno/tonos'
import { useEliminarTonoPorUrl } from '../hooks/use-eliminar-tono-por-url'
import { useModalDeTono } from '../hooks/use-modal-de-tono'
import { useTonos, type Tonos } from '../hooks/use-tonos'
import { EliminarTonoDiferido, ModalDeTonoDiferido } from './diferidos'
import { FilaDeTono } from './fila-de-tono'

type Props = { lista: ListaDeTonos }

const BOTON = 'h-11 md:h-8'

function NuevoTono({ alNuevo, alTope }: { alNuevo: () => void; alTope: boolean }) {
  return (
    <Button
      className={BOTON}
      disabled={alTope}
      aria-describedby={alTope ? 'tonos-tope' : undefined}
      onClick={alNuevo}
    >
      <PlusIcon aria-hidden />
      Nuevo tono
    </Button>
  )
}

// El modal de «Nuevo tono» y «Editar» y la confirmación de eliminar: se piden al abrirse.
function Ventanas({
  tonos,
  modal,
  eliminacion,
}: {
  tonos: Tonos
  modal: ReturnType<typeof useModalDeTono>
  eliminacion: ReturnType<typeof useEliminarTonoPorUrl>
}) {
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const montarEliminar = useAbiertoAlgunaVez(eliminacion.abierto)
  return (
    <>
      {montar ? (
        <ModalDeTonoDiferido
          key={modal.apertura}
          abierto={modal.abierto}
          alCerrar={modal.alCerrar}
          tonos={tonos}
          original={modal.original}
          noDisponible={modal.noDisponible}
        />
      ) : null}
      {montarEliminar ? (
        <EliminarTonoDiferido
          abierto={eliminacion.abierto}
          alCerrar={eliminacion.cerrar}
          tono={eliminacion.tono}
          enCurso={tonos.enCurso}
          alEliminar={tonos.eliminar}
          focoAlCerrar={() =>
            document.querySelector<HTMLElement>(
              `[data-eliminar-tono="${eliminacion.tono?.id ?? ''}"]`,
            ) ?? true
          }
        />
      ) : null}
    </>
  )
}

// Configuración › Cotización › Tonos (4.22-4): el catálogo de la empresa, por nombre y hasta el tope que dice la base. Es de toda la empresa, no de un origen, y se
// guarda al instante (cada tono es una escritura propia, no parte de «Guardar el borrador» del diseño). Cada escritura devuelve la lista entera y esa reemplaza a la
// local: ningún pedido extra.
export function TonosDelCatalogo({ lista: inicial }: Props) {
  const tonos = useTonos(inicial)
  const { lista } = tonos
  const modal = useModalDeTono(lista)
  const eliminacion = useEliminarTonoPorUrl(lista.tonos)
  const alTope = alTopeDeTonos(lista)
  return (
    <section className="grid gap-3" aria-labelledby="titulo-de-tonos">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="grid gap-0.5">
          <h2
            id="titulo-de-tonos"
            className="text-(length:--text-lg) font-semibold text-(--color-ink)"
          >
            Tonos
          </h2>
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            Los colores con que se pintan los grupos de una fórmula. Cada tono se lee en el tema
            claro y en el oscuro.
          </p>
        </div>
        <NuevoTono alNuevo={modal.abrirNuevo} alTope={alTope} />
      </div>
      {alTope ? (
        <Aviso tono="aviso">
          <span id="tonos-tope">{textoDelTopeDeTonos(lista.tope)}</span>
        </Aviso>
      ) : null}
      {lista.tonos.length === 0 ? (
        <EstadoVacio
          Icono={SwatchBookIcon}
          titulo="Todavía no hay tonos. Crea el primero."
          accion={<NuevoTono alNuevo={modal.abrirNuevo} alTope={false} />}
          compacto
        />
      ) : (
        <ul className="grid gap-2">
          {lista.tonos.map((tono) => (
            <FilaDeTono
              key={tono.id}
              tono={tono}
              alEditar={modal.abrirEdicion}
              alPedirEliminar={eliminacion.abrir}
            />
          ))}
        </ul>
      )}
      <Ventanas tonos={tonos} modal={modal} eliminacion={eliminacion} />
    </section>
  )
}

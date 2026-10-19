'use client'

import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import { Skeleton } from '@/shared/ui/skeleton'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useApertura } from '@/shared/ui/use-apertura'
import { useLecturaAlMontar } from '@/shared/ui/use-lectura-al-montar'
import { leerCatalogosDeEdicion } from '../../../composicion.client'
import type { LeadDeFicha } from '../../../entities/ficha'
import { usePanelDeLead } from '../hooks/use-panel-de-lead'
import { PanelDeEdicion } from './panel-de-edicion'
import { PanelSinFormulario } from './panel-sin-formulario'

type Props = {
  ficha: LeadDeFicha
  // Cartera y `leads.editar`: sin esto el panel no se abre aunque la URL lo pida.
  puedeEditar: boolean
}

type PropsDelLector = Props & { abierto: boolean; alCerrar: () => void }

// Lee el layout y los catálogos de lead y, con ellos, dibuja el panel de edición. Se monta de nuevo en cada apertura (`key`): cada una
// arranca de lo guardado y con los catálogos al día.
function LectorDeCatalogos({ ficha, puedeEditar, abierto, alCerrar }: PropsDelLector) {
  const { zonaHoraria } = useRegional()
  const { lectura, reintentar } = useLecturaAlMontar(leerCatalogosDeEdicion, ficha.id)
  if (lectura.estado === 'leido') {
    return (
      <PanelDeEdicion
        ficha={ficha}
        campos={lectura.dato.campos}
        origenes={lectura.dato.origenes}
        tipos={lectura.dato.tipos}
        zona={zonaHoraria}
        puedeEditar={puedeEditar}
      />
    )
  }
  return (
    <PanelSinFormulario nombre={ficha.nombre} abierto={abierto} alCerrar={alCerrar}>
      {lectura.estado === 'leyendo' ? (
        <div aria-busy="true" aria-label="Cargando el formulario" className="grid gap-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : (
        <div role="alert" className="grid gap-3">
          <p className="text-(length:--text-sm) text-(--color-ink)">
            No se pudo cargar el formulario.
          </p>
          <Button type="button" variant="outline" onClick={reintentar} className="w-fit">
            Reintentar
          </Button>
        </div>
      )}
    </PanelSinFormulario>
  )
}

// El panel de edición de la ficha (`?panel=editar-lead`). La ficha no manda sus catálogos (el layout completo y 100 orígenes y 100 tipos
// pesaban en el documento de cada visita): se piden al abrirlo, y su código también llega al abrirlo. Un `?panel=editar-lead` en la URL al
// llegar lo abre igual, con su esqueleto mientras llega.
export function EdicionDeLaFicha(props: Props) {
  const panel = usePanelDeLead()
  const apertura = useApertura(panel.abierto)
  const visto = useAbiertoAlgunaVez(panel.abierto)
  if (!visto || !props.puedeEditar) {
    return null
  }
  return (
    <LectorDeCatalogos key={apertura} {...props} abierto={panel.abierto} alCerrar={panel.cerrar} />
  )
}

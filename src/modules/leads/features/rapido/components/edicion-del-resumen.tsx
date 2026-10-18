'use client'

import { Button } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { useRegional } from '@/shared/ui/regional'
import { Skeleton } from '@/shared/ui/skeleton'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { useApertura } from '@/shared/ui/use-apertura'
import { useLecturaAlMontar } from '@/shared/ui/use-lectura-al-montar'
import { leerFichaDelLead } from '../../../composicion.client'
import type { CampoDeLead } from '../../../entities/campo'
import type { TipoDeLeadEnCatalogo } from '../../../entities/catalogos'
import { MENSAJE_DE_LEAD_NO_DISPONIBLE, type OrigenConEstado } from '../../../entities/ficha'
import { PanelDeEdicion } from '../../ficha/components/panel-de-edicion'
import { usePanelDeLead } from '../../ficha/hooks/use-panel-de-lead'

type Props = {
  leadId: string
  nombre: string
  campos: readonly CampoDeLead[]
  origenes: readonly OrigenConEstado[]
  tipos: readonly TipoDeLeadEnCatalogo[]
  // Se guardó: el resumen vuelve a leer el lead. Y si quien edita ya no lo ve, también (y lo dice).
  alGuardado: () => void
  alPerderElLead: () => void
}

type PropsDelLector = Props & { abierto: boolean; alCerrar: () => void }

// Mientras llega la ficha, si no se pudo leer o si el lead ya no se ve: un panel con lo que pasa, en el lugar del formulario.
function PanelSinFormulario({
  nombre,
  abierto,
  alCerrar,
  children,
}: Pick<PropsDelLector, 'nombre' | 'abierto' | 'alCerrar'> & { children: React.ReactNode }) {
  return (
    <Drawer abierto={abierto} alCerrar={alCerrar} titulo={`Editar ${nombre}`} ancho="amplio">
      {children}
    </Drawer>
  )
}

// Lee la ficha (`lead_ficha`: la versión y los datos que quien mira recibe) y, con ella, dibuja el panel de edición de la ficha. Se
// monta de nuevo en cada apertura (`key`): cada una arranca de lo guardado.
function LectorDeLaFicha({
  leadId,
  nombre,
  campos,
  origenes,
  tipos,
  alGuardado,
  alPerderElLead,
  ...panel
}: PropsDelLector) {
  const { zonaHoraria } = useRegional()
  const { lectura, reintentar } = useLecturaAlMontar(() => leerFichaDelLead(leadId), leadId)
  if (lectura.estado === 'leyendo') {
    return (
      <PanelSinFormulario nombre={nombre} {...panel}>
        <div aria-busy="true" aria-label="Cargando el lead" className="grid gap-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </PanelSinFormulario>
    )
  }
  if (lectura.estado === 'fallo' || lectura.dato === null) {
    return (
      <PanelSinFormulario nombre={nombre} {...panel}>
        <div role="alert" className="grid gap-3">
          <p className="text-(length:--text-sm) text-(--color-ink)">
            {lectura.estado === 'fallo'
              ? 'No se pudo cargar el lead.'
              : MENSAJE_DE_LEAD_NO_DISPONIBLE}
          </p>
          {lectura.estado === 'fallo' ? (
            <Button type="button" variant="outline" onClick={reintentar} className="w-fit">
              Reintentar
            </Button>
          ) : null}
        </div>
      </PanelSinFormulario>
    )
  }
  return (
    <PanelDeEdicion
      ficha={lectura.dato}
      campos={campos}
      origenes={origenes}
      tipos={tipos}
      zona={zonaHoraria}
      puedeEditar
      enResumen={{ alRecargar: reintentar, alGuardado, alPerderElLead }}
    />
  )
}

// El panel de edición del lead, encima de su resumen (`?lead=<id>&panel=editar-lead`). Lee la ficha al abrirse (un pedido) y llega con su
// código por `diferido()`: el listado no paga el formulario hasta que alguien pulsa «Editar». Al guardar o cancelar se cierra y el resumen
// queda debajo, con el dato al día. Va dentro del drawer del resumen (Base UI anida los diálogos por el árbol de React: Esc cierra sólo
// el de arriba).
export function EdicionDelResumen(props: Props) {
  const panel = usePanelDeLead()
  const apertura = useApertura(panel.abierto)
  const visto = useAbiertoAlgunaVez(panel.abierto)
  if (!visto) {
    return null
  }
  return (
    <LectorDeLaFicha key={apertura} {...props} abierto={panel.abierto} alCerrar={panel.cerrar} />
  )
}

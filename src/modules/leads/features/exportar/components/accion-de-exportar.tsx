'use client'

import { DownloadIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelDeExportar } from '../hooks/use-panel-de-exportar'
import { DialogoDeExportarDiferido } from './diferidos'

// «Exportar», en las acciones del listado. Se dibuja sólo con `leads.exportar` (la base lo vuelve a
// decidir). El diálogo se pide al abrirse.
export function AccionDeExportar() {
  const panel = usePanelDeExportar()
  const montar = useAbiertoAlgunaVez(panel.abierto)
  return (
    <>
      <Button type="button" variant="outline" className="h-11 md:h-9" onClick={panel.abrir}>
        <DownloadIcon aria-hidden />
        Exportar
      </Button>
      {montar ? (
        <DialogoDeExportarDiferido abierto={panel.abierto} alCerrar={panel.cerrar} />
      ) : null}
    </>
  )
}

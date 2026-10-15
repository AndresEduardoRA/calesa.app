'use client'

import { DownloadIcon, FileSpreadsheetIcon, UploadIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { Button, buttonVariants } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelDeExportar } from '../hooks/use-panel-de-exportar'
import { DialogoDeExportarDiferido } from './diferidos'

type Props = { puedeExportar: boolean; puedeImportar: boolean }

const RENGLON = 'min-h-11 md:min-h-8'

// «Exportar» e «Importar», en las acciones del listado. Cada uno sólo con su permiso (`leads.exportar`,
// `leads.crear`); la base lo vuelve a decidir. Con los dos, un menú «CSV»; con uno, su botón. El diálogo
// de exportar se pide al abrirse.
export function AccionesDeCsv({ puedeExportar, puedeImportar }: Props) {
  const panel = usePanelDeExportar()
  const montar = useAbiertoAlgunaVez(panel.abierto)
  if (!puedeExportar && !puedeImportar) {
    return null
  }
  const exportar = (
    <Button type="button" variant="outline" className="h-11 md:h-9" onClick={panel.abrir}>
      <DownloadIcon aria-hidden />
      Exportar
    </Button>
  )
  const importar = (
    <Link
      href={RUTAS.importarLeads as Route}
      className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-9' })}
    >
      <UploadIcon aria-hidden />
      Importar
    </Link>
  )
  return (
    <>
      {puedeExportar && puedeImportar ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button type="button" variant="outline" className="h-11 md:h-9">
                <FileSpreadsheetIcon aria-hidden />
                CSV
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem className={RENGLON} onClick={panel.abrir}>
                <DownloadIcon aria-hidden />
                Exportar…
              </DropdownMenuItem>
              <DropdownMenuItem
                className={RENGLON}
                render={<Link href={RUTAS.importarLeads as Route} />}
              >
                <UploadIcon aria-hidden />
                Importar…
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      {puedeExportar && !puedeImportar ? exportar : null}
      {puedeImportar && !puedeExportar ? importar : null}
      {puedeExportar && montar ? (
        <DialogoDeExportarDiferido abierto={panel.abierto} alCerrar={panel.cerrar} />
      ) : null}
    </>
  )
}

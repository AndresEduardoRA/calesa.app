'use client'

import { DownloadIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { formatearNumero } from '@/shared/lib/formato'
import { RUTAS } from '@/shared/lib/rutas'
import { Aviso } from '@/shared/ui/aviso'
import { Button, buttonVariants } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import type { ResumenDeImportacion } from '../../../entities/importacion/lotes'
import { DeshacerImportacion } from './deshacer-importacion'

const UN_DIA = 24 * 60 * 60 * 1000

type Props = {
  cancelada: boolean
  resumen: ResumenDeImportacion
  // Cuántas filas llevaría el archivo de errores (rechazadas y las que ya existían).
  paraCorregir: number
  // La importación cerrada en la base y cuándo: desde ahí corren las 24 h para deshacerla.
  cierre: { importacionId: string; en: string } | null
  alDescargarErrores: () => void
  alImportarOtro: () => void
}

// El último paso: qué entró, qué ya existía y qué se rechazó. Lo rechazado se baja como un CSV con su
// motivo, con las mismas columnas, para corregirlo y volver a subirlo.
export function PasoResultado({
  cancelada,
  resumen,
  paraCorregir,
  cierre,
  alDescargarErrores,
  alImportarOtro,
}: Props) {
  const { locale } = useRegional()
  const numero = (n: number) => formatearNumero(n, { locale })
  const leads = (n: number) => (n === 1 ? 'lead' : 'leads')
  return (
    <section aria-label="Resultado de la importación" className="grid gap-4">
      <Aviso tono={resumen.creadas > 0 ? 'positivo' : 'info'}>
        <p className="font-medium">
          {cancelada ? 'Cancelaste la importación. ' : ''}
          {resumen.creadas === 0
            ? 'No entró ningún lead.'
            : `Entraron ${numero(resumen.creadas)} ${leads(resumen.creadas)} a tu cartera.`}
        </p>
      </Aviso>
      <ul className="grid gap-1 text-(length:--text-sm)">
        <li>{numero(resumen.creadas)} importados</li>
        <li>{numero(resumen.yaExistian)} ya existían</li>
        <li>{numero(resumen.rechazadas)} rechazados</li>
        {cancelada ? <li>{numero(resumen.pendientes)} sin importar</li> : null}
      </ul>
      {cierre && resumen.creadas > 0 ? (
        <DeshacerImportacion
          importacionId={cierre.importacionId}
          intactos={resumen.creadas}
          creadas={resumen.creadas}
          venceEn={new Date(Date.parse(cierre.en) + UN_DIA).toISOString()}
          ahora={cierre.en}
          superficie="resultado"
        />
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        {paraCorregir > 0 ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 md:h-9"
            onClick={alDescargarErrores}
          >
            <DownloadIcon aria-hidden />
            Descargar errores
          </Button>
        ) : null}
        <Button type="button" variant="outline" className="h-11 md:h-9" onClick={alImportarOtro}>
          Importar otro archivo
        </Button>
        <Link href={RUTAS.leads as Route} className={buttonVariants({ className: 'h-11 md:h-9' })}>
          Ver mis leads
        </Link>
      </div>
    </section>
  )
}

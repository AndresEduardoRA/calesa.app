'use client'

import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { EstadoError, EstadoVacio } from '@/shared/ui/estados'
import { Skeleton } from '@/shared/ui/skeleton'
import type { Importaciones } from '../hooks/use-importaciones'
import { FilaDeImportacion } from './fila-de-importacion'

type Props = { importaciones: Importaciones; todas: boolean }

function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando las importaciones" className="grid gap-2">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  )
}

// La lista «Importaciones» de `/datos` (9.06-5, D55): las propias, o todas con `datos.importar.todo`, la más nueva arriba, de a 20 con
// «Ver más» hasta 500. Es una bitácora sin resumen que abrir (como el historial de una unidad de logística): una lista, no una tabla.
export function ListaDeImportaciones({ importaciones, todas }: Props) {
  const { estado, filas, ahora } = importaciones
  return (
    <section aria-labelledby="titulo-importaciones" className="grid max-w-3xl gap-3">
      <h2 id="titulo-importaciones" className="text-(length:--text-lg) font-semibold">
        Importaciones
      </h2>
      {estado === 'cargando' ? <Cargando /> : null}
      {estado === 'error' ? (
        <EstadoError
          compacto
          titulo="No se pudo cargar las importaciones."
          alReintentar={importaciones.recargar}
        />
      ) : null}
      {estado === 'lista' && filas.length === 0 ? (
        <EstadoVacio
          compacto
          titulo={todas ? 'Nadie importó todavía.' : 'Todavía no importaste nada.'}
          descripcion="Cada archivo que importes aparece acá con su avance y su resultado."
        />
      ) : null}
      {filas.length > 0 ? (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
          {filas.map((resumen) => (
            <FilaDeImportacion key={resumen.id} resumen={resumen} ahora={ahora} todas={todas} />
          ))}
        </ul>
      ) : null}
      {importaciones.errorAlVerMas ? (
        <Aviso tono="peligro">{importaciones.errorAlVerMas.mensaje}</Aviso>
      ) : null}
      {importaciones.hayMas ? (
        <div>
          <Button
            type="button"
            variant="outline"
            className="h-11 md:h-9"
            disabled={importaciones.pidiendo}
            onClick={importaciones.verMas}
          >
            {importaciones.pidiendo ? 'Cargando…' : 'Ver más'}
          </Button>
        </div>
      ) : null}
      {importaciones.enElTope ? (
        <AvisoDeTope texto="Se muestran las 500 importaciones más recientes." />
      ) : null}
    </section>
  )
}

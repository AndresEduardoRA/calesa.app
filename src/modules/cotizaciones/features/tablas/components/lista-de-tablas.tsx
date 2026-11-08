'use client'

import Link from 'next/link'
import { parseAsString, useQueryStates } from 'nuqs'
import { fechaRelativa } from '@/shared/lib/fechas'
import { formatearNumero } from '@/shared/lib/formato'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Badge } from '@/shared/ui/badge'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { useRegional } from '@/shared/ui/regional'
import { TOPE_DE_TABLAS, type TablaDeReferencia } from '../../../entities/tablas/lectura'
import { rutaDeLasTablas } from '../../../entities/tablas/rutas'

type Origen = { id: string; nombre: string; activo: boolean }

type Props = {
  // Los orígenes donde quien mira configura las tablas (al menos uno), en el orden del catálogo.
  origenes: readonly Origen[]
  origen: Origen
  lectura: { tablas: readonly TablaDeReferencia[]; hayMas: boolean }
}

const etiquetaDe = (origen: Origen) =>
  origen.activo ? origen.nombre : `${origen.nombre} (inactivo)`

function Publicada({ tabla }: { tabla: TablaDeReferencia }) {
  const { zonaHoraria } = useRegional()
  const partes = [
    `Versión ${formatearNumero(tabla.version, { decimales: 0 })}`,
    tabla.publicadoPor,
    tabla.publicadoEn ? fechaRelativa(tabla.publicadoEn, { zona: zonaHoraria }) : null,
  ].filter((parte): parte is string => parte !== null)
  return <p className="text-(--color-ink-soft)">{partes.join(' · ')}</p>
}

// La lista de tablas de referencia de un origen y las compartidas (4.23-3, C3): con más de un origen, un selector que escribe `?origen=` (y borra `?tabla=`); cada tabla
// abre su editor. Las tablas nuevas y sus columnas se crean por SQL (P5 del 4.23-1).
export function ListaDeTablas({ origenes, origen, lectura }: Props) {
  const [url, setUrl] = useQueryStates(
    { origen: parseAsString, tabla: parseAsString },
    { shallow: false },
  )
  // Lo elegido se ve en el acto, mientras el servidor lee el origen nuevo.
  const elegido = origenes.some((uno) => uno.id === url.origen) ? url.origen : origen.id
  return (
    <>
      {origenes.length > 1 ? (
        <div className="max-w-xs">
          <CampoSeleccion
            nombre="origen-de-las-tablas"
            etiqueta="Origen"
            opciones={origenes.map((uno) => ({ valor: uno.id, etiqueta: etiquetaDe(uno) }))}
            value={elegido ?? origen.id}
            onChange={(evento) => {
              void setUrl({ origen: evento.target.value, tabla: null })
            }}
          />
        </div>
      ) : null}
      {lectura.tablas.length === 0 ? (
        <div className="grid gap-1 rounded-(--radius-lg) border border-(--color-line) bg-(--color-surface) p-3 text-(length:--text-sm)">
          <p className="text-(--color-ink)">{origen.nombre} no tiene tablas de referencia.</p>
          <p className="text-(--color-ink-soft)">
            Las tablas nuevas y sus columnas todavía no se crean desde aquí.
          </p>
        </div>
      ) : (
        <ul
          aria-label={`Tablas de referencia de ${origen.nombre}`}
          className="grid grid-cols-[minmax(0,1fr)] gap-2"
        >
          {lectura.tablas.map((tabla) => (
            <li
              key={tabla.id}
              className="grid min-w-0 gap-1 rounded-(--radius-lg) border border-(--color-line) bg-(--color-surface) p-3 text-(length:--text-sm)"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <Link
                  href={rutaDeLasTablas(origen.id, tabla.id)}
                  className="font-semibold break-words text-(--color-ink) underline-offset-4 hover:underline"
                >
                  {tabla.nombre}
                </Link>
                <span className="break-all text-(--color-ink-faint)">{tabla.clave}</span>
                {tabla.compartida ? <Badge variant="secondary">Compartida</Badge> : null}
                {tabla.tapada ? (
                  <Badge variant="outline">Tapada por la de {origen.nombre}</Badge>
                ) : null}
              </div>
              <Publicada tabla={tabla} />
            </li>
          ))}
        </ul>
      )}
      {lectura.hayMas ? (
        <AvisoDeTope
          texto={`Mostrando las ${formatearNumero(TOPE_DE_TABLAS, { decimales: 0 })} primeras tablas.`}
        />
      ) : null}
    </>
  )
}

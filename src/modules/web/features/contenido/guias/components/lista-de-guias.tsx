'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { formatearFecha } from '@/shared/lib/fechas'
import {
  AbrirResumen,
  CabeceraPegada,
  CeldaPegada,
  FilaDeLista,
  TablaDeLista,
  TarjetaDeLista,
  UnaSolaVista,
} from '@/shared/ui/lista'
import { useRegional } from '@/shared/ui/regional'
import { TableBody, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { rutaDeGuia, type GuiaDeLista } from '../../../../entities/contenido/guias'
import { EstadoDeLaGuia } from './estado-de-la-guia'

type Props = { filas: readonly GuiaDeLista[]; ahora: string }

const SIN = 'Sin asignar'

function Tabla({ filas, ahora }: Props) {
  const router = useRouter()
  const { zonaHoraria } = useRegional()
  return (
    <TablaDeLista className="@container">
      <TableHeader>
        <TableRow>
          <CabeceraPegada lado="nombre">Título</CabeceraPegada>
          <TableHead>Categoría</TableHead>
          <TableHead>Autor</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Actualizada</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filas.map((guia) => (
          <FilaDeLista
            key={guia.id}
            alAbrir={() => {
              router.push(rutaDeGuia(guia.id) as Route)
            }}
          >
            <CeldaPegada lado="nombre">
              <AbrirResumen nombre={guia.titulo} className="max-w-96 min-w-0 truncate">
                {guia.titulo}
              </AbrirResumen>
            </CeldaPegada>
            <td className="p-2 text-(--color-ink-soft)">{guia.categoria ?? SIN}</td>
            <td className="p-2 text-(--color-ink-soft)">{guia.autor ?? SIN}</td>
            <td className="p-2">
              <EstadoDeLaGuia publicadaEn={guia.publicadaEn} ahora={ahora} zona={zonaHoraria} />
            </td>
            <td className="p-2 text-(--color-ink-soft)">
              {formatearFecha(guia.actualizadoEn, { zona: zonaHoraria })}
            </td>
          </FilaDeLista>
        ))}
      </TableBody>
    </TablaDeLista>
  )
}

function Tarjetas({ filas, ahora }: Props) {
  const router = useRouter()
  const { zonaHoraria } = useRegional()
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {filas.map((guia) => (
        <TarjetaDeLista
          key={guia.id}
          alAbrir={() => {
            router.push(rutaDeGuia(guia.id) as Route)
          }}
        >
          <AbrirResumen nombre={guia.titulo} className="min-w-0 font-medium break-words">
            {guia.titulo}
          </AbrirResumen>
          <EstadoDeLaGuia publicadaEn={guia.publicadaEn} ahora={ahora} zona={zonaHoraria} />
          <p className="text-(length:--text-sm) break-words text-(--color-ink-soft)">
            {[guia.categoria, guia.autor].filter(Boolean).join(' · ') || SIN} · Actualizada el{' '}
            {formatearFecha(guia.actualizadoEn, { zona: zonaHoraria })}
          </p>
        </TarjetaDeLista>
      ))}
    </ul>
  )
}

// La lista de guías: tabla desde 768 px y tarjetas debajo (una sola vista). Un clic en la fila abre la guía.
export function ListaDeGuias({ filas, ahora }: Props) {
  return (
    <UnaSolaVista
      tabla={() => <Tabla filas={filas} ahora={ahora} />}
      tarjetas={() => <Tarjetas filas={filas} ahora={ahora} />}
    />
  )
}

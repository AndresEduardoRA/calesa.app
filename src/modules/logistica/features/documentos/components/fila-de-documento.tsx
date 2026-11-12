'use client'

import { Button } from '@/shared/ui/button'
import { formatearFecha } from '@/shared/lib/fechas'
import { TarjetaDeLista } from '@/shared/ui/lista'
import { Badge } from '@/shared/ui/badge'
import { useRegional } from '@/shared/ui/regional'
import type { DocumentoDeLaUnidad, TipoDeDocumento } from '../../../entities/documentos/documento'
import { formatearBytes } from '../../../entities/documentos/tamano'
import { textoDelVencimiento } from '../../../entities/documentos/vencimiento'
import { AccionesDelDocumento } from './acciones-del-documento'
import type { ContextoDeLaFila } from './contexto-de-la-fila'
import { EstadoDelDocumento } from './estado-del-documento'
import { abrirDocumento } from './ver-documento'

const OTRA_PERSONA = 'otra persona'

type Props = {
  documento: DocumentoDeLaUnidad
  // El tipo del documento: `null` en «Otro tipo» (el que ya no está entre los activos).
  tipo: TipoDeDocumento | null
  contexto: ContextoDeLaFila
  nombres: Readonly<Record<string, string>>
  hoy: string
}

function nombreDe(id: string | null, nombres: Readonly<Record<string, string>>): string | null {
  return id ? (nombres[id] ?? OTRA_PERSONA) : null
}

// «Subido por Ana el 3 mar 2027. Revisado por Luis el 4 mar 2027»: sin nombre un uuid nunca se muestra (D8).
function Autoria({ documento, nombres }: Pick<Props, 'documento' | 'nombres'>) {
  const { zonaHoraria } = useRegional()
  const subidoPor = nombreDe(documento.subidoPor, nombres)
  const revisadoPor = nombreDe(documento.revisadoPor, nombres)
  const fecha = (iso: string) => formatearFecha(iso, { zona: zonaHoraria })
  return (
    <p className="min-w-0 text-(length:--text-sm) break-words text-(--color-ink-soft)">
      Subido{subidoPor ? ` por ${subidoPor}` : ''} el {fecha(documento.creadoEn)}
      {documento.revisadoEn
        ? `. Revisado${revisadoPor ? ` por ${revisadoPor}` : ''} el ${fecha(documento.revisadoEn)}`
        : ''}
    </p>
  )
}

function PesoYVencimiento({ documento, hoy }: Pick<Props, 'documento' | 'hoy'>) {
  const vencimiento = textoDelVencimiento(documento.venceEl, hoy)
  return (
    <p className="flex min-w-0 flex-wrap gap-x-3 text-(length:--text-sm) text-(--color-ink-soft)">
      {documento.bytes !== null ? <span>{formatearBytes(documento.bytes)}</span> : null}
      {vencimiento ? (
        <span className={vencimiento === 'Vencido' ? 'text-destructive font-medium' : undefined}>
          {vencimiento}
        </span>
      ) : null}
    </p>
  )
}

function Archivo({ ruta, nombre }: { ruta: string; nombre: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        className="min-h-11 md:min-h-9"
        aria-label={`Ver ${nombre}`}
        onClick={() => void abrirDocumento(ruta, nombre, 'ver')}
      >
        Ver
      </Button>
      <Button
        variant="outline"
        className="min-h-11 md:min-h-9"
        aria-label={`Descargar ${nombre}`}
        onClick={() => void abrirDocumento(ruta, nombre, 'descargar')}
      >
        Descargar
      </Button>
    </div>
  )
}

// Un documento de la unidad: su archivo, su estado en texto, el motivo del rechazo, el vencimiento, quién lo subió y quién lo revisó. «Ver» y «Descargar» piden una URL firmada al tocar;
// «Aprobar» y «Rechazar» (6.06-3) revisan la fila.
export function FilaDeDocumento({ documento, tipo, contexto, nombres, hoy }: Props) {
  const nombre = documento.nombre ?? 'Documento sin nombre'
  return (
    <TarjetaDeLista>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="min-w-0 font-medium break-words">{nombre}</span>
        <EstadoDelDocumento estado={documento.estado} />
        {documento.visiblePortal ? <Badge variant="outline">Visible en el portal</Badge> : null}
      </div>
      {documento.estado === 'rechazado' && documento.motivoDeRechazo ? (
        <p className="text-destructive min-w-0 text-(length:--text-sm) break-words">
          Rechazado: {documento.motivoDeRechazo}
        </p>
      ) : null}
      <PesoYVencimiento documento={documento} hoy={hoy} />
      <Autoria documento={documento} nombres={nombres} />
      {documento.nota ? (
        <p className="min-w-0 text-(length:--text-sm) break-words">{documento.nota}</p>
      ) : null}
      {documento.ruta ? <Archivo ruta={documento.ruta} nombre={nombre} /> : null}
      <AccionesDelDocumento documento={documento} tipo={tipo} contexto={contexto} />
    </TarjetaDeLista>
  )
}

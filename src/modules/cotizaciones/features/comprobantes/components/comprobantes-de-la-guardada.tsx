import { Suspense, type ReactNode } from 'react'
import { formatearFechaHora } from '@/shared/lib/fechas'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Badge } from '@/shared/ui/badge'
import { Skeleton } from '@/shared/ui/skeleton'
import { leerComprobantesDeLaCotizacion } from '../../../areas/comprobantes/composicion'
import {
  puedeAnularComprobantes,
  seVenLosComprobantes,
} from '../../../entities/comprobantes/acceso'
import {
  numeroDeComprobante,
  type ComprobanteDeLaCotizacion,
} from '../../../entities/comprobantes/comprobante'
import type { PropsDeUnHuecoDeLaGuardada } from '../../hoja/components/huecos'
import { AnularElVigente } from './anular-el-vigente'
import { ErrorDeLectura } from './error-de-lectura'

const TITULO = 'comprobantes-de-la-cotizacion'
const TEXTO = 'text-(length:--text-sm) text-(--color-ink-soft)'

// La sección «Comprobantes» bajo la hoja (hueco `Debajo`, 4.26-2): se lee en el servidor tras `<Suspense>` (el mismo `cache` que el botón de la cabecera) y se
// dibuja en una final o en una cotización que ya tiene alguno. No muestra `datos` (P4 a): el cliente y el vehículo ya los dice la cabecera, con sus permisos.
export function ComprobantesDeLaGuardada(props: PropsDeUnHuecoDeLaGuardada) {
  return (
    <Suspense fallback={props.cotizacion.clase === 'final' ? <Esqueleto /> : null}>
      <Seccion {...props} />
    </Suspense>
  )
}

function Esqueleto() {
  return (
    <div className="grid gap-2" aria-hidden>
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-12 w-full" />
    </div>
  )
}

function Marco({ children }: { children: ReactNode }) {
  return (
    <section aria-labelledby={TITULO} className="grid min-w-0 gap-3">
      <h2 id={TITULO} className="text-(length:--text-lg) font-semibold text-(--color-ink)">
        Comprobantes
      </h2>
      {children}
    </section>
  )
}

async function Seccion({ cotizacion, permisos }: PropsDeUnHuecoDeLaGuardada) {
  const lectura = await leerComprobantesDeLaCotizacion(cotizacion.id)
  if (!lectura.ok) {
    return cotizacion.clase === 'final' ? (
      <Marco>
        <ErrorDeLectura titulo="No se pudieron cargar los comprobantes" />
      </Marco>
    ) : null
  }
  const { filas, hayMas } = lectura.data
  if (!seVenLosComprobantes(cotizacion.clase, filas)) {
    return null
  }
  const puedeAnular = puedeAnularComprobantes(permisos)
  return (
    <Marco>
      {filas.length === 0 ? (
        <p className={TEXTO}>Todavía no tiene comprobantes.</p>
      ) : (
        <ul className="grid gap-3">
          {filas.map((comprobante) => (
            <Fila key={comprobante.id} comprobante={comprobante} puedeAnular={puedeAnular} />
          ))}
        </ul>
      )}
      {hayMas ? (
        <AvisoDeTope texto={`Mostrando los ${String(TAMANO_DE_VER_MAS)} más recientes.`} />
      ) : null}
    </Marco>
  )
}

function Fila({
  comprobante,
  puedeAnular,
}: {
  comprobante: ComprobanteDeLaCotizacion
  puedeAnular: boolean
}) {
  const numero = numeroDeComprobante(comprobante.serie, comprobante.numero)
  const vigente = comprobante.anuladoEn === null
  return (
    <li className="flex flex-wrap items-start justify-between gap-2" data-comprobante={numero}>
      <div className="grid min-w-0 gap-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-(--color-ink)">{numero}</span>
          <Badge variant={vigente ? 'secondary' : 'destructive'}>
            {vigente ? 'Vigente' : 'Anulado'}
          </Badge>
        </p>
        <p className={TEXTO}>
          Emitido el {formatearFechaHora(comprobante.emitidoEn)}
          {comprobante.emitidoPor ? ` por ${comprobante.emitidoPor}` : ''}
        </p>
        {comprobante.anuladoEn === null ? null : (
          <p className={`${TEXTO} break-words`}>
            Anulado el {formatearFechaHora(comprobante.anuladoEn)}
            {comprobante.anuladoPor ? ` por ${comprobante.anuladoPor}` : ''}
            {comprobante.motivo ? `: ${comprobante.motivo}` : ''}
          </p>
        )}
      </div>
      {vigente && puedeAnular ? (
        <AnularElVigente comprobanteId={comprobante.id} numero={numero} />
      ) : null}
    </li>
  )
}

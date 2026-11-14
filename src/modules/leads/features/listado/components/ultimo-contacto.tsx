import type { Route } from 'next'
import Link from 'next/link'
import { cn } from 'cn'
import { Button } from '@/shared/ui/button'
import { useAhora } from '@/shared/ui/use-ahora'
import { useRegional } from '@/shared/ui/regional'
import { accionesDelMenu, type ParaMarcar } from './tipos'
import { IconoDelCatalogo } from '@/shared/ui/icono-del-catalogo/icono-del-catalogo'
import type { FilaDeLead } from '../../../entities/listado'
import {
  rutaDelRecordatorioDeFila,
  rutaDelSeguimientoDeFila,
  textoDelRecordatorio,
  textoDelUltimoSeguimiento,
  tipoDeSeguimientoDelCatalogo,
  type TipoDeSeguimientoEnCatalogo,
} from '../../../entities/ultimo-contacto'

// Lo que el listado le pasa a todas sus filas: los tipos de seguimiento (nombre e icono) y el instante de la página (ISO, el del servidor).
export type DatosDeUltimoContacto = {
  tipos: readonly TipoDeSeguimientoEnCatalogo[]
  ahora: string
}

// Lo que el listado necesita para decir «hace X»: los tipos de seguimiento (nombre e icono), el instante contra el que se cuenta (avanza cada minuto) y
// la zona de la empresa.
export type ParaUltimoContacto = {
  tipos: readonly TipoDeSeguimientoEnCatalogo[]
  ahora: Date
  zona: string
  // Con el lead en la cartera y `leads.editar`: el atajo de cada vacío. Nulo sin el permiso o fuera de la cartera.
  alAnotar: (() => void) | null
  alAgendar: (() => void) | null
  // En la tarjeta del celular, en media columna: la hora debajo del título (en la tabla, a su lado).
  apilado?: boolean
}

const ENLACE =
  'rounded-(--radius-sm) text-(--color-ink) underline-offset-2 hover:underline focus-visible:underline'

// El atajo de un vacío: un botón de texto del alto táctil en el celular.
function AtajoDeVacio({ texto, alPulsar }: { texto: string; alPulsar: () => void }) {
  return (
    <Button
      type="button"
      variant="link"
      className="inline-flex h-auto min-h-11 w-fit px-0 text-(length:--text-xs) md:min-h-7"
      onClick={alPulsar}
    >
      {texto}
    </Button>
  )
}

// El último seguimiento del lead: su tipo (con el icono del catálogo), su título y «hace 3 días»; un clic abre la ficha en sus seguimientos. Si el último es
// privado de otra persona sólo se dice «hace X» (la fecha es pública); sin seguimientos, «Sin seguimientos» y el atajo para anotar el primero.
export function UltimoSeguimientoDeFila({
  lead,
  contexto,
}: {
  lead: FilaDeLead
  contexto: ParaUltimoContacto
}) {
  const { ultimoSeguimientoEn: en, ultimoSeguimiento: detalle } = lead
  if (en === null) {
    // Sin envoltorio: cada fila de 100 paga cada nodo (`docs/RENDIMIENTO.md`); el texto y el atajo quedan uno al lado del otro y bajan si no caben.
    return (
      <>
        <span className="mr-2 text-(length:--text-xs) text-(--color-ink-soft)">
          Sin seguimientos
        </span>
        {contexto.alAnotar ? (
          <AtajoDeVacio texto="Anotar seguimiento" alPulsar={contexto.alAnotar} />
        ) : null}
      </>
    )
  }
  const cuando = textoDelUltimoSeguimiento(en, contexto)
  const tipo = detalle ? tipoDeSeguimientoDelCatalogo(contexto.tipos, detalle.tipoId) : null
  // Una línea y pocos nodos (cada fila de 100 paga cada uno): icono, título (que se corta) y «hace X» (que no).
  return (
    <Link
      href={rutaDelSeguimientoDeFila(lead.id) as Route}
      className={cn(
        'min-w-0 items-center gap-x-1',
        contexto.apilado ? 'grid grid-cols-[auto_minmax(0,1fr)]' : 'flex',
        ENLACE,
      )}
      data-ultimo-seguimiento=""
    >
      {detalle ? (
        <>
          <IconoDelCatalogo clave={tipo?.icono} className="size-3.5" deLista />
          <span className="min-w-0 truncate text-(length:--text-sm)">
            {tipo ? `${tipo.nombre}: ` : ''}
            {detalle.titulo}
          </span>
        </>
      ) : null}
      <span
        className={cn(
          'text-(length:--text-xs) text-(--color-ink-soft)',
          contexto.apilado ? (detalle ? 'col-start-2' : 'col-span-2') : 'shrink-0',
        )}
      >
        {cuando}
      </span>
    </Link>
  )
}

// El próximo recordatorio de quien mira sobre el lead: su título y «en 2 días»; vencido, resaltado y dicho con texto («vencido hace 1 día»). Un clic lo abre.
// Sin recordatorio, un guion y el atajo para programar uno.
export function RecordatorioDeFila({
  lead,
  contexto,
}: {
  lead: FilaDeLead
  contexto: ParaUltimoContacto
}) {
  const recordatorio = lead.proximoRecordatorio
  if (recordatorio === null) {
    return (
      <>
        <span role="img" aria-label="Sin recordatorio" className="mr-2 text-(--color-ink-faint)">
          —
        </span>
        {contexto.alAgendar ? (
          <AtajoDeVacio texto="Programar" alPulsar={contexto.alAgendar} />
        ) : null}
      </>
    )
  }
  const { texto, vencido } = textoDelRecordatorio(recordatorio.recordarEn, contexto)
  return (
    <Link
      href={rutaDelRecordatorioDeFila(lead.id, lead.enCartera, recordatorio.id) as Route}
      className={cn('min-w-0 items-center gap-x-1', contexto.apilado ? 'grid' : 'flex', ENLACE)}
      data-recordatorio-de-fila=""
      data-vencido={vencido ? 'true' : undefined}
    >
      <span className="min-w-0 truncate text-(length:--text-sm)">{recordatorio.titulo}</span>
      <span
        className={cn(
          'w-fit text-(length:--text-xs)',
          !contexto.apilado && 'shrink-0',
          vencido
            ? 'rounded-(--radius-sm) bg-(--color-aviso-soft) px-1 font-medium text-(--color-aviso-ink)'
            : 'text-(--color-ink-soft)',
        )}
      >
        {texto}
      </span>
    </Link>
  )
}

// El contexto de cada fila: el reloj de la lista (uno solo, cada minuto), la zona de la empresa y los atajos de los vacíos de ESA fila
// (sólo con el lead en la cartera y `leads.editar`, como el «⋯»).
export function useContextoDeUltimoContacto(datos: DatosDeUltimoContacto, marcar: ParaMarcar) {
  const ahora = useAhora(datos.ahora)
  const { zonaHoraria: zona } = useRegional()
  return (lead: FilaDeLead): ParaUltimoContacto => {
    const acciones = accionesDelMenu(marcar, lead)
    return {
      tipos: datos.tipos,
      ahora,
      zona,
      alAnotar: acciones?.alAnotar ?? null,
      alAgendar: acciones?.alAgendar ?? null,
    }
  }
}

// Los dos datos en la tarjeta del celular: dos columnas con su rótulo arriba (una sola con el texto al 200 %). `dt` y `dd` van sin envoltorio
// (`grid-flow-col` los acomoda de a dos por columna): cada tarjeta de 100 paga cada nodo (`docs/RENDIMIENTO.md`).
export function UltimoContactoDeTarjeta({
  lead,
  contexto,
}: {
  lead: FilaDeLead
  contexto: ParaUltimoContacto
}) {
  return (
    <dl className="grid grid-flow-col grid-cols-2 grid-rows-[auto_1fr] gap-x-3 border-t border-(--color-line) pt-2 @max-[16rem]:grid-flow-row @max-[16rem]:grid-cols-1 @max-[16rem]:grid-rows-none">
      <dt className="truncate text-(length:--text-xs) text-(--color-ink-soft)">
        Último seguimiento
      </dt>
      <dd className="min-w-0">
        <UltimoSeguimientoDeFila lead={lead} contexto={{ ...contexto, apilado: true }} />
      </dd>
      <dt className="truncate text-(length:--text-xs) text-(--color-ink-soft)">Recordatorio</dt>
      <dd className="min-w-0">
        <RecordatorioDeFila lead={lead} contexto={{ ...contexto, apilado: true }} />
      </dd>
    </dl>
  )
}

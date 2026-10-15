'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { Bloque } from '@/shared/ui/bloque'
import { useRegional } from '@/shared/ui/regional'
import { nombreDeLead, type Relaciones, type Vinculo } from '../../../entities/vinculo'
import { BotonDesvincular } from './boton-desvincular'

type Props = {
  relaciones: Relaciones
  // El vehículo, si quien mira lo puede editar: entonces puede desvincularlo.
  editable?: { id: string; titulo: string; numero: number; actualizadoEn: string } | null
}

const SUBTITULO = 'text-(length:--text-xs) font-medium text-(--color-ink-soft)'
const DETALLE = 'text-(length:--text-xs) text-(--color-ink-soft)'

// «Ana Quispe · lead #12», o cómo se dice un lead que quien mira no ve.
function Lead({ nombre, numero }: { nombre: string; numero: number | null }) {
  return (
    <span className="font-medium text-(--color-ink)">
      {nombre}
      {numero === null ? null : (
        <span className="font-normal text-(--color-ink-soft) tabular-nums"> · lead #{numero}</span>
      )}
    </span>
  )
}

function Periodo({ vinculo, zona }: { vinculo: Vinculo; zona: string }) {
  const desde = formatearFecha(vinculo.desde, { zona })
  const cuando = vinculo.hasta
    ? `Del ${desde} al ${formatearFecha(vinculo.hasta, { zona })}`
    : `Desde el ${desde}`
  return (
    <span className={DETALLE}>
      {cuando}
      {vinculo.porNombre ? ` · lo vinculó ${vinculo.porNombre}` : null}
    </span>
  )
}

// A qué lead está vinculado un vehículo (con su historial) y qué leads mostraron interés. Se vincula y
// se marca interés desde la ficha del lead; acá, quien edita el vehículo puede desvincularlo. El nombre
// de un lead aparece únicamente si quien mira lo ve.
export function VinculoEInteresados({ relaciones, editable = null }: Props) {
  const { zonaHoraria: zona } = useRegional()
  const { vinculo, historial, interesados } = relaciones
  return (
    <Bloque titulo="Vínculo e interesados">
      <div className="grid gap-4 text-(length:--text-sm)">
        <section aria-label="Vínculo" className="grid gap-1.5">
          <h3 className={SUBTITULO}>Vínculo</h3>
          {vinculo ? (
            <p className="grid gap-0.5">
              <Lead nombre={nombreDeLead(vinculo)} numero={vinculo.leadNumero} />
              <Periodo vinculo={vinculo} zona={zona} />
            </p>
          ) : null}
          {vinculo && editable ? <BotonDesvincular vehiculo={editable} /> : null}
          {vinculo ? null : (
            <p className="text-(--color-ink-soft)">
              Sin vínculo: ningún lead es dueño ni comprador de este vehículo.
            </p>
          )}
          {historial.length > 0 ? (
            <ul aria-label="Vínculos anteriores" className="grid gap-1.5 pt-1">
              {historial.map((anterior) => (
                <li key={`${anterior.leadId}-${anterior.desde}`} className="grid gap-0.5">
                  <Lead nombre={nombreDeLead(anterior)} numero={anterior.leadNumero} />
                  <Periodo vinculo={anterior} zona={zona} />
                </li>
              ))}
            </ul>
          ) : null}
        </section>
        <section aria-label="Interesados" className="grid gap-1.5">
          <h3 className={SUBTITULO}>Interesados</h3>
          {interesados.length === 0 ? (
            <p className="text-(--color-ink-soft)">
              Ninguno de los leads que ves mostró interés en este vehículo.
            </p>
          ) : (
            <ul className="grid gap-2">
              {interesados.map((interesado) => (
                <li key={interesado.leadId} className="grid gap-0.5">
                  <Lead nombre={interesado.leadNombre} numero={interesado.leadNumero} />
                  {interesado.nota ? <span>{interesado.nota}</span> : null}
                  <span className={DETALLE}>
                    {formatearFecha(interesado.creadoEn, { zona })}
                    {interesado.porNombre ? ` · lo marcó ${interesado.porNombre}` : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Bloque>
  )
}

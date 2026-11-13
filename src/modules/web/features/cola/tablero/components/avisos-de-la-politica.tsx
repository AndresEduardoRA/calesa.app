import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { Aviso } from '@/shared/ui/aviso'
import type { PoliticaDeLaCola } from '../../../../entities/cola/politica'

type Props = {
  politica: PoliticaDeLaCola
  // Quien mira puede cargar el WhatsApp de respaldo en Sitio web.
  puedeEditarElSitio: boolean
}

// Lo que impide que la cola funcione como se espera, arriba de todo y sólo si pasa: la cola apagada (la ruleta no reparte) o sin WhatsApp de respaldo
// (a quien no recibe un asesor no se le ofrece a quién escribir).
export function AvisosDeLaPolitica({ politica, puedeEditarElSitio }: Props) {
  if (politica.colaActiva && politica.whatsappRespaldo) {
    return null
  }
  return (
    <div className="grid gap-2">
      {politica.colaActiva ? null : (
        <Aviso tono="aviso">La cola está apagada: la rueda no reparte turnos nuevos.</Aviso>
      )}
      {politica.whatsappRespaldo ? null : (
        <Aviso tono="aviso">
          Falta el WhatsApp de respaldo: quien no reciba un asesor no tendrá a quién escribir.{' '}
          {puedeEditarElSitio ? (
            <Link
              href={RUTAS.configuracionDeWeb as Route}
              className="inline-flex min-h-11 items-center underline md:min-h-0"
            >
              Cargarlo en Sitio web
            </Link>
          ) : null}
        </Aviso>
      )}
    </div>
  )
}

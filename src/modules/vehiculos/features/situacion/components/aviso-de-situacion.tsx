'use client'

import { useRouter } from 'next/navigation'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import {
  accionesDeSituacion,
  pedidoParaResolver,
  textoDelAvisoDeSituacion,
  type ResolucionDeSubasta,
  type Situacion,
} from '../../../entities/situacion'
import { useNoGanada } from '../hooks/use-no-ganada'
import { BotonesDeSituacion, CLASE_DE_BOTON } from './botones-de-situacion'

type Props = {
  vehiculoId: string
  origen: { id: string; nombre: string }
  situacion: Situacion
  // El nombre de su fase, o null si todavía no tiene.
  fase: string | null
  // Si quien mira puede resolver la subasta (`puedeResolverLaSubasta`; la base vuelve a decidir).
  puede: boolean
  // «La ganamos» abre el mover de logística en su modo (`/logistica/vehiculo/<id>?ganada=si`): lo arma `src/app`.
  hrefLaGanamos: string
  resolucion: ResolucionDeSubasta | null
  // La fecha de la resolución, ya escrita en la zona de la empresa.
  fecha: string | null
}

// La situación en la ficha, bajo la cabecera: «Sin resolver» pregunta con «La ganamos» y «No la ganamos»; «No ganada» dice quién y cuándo, con
// «Deshacer». Sin permiso, el texto sin botones y a quién pedirlo. En subasta o en su fase, nada (el bloque de la subasta ya lo dice).
export function AvisoDeSituacion(props: Props) {
  const { vehiculoId, origen, situacion, puede, hrefLaGanamos } = props
  const router = useRouter()
  const { marcar, enviando, conflicto, error } = useNoGanada({ vehiculoId, origenId: origen.id })
  const texto = textoDelAvisoDeSituacion(props)
  if (texto === null) return null
  const acciones = accionesDeSituacion({ situacion, puede })
  return (
    <Aviso tono={situacion === 'sin_resolver' ? 'aviso' : 'info'}>
      <section aria-label="Situación de la subasta" className="grid gap-2" data-aviso="situacion">
        <p>{texto}</p>
        {puede ? null : <p>{pedidoParaResolver(origen.nombre)}</p>}
        {conflicto ? (
          <div className="flex flex-wrap items-center gap-2">
            <p>{conflicto} No se cambió nada.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={CLASE_DE_BOTON}
              onClick={() => {
                router.refresh()
              }}
            >
              Recargar
            </Button>
          </div>
        ) : null}
        {error ? <p role="alert">{error}</p> : null}
        {conflicto ? null : (
          <BotonesDeSituacion
            acciones={acciones}
            hrefLaGanamos={hrefLaGanamos}
            enviando={enviando}
            alMarcar={(noGanada) => void marcar(noGanada)}
          />
        )}
      </section>
    </Aviso>
  )
}

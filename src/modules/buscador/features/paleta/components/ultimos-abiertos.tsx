import { CommandGroup } from '@/shared/ui/command'
import type { DestinoDeLaAccion } from '../../../entities/acciones-de-la-paleta'
import type { EstadoDeLosUltimos } from '../../../entities/estado-de-la-paleta'
import { FilaDeResultado } from './fila-de-resultado'
import { Reintentar } from './reintentar'

type Props = {
  estado: EstadoDeLosUltimos
  alReintentar: () => void
  alElegir: (destino: DestinoDeLaAccion) => void
}

const AVISO = 'px-3 py-2 text-(length:--text-sm) text-(--color-ink-soft)'

// «Últimos abiertos»: lo que la persona abrió hace poco, de lo más reciente a lo más viejo (ya vienen acotados y ordenados).
export function UltimosAbiertos({ estado, alReintentar, alElegir }: Props) {
  if (estado.tipo === 'cargando') {
    return (
      <p role="status" className={AVISO}>
        Cargando…
      </p>
    )
  }
  if (estado.tipo === 'error' || estado.tipo === 'sin_conexion') {
    return (
      <div className={AVISO}>
        <p role="status">{estado.mensaje}</p>
        <Reintentar alReintentar={alReintentar} />
      </div>
    )
  }
  if (estado.abiertos.length === 0) {
    return <p className={AVISO}>Aún no has abierto nada.</p>
  }
  return (
    <CommandGroup heading="Últimos abiertos">
      {estado.abiertos.map((abierto) => (
        <FilaDeResultado
          key={`${abierto.tipo}:${abierto.fila.id}`}
          abierto={abierto}
          alElegir={alElegir}
        />
      ))}
    </CommandGroup>
  )
}

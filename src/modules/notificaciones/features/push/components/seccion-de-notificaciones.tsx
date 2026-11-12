'use client'

import { useRouter } from 'next/navigation'
import { EstadoError } from '@/shared/ui/estados'
import { MOTIVO_SIN_PERMISO_PUSH } from '../../../entities/motivos'
import type { ApagadosDePush } from '../../../entities/preferencia-de-push'
import type { SuscripcionPropia } from '../../../entities/suscripcion'
import { PreferenciasPorTipo } from '../../preferencias/components/preferencias-por-tipo'
import { usePush } from '../hooks/use-push'
import { InterruptorDePush } from './interruptor-de-push'
import { MisNavegadores } from './mis-navegadores'

type Props = {
  tienePermiso: boolean
  integracionActiva: boolean
  clavePublica: string | null
  // `null` = la lectura falló: se dibuja el error con «Reintentar».
  suscripciones: SuscripcionPropia[] | null
  apagados: ApagadosDePush | null
}

// El cuerpo del bloque «Notificaciones» de `/perfil`: este navegador, los avisos por tipo y «Tus navegadores».
export function SeccionDeNotificaciones({
  tienePermiso,
  integracionActiva,
  clavePublica,
  suscripciones,
  apagados,
}: Props) {
  const router = useRouter()
  const push = usePush({ tienePermiso, integracionActiva, clavePublica })
  if (suscripciones === null || apagados === null) {
    return (
      <EstadoError
        compacto
        titulo="No se pudieron cargar tus avisos"
        alReintentar={() => router.refresh()}
      />
    )
  }
  return (
    <div className="grid gap-5">
      <InterruptorDePush push={push} />
      <PreferenciasPorTipo
        apagadosIniciales={apagados}
        motivoSiNoPuede={tienePermiso ? null : MOTIVO_SIN_PERMISO_PUSH}
      />
      <MisNavegadores
        suscripciones={suscripciones}
        esteNavegador={push.endpointDeEsteNavegador}
        ocupado={push.enCurso}
        alQuitar={(endpoint) => void push.quitar(endpoint)}
      />
    </div>
  )
}

// Lo que la hoja de cotizar le pasa al panel del vehículo para dar de alta desde él: el origen y si apibara está encendida. Lo arma la página (`src/app`) sólo cuando
// quien mira puede crear vehículos en el origen. El layout del origen no viaja: el alta lo lee desde el navegador al abrirse (`useLayoutDelAlta()`). Fuera de un
// archivo `'use client'`: lo arma el servidor.
import type { OrigenResumen } from '@/modules/origenes/client'
import type { DisponibilidadDeApibara } from '../../entities/apibara'

export type AltaDelPanel = {
  origen: OrigenResumen
  apibara: DisponibilidadDeApibara
}

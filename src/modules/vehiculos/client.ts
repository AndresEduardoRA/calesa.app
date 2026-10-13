// La entrada de CLIENTE del módulo `vehiculos`: lo que puede importar un Client Component de
// `app/` o de otro módulo (`@/modules/vehiculos/client`). Sólo componentes de cliente (o puros) y
// tipos de `entities/`. Nada de servidor: para eso está `index.ts`.
export { TarjetaVehiculo } from './features/listado/components/tarjeta-vehiculo'
export { BadgeDeFase } from './features/listado/components/badge-de-fase'
export type { Vehiculo } from './entities/vehiculo'

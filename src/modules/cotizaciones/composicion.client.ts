// Composición del módulo en el navegador: lo que un componente necesita de `infra/*.client.ts`.
// Separado de `composicion.ts` porque aquel importa `server-only`.
export { leerHistorialDelVehiculo } from './infra/historial-del-vehiculo.client'
export { recalcular } from './infra/recalculo.client'
export { leerTablaDeAyuda } from './infra/tabla-de-ayuda.client'

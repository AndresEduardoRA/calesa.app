// La API de servidor del área `aprobada` de `cotizaciones`. Sale por el `index.ts` de la raíz, que sólo la reexporta (4.15-4).
//
// La cotización aprobada de un vehículo (B4): las lecturas que las páginas de `src/app` unen a otras pantallas (la columna de `/vehiculos`, la insignia del listado) y
// sus tipos. Los componentes salen por `pantallas/aprobada-<pantalla>.ts`.
export { leerAprobadasDeCotizaciones, leerAprobadasDeVehiculos } from './composicion'
export type { CotizacionAprobadaDelVehiculo } from '../../entities/aprobada/tipos'

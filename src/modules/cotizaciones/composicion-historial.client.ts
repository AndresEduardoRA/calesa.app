// Composición del historial del vehículo en el navegador, aparte de `composicion.client.ts`: ése lo importa la hoja (el recálculo) y arrastraría a la carga en frío de
// `/cotizaciones/nuevo` todo lo que reexporta, aunque el historial sólo se pida al desplegarlo (medido en el 4.14-2b: +20 KB). Este archivo lo importa sólo el historial,
// que viaja con `diferido()`.
export { leerHistorialDelVehiculo } from './infra/historial-del-vehiculo.client'

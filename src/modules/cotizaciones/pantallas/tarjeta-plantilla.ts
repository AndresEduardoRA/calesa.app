// Pantalla del área `tarjeta` de `cotizaciones` para la pestaña «Tarjeta» de Configuración › Cotización (4.19-4). Sólo `src/app` importa este archivo: reexporta lo que esa
// pantalla dibuja y nada más, y por eso no pesa en `/cotizaciones/nuevo` (que importa `pantallas/tarjeta.ts`).
//
// La vista previa en vivo del editor de la plantilla: la página la pasa por el hueco `VistaPrevia` del editor (`entities/vista-previa-de-la-plantilla.ts`).
export { VistaPreviaDeLaPlantillaDiferida } from '../features/tarjeta/components/diferidos'

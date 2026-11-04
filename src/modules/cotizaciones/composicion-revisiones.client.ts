// Composición de las revisiones de una cotización en el navegador, aparte de `composicion.client.ts` y de `composicion-historial.client.ts`: ese primero lo importa la hoja
// y arrastraría a la carga en frío de `/cotizaciones/[id]` todo lo que reexporta, aunque las revisiones sólo se pidan al abrir su panel. Este archivo lo importa sólo el panel,
// que viaja con `diferido()`.
export { leerRevisiones } from './infra/revisiones.client'

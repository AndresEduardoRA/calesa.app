// La entrada del SHELL del módulo `leads` para Client Components de `src/app/(app)/_shell/`: abrir «Nuevo lead» desde la paleta de la barra, sin importar el drawer.
// Existe aparte de `client.ts` porque lo que importa el shell viaja en el JS de **todas** las pantallas (`docs/RENDIMIENTO.md`); el alta se pide al abrirse.
export { useAbrirNuevoLead } from './features/alta/hooks/use-panel-de-alta'

// API pública del módulo `agenda` para Client Components: lo puro que dibuja una cosa de la agenda y los tipos de `entities/`.
// Lo usarán el chat (`/tarea`, `/evento`) y el tablero. Nada de `index.ts`, `composicion` ni `infra/`.
export { ChipEvento } from './features/calendario/components/chip-de-agenda'
export { CLASES_DE_AGENDA, type ClaveDeClase, type EntradaDeAgenda } from './entities/agenda'

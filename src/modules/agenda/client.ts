// API pública del módulo `agenda` para Client Components: lo puro que dibuja una cosa de la agenda y los tipos de `entities/`.
// Lo usarán el chat (`/tarea`, `/evento`) y el tablero. Nada de `index.ts` ni `composicion`; de `infra/` sólo lecturas `*.client.ts` (el chat busca personas desde el navegador).
export { ChipEvento } from './features/calendario/components/chip-de-agenda'
export { CLASES_DE_AGENDA, type ClaveDeClase, type EntradaDeAgenda } from './entities/agenda'

// Lo que el chat usa para `/tarea` y `/evento` (7.10-3): el selector de personas, las reglas puras del formulario y completar una tarea desde su ficha.
// `completarTarea`: la RPC decide quién completa (su creador o su responsable); aquí sólo se reexporta, como `completarRecordatorio` en `leads/client.ts`.
export { SelectorDePersonas } from './features/personas/components/selector-de-personas'
export { completarTarea } from './features/tareas/actions/completar-tarea'
export { leerPersonasParaTarea } from './infra/personas.client'
export {
  datosDeEventoNuevo,
  datosDeTareaNueva,
  destinatariosDeEvento,
  LARGO_MAXIMO_DE_TITULO,
  validarEvento,
  validarTarea,
  type ErroresDeEvento,
  type ErroresDeTarea,
  type PersonaElegida,
  type ValoresDeEvento,
  type ValoresDeTarea,
} from './entities/edicion'
export { TOPE_DE_DESTINATARIOS } from './entities/visibilidad'
export type { PersonasEncontradas } from './entities/personas'

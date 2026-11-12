// Composición del módulo en el servidor: aquí se decide qué implementación recibe cada interfaz de `entities/`. Las entradas
// importan de este archivo, nunca de `infra/` (lo verifica eslint-plugin-boundaries).
import 'server-only'
import { repositorioDeMetricas } from './infra/queries/metricas'

export { repositorioDeMetricas }

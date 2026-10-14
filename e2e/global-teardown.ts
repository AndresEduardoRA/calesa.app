import { restaurarAlTerminar } from './soporte/guardia'

// Al terminar, también cuando una prueba falló: apibara como estaba y ningún lead de prueba.
export default async function globalTeardown(): Promise<void> {
  await restaurarAlTerminar()
}

import { exigirFunciones, respaldarAntesDeCorrer } from './soporte/guardia'

// Antes de la primera prueba: lo que una corrida anterior dejó torcido se repone y las funciones edge
// tienen que estar servidas. Ver `soporte/guardia.ts`.
export default async function globalSetup(): Promise<void> {
  await exigirFunciones()
  await respaldarAntesDeCorrer()
}

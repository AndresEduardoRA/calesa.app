// Lo que el lector del PDF de las pruebas no sabe leer lo dice con este prefijo y no adivina (4.18-3a, C12).
export function noEntiende(motivo: string): never {
  throw new Error(`PDF que el lector no entiende: ${motivo}`)
}

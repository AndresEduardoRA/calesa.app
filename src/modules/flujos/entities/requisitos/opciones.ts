// Lo que el bloque de requisitos necesita leer aparte para nombrar las cosas: los tipos de documento (un requisito de documento los nombra por id).
// Se lee del servidor una vez por flujo (`infra/requisitos/opciones.ts`); otra área tiene su propia lectura de los mismos tipos: un área no importa otra.
// También las fases activas del otro flujo (para las esperas).

// Cuántos tipos se leen por grupo (los de toda la empresa y los del flujo); la lectura pide uno más para saber si hay más.
export const TOPE_DE_TIPOS_PARA_REQUISITOS = 100
// Y cuántos flujos y fases del otro ámbito (una espera de repuestos puede apuntar a cualquier flujo de vehículos).
export const TOPE_DE_FLUJOS_PARA_REQUISITOS = 100
export const TOPE_DE_FASES_PARA_REQUISITOS = 1000

export type TipoParaRequisito = {
  id: string
  nombre: string
  formatos: string[]
  activo: boolean
  // Es de este flujo (si no, es de toda la empresa).
  delFlujo: boolean
}

// Una fase activa del otro flujo, con el nombre de su flujo (ya dice de dónde viene).
export type FaseDelOtroFlujo = { id: string; nombre: string; flujo: string }

export type OpcionesDeRequisitos = {
  tipos: TipoParaRequisito[]
  // Algún grupo llegó a su tope: no están todos los tipos.
  truncado: boolean
  // Las fases activas del otro ámbito, por flujo y por orden (lo que una espera puede esperar).
  fases: FaseDelOtroFlujo[]
  fasesTruncado: boolean
}

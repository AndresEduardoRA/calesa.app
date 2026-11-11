// Lo que el bloque de requisitos necesita leer aparte para nombrar las cosas: los tipos de documento (un requisito de documento los nombra por id).
// Se lee del servidor una vez por flujo (`infra/requisitos/opciones.ts`); otra área tiene su propia lectura de los mismos tipos: un área no importa otra.
// La 5.08-2 suma las fases del otro flujo (para las esperas).

// Cuántos tipos se leen por grupo (los de toda la empresa y los del flujo); la lectura pide uno más para saber si hay más.
export const TOPE_DE_TIPOS_PARA_REQUISITOS = 100

export type TipoParaRequisito = {
  id: string
  nombre: string
  formatos: string[]
  activo: boolean
}

export type OpcionesDeRequisitos = {
  tipos: TipoParaRequisito[]
  // Algún grupo llegó a su tope: no están todos los tipos.
  truncado: boolean
}

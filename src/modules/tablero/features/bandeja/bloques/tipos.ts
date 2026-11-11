import type { ReactNode } from 'react'
import type { BloqueBandeja } from '../../../entities/bandeja'

// Lo que recibe el cuerpo de cada bloque: el bloque (su frase de vacío, sus permisos) y la zona horaria de la empresa.
// El título y la `<section>` los dibuja `<Bandeja>`: un archivo de bloque sólo dibuja su cuerpo.
export type ContextoDeBloque = {
  bloque: BloqueBandeja
  zona: string
}

// Un Server Component (async) que lee por la entrada pública del módulo dueño y dibuja el cuerpo del bloque.
export type CuerpoDeBloque = (contexto: ContextoDeBloque) => ReactNode | Promise<ReactNode>

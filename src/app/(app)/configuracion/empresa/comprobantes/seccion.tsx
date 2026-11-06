import type { Permisos } from '@/shared/lib/permisos'

type Props = {
  // La clave de la pestaña de un área que está abierta.
  pestana: string
  permisos: Permisos
  // Los parámetros de la URL, ya resueltos, como los recibe la sección de Monedas.
  parametros: Record<string, string | string[] | undefined>
}

// La sección de una pestaña del área de comprobantes. Es del carril C: el 4.26 dibuja aquí lo que exporte
// `pantallas/comprobantes-empresa.ts`. Hoy no hay pestañas de un área y nunca se alcanza.
export function SeccionDeComprobantes(_props: Props) {
  return null
}

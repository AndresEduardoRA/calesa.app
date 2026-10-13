// Lo que los casos de uso de vistas guardadas necesitan de afuera.
import type { Resultado } from '@/shared/lib/errores'
import type { PantallaConVistas, ParamsDeVista, VistaGuardada } from './vista'

// Las vistas de quien llama en esa pantalla (la RLS es de fila propia).
export type LectorDeVistas = (pantalla: PantallaConVistas) => Promise<Resultado<VistaGuardada[]>>

export type RepositorioVistas = {
  // Con un nombre que ya existe en esa pantalla, la reemplaza.
  guardar: (pedido: {
    usuarioId: string
    pantalla: PantallaConVistas
    nombre: string
    params: ParamsDeVista
  }) => Promise<Resultado<VistaGuardada>>
  eliminar: (pedido: { usuarioId: string; id: string }) => Promise<Resultado<null>>
}

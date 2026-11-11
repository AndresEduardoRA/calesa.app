import { WorkflowIcon } from 'lucide-react'
import { RUTAS } from '@/shared/lib/rutas'
import type { SeccionDeConfiguracion } from '../secciones'

// La entrada de Configuración › Flujos en el hub (5.02). Entra quien configura el flujo de algún origen, el de repuestos o los catálogos de logística (los tipos de
// documento, 5.09). El tipo se trae con `import type`: el ciclo con `secciones.ts` es sólo de tipos y se borra al compilar.
export const SECCION_DE_FLUJOS = {
  clave: 'flujos',
  titulo: 'Flujos',
  descripcion:
    'Las fases de cada origen y del flujo de repuestos: quién las mueve, qué piden para entrar y sus reglas.',
  ruta: RUTAS.configuracionDeFlujos,
  Icono: WorkflowIcon,
  permisos: ['flujos.configurar', 'repuestos.configurar', 'logistica.catalogos.gestionar'],
} as const satisfies SeccionDeConfiguracion

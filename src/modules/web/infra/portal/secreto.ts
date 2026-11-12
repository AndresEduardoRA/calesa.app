import 'server-only'
import { entornoDelServidor } from '@/shared/config/servidor'

// El secreto que firma la cookie del portal, o nulo si el despliegue no lo tiene (el portal responde 503). No sale del área: lo ata
// `areas/portal/composicion.ts` a la firma y a la lectura.
export function secretoDelPortal(): string | null {
  return entornoDelServidor().PORTAL_COOKIE_SECRETO ?? null
}

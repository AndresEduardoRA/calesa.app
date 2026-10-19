// Pantalla: La ficha de un lead (`/leads/[id]`) y sus secciones: seguimientos, oportunidades y portal. Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`): reexporta lo que esa pantalla dibuja y nada más.
export { FichaDeLead } from '../features/ficha/components/ficha-de-lead'
export { LeadNoDisponible } from '../features/ficha/components/lead-no-disponible'
export { SeccionSeguimientos } from '../features/seguimientos/components/seccion-seguimientos'
export { EsqueletoDeSeguimientos } from '../features/seguimientos/components/esqueleto-de-seguimientos'
export { SeccionOportunidades } from '../features/oportunidades/components/seccion-oportunidades'
export { EsqueletoDeOportunidades } from '../features/oportunidades/components/esqueleto-de-oportunidades'
export { SeccionPortal } from '../features/portal/components/seccion-portal'
export { EsqueletoDePortal } from '../features/portal/components/esqueleto-de-portal'

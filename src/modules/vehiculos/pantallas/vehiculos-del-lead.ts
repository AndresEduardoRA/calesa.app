// Pantalla: La sección «Vehículos» de la ficha de un lead (`/leads/[id]`, la compone `app/`: `leads` no importa `vehiculos`). Sólo `src/app` importa este archivo (`.claude/rules/modulos.md`): reexporta lo que esa pantalla dibuja y nada más.
export { SeccionVehiculosDelLead } from '../features/vinculo/components/seccion-vehiculos-del-lead'
export { EsqueletoDeVehiculosDelLead } from '../features/vinculo/components/esqueleto-de-vehiculos-del-lead'

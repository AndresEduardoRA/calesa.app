# leads

Leads (prospectos y clientes) con teléfono principal único y enmascarado salvo cartera, seguimientos, recordatorios, etiquetas, favoritos/tachados, compartir/transferir, oportunidades en embudos, portal del cliente, limbo y papelera.

## Entra y sale

- Entra: drawer «Nuevo lead» (verifica el teléfono al tipear), seguimientos con Tiptap saneado, importación CSV propia.
- Sale: `getLead()`, `buscarLeads()`, `<SelectorLead>`, `<ChipLead>`, `telefonoDe(leadId)` (sólo cartera). Lo consumen `cotizaciones`, `vehiculos`, `agenda`, `chat`, `web`, `repuestos`, `buscador`, `tablero`, `datos`.
- Depende de: `equipo` (permisos y alcance propios/todos).

## Archivos clave

- `entities/telefono.ts` — normalización E.164 por país de la empresa; `entities/cartera.ts` — reglas de acceso (dueño/compartido/adoptado) puras.
- `infra/queries/leads.ts` lee **`leads_vista`** (teléfono enmascarado), nunca la tabla; `infra/rpc.ts` envuelve `crear_lead`, `verificar_telefono`, `compartir_lead`, `transferir_lead`, `otorgar_portal`.
- `features/listado/`, `features/ficha/`, `features/seguimientos/`, `features/recordatorios/`, `features/embudo/` (kanban), `features/portal/`, `features/importar/`.

## Tablas

`leads`, `leads_telefonos`, `leads_asesores` (cartera), `leads_favoritos`, `leads_tachados`, `etiquetas`, `leads_etiquetas`, `tipos_seguimiento`, `seguimientos`, `recordatorios`, `embudos`, `embudos_etapas`, `oportunidades`, `oportunidades_historial`, `accesos_portal`, `origenes_lead`.

## No se rompe

- `telefono_principal` es único entre leads vivos; sólo `crear_lead` y `cambiar_telefono_lead` lo escriben. Si existe: dice de quién es (CTA al chat) o, si está en limbo, lo adopta y queda en `actividad`.
- El teléfono completo sólo lo ve la cartera (`telefono_lead()`), **incluido el dueño**: es deliberado, no un bug.
- Favoritos, tachados y etiquetas son privados por usuario: compartir un lead no los comparte.
- Seguimiento `publico = true` es lo único del lead que ve el portal.

## Ojo

- `leads_vista` existe porque RLS no esconde columnas. Un `select *` sobre `leads` desde la app es un error de revisión.
- El código del portal (`XXX-YYYYY`, alfabeto sin I/O/0/1) se muestra una sola vez en grande; la clave se guarda con bcrypt y nadie la lee.

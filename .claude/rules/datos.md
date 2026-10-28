---
paths:
  - 'src/modules/*/infra/**'
  - 'src/shared/lib/supabase/**'
---

# Capa de datos

- Lecturas en `infra/queries/*.ts` con `import 'server-only'`; realtime y fetch del browser en
  `infra/*.client.ts` (`@/shared/lib/supabase/browser`). Nunca desde componentes.
- El cliente de servidor se crea por request (`createClient()` de `@/shared/lib/supabase/server`).
- El cliente admin (secret key) salta la RLS: sólo en route handlers del portal, webhooks y crons. Única
  excepción, invitar personas: `conAdminDeAuth()` de `src/modules/equipo/infra/invitaciones.ts`, que
  comprueba `equipo.usuarios.gestionar` con el cliente de quien invita antes de crear el admin, entrega
  sólo `auth.admin` (`CuentasInvitadas`) y no asigna el rol. El lint prohíbe importar
  `@/shared/lib/supabase/admin` desde otro archivo. Nunca lee `leads`, `vehiculos` ni `cotizaciones`.
- Los tipos salen de `@/shared/types/database.types`.
- Leads: se leen de `leads_vista`, nunca `from('leads')` para el teléfono. «Míos» de quien tiene
  `leads.ver` «propios» se lee de `leads_cartera_vista`, elegida por `fuenteDelListado()`
  (`modules/leads/entities`), no por cada pantalla. Una búsqueda por nombre o por un campo (público o privado)
  va a `leads_candidatos()` y luego a `leads_vista_por_ids()` (`leerPorCandidatos()`). Una función
  `returns setof leads_vista` nace en `_leads_vista_crear()` sin `strict`, `set`, `security definer` ni
  `volatile`.
- Sin `.insert()` ni `.update()` sobre la tabla, sólo RPC: orígenes y categorías (`origen_*`,
  `categoria_*`); vehículos (`vehiculo_crear` con el `id` del navegador, `vehiculo_guardar`,
  `vehiculo_subasta_refrescar`); fotos (`vehiculo_foto*`; versión de `vehiculos_imagenes_version`).
- El bruto de apibara no llega del navegador (lo guarda la edge function en `apibara_consultas`); su clave
  la lee sólo `integracion_secreto()`, nunca el cliente admin.
- Lo que otorga permisos se escribe por RPC: `crear_lead`, `cambiar_fase`, `vehiculo_vitrina`,
  `vehiculo_vincular`, `vehiculos_papelera_*`, `leads_papelera_*`, `formula_*`, `rbac_*`, `otorgar_portal`, `lead_transferir`, `lead_compartir`,
  `lead_revocar_acceso`, `lead_salir`, `cotizacion_marcar_final`, `comprobante_emitir`,
  `web_confirmar_contacto`, `cola_web_configurar`. Actuar sobre un lead exige `puede_actuar_lead()`,
  nunca `puede_lead(…, 'leads.editar')`. Un `.update()` sobre `fase_id`, `lead_id`, `publicado_web`,
  `eliminado_en`, `creado_por` o `responsable_id` es un bug.
- Toda edición manda `p_actualizado_en_esperado` o `p_fase_esperada` y trata `PT409` con `conflicto()`
  de `@/shared/lib/errores`. Una RPC de lote lleva `[{id, actualizado_en}]` y devuelve un resultado
  parcial con `codigo` y `motivo` por fila, que se muestra.
- La vitrina se lee con `vehiculo_vitrina_previa` y `vitrina_del_origen`; nada lee el esquema `interno`.
  La papelera de vehículos, con `vehiculos_papelera_listar()`; se restaura o purga con la versión del
  lote (`lotes_papelera.actualizado_en`).
- Una query de seguimiento sobre una página ya paginada se acota con `.in('id', ids)`.
- Uploads: fotos por `comprimirImagen()` o `comprimirEnTamanos()` y `subirPorHash()` con
  `extensionDe(blob.type)`; documentos sin comprimir.
- Borrar de Storage nunca es un `remove` directo: en `marca` y `avatares`, `quitarSiHuerfano()`; en
  `vehiculos` el navegador no borra (barre `storage_gc_reclamar`).
- `revalidatePath` en la action que muta; sin `router.refresh()` en el éxito.

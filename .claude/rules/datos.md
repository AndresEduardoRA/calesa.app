---
paths:
  - 'src/modules/*/infra/**'
  - 'src/shared/lib/supabase/**'
---

# Capa de datos

- Lecturas en `infra/queries/*.ts` con `import 'server-only'`; realtime y fetch desde el browser en
  `infra/*.client.ts` (cliente de `@/shared/lib/supabase/browser`). Nunca desde componentes.
- El cliente de servidor se crea por request (`createClient()` de `@/shared/lib/supabase/server`),
  jamás en una variable global.
- El cliente admin (`secret key`) salta la RLS. Sólo se crea en route handlers del portal,
  webhooks y crons, con **una excepción**: invitar personas, que exige la API de admin de Auth.
  Esa excepción vive en un solo lugar, `conAdminDeAuth()` de
  `src/modules/equipo/infra/invitaciones.ts`, y con tres candados: comprueba
  `equipo.usuarios.gestionar` en la base con el cliente de quien invita **antes** de crear el
  cliente admin; entrega sólo `auth.admin` envuelto en `CuentasInvitadas` (nunca `.from()` ni
  `.rpc()`); y no asigna el rol (eso lo hace `rbac_asignar_rol` con la sesión de quien invita).
  El lint prohíbe importar `@/shared/lib/supabase/admin` desde cualquier otro archivo. En ningún
  caso el cliente admin lee `leads`, `vehiculos` ni `cotizaciones` (saltaría la papelera).
- Los tipos vienen de `@/shared/types/database.types` (`Tables<'leads'>`, `Enums<'tipo_lead'>`).
  Si un tipo contradice el código, el código está mal.
- Leads: se leen de `leads_vista` (teléfono enmascarado salvo cartera). Nunca `from('leads')`
  para leer el teléfono.
- Los orígenes, su layout de campos y sus categorías se escriben sólo por RPC (`origen_*`,
  `categoria_*`): sus tablas son de sólo lectura, y un campo con datos no cambia de tipo ni se elimina.
- Lo que otorga permisos se escribe por RPC: `crear_lead`, `cambiar_fase`, `vehiculo_vitrina`,
  `papelera_*`, `formula_*`, `rbac_*`, `otorgar_portal`, `transferir_lead`, `compartir_lead`,
  `cotizacion_marcar_final`, `comprobante_emitir`, `web_confirmar_contacto`, `cola_web_configurar`.
  Un `.update()` sobre `fase_id`, `publicado_web`, `eliminado_en`, `creado_por` o `responsable_id`
  es un bug (la base lo rechaza por grant de columna).
- Toda mutación de edición manda `p_actualizado_en_esperado` o `p_fase_esperada` (la RPC los exige: un
  nulo se rechaza) y trata `PT409` como conflicto legible (`conflicto()` de `@/shared/lib/errores`),
  nunca como error genérico.
- Una query de seguimiento sobre una página ya paginada se acota con los ids de esa página
  (`.in('id', ids)`), nunca con un filtro sin cota. Listas grandes: keyset por `(creado_en, id)`.
- Uploads desde el browser: fotos por `comprimirImagen()` (WebP, ≤ 1600 px) y
  `subirPorHash()`; documentos sin comprimir. Commit diferido: el archivo se sube al confirmar el
  formulario, y si la fila falla se hace `remove([ruta])`. Borrar un objeto pasa por
  `storage_refcount` (RPC), nunca `remove` directo de algo que otra fila pueda referenciar.
- `revalidatePath` en la action que muta; sin `router.refresh()` encima en el camino de éxito.

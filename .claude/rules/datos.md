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
- Los vehículos se escriben sólo por RPC: `vehiculo_crear` (con el `id` que genera el navegador:
  reintentar no duplica; con `p_apibara`, la respuesta en bruto), `vehiculo_guardar` (con versión) y
  `vehiculo_subasta_refrescar` (con versión: bruto, fecha y estado, más lo que la app decidió
  actualizar). `subasta_en`, `estado_subasta` y `apibara_*` los escribe sólo la base, derivados del
  bruto. La clave de apibara la lee sólo `integracion_secreto()` (service role) desde la edge
  function: nunca el cliente admin de la app. La tabla es de sólo lectura: no hay
  `.insert()` ni `.update()` sobre `vehiculos`. Un error de validación trae en `hint` el campo
  (`anio`, `atributos.<clave>`). Bajo RLS los filtros sobre `atributos` no usan el GIN.
- Las fotos de un vehículo se escriben sólo por RPC: `vehiculo_fotos_agregar` (idempotente por
  hash; devuelve `agregadas`, `repetidas` y `sin_lugar`), `vehiculo_foto_mover`,
  `vehiculo_foto_portada` y `vehiculo_foto_eliminar`. `vehiculos_imagenes` es de sólo lectura. Su
  versión es la de `vehiculos_imagenes_version`, no la del vehículo.
- Lo que otorga permisos se escribe por RPC: `crear_lead`, `cambiar_fase`, `vehiculo_vitrina`,
  `vehiculo_vincular` (el vínculo da ver y editar con alcance «propios»),
  `vehiculos_papelera_*` (las `papelera_*` genéricas son sólo de leads y cotizaciones: rechazan
  vehículos), `formula_*`, `rbac_*`, `otorgar_portal`, `transferir_lead`, `compartir_lead`,
  `cotizacion_marcar_final`, `comprobante_emitir`, `web_confirmar_contacto`, `cola_web_configurar`.
  Un `.update()` sobre `fase_id`, `lead_id`, `publicado_web`, `eliminado_en`, `creado_por` o `responsable_id`
  es un bug (la base lo rechaza).
- Toda mutación de edición manda `p_actualizado_en_esperado` o `p_fase_esperada` (la RPC los exige: un
  nulo se rechaza) y trata `PT409` como conflicto legible (`conflicto()` de `@/shared/lib/errores`),
  nunca como error genérico. Una RPC de lote (`vehiculos_papelera_enviar`) lleva la versión de cada
  fila en su arreglo (`[{id, actualizado_en}]`) y devuelve un resultado parcial: lo que no pasó
  vuelve con su `codigo` y su `motivo`, y se muestra entero.
- La vitrina se escribe con `vehiculo_vitrina` (versión del vehículo, el estado entero) y se lee
  con `vehiculo_vitrina_previa` y `vitrina_del_origen`. Nada de la app lee el esquema `interno`.
- La papelera de vehículos se lee con `vehiculos_papelera_listar()` (la RLS esconde lo eliminado a
  todos) y se restaura o purga con la versión **del lote** (`lotes_papelera.actualizado_en`).
- Una query de seguimiento sobre una página ya paginada se acota con los ids de esa página
  (`.in('id', ids)`), nunca con un filtro sin cota. Listas grandes: keyset por `(creado_en, id)`.
- Uploads desde el browser: fotos por `comprimirImagen()` o `comprimirEnTamanos()` (WebP, o JPEG
  donde el navegador no lo codifica; ≤ 1600 px) y `subirPorHash()`, con la extensión de
  `extensionDe(blob.type)`; documentos sin comprimir. Commit diferido: el archivo se sube al
  confirmar, nunca al elegirlo.
- Borrar un objeto de Storage nunca es un `remove` directo de algo que otra fila pueda
  referenciar. En `marca` y `avatares`, `quitarSiHuerfano()` (cuenta con `storage_refcount`). En
  `vehiculos` el navegador no borra nada (no hay policy): eliminar una foto encola sus objetos, y
  lo que se subió y no llegó a tener fila lo junta el barrido de huérfanos
  (`storage_gc_reclamar`).
- `revalidatePath` en la action que muta; sin `router.refresh()` encima en el camino de éxito.

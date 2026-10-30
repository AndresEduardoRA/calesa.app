# vehiculos

Inventario de vehículos por origen con atributos dinámicos: listado con filtros en la URL y vistas guardadas, ficha según el layout del origen, alta y edición en un panel, fotos (hasta 24, con portada), el vínculo a un lead con sus interesados (en la ficha del vehículo, con «Desvincular»; y la sección «Vehículos» de la ficha del lead, que vive acá), la vitrina (publicar en la web con precio público y vista previa de lo que verá el visitante) la papelera por lotes (enviar con «Deshacer», restaurar y purgar) y, en un origen de subasta con apibara encendida, el alta pegando un enlace de Copart o IAAI, un VIN o un lote (de a uno o varios), con sus fotos, y «Refrescar» la subasta desde la ficha; y la limpieza automática de lo importado de una subasta que nadie compró, con su aviso previo y «Conservar».

Ficha completa (historia, partes, mediciones, trampas viejas): `docs/archivo/modulos/vehiculos.md`, sólo con grep.

## Entra y sale

- Entra: `/vehiculos` (`?origen=`, filtros, `?cursor=`, `?vitrina=si|no`, `?vehiculo=<id>` abre el resumen con `?pestana=fotos|interesados`), `/vehiculos/papelera`, `/vehiculos/[id]` (`?seccion=ficha|fotos`). Paneles por URL: `?panel=nuevo`, `?editar=<id>`, `?panel=vitrina`, `?panel=desvincular`, `?panel=purgar&lote=`. Layout, categorías y orígenes vienen de `origenes`; fases de `flujos`; vistas guardadas de `equipo`: la página los lee y los pasa por props.
- `/cotizaciones/nuevo` (la compone `app/`): la barra del vehículo sobre la hoja (`pantallas/cotizar`, `<BarraDelVehiculo>`) abre el panel del vehículo en `?panel=vehiculo&lista=ultima|cierre&cursor=`: «Últ. cotización» y, en un origen de subasta, «Cierre subasta», leídas desde el navegador (`infra/panel-para-cotizar.client.ts`) y escritas en la URL sin ir al servidor; elegir o quitar escribe el vehículo en la clave que le pasa la página (`claveDeLaUrl`) y cierra el panel. La barra recibe, ya armados por la página, el «n» de «Cotizado (n)» (`cotizado`, texto, dibujado sin `<Badge>`: éste arrastra Base UI y sumaba 8,5 KB a la carga en frío de la hoja) y el `historial` del elegido (un `ReactNode` de `cotizaciones`: `vehiculos` no lo importa), que el panel dibuja dentro de la región «Elegido».
- `index.ts` (servidor) **no exporta componentes**; las pantallas los traen por `pantallas/<pantalla>.ts` (`listado`, `ficha`, `papelera`, `vehiculos-del-lead`, `cotizar`). Una pantalla nueva = su archivo. Exporta lecturas y reglas (`buscarVehiculos`, `leerVehiculo` —null si no existe, está en papelera o no se ve—, `condicionesDe`, `editablesDe`, `leerPapelera`, `leerSubasta`, `limpiezaDe`…: ver `docs/MAPA.md`) y `MAXIMO_DE_PAGINA_DE_VEHICULOS` (100); el tamaño sale de `tamanoDePagina()`.
- `client.ts`: `<TarjetaVehiculo>`, `<BadgeDeFase>`, `Vehiculo`.
- «Cotizar» del resumen (4.14-2b): `/vehiculos` pasa `paraCotizar` (`entities/ruta-para-cotizar.ts`: la ruta de la hoja con el origen y la clave del vehículo, o `null` si no cotiza en el origen: `origenesParaCotizar()`) por el listado y el resumen hasta la cabecera. Abre la hoja sin lead.
- Depende de `origenes`, `flujos`, `equipo`. `leads` no importa `vehiculos`: vínculo e interesados viven acá aunque se muestren en la ficha del lead (`app/` los compone).

## Archivos clave

- `entities/`: `filtros.ts` (devuelve `Condicion[]` neutras que `infra/` traduce), `comunes.ts` (`camposComunes()`: único lugar con etiquetas fijas), `esquema.ts` (`validarVehiculo()`: lo usan igual formulario y action), `acciones-de-vehiculo.ts` (lista única del «⋯»), `limpieza.ts` (sólo lee y dice), y `papelera`, `vinculo`, `vitrina`, `foto`, `apibara`, `subasta*`, `resumen`. `infra/`: lecturas en `queries/`, escrituras por RPC, `*.client.ts` para el navegador.
- `features/`: `alta`, `ficha`, `fotos`, `vitrina`, `papelera`, `vinculo`, `listado`, `acciones`, `resumen`, `subasta`, `limpieza`, `panel-para-cotizar` (la barra y el panel del vehículo de la hoja de cotizar; sus listas y su margen, en `entities/panel-para-cotizar.ts`). `CLAVE_DE_EDICION` vive en `features/alta/claves.ts`, no en un `'use client'`.
- El listado dibuja una sola vista (tabla o tarjetas) elegida en servidor; los e2e buscan filas con `tbody tr, li article`.
- Pestañas de la ficha: `src/app/(app)/vehiculos/[id]/pestanas.ts`, cada una con su `seccion-<clave>.tsx`.

## Tablas

`vehiculos`, `vehiculos_imagenes`, `vehiculos_imagenes_version`, `vehiculos_interesados`, `vehiculos_vinculos`, `vehiculos_conservados`, `apibara_consultas` y `limpieza_corridas` (sólo `service_role`), `cola_gc_*` (cola de Storage de todos los buckets), `lotes_papelera` (compartida con leads y cotizaciones).
RPC de escritura: `vehiculo_crear|guardar|subasta_refrescar|vincular|vitrina|conservar`, `vehiculo_fotos_agregar`, `vehiculo_foto_mover|portada|eliminar`, `vehiculo_interesado_marcar|quitar`, `vehiculos_papelera_enviar|restaurar|purgar`. `vehiculos`, `vehiculos_imagenes` y `vehiculos_interesados` son de sólo lectura para la app.

## No se rompe

- **La ficha se escribe sólo por RPC** (`vehiculo_crear`, `vehiculo_guardar`): lista cerrada de claves; `fase_id`, `publicado_web`, `lead_id`, `creado_por` se rechazan. Nada de `.insert()` ni `.update()` sobre `vehiculos`. `fase_id` lo escribe `cambiar_fase` y, sólo al nacer, `vehiculo_crear` (si el flujo tiene una única inicial sin nota ni requisitos; si no, «Sin fase»).
- **`cotizado_en`** (cuándo se cotizó por última vez) la escribe sólo el trigger `trg_vehiculo_cotizado` de `cotizaciones` (crear con el vehículo, o pasarle una cotización; nunca retrocede). Cuando lo único que cambia es `cotizado_en`, ni `trg_actualizado_en` mueve la versión ni `trg_auditar_cambio` escribe en `actividad`: cotizar no le cambia la ficha a quien la tiene abierta. **`cierre_subasta_en`** es generada (la regla de «subasta viva» y su fecha vive en la base: abierta o en vivo, `coalesce(subasta_fin_en, subasta_en)`); nadie la escribe y entra en `antes`/`despues` de `actividad`. En `vehiculos` no va un trigger `before` con un `when` que nombre la fila `new` entera o una columna generada.
- Toda edición manda la versión (`actualizado_en`); otra es `PT409` con «<quién> cambió este vehículo hace <cuánto>». Formulario y servidor validan con **el mismo esquema**. En `atributos` nunca un nulo: vaciar quita la clave.
- Los filtros salen del layout (clave de `origenes_campos`, nunca de la URL); todo texto de la persona pasa por `citar()` o `patronContiene()` antes de un `or()` de PostgREST. `buscarVehiculos()` no filtra por permiso: lo decide la RLS.
- **Fotos:** commit diferido (elegir no sube; «Subir N» sube los dos objetos y **una** action registra). Sólo por RPC; las tres de edición mandan la versión **de las fotos** (`vehiculos_imagenes_version`), no la de la ficha. Máx. 24 y una portada: lo impone la base. Sin duplicados (hash del archivo elegido). Objetos `vehiculos/<vehiculo_id>/<sha-256>.<webp|jpg>`; la app no borra objetos: eliminar encola en `cola_gc_storage` y «Deshacer» (10 s) los saca.
- **Vitrina, sólo por RPC** `vehiculo_vitrina` (estado entero, sin defaults, con versión del vehículo; exige `vehiculos.vitrina` del origen y ver el vehículo). **Publicado no es «en vitrina»:** la regla vive en la base (`interno.vitrina_vehiculos`); la app no la copia. La vista previa la da `vehiculo_vitrina_previa()`.
- **Papelera, sólo por RPC y siempre resultado parcial** (cada vehículo con su versión, lote hasta 200; restaurar/purgar mandan la versión del lote). Enviar ofrece «Deshacer» 10 s. Lo que no entra lo decide la base (`_vehiculo_motivo_de_bloqueo`). Restaurar vuelve sin publicar. Purgar es irreversible (`<ConfirmarPurga>`). Se lee sólo por `vehiculos_papelera_listar()`. Un lead con vehículo vinculado no va a la papelera de leads.
- **Vínculo e interesados, sólo por RPC** (`vehiculo_vincular`; `p_lead` nulo desvincula; bloquea el lead y luego el vehículo; reemplazar exige tener también el lead actual). El vínculo otorga permisos (con alcance «propios», quien tiene el lead edita el vehículo). Este módulo no lee `leads`: los nombres llegan de las RPC con RLS de quien llama. El bloque sólo se dibuja con `leads.ver`.
- «Editar» lo decide la base (`editablesDe()` + `vehiculos_editables`; las RPC, `puede_vehiculo()`).
- **La limpieza automática es de la base** (`_limpieza_aplica|termino|vence|ancla|fecha`; `limpieza_el` columna calculada): nunca una copia de la regla en TypeScript; sumar una ancla = una línea en `_limpieza_ancla()`. Sólo `importado_apibara` en origen de subasta. «Conservar» no mueve la versión de la ficha.
- **apibara:** la llamada vive en la edge function, que llama el navegador; guarda el bruto en `apibara_consultas` y alta/refresco sólo mandan su id (`p_consulta`). Fecha y estado de subasta los deriva la base (`_vehiculo_subasta_desde()`). `precio` nunca sale de la puja. Refrescar no pisa lo editado (`fusionarRefresco()`). Con 429 o clave rechazada no se consulta la línea siguiente.
- Atajo `N`: abre «Nuevo» sólo si se puede; si no, nada.

## Ojo

- Bajo RLS los filtros sobre `atributos` no usan el GIN: lo barato es `vehiculos_origen_listado_idx`. Keyset `(creado_en, id)`; el cursor viaja como texto (por `Date` pierde microsegundos).
- El VIN es único entre todos los vivos (puede chocar con uno que no ves); el lote, por origen y plataforma. El `id` del alta lo genera el navegador (reintentar devuelve el mismo).
- En plpgsql nunca `if not (lead_id in (select mis_leads()))` (con nulo no levanta): `puede_vehiculo()`.
- `cotizacion_marcar_final` toma vehículo y luego lead, al revés que vincular: revisar el orden de locks. Desvincular con cotización final no se frena.
- Una foto < 480 px tiene `ruta = ruta_miniatura` (refcount 2 con una foto).
- e2e: borrar fases antes que el origen (`borrarFasesDe`) y lotes antes que la persona (`borrarLotesDePrueba`).

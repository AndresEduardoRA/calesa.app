# Lecciones

Trampas que ya se pisaron, vueltas regla: qué hacer o evitar y por qué. Se busca con grep antes de escribir una migración, una RPC,
una prueba o una pantalla. Lo que es regla de construcción de siempre está en `.claude/rules/*` (no se repite aquí); las decisiones de
diseño, en `docs/DECISIONES.md`.

**Una lección nueva** entra cuando un bug o una trampa costó tiempo y volvería a pasar: una viñeta en su sección, `- Haz/Evita X: porque Y.`
Si ya no aplica (cambió la herramienta o el código), se quita.

## Base de datos: SQL, RLS y permisos

- Pregunta permisos en plpgsql con `puede_*()`, nunca con `if … in (select …)`: con nulos ese `if` no levanta y la rama se salta.
- Envuelve en `coalesce(…, false)` toda variable que sale de `jsonb_typeof` o de una clave que puede faltar: un nulo apaga la rama en silencio.
- En plpgsql un `or` no corta: `d.id is null or s.x = 0` evalúa `s` sin asignar (55000). El «no existe» va en su propio `if … raise` antes de usar el record.
- En un bucle plpgsql asigna `v_arr[i]` a una variable antes de usarlo en una consulta (si no, cada vuelta recibe el arreglo entero) y arma el jsonb con `jsonb_object_agg`, no concatenando.
- Rechaza `NaN` explícito junto a `monto > 0` en toda RPC de dinero: en Postgres `'NaN' > 0` es verdadero y `numeric(18,2)` lo guarda, así que el `check` no basta.
- Declara STABLE, no IMMUTABLE, una función que usa `jsonb_build_object`: esa función es STABLE y `db:lint` lo avisa.
- Un trigger `before insert` corre antes del `with check` de la policy: quien no puede recibe 23514 en vez de 42501. Ordena las defensas sabiéndolo.
- Los triggers BEFORE corren en orden alfabético del nombre: el que depende de otros se nombra para ir último (`trg_lead_z_cliente_desde`).
- Un borrado suave por `update` da 42501 si la policy de leer no admite la fila nueva (aun sin `returning`): borrar así pide una RPC `security definer`.
- Mantén una copia derivada desde el trigger de la fuente si sus filas se reviven por `on conflict do update`: lo que calcula el `before insert` se descarta.
- Excluye de `trg_actualizado_en` y de la auditoría una columna que escribe otro proceso: si no, quien tiene la ficha abierta recibe PT409 y la vitrina se mueve.
- Haz que toda puerta de escritura (guardar, papelera, adjuntos, policies de storage) pida también `ver` y responda como lo inexistente: «editar sin ver» se repitió en cuatro puertas.
- `tiene_permiso(clave)` sin origen vale si la persona la tiene en cualquier origen: lo que es por origen se pregunta con la variante que recibe el origen.
- Calcula en la RPC el dinero derivado (`monto_base`, tipo de cambio aplicado), nunca con un `update` de tabla con valores del navegador: el navegador no es fuente de dinero.
- Ordena o salta por fecha con `(creado_en, id)`: `now()` es la hora de la transacción y una transacción larga deja un id mayor con una hora menor.
- Haz que un `check` que exige una FK no nula admita el nulo si la FK es `on delete set null`: al purgar lo nombrado la fila cae con 23514.
- Comprueba con un `insert` que una tabla admite filas antes de construir encima: una PK sobre columnas que un `check` obliga a dejar nulas hacía imposible una tabla entera.
- Una FK `on delete restrict` da 23001, no 23503: atrapa los dos.
- En una RPC de lote atrapa sólo los códigos esperados (`PT409`, `23514`, `42501`, `22023`) y devuelve el resultado por elemento: un `when others` se traga errores reales.
- Evita `insert … on conflict` en una RPC que se llama siempre: dispara los triggers por sentencia aunque no escriba. Crea la fila única en la migración.
- Ningún ayudante recibe como único argumento una fila de una tabla: PostgREST lo expone como columna calculada.
- Un regex SQL que espeja el léxico de TS va con clases enumeradas (los rangos dependen de la colación) y sin grupos de captura (`regexp_matches(…, 'g')` devolvería el grupo).
- Da `update (columnas)`, no `update` de tabla: el grant entero deja cambiar columnas que la app nunca manda (pasar un valor a otro catálogo).
- Quita privilegios con revoke de columna cuando el grant es por columna: un revoke de tabla se lleva también los grants de columna que sí se leen.
- Conserva el índice completo de una FK aunque haya uno parcial (`where eliminado_en is null`): el parcial no sirve a la cascada.
- Dale índice a toda columna con ruta de storage que entra en `storage_refcount()`: sin él, cada purga recorre la tabla.
- Un motivo de rechazo que la base guarda nunca copia el valor de la celda: llevaría datos de terceros al informe y a los logs.

## Migraciones

- Cambiar argumentos o tipo de retorno es `drop` + `create` (parámetro nuevo al final, con default si hay llamadas posicionales) y repetir los grants: `create or replace` deja dos sobrecargas.
- Prefiere una función de lectura aparte a cambiar el tipo de retorno de una existente: el `drop` rompe pruebas, infra y la definición que otros recrean.
- Repite `revoke`/`grant` explícitos (también `anon` en `web.*`) aunque `create or replace` conserve privilegios, y pruébalo con una mutación que conceda a `anon` o PUBLIC.
- Parte un trigger si su `when` nombra `old`: ese `when` no puede ir en un trigger de `insert`.
- Al crear un permiso o cambiar su `aplicado_en`, cámbialo también en `supabase/seed.sql`: el seed corre tras las migraciones con `on conflict … do update` y lo pisa en local y en CI.
- Prueba un `update public.permisos` re-ejecutando la migración sobre la base sembrada: en local la tabla está vacía hasta el seed y el `update` no toca nada.
- Un `check` nuevo sobre una tabla con datos nace `not valid` y se valida en otra sentencia sólo si ninguna fila lo rompe (si no, `raise notice`): la migración no debe caer en la nube.
- No pongas `check` sobre texto que la nube puede tener con otros valores: valídalo en la RPC.
- Piensa qué jobs despierta una migración que rellena una columna (rellenar `fase_desde` disparó alertas de demora): PGlite arranca vacío y no lo prueba.
- En la nube un índice nuevo se crea sin `concurrently` y bloquea las escrituras mientras se arma: mide la tabla o púrgala antes del `db push`.
- No nombres `p_cantidad` ni `p_tamano` un parámetro que no es una página: `escala.sql` lo trata como tamaño y exige `_acotar_pagina`.
- No llames a un ayudante con un prefijo que una prueba cuenta por patrón (`_formula_%` lo cuenta `validar-formula.sql`).
- Si dos ramas reescriben entera la misma función, la que se integra segunda se rehace sobre la otra: si no, la pisa sin conflicto de git.

- Al regenerar SQL desde el catálogo (`pg_policies.qual`, `pg_get_triggerdef`), consulta con el `search_path` vacío: si no, los nombres salen sin esquema (`uid()` por `auth.uid()`) y la policy no aplica.
- `format('%s', un_booleano)` escribe `t` o `f`, que no es SQL: usa `case when … then 'true' else 'false' end` al generar un `insert`.
- Antes de comparar dos volcados quita las líneas `\restrict` y `\unrestrict` de `pg_dump` 17: llevan una clave al azar y dan una diferencia falsa.
- `supabase db dump` ya trae `alter publication supabase_realtime add table …`, pero no los triggers de `auth.users`, las policies de `storage.objects`, los buckets, los secretos de Vault ni los jobs: eso lo suma `scripts/db/aplastar.sh`.

## Candados y concurrencia

- Toma la fila `for no key update` cuando no cambias una clave: `for update` choca con el `key share` de quien inserta hijas (comentarios, revisiones) y termina en espera, 55P03 o 40P01.
- Asigna una columna con índice único sólo si cambia: aun con el mismo valor toma el candado de clave y hace esperar a quien inserta con esa FK.
- Fija un orden común de candados (lead → vehículo → cotizaciones por id; padres antes que hija, en el orden de quien purga): al revés aparece 40P01.
- Haz que una transacción que recorre varios lotes (un job) tome primero las filas de todos en el orden común: lote a lote retiene un vehículo antes que el lead de otro lote y da 40P01.
- Toma los candados de una clase en una sola pasada ordenada por id (agregar ∪ quitar): quitar todo y luego agregar todo forma ciclos y da 40P01.
- Haz que un job que retiene filas use `skip locked`: si no, frena a las personas que editan esas filas.
- Mira el permiso antes del candado y de la versión: quien no puede recibe 42501 sin esperar. Salvo cuando lo que otro cambia a la vez es el permiso de quien llama (la dominancia): ahí el candado va primero.
- Toma el candado antes de leer el estado que comparas (fase esperada, versión) o de contar lo que usa la fila: si no, dos sesiones pasan las dos o se cuela un 23503 crudo.
- Pon en una función `volatile` y en una sentencia aparte, tras el candado, la comprobación que debe ver lo que otro acaba de confirmar: en READ COMMITTED la foto es por sentencia.
- Antes de serializar varias RPC con un candado común, busca en `scripts/carreras/` las que esperan que dos llamadas no se esperen (dos bajas a la vez): ese arnés corre B antes de confirmar A y se cuelga en vez de fallar.
- Un índice único no frena dos `update … where id` a la vez (la segunda relee y pisa): serializa con `pg_advisory_xact_lock` o `for update` más la versión esperada, y pruébalo con una carrera.
- Reordenar con valores de orden pide un candado del conjunto (`lock table`): dos personas que mueven tarjetas distintas pueden dejar dos en el mismo orden.
- Envuelve el `insert` idempotente por id en `exception when unique_violation` (o busca el id tras el candado): dos reintentos simultáneos dan el 23505 crudo de la PK.
- Fija con una prueba de definición una cláusula de candado que no tiene prueba de carrera: al recrear la función, un merge la perdió en silencio.
- Prueba un ciclo de candados con tres conexiones (una retiene el candado del medio, `scripts/carreras/candados-papelera.mjs`): con dos, A termina su llamada antes de que B empiece y el 40P01 nunca aparece.
- Un `for key share` no espera a quien aguarda un `for update` sobre la misma fila si quien la tiene es otro `key share`: se adelanta, y así se arma el ciclo con quien esperaba.
- Importa toda carrera nueva desde `scripts/carreras.mjs`, sin un corredor aparte: lo que sólo corre a mano no corre (lo vigila `scripts/guardas/carreras-en-db-carreras.test.ts`).

## Pruebas de la base (PGlite y `db:probar`)

- Dentro de una transacción `now()` no se mueve: la «esperada vieja» es la versión menos 1 µs y que guardar mueve la versión se prueba entre transacciones.
- Deja en el pasado lo que debe moverse (`session_replication_role = replica`) y da `ocurrido_en` explícitos y distintos: con el `now()` fijo las mutaciones no caen.
- Una función STABLE lee la foto de la sentencia que la llama: prueba su efecto con un ayudante `pg_temp` aparte.
- PGlite ordena con colación C y la base real con ICU: escribe `collate "C"` explícito y prueba el orden con casos no ASCII, o la diferencia pasa sin verse.
- PGlite no trae los privilegios por defecto de Supabase: un grant se prueba mirando la definición o en la base real.
- Compara un valor que puede ser nulo con `is distinct from` o `is not true`: `= false` deja pasar el nulo y la prueba no cae.
- Inspecciona el cuerpo de una función con `pg_get_functiondef`, no `prosrc`: una `language sql` con `begin atomic` deja `prosrc` vacío.
- Comprueba que una mutación cae por la causa que buscabas: un rojo por un motivo ajeno (la fila propia ya tomada) no demuestra nada.
- Inserta en la misma transacción lo que una espera necesita ver: una inserción de otra conexión hecha desde el cliente no la ve Postgres y la corrida se cuelga en vez de dar 40P01.
- Fija el instante en vez de `now() + 12 h`: a ciertas horas del día la prueba no mide nada.
- Usa un prefijo propio por archivo para los ayudantes `pg_temp`: en el `db:probar` completo se comparten y el mismo nombre con otra firma da «is not unique».
- Escribe explícito el default de una columna del que depende la prueba: cuando cambió (`bloqueante` a `false`) cayeron pruebas ajenas.
- Prueba aparte lo que crees en `interno` o `web`: las guardas generales (RLS en todo, definer con `search_path`) sólo miran `public`.
- Postgres revierte toda la llamada ante un error: una prueba no ve el orden de escrituras dentro de una función, sólo guarda contra un `exception when` interno.
- Elige «el primer origen activo» por `(creado_en, clave)` o filtra lo tuyo, nunca por id: los uuid son al azar y otro archivo pudo dejar uno creado.
- Crea antes una dueña de prueba: con la base recién reseteada no hay cuentas, la primera es dueña y una invitada sin aceptar no puede ser la única que gestiona (`rbac_guardian`).
- Revisa los detectores textuales al escribir un mensaje de error: palabras como `antes`/`despues` hacen caer la guarda de `cotizaciones-visibilidad.sql`.
- Prueba un espejo TS de una regla SQL contra la función vigente en PGlite con los mismos casos, `hint` y texto: los tests con datos de mentira no ven la divergencia.
- Copia en un espejo TS los detalles de la regla: `char_length` cuenta puntos de código (no `.length`), `collate "C"` no es `localeCompare` ni `<`, `btrim` sólo quita U+0020 y `jsonb::text` lleva `", "`.

## PostgREST, tipos y capa de datos

- Haz viajar `actualizado_en` como el texto de la base, nunca por `Date` ni `fechas.ts`: `Date` redondea a milisegundos y toda edición da PT409.
- Compara sellos con sus microsegundos y acepta que Postgres recorte ceros finales (`\d{1,6}`): `Date.parse` empata dos del mismo milisegundo y exigir 6 dígitos falla según el reloj.
- No embebas una tabla sobre sí misma (`mensajes→mensajes`, `formulas!version_origen_id`): da 400 o un arreglo. Léela con una segunda consulta por PK.
- Nombra la FK en el embed si dos apuntan a la misma tabla (`fases!fases_requisitos_fase_id_fkey!inner`): si no, PostgREST responde que es ambiguo.
- Prueba toda lectura nueva con embebidos contra la base real: los tests con filas de mentira no ven ni la ambigüedad ni la forma.
- Lee por páginas hasta una vacía o con tope + 1, nunca hasta una corta: `max_rows` depende del despliegue. Si después reescribes todo, lee entero o nada.
- Filtra el nulo con `.is('col', null)`: `.eq('col', null)` no encuentra ninguna fila.
- `database.types.ts` lista también los ayudantes `_…` (el generador no mira los grants): figurar ahí no significa que la app pueda llamarlos.
- Pasa por Zod toda respuesta de RPC aceptando nulo donde la base puede darlo, y trátala como `T | null`: el tipo generado dice `string` aunque la función devuelva nulo.
- Llama con todos los parámetros (`nuloParaLaBase`) a una función con parámetros sin default, o castea en el repositorio: los tipos generados no admiten nulo.
- Con escritura directa bajo RLS, cero filas afectadas no es éxito: di «sin permiso» o relee por id para distinguirlo de «ya no existe».
- Filtra «lo mío» por `usuario_id` a mano aunque haya RLS: la RLS deja ver filas ajenas a quien gestiona y la dueña confirmaría turnos de otra persona.
- Pon `eliminado_en is null` explícito aunque la policy lo implique: el índice parcial no debe depender de que el planificador lo deduzca.
- Haz cruzar montos y decimales como texto y pásalos a `Number` sólo al entrar a `<Monto>`: un float de JSON pierde cifras al calcular o guardar.
- Lee un número tipeado con `leerNumeroTipeado` según el locale, también el de una celda: aceptar `,` o `.` sin mirarlo guardó «2.000» como 2,00 y «1.5» como 15.
- Mapea en `errores.ts` de la entidad cada código que su RPC puede dar (`22022`, `P0002`): `errorDePostgrest` sólo conoce los comunes y el resto cae en «Algo falló…».
- No pases por `errorDePostgrest()` un 22023 o PT409 escrito para la persona: cambia por el genérico todo mensaje con «column» o «relation», y un id de nodo puede contenerlo.
- No muestres textos de la base salvo el PT409 (persona y hora): cada código tiene su texto propio en la pantalla.
- Pasa por `revisarTextoParaLaBase()` todo texto o JSON de la persona que va a `jsonb` o `text`: `\u0000`, un surrogate suelto o un anidamiento profundo rompen PostgREST o supabase-js.
- Sube un objeto por hash sin `upsert` (no hay policy de update) y cuenta «ya existe» como éxito: el mismo archivo vuelve a subirse al reintentar.
- Usa `perfiles` (legible por toda persona activa) para un selector de personas: `equipo_lista` pide `equipo.usuarios.ver`.
- Crea el cliente admin dentro de cada función que lo usa, nunca global: salta la RLS y no debe sobrevivir a la llamada.

## Server Actions, Next y React

- No revalides desde una pantalla con estado tipeado: en Next 16 `revalidatePath` (cualquier ruta), `revalidateTag`, `updateTag` y `refresh` vuelven a dibujar la página que llama.
- Mide el peor caso de lo que manda una Server Action: el tope es 1 MB por pedido y una fórmula de 2.000 nodos pesó 400 KB.
- En un route handler, `await connection()` va antes de cualquier rama (también el 503 sin secreto): con `cacheComponents`, `next build` lo prerenderiza y lo sirve fijo.
- Renueva el id idempotente del navegador por intento (tras el éxito o al reabrir, `key` = la apertura): la pantalla conserva su estado y el mismo id devolvería lo ya creado.
- Usa un token fijo, sin refresco, en un stream que lee con la sesión después de responder: rotar el refresh token tras la `Response` cierra la sesión por reuso.
- Pon una constante que lee un Server Component fuera de todo archivo `'use client'`: llega como referencia de cliente, no como valor (las claves de URL compartidas van en `entities/`).
- Con el doble montaje de StrictMode descarta lo viejo por «último pedido», no con un `useRef` de «ya leí»: deja la vista en «Cargando…».
- Tras una action pon lo devuelto en la ventana cargada, sin `router.refresh()`: el refresco relee la primera página y devuelve lo cargado a 10.
- Tras un `router.refresh()` inevitable, mantén los controles apagados hasta que la pantalla se redibuje: un cambio de URL en medio pierde el refresco.
- Suelta el aviso de guardado o el cierre de panel al terminar el envío (`useTrasElEnvio`) y encola lo que sale al desmontarse: el refresco remonta el panel antes de que `isPending` baje.
- Pasa a filas con `memo` callbacks estables (los `set` de `useState`): un callback nuevo por render vuelve a dibujar las 500 filas.
- Calcula «Hoy» en el servidor y hazlo viajar como `YYYY-MM-DD`: en el cliente «Hoy» y «Ayer» cambian al hidratar cerca de la medianoche.
- Una página de ejemplo o de muestra no usa `Date`: desajusta la hidratación.
- Usa una tupla `AlMenosUna<T>` bajo `noUncheckedIndexedAccess`, y recuerda que `ReadonlyArray.map` pierde la tupla.
- Reemplaza las variables de una plantilla en una sola pasada con función: un valor con `{clave}` o `$&` se expandiría en `String.replace`.

## Módulos y JS en frío

- No reexportes lecturas de otras superficies por un `composicion.client.ts` que importa una pantalla en frío: ella paga todo lo que reexporta (+20 KB). Cada lectura en su `composicion-<x>.client.ts`.
- Dale a cada superficie su propio `diferidos.tsx`: un `diferido()` de nivel superior es efecto de módulo y no se descarta aunque la pantalla no lo reexporte.
- Mide con `presupuesto-js` antes de importar `<Badge>` u otra utilidad de `shared` en la carga en frío de una pantalla pesada: `<Badge>` arrastra Base UI (+8,5 KB).
- Haz que un `loading.tsx` importe sólo el esqueleto, nunca la pantalla ni el barril de `pantallas/`: baja su chunk dos veces en frío.
- Manda al navegador las acciones ya calculadas por el servidor, no `permisos.ts` ni las reglas: importarlas suma JS en frío a la ruta.
- Pasa al cliente sólo lo que dibuja (`contextoParaElNavegador()`): las props de una pestaña viajan en el primer HTML, unos 100 B por nodo y por fila.
- Mide lo que el layout pasa como props: viaja en el documento de todas las pantallas (30 acciones de la paleta sumaron 7 KB a `/perfil`).
- Pon en un archivo de `features/` del módulo la composición que cruza módulos: en una entrada la rechaza `boundaries`.
- Nombra un archivo de `pantallas/` con el prefijo de su área: sin prefijo es núcleo, y el núcleo no importa áreas.
- Si un área o módulo necesita algo de otro, lo compone `src/app` (render prop desde un Client Component de la ruta, con el cast de `ComponentType`): una función no cruza de Server a Client.
- No nombres un archivo como un SDK vetado (`resend.ts`): el lint lo veta por patrón de ruta.

## Interfaz

- Escribe una columna lateral de grilla como `minmax(0, 24rem)`, no rem fijos: con el texto al 200 % los media queries siguen en px y la página se ensancha.
- En una rejilla de 12 pistas que colapsa en angosto usa `gap-x-0 @lg:gap-x-3`: al 200 % las pistas van a 0 y los 11 huecos fijos desbordan.
- Nombra los contenedores (`@container/hoja`, `@4xl/hoja`): una consulta de contenedor la resuelve el contenedor más cercano al descendiente, no el que lleva la clase.
- Pon `min-w-0` en la raíz de una barra de pestañas: sin él, una pestaña más ensancha la página en el celular en vez de desplazar la barra.
- Si un panel lee su URL con `nuqs`, escríbela con `nuqs`, no con `router.replace`: el panel no se entera del cambio.
- No cierres un panel por nuqs justo antes de un `router.push`/`replace`: nuqs escribe la URL después y pisa el destino. Navega y deja que el panel salga solo.
- Respalda en `sessionStorage` lo que guardes en `history.state`: con `shallow: false` Next lo pisa a los ~60 ms y Chromium no conserva un `replaceState` en `pagehide`.
- Elige la primera pestaña con `parseAsStringLiteral(claves).withDefault(primera)`: con `parseAsString` la URL se ensucia con la clave por defecto.
- Dale clave propia de URL a lo que debe convivir: un `?panel=` compartido entre hoja de filtros y drawers hace que abrir uno cierre el otro.
- Al pasar de un panel a otro, el que cierra no devuelve el foco (`focoAlCerrar` false): Base UI lo devuelve un instante después y le roba letras al campo nuevo.
- Llama `useCambiosSinGuardar` y `useVueltaDelFoco` una sola vez por panel y clave: dos llamadas se pisan el estado.
- No pongas la versión en la `key` de un editor que guarda ni de sus modales vecinos: guardar o «Recargar» los remonta y pierde lo tipeado. Tras guardar, la base es la fila que devolvió la RPC.
- Haz que «Recargar» tras un rechazo sume la lectura pedida a la `key`: sin remontar, la hoja vuelve a mandar lo que la base rechazó.
- Guarda el borrador por campo tocado, no como copia de la fila: así sobrevive a «Recargar» tras un PT409 y se suelta al llegar la versión nueva.
- Dos formularios sobre la misma fila con una sola versión van con un solo «Guardar» o con la versión como `key` en los dos: guardar uno da PT409 al otro o descarta lo escrito.
- En un asistente de varios pasos, apaga los selectores que alimentan el envío mientras prepara, sube o crea: si cambian a mitad, se crea con lo anterior sin decirlo.
- Modela un filtro sí/no como elección de valores (todas / sí / no), no como booleano: un «No» tri-estado no filtra y el chip dice lo contrario.
- Nunca pongas un monto en el título de un `<Confirmar>`, en `aria-label`, `title` ni `<option>`: esquiva `<Monto>` y el Modo Live lo deja a la vista. Etiqueta neutra y el monto al lado.
- Dibuja como texto, nunca como enlace ni HTML, un texto libre de un visitante anónimo (`ruta`, `fuente`).
- Pon `method="post"` en todo `<form>` con credenciales o datos sensibles: enviado antes de hidratar sale por GET y deja la contraseña en la URL.
- Si falla la lectura de un permiso o una regla, apaga el botón con motivo y nunca lo habilites (`dominada: null` → apagado).
- Al comparar rutas por prefijo, `/` sólo coincide consigo misma: si no, vuelve «disponible» cualquier ruta.
- Pon el motivo de un botón o pestaña apagada en texto visible (`aria-describedby`), no sólo en `title`: un `TabsTrigger` deshabilitado no recibe foco y el lector no lo lee.
- Al cambiar un token de color corre `design/tokens.test.ts` (contraste AA) y actualiza su espejo del PDF (`estilos-del-documento.ts`) y `e2e/xcell-geometria.spec.ts`.
- Dale a toda página nueva su `loading.tsx`, un `h1` (`sr-only` si no se ve) fuera del `Suspense` y un `<title>` único: lo exigen `estados-de-ruta.test.ts` y `accesibilidad.spec.ts`.
- Chrome ignora `autocomplete="off"` en un `type="password"` y el Chromium de Playwright no lo reproduce: eso sólo se comprueba a mano, no lo des por probado.

## Realtime y notificaciones

- Abre todo canal nuevo por `canal.client.ts`: se une después de `realtime.setAuth()` (antes entra como `anon` y rechaza el filtro con «invalid column for filter»).
- Relee al unirte al canal, también la primera vez: lo insertado entre la lectura de la pantalla y la unión nunca llega como señal.
- Suscríbete sólo a `INSERT`/`UPDATE` filtrados por columna (`usuario_id=eq.<yo>`, `conversacion_id=eq.<id>`) y nunca reacciones a `DELETE`: Realtime no aplica RLS a los `DELETE`.
- Una salida de miembro (`DELETE`) no genera señal: la lista que la provoca quita la fila y relee por su cuenta.
- Monta las suscripciones del marco al descansar (`useAlDescansar`), no al hidratar: evaluar el cliente de Supabase mientras React hidrata retrasa el primer clic unos 300 ms.
- Haz que una suscripción de fondo se vuelva a suscribir con cada `online` (`useVueltaDeLaRed()` como `key`) y nunca muestre «Sin conexión»: nadie la pidió y tapa el aviso real.

## Escala y rendimiento

- Bajo RLS una comparación de enum (`enum_eq`, no leakproof) no es condición de índice: usa índices parciales con el literal en su rama.
- Deja un solo índice entero por columna que se sondea: dos que sirven a la misma consulta compiten en el plan genérico según el volumen.
- Un índice para un cursor `(creado_en, id) < (c, i)` lleva las dos columnas en el sentido del orden (`creado_en desc, id desc`): si no, la tupla deja de ser condición de índice.
- Borra un índice que ninguna ruta usa si cubre una columna que cambia en cada escritura: vuelve no-HOT ese update.
- Para «le queda alguna» por lote usa una sonda `(select true … limit 1)`, no `exists`: en el plan genérico con poco volumen, `exists` hace un semi join que lee el índice entero.
- Resuelve el alcance una vez en una `security definer` con el predicado de la policy: filtrar hijas cuyas policies preguntan por fila paga un `puede_*` por fila recorrida.
- Con el plan genérico, varios filtros en la misma consulta parecen selectivos y ordenan toda la tabla: recorre el índice por lotes y filtra en plpgsql.
- Usa como cursor el id de una fila visible y resuélvelo por PK: un cursor que es la clave de un grupo puede recorrer grupos invisibles.
- Lee un cupo «N por hora» con las N más recientes (`order by creado_en desc limit N`; libre = la más vieja + 1 h): así no hace falta `count(` ni otra excepción en `escala.sql`.
- Mide el costo en altas e importación antes de un índice de n-gramas (duplicaba el tiempo) y prefiere un mínimo de 3 caracteres.
- Mide con una sentencia preparada y parámetros, no con literales: con literales el planificador elige otro plan que no es el que corre.
- Haz el `EXPLAIN` de una `security definer` como dueño de la tabla, que es como corre, y con volumen: con poco, el planificador elige otra ruta.
- Siembra fondo realista al medir: el plan genérico estima filas por promedio y con pocas entidades calientes elige otro índice.
- Vacía con `truncate … cascade` dentro de la transacción (con guarda de que quedó vacía), no con `delete`: el `delete` deja entradas en los índices.
- Pasa `vacuum (full, analyze)` antes de medir crecimiento de bloques: las corridas revertidas o caídas dejan tuplas muertas (398 MB) y espacio libre que la sonda reusa y suma 0.
- Juzga «no crece con N» por bloques por relación (`pg_stat_get_xact_blocks_fetched`), no en ms ni en buffers totales: el autovacuum y el WAL mueven los tiempos.
- Comprueba que la guarda «no crece con N» cae al quitar el índice: la cota contra la profundidad sola pasa sin índice.
- Asierta que cada ruta medida devuelve sus `n + 1` filas: con la sesión equivocada la policy vacía la ruta y el assert de bloques pasa sin medir nada.
- Escribe un «fuera de estos valores» sobre un arreglo que no es constante como `col = any (<complemento>)`, nunca `col <> all (…)`: el planificador estima cada `<>` contra algo no constante como `1 - 1/ndistinct` y, con una columna casi de un solo valor, da selectividad ≈ 0 y deja de leer la ruta en orden por su índice (lee todo y ordena).

## e2e (Playwright)

### Localizar y esperar

- Sobre listas de cientos de filas busca por texto, no `*ByRole`: calcular el nombre accesible de cada enlace agota el timeout con un CPU.
- Usa `exact: true` en botones genéricos («Guardar») y cuando un nombre o texto contiene a otro («Ir a la versión» dentro de «Revertir a la versión N»): si no, coincide con el de otra barra.
- Busca dentro de `main` o `#contenido`, nunca por `.fixed` ni una clase genérica: el marco repite textos («Sin conexión», la navegación) y sus barras fijas (campana, chat) coinciden.
- Filtra lo visible en un localizador de filas (`tr, li`): Next conserva la pantalla anterior escondida en el DOM y aparecen dos filas.
- En el celular una fila de tabla es una tarjeta: un localizador por fila funciona en escritorio y cae en `movil`.
- Con un modal o `<Drawer>` abierto lo de atrás sale del árbol de accesibilidad: ciérralo antes de afirmar sobre la página (un `toHaveCount(0)` sería un falso verde).
- Espera el estado final (`toHaveValue`, resultados llegados, hidratación) antes de un atajo de teclado: antes de hidratar la `N` la toma el «Nuevo lead» del marco y el robot tipea más rápido.
- Antes de tabular espera a que la sección esté y el foco en su lugar: un Tab mientras llega contenido manda el foco al `body` y vuelve a recorrer la navegación.
- Arma la espera de un pedido antes del clic con `conRespuesta(page, coincide, accion, espera)` de `e2e/soporte/esperas.ts`, con tope propio: recibe la acción, no una promesa ya creada.
- Sin red, espera el texto del pendiente, no el `requestfailed`: el evento no prueba lo que ve la persona.
- No afirmes sobre un toast que se cierra solo ni leas una lista una vez tras mutar: afirma el estado en la base o usa `expect.poll`, porque el aviso se va o la lista se redibuja.
- Un `toHaveURL` que la página anterior ya cumple no prueba nada: espera el estado nuevo con `expect.poll` (que exista la cotización nueva) y recién entonces mira la URL.
- nuqs dibuja al instante y escribe la URL después: espera la clave en la URL antes de `reload()` o «atrás», o recarga la URL de antes (pasa en el celular).
- Un clic antes de hidratar se pierde: reintenta con tope corto hasta que la URL pida el panel y para si ya lo pide, porque cada clic de más suma una entrada al historial y rompe «atrás».
- Mide cajas dentro de un diálogo sólo cuando termina la animación (`quieto()`): durante la escala 44 px miden 42 y `getBoundingClientRect` miente.
- Centra el botón antes del clic: tras `scrollIntoViewIfNeeded` queda al borde inferior, debajo de la burbuja del chat.
- Un `input type=date` conserva el foco en su subcampo y `blur()` no lo suelta: reintenta y descarta si sigue enfocado, o la medición de foco visible se compara consigo misma.
- Compara y ordena fechas como timestamp (`Date.parse`), nunca como texto ISO: «…:23Z» queda por delante de «…:23.078Z», y un orden por texto borró a la dueña y tumbó 105 pruebas.

### Sesiones y datos de prueba

- Para cambiar de cuenta, `context.clearCookies()` antes de `entrar`: `{ fresco: true }` no descarta la sesión y `/ingreso` con sesión viva lleva a Inicio.
- Evita una prueba que cambia de usuario a mitad o entra «fresco» dos veces: pártela, porque arrastra el estado de la sesión anterior.
- Limpia en el orden de las FK y suelta antes lo que frena (comprobantes con `restrict`, FK sin `on delete` como `ajustes_web.actualizado_por`): un `afterAll` que cae ensucia el spec siguiente.
- Haz que un spec que siembra por SQL borre lo suyo también al empezar: una corrida caída lo deja y frena la limpieza del siguiente.
- Limpia sólo tu prefijo o tu origen (`borrarDineroDeEsteOrigen`), nunca `like 'E2E%'` ni todos los `e2e_%`: una limpieza amplia borra lo que otro spec en curso necesita.
- No corras juntos dos specs que borran y siembran las mismas personas (`chat` y `chat-widget`): se pisan el terreno. Van en comandos aparte.
- Afirma una cifra compartida (tablero, margen, conteos del mes) por el aumento que causa tu acción con `≥`, nunca por un total: otros specs escriben en el mismo período.
- Un spec que escribe un secreto real (Vault de apibara) toma su huella al empezar y la deja igual al final: si no, rompe a los demás.
- Para simular un estado que un job cierra, retén un candado que el job no puede tomar; no pauses `cron.job`.
- Para probar qué camino usa la pantalla, mide con `pg_stat_statements` (con `workers: 1`) que crece una lectura y no la otra.
- Distingue las Server Actions propias con un marcador (`intento`) en un vigilante que cuenta por URL: otras actions van a la misma URL (registrar la visita).

### El marco y las cuentas de pedidos

- Si sumas algo al marco o al menú (entrada, campana, burbuja, pestaña), grepea `e2e/`: mueve paradas de Tab, pedidos contados, pestañas contadas, topes de JS y lo que tapa un `fixed`.
- Marca `esDelMarco` todo pedido nuevo que haga el marco: los specs que cuentan pedidos de su pantalla los excluyen y si no, caen.
- No asertes la cuenta exacta de paradas de Tab en un recorrido que cruza el marco (mide KLM con tope): cada entrada nueva de la navegación ponía en rojo PR ajenos.
- Mide la tarea de oro con teclas, toques y KLM, no con reloj: varias sesiones en una máquina dan rojos falsos al cronometrar.

### Pruebas que prueban algo

- Una prueba que pasa con y sin el arreglo no se conserva; una de «con `reduce` no ocurre X» necesita su mitad de control, la que muestra que sin `reduce` sí ocurre.
- Para afirmar que algo no se envió espera un estado final o un centinela, no un `waitForTimeout`: sin centinela la prueba no demuestra nada.
- Reproduce una inestable frenando la CPU del navegador (CDP `Emulation.setCPUThrottlingRate`) o con latencia en `page.route` (`rsc`, `rpc`, actions): sin reproducirla, no la des por arreglada.
- En un spec `serial` la primera caída deja las demás «did not run»: no las cuentes como verdes y corre por separado cada una.
- Si un spec caído quedó en `/ingreso` (bajo carga o con el servidor recién levantado), es el inestable conocido del ingreso: repítelo solo antes de culpar al cambio.

## Vitest

- En un DOM grande busca por texto, no por rol (con un CPU pasa los 5 s), y llega al tope con pocas filas; un test que corre un script entero lleva su tope con el motivo.
- Mockea `server-only` en el test de un `client.ts` que reexporta una Server Action: la arrastra transitivamente.
- Prueba un registro por área con el área simulada, nunca con el archivo real: la prueba cae en cuanto alguien registra algo.

## CI, entorno y herramientas

- Registra una RPC en `paginas-en-la-base.ts` en el mismo cambio que su primer `.rpc(`, no antes: `paginas.test.ts` rechaza una entrada sin llamador en `src/`.
- Agrega la sección de `docs/UX.md` que cita un spec en el mismo commit que la pantalla: la guarda del mapa exige que el título exista.
- Lee pronto el log de una corrida roja: `gh run view --log-failed` sale vacío al rato y la causa queda sin verificar.
- `supabase db lint` cambia de formato si detecta un agente (`AI_AGENT`, `CLAUDECODE`): lee con `leerDbLint()` aceptando las dos formas y, para reproducir el CI, quita esas variables.
- Corre Splinter con los schemas de `[api]` (`pgrst.db_schemas`): sin ellos sólo revisa `public` y no ve los avisos de `web`.
- Si `next build` cae con «Type '/x' is not assignable to RouteImpl», corre `pnpm typecheck` (hace `next typegen`): no es del código.
- Usa `set -o pipefail` en los arneses: el código de salida de una tubería es el del último comando y una mutación «cae» o «pasa» en falso.
- Tras traer main corre `pnpm db:reset` antes de culpar al código por e2e que caen: la base local puede no tener las migraciones nuevas.
- Antes de culpar al código, mira que la base del carril tenga tus migraciones (`supabase_migrations.schema_migrations`): dos worktrees con la misma letra en `.env.carril` comparten la pila y se pisan; `bash scripts/worktree/preparar.sh <letra libre>` pasa el worktree a otra.
- El hook de Bash lee el texto entero del comando, heredocs incluidos: un guion que nombre un push, la bandera de saltar hooks o una orden remota de Supabase se escribe en un archivo (Write) y se corre desde ahí.
- Con dos cuentas en `gh`, no cambies la activa: pide el token de la dueña del repo por llamada (`GH_TOKEN=$(gh auth token --user <dueña>)`), como hace `scripts/flujo/publicar.sh`.
- `gh pr merge --auto` sin protección en `main` integra en el acto, antes del CI: el auto-merge sólo espera lo que la rama exige («Listo · todo en verde»).
- La cuenta de líneas de `max-lines` (300) vale también para un `.test.ts`: una prueba nueva que no cabe va en su propio archivo.

## Por módulo

### cotizaciones

- Para «difiere de lo guardado» compara valores y totales, no sólo el total: una celda puede cambiar sin moverlo.
- react-pdf no dibuja WebP ni SVG con `<style>`, clases, `use`, `mask`, `filter` o `<image>`: una imagen para el PDF llega en PNG o JPG.

### vehiculos

- Mira el tipo del blob que devuelve el canvas y usa JPEG si hace falta: Safari devuelve PNG aunque pidas WebP.

# Plan por fases

Regla: **una fase por sesión de trabajo**, y al terminar se para y se reporta. Construir varias
fases de corrido es cómo se acumulan errores que después cuestan tres veces más arreglar. El
alcance es todo el brief; no hay MVP: hay orden.

Cada fase tiene un criterio de terminado verificable — no «que funcione bien» sino algo que se
puede correr y ver. Las metas de las tareas de oro de `docs/UX.md` son criterio de terminado de su
fase y se miden con un e2e.

---

## Fase 0 — Cimientos

`setup.sh` ya corrió. Verificar que lint, typecheck, test y `db:probar` pasan en vacío; probar que
los hooks bloquean (un `any`, una promesa sin await, un import a tripas de otro módulo); crear
`src/shared/lib/supabase/{server,browser,admin,proxy}.ts`, `src/proxy.ts`,
`safe-action.ts`, `permisos.ts` (claves tipadas desde `seed.sql`), `formato.ts`, `fechas.ts`,
`errores.ts`; `src/app/globals.css` con los tokens de `design/tokens.css` y modo oscuro;
`src/app/manifest.ts` + `public/sw.js`; `supabase start`, `db:reset`, `db:types`; `docs/MAPA.md`
limpio; primer commit.

**Terminado cuando:** el proyecto arranca, lint y typecheck pasan en vacío, hay un test que corre,
`pnpm db:probar` pasa, `scripts/mapa.sh --check` pasa sin pendientes, y el primer commit está hecho.

## Fase 1 — Equipo, empresa y shell de la app

Módulos `equipo` y `empresa` completos: login email+contraseña y Google, recuperar contraseña,
registro on/off (la UI esconde el botón; la base ya lo bloquea), invitación por API admin
(`invitado: true`), perfil propio, equipo (lista, roles, bloquear, dar de baja con aviso de cuántos
leads van al limbo), matriz de roles × permisos con origen y alcance (RPC `rbac_*`, dominancia
visible: lo que no tenés aparece deshabilitado con el motivo), ajustes de la empresa (marca, logo,
país, locale, zona horaria, monedas, tipos de cambio con historial, integraciones, retenciones;
«Regenerar íconos» a partir del logo, ver `design/ICONOS.md`).
Shell: layout con sidebar por permisos, topbar con TC y buscador (placeholder), modo oscuro,
densidad, transiciones, `estados/` y `esqueletos/` compartidos, `<Monto>` y Modo Live,
`<Drawer>`, `<Modal>`, `<Bloque>`, `<Confirmar>`, toasts. Inicio = bandeja vacía con bloques por permiso.

**Terminado cuando:** una persona nueva se registra (si está abierto) o entra invitada, nace con el
rol que le dieron, ve sólo los módulos que sus permisos permiten, y el dueño puede crear un rol,
darle permisos acotados a un origen y bloquear a alguien; e2e de login + matriz de roles en verde.

## Fase 2 — Orígenes y vehículos

Módulos `origenes` y `vehiculos`: CRUD de orígenes con tipo subasta/manual (los triggers crean el
flujo y los campos), editor del layout de campos (orden, grupo, requerido, en tarjeta, filtrable,
público) y categorías; listado de vehículos por origen con `FilterShell` (chips, panel lateral,
bottom-sheet móvil, filtros derivados de `origenes_campos.filtrable`, estado en URL con `nuqs`,
vistas guardadas); ficha por layout; alta y edición en drawer con bloques; fotos (≤ 24,
compresión WebP, portada, reordenar, hash + refcount); interesados y vínculo activo; vitrina
(RPC) con precio público; papelera (enviar, listar, restaurar, purgar); integración apibara
(`supabase/functions/apibara` + alta por link/lote con mapeo por `clave_apibara`, activable desde
integraciones); subastas próximas en la ficha.

**Terminado cuando:** se crea un origen «Corea» manual y uno de subasta, cada uno nace con su
flujo y sus campos; un vehículo de subasta se da de alta pegando un link (o a mano si apibara está
apagado); los filtros reflejan los campos filtrables del origen y sobreviven a recargar; la vitrina
sólo publica con permiso y por RPC; e2e del alta por link y de la papelera en verde.

## Fase 3 — Leads

Módulo `leads`: **campos configurables** (Configuración › Leads › Campos: crear, apagar, renombrar, ordenar, agrupar, requerido, filtrable, en la tabla, valor por defecto y «solo la cartera»; son el layout que leen el alta, la ficha, el listado y el CSV); listado con filtros, drawer rápido y ficha con pestañas; drawer «Nuevo lead» con
verificación del teléfono al tipear (`verificar_telefono`: libre / existe y es mío / de otro con
CTA al chat / en limbo → adopta); seguimientos con Tiptap saneado, tipos configurables,
visibilidad pública/privada; recordatorios con atajos de fecha; favoritos, tachados (ocultos
por defecto, filtro de 3 estados) y etiquetas por usuario; compartir, transferir, revocar; oportunidades
en embudos por usuario con kanban (`?vista=embudo`); portal del cliente (otorgar con código en
grande y texto para WhatsApp, revocar); papelera; exportar/importar CSV de lo propio (vista previa
por fila, importa las válidas, con deshacer durante 24 horas).

**Avance (por partes, una por sesión):** hechas la 1 (campos configurables), 2 (alta rápida), 3
(listado), 4 (ficha y teléfonos), 5 (seguimientos, recordatorios, favoritos, tachados y etiquetas) y
6a (auditoría de todas las RPC y policies de leads, cartera —compartir, transferir, quitar acceso y
salir— y papelera de leads) y **6b (sección «Vehículos» de la ficha: vincular, desvincular, interesados;
`vehiculo_id` en seguimientos y recordatorios; la prueba de carreras con dos conexiones)** y **7a (embudos
personales, oportunidades con kanban y sección en la ficha, transferir con oportunidades)** y **7b (el acceso del
cliente del lado del equipo —la sección «Portal»— y el endurecimiento de `web.portal_*`)**. **8a (exportar la cartera e importar con vista previa, por lotes)** y **8b (deshacer una importación durante 24 h, con «Tus importaciones recientes»)** y **9a (el país del teléfono: se dice al tipear, llena «País» y se ve en la ficha y en la importación; tabla estática, sin SQL)** y **9b (el primer seguimiento del alta, opcional y enriquecido: el mismo editor y los mismos campos que la ficha, «Cuándo fue» y «Próximo contacto» plegado; una migración que amplía `_lead_crear`)** y **9c (los formularios que aparecían al pulsar algo, en modales con su URL)** y **9d (un solo modal de seguimiento en la ficha, el drawer y la tabla; la pestaña «Seguimientos» del drawer; anotar o agendar desde el «⋯» de una fila)** y **9d-2 (el drawer con tres pestañas, «Resumen», «Seguimientos» y «Recordatorios»; las listas de un lead por páginas, con tope, «Ir a una fecha» y «Recargar» de costo fijo; la regla de escala, `.claude/rules/escala.md`)** y **9e (la escala de toda la app medida con 50.000 leads y 100.000 filas por purgar: números acotados, kanban y papeleras con tope, jobs por lotes, el shell delgado, `diferido()` y las guardas)** y **9f-2 (la numeración de los leads: número propio por creador y número global sólo con un permiso, enmascarado por filas en la base; se ve bajo el nombre, en la ficha y el drawer, y se busca con `#n`)** y **9f-1 (el origen del lead configurable: una pestaña en Configuración › Leads para crear, renombrar, ordenar, activar y desactivar los orígenes; se escriben sólo por RPC con `leads.configurar`; uno con leads no se elimina; el alta, la ficha, el listado y el CSV los leen de la base)**.

**Lo que queda de la Fase 3, en este orden** (una parte por sesión, cada una se detiene a reportar):

1. **El recorrido de la IA con dos cuentas** (dueño y asesor) por las tareas de oro de leads: reemplaza la prueba manual (nadie prueba a mano; toda verificación es un test o un recorrido de la IA).
2. ~~**9f-2 — la numeración de los leads**~~ **hecha:** número propio (por creador) y número global (con `leads.numero_global.ver`), enmascarado por filas en la base y probado por todas las rutas (`docs/DECISIONES.md`, 2026-10-17). **Para la Fase 9:** la pantalla de Actividad lee el diff por una función que recorta según la cartera; esa función **no** reintroduce los números (`actividad.antes/despues` no los guardan y la matriz lo asserta con un patrón), y todo lo nuevo que devuelva el número de un lead entra al inventario de `numero-global.sql`.
3. ~~**9g — ítems por página configurables en toda la app**~~ **hecha:** «Ítems por página» (10, 25, 50, 100) en el listado de leads y el inventario de vehículos, la recuerda la cuenta (`listas.por_pagina`) y manda `?por=`; el tamaño sale de `src/shared/lib/paginacion.ts` y cada RPC lo acota en la base con `_acotar_pagina` (`docs/DECISIONES.md`, 2026-10-17). **El máximo del listado de leads es 50, no 100** (a 100 el plan de la cartera de «todos» deja el índice: 518 ms contra 13); el inventario cabe con 100. **Para la 9h:** al arreglar la estimación, `MAXIMO_DE_PAGINA_DE_LEADS` sube a 100 y `db:medir:volumen` lo asserta.
4. ~~**9h — la cartera de «todos» a escala**~~ **hecha** (`docs/DECISIONES.md`, 2026-10-17): la causa era la estimación de la policy de `leads` (0,37 % de la cartera viva: la rama «todos» dentro de un `or` valía 0,005 y el limbo, un SubPlan por fila, 0,5) y el costo por fila de `atributos_lead()`. La cartera y los atributos públicos van en la fila del lead (`leads.cartera`, `leads.atributos_publicos`, mantenidas por triggers y comparadas con su fuente en `derivados-leads.sql`), la regla de visibilidad está escrita una vez (`_lead_visible_para()`, inlineada en la policy, `puede_lead()` y `atributos_lead()`) en una forma que se estima en ~1, cambiar la privacidad de un campo va por lotes, un campo público se filtra por su copia y el máximo de leads por página es 100. Con 50.000: un filtro sin resultados de la dueña 4,4 s → 21 ms, una etiqueta 717 → 42 ms, «míos» 870 → 10 ms, una página profunda 390 → 11 ms. **Quedan como candidatos:** ~~la baja de una persona por lotes~~ (hecha en el cierre 1); la búsqueda por nombre con `pg_trgm` a través de una `definer` si la cartera pasa de ~300.000 (hoy, 185 ms con 200.000); filtrar por un campo privado cuesta lo que suma la cartera de quien filtra (~66 µs por lead).
5. ~~**9i — un patrón de lista para toda tabla, el resumen de vehículos y el orden del «⋯» del lead**~~ **hecha** (`docs/DECISIONES.md`, 2026-10-18): `src/shared/ui/lista/` (una sola vista, nombre y «⋯» pegados, un clic en cualquier parte abre el resumen, teclado, `<MasAcciones>`) y una guarda que exige el patrón a toda lista de un módulo; el inventario de vehículos lo adopta; el resumen de vehículos en `?vehiculo=` (Resumen, Fotos, Interesados) con «Editar» que abre el panel encima y vuelve; lo mismo en leads (`?lead=` + «Editar»); el «⋯» del lead, de una sola lista, en la fila, el kanban, el resumen y la ficha, y el del vehículo en la fila, el resumen y la ficha. **Quedó:** el listado del equipo no tiene resumen (la guarda lo registra como excepción: candidato a «Persona»); una bandera `principal` en los campos de un origen para lo que identifica al vehículo (hoy `en_tarjeta`); el kanban en el tope pesa 3.000 nodos más (`docs/RENDIMIENTO.md`).
6. ~~**9j — los tipos de lead configurables como los orígenes**~~ **hecha** (`docs/DECISIONES.md`, 2026-10-18): Configuración › Leads › «Tipos de lead» (crear, renombrar, ordenar, activar y desactivar, hasta 100; uno con leads no se elimina), cada tipo de una **clase fija** («prospecto» o «cliente») elegida al crear y que no cambia; la base impone que siempre quede un tipo activo de cada clase (trigger con candado, probado con dos conexiones en `db:carreras`) y que un lead no guarde uno apagado. `tipos_lead` reemplaza al enum `tipo_lead`; el alta propone el primer tipo activo de la clase prospecto, y el alta, la ficha, el resumen, el listado (columna y filtro por clave), el CSV y la exportación leen los nombres de la base (`leads_catalogos()`). **El sistema razona por la clase, nunca por el nombre ni la clave de un tipo** (Fases 4 y 9, abajo). El portal no lee el tipo (el `cliente` de `web.portal_snapshot` es el nombre del lead). **Quedó:** un «por defecto» explícito para el alta (hoy, el primero de la clase prospecto por orden) y un icono o color por tipo.
7. **El cierre de la fase**, en cinco partes (cada una se detiene a reportar; el plan tenía tres, pero el cierre 2 dejó trabajo no previsto, el 3 lo absorbió y el 4 sumó las herramientas para mirar capturas: la higiene y el Nivel 3 pasan al cierre 5). **Cierre 1 hecho** (`docs/DECISIONES.md`, 2026-10-17, «Cierre 1»): lo que la escala dejó con número. **Cierre 2 hecho** («Cierre 2»): las dos deudas de la baja en curso y los ocho defectos de interfaz. **Cierre 3 hecho** («Cierre 3»): las deudas del 2 y los hallazgos de interfaz que dejó:
   - ~~la policy de `leads_asesores` entregaba la fila de quien está en baja~~ (cierre 3, 0a: `…002700`, con su prueba permanente `cartera-policy.sql` y las policies en el inventario del humo); ~~el comentario de `…002400`~~ (0b);
   - ~~las tarjetas del listado en el celular al 200 %~~ (no era una regresión: ya estaban así en el cierre 1; leads y vehículos), ~~los `Drawer` con formulario que no preguntan al salir desde un aviso~~ (eran doce; el `<Drawer>` lo hace y una guarda registra todos), ~~el aviso sobre el pie de los paneles~~ y ~~las etiquetas de los botones al 200 %~~ (sí crecían: lo que las hacía parecer quietas era `transition-all`; una guarda lo impide);
   - ~~lo que dejó el cierre 3~~ **hecho en el cierre 4:** los tres modales con formulario (nuevo embudo, nuevo rol, invitar persona; y «Etiquetas», que apareció al buscarlos) preguntan al descartar, con su guarda; «Agregar vehículo» cuenta la nota de un interés sin mandar; los avisos con descripción crecen con el texto (la letra ya crecía: faltaba el ancho).

   **Cierre 4 hecho** (`docs/DECISIONES.md`, 2026-10-17, «Cierre 4 (1)» a «(10)»): los tres pendientes de interfaz, las herramientas para mirar capturas (el ayudante que espera a la pantalla quieta y las hojas de contacto: «mirar» es abrir todas las hojas, `.claude/rules/e2e.md`) y los tiempos de prueba medidos: `importaciones-vinculos-purgar` no es lento (el 6,4 s no se reprodujo en nueve condiciones y se refutó la hipótesis del WAL), una base recién creada sí tardaba 20 s en su primera importación por falta de estadísticas (la semilla analiza), el lote de la importación se queda en 50 (con su guarda), y las cuentas de los `beforeAll`/`afterAll` se crean y se borran a la vez. El uso de `pnpm test:e2e:completo --project=<nombre>` (el flag ya pasaba a Playwright) está documentado.

   **Cierre 5 (higiene y Nivel 3), lo que queda:**
   - **de la 9e:** (a) una pantalla paga todo lo que reexporta el `index.ts` del módulo que importa (`/perfil`, 25 KB por `ListaEquipo` y `MatrizDeRoles`; `/leads`, la ficha y el importador): partir los barriles por pantalla o servir lo grande con `diferido()` y SSR; los presupuestos de JS de `/leads`, `/perfil` y `/vehiculos` ya están fijados (`e2e/soporte/presupuestos.ts`); ~~(c) un avatar chico~~, ~~(d) el cursor de `storage-gc`~~, ~~(e) avisar el tope~~ y ~~(f) el lote de papelera de 20, la búsqueda del kanban~~ (cierre 1; el «página N» se descartó);
   - los **barriles de módulo** y el recorte de la ficha (sus presupuestos, «Datos», «Oportunidades» y «Portal»); las **oportunidades visibles a 10**; la **tabla de criterios** y el **índice de `docs/DECISIONES.md`**;
   - **fechar las entradas del repo** con la fecha del sistema (`TZ=America/La_Paz date +%F`);
   - el **Nivel 3** de verificación;
   - **lo que vieron las 34 hojas de `e2e-capturas/cierre-3`** (cierre 4, parte B; sin arreglar):
     - **4.1** el listado de leads al 200 % en escritorio: «Lista | Embudo», «Importar» y «Papelera» quedan alineados a la derecha, cada uno en su fila, y «Ítems por página» al final: la barra se ve desordenada (`botones-texto-200-01`; la barra del listado, `FilterShell` y las acciones de `listado-de-leads`);
     - **4.2** los marcadores de los buscadores se cortan al 200 %: «Buscar por nombre c…» en el listado y «Buscar en el embu…» en el kanban (`r-cierre-2-03` y `-06`; el campo del `FilterShell` y `busqueda-del-embudo.tsx`);
     - **4.3** la vista previa de la importación en escritorio parte el nombre de la fila («…escritorio B / 1») con ~800 px libres a la derecha (`r-csv-08`; `paso-vista-previa`);
     - **4.4** un modal en el celular al 200 % deja el cuerpo en una cuarta parte de la pantalla: el pie con su pregunta o sus dos botones apilados ocupa casi la mitad y el aviso «No hay conexión…» se corta tras cuatro líneas (`r-cierre-4-20`, `-10`, `-24`; el pie de `<Modal>` y de `ModalDeFormulario`);
   - ~~**medir en volumen la importación**~~ **medida en el cierre 5a** (`docs/DECISIONES.md`, 2026-10-18, «Cierre 5a»; `docs/RENDIMIENTO.md` › «Cierre 5a»): abajo, 5a-3. Los otros dos presupuestos de `db:medir:volumen` que fallaban con 212.000 leads y la suite también se midieron, **sin arreglar** (cada uno con su número, el assert que ya cuida la guarda y el que el arreglo tiene que cumplir):
     - ~~**5a-1 · la búsqueda por nombre crece con N**~~ **hecho en el cierre 5a-fix-1b** (`docs/DECISIONES.md`, 2026-10-18, «Cierre 5a-fix-1b»; `docs/RENDIMIENTO.md` › «Cierre 5a-fix-1b»): la búsqueda por nombre y un campo público se leen en dos pasos —`leads_candidatos()` saca de `leads_busqueda_idx` los primeros 300 que coinciden, sólo de lo que quien llama ve, y la página sale de `leads_vista_por_ids()` con lo demás— (migración `…20261019003300`). **Antes → después, los dos pasos, con 62.000 y con 212.000 leads:** la dueña en «todos», sin resultados 48,8 → **6,7** y 204,7 → **6,5** ms, selectivo 58,8 → 23,5 y 220,6 → **17,5**; Ana, con un apellido común (12,5 %) 56,1 → 32,9 y 391,8 → **40,5**; Berta, con un apellido común 16,1 → 16,3 y 73,0 → **16,4** (ya no crece con N); la «chica» 7,5 → 3,6 y 38,4 → **3,6**; un término que coincide con casi todo (`Volumen`) Ana 263 → 34,1 y 3.119 → **43,8**, Berta 606 → 39,5 y 7.270 → **38,8**, la dueña en «míos» 2.127 → 37,2 y 12.771 → **43,8**. **Lo asertado** (`medir-escala.sql`, `busqueda()`): como mucho 39,5 ms con 62.000 y 44,6 con 212.000 (tope 50 los dos pasos, 25 y 40 cada uno), sin la fórmula `3,2 µs × N`; el md5 de las filas enteras contra la consulta de siempre, 190 comparaciones iguales en Postgres de verdad (`busqueda-volumen.sql`) y las de `busqueda-leads.sql` en `db:probar`; Berta lee 0 bloques del heap buscando apellidos que sólo tienen otras personas. Costo de escribir y límites: abajo (5a-5, 5a-7 a 5a-10) y `docs/RENDIMIENTO.md`.
     - ~~**5a-2 · la persona con pocos leads recorre el índice entero**~~ **hecho en el cierre 5a-fix-1a** (`docs/DECISIONES.md`, 2026-10-18, «Cierre 5a-fix-1a»; `docs/RENDIMIENTO.md` › «Cierre 5a-fix-1a»): «míos» de quien tiene `leads.ver` «propios» se lee de `leads_cartera_vista` (la cartera de quien mira, por `leads_asesores_listado_idx`; migración `…20261019003200`), no de `leads_vista`. **La «chica» (3 leads), página 1:** 18,6 → **3,6 ms** con 62.000 leads y 63,8 → **3,7 ms** con 212.000; descartes 49.529 → **29** y 199.526 → **29**; página 100 por cursor 15,8 → 3,6 y 64,9 → 3,7. Una asesora con 500 leads en la papelera: 4,8 / 4,9 ms (530 descartes). **Assert** (`medir-escala.sql`): «míos» de Ana, Berta, la «chica» y la de la papelera, página 1 ≤ 30 ms, cursor ≤ 150 y ≤ 3.000 descartes con 62.000 **y** con 212.000, **sin** las dos fórmulas por N (borradas). **Los cuatro cercanos al techo, sin tocar sus presupuestos** (62.000 → 212.000, antes → después): etiqueta de Ana 23,6 → 16,1 y 96,3 → **64,3**; atributo sin resultados de la dueña 23,7 → 21,8 y 90,4 → 90,0 (ruta que no cambió); campo privado sin resultados de la dueña 1.396,6 → 1.418,6 y 5.305 → **5.534 de 6.000 (92 %)**; kanban 18,5 → 25,6 y 74,8 → 70,6 (no es de este arreglo: su policy es la de `oportunidades`). **Lo que queda, con su número** (RENDIMIENTO › «Lo que no arregla»): (a) quien ve «todos» con pocos leads propios (una supervisora) recorre `leads_listado_idx` entero en «míos»: 78,9 ms con 212.000; (b) un filtro sin resultados sobre una columna común (`atributos_publicos @>`) sigue en un `Seq Scan` de `leads` para todos, también la «chica» (56,2 ms con 212.000, presupuesto 100): se arregla con la misma función con el uid literal y `gin` que pide 5a-1; (c) **hallazgos de la dueña en «míos»**, rutas que no cambiaron y nunca se midieron: un atributo común 105,6 ms con 212.000 y una etiqueta propia 112 ms con 62.000, ambos sobre su presupuesto de 100 (**candidato, junto con 5a-1**: la guarda de la dueña en «míos» debería asertarlos). _Original:_ la «chica» (3 leads) descartaba 50.026 filas con 62.000 → 200.026 con 212.000 y tardaba 18,5 → 62,8 ms (0,30 µs por lead, lineal); la policy decide en ejecución si ve «todos» o «propios» y el plan genérico camina `leads_listado_idx` entero.
     - ~~**5a-3 · importar 500 filas cuesta lo que pesa `actividad`**~~ **hecho en el cierre 5a-fix-2** (`docs/DECISIONES.md`, 2026-10-18, «Cierre 5a-fix-2»; `docs/RENDIMIENTO.md` › «Cierre 5a-fix-2»): `_lead_crear` busca «¿este intento ya entró por una adopción?» sólo si el alta trae `adoptar` (la importación lo rechaza), migración `…20261019003100`. **500 filas en lotes de 50, con 62.000 leads:** con ~23.000 filas de `actividad` 3.501–4.297 ms → **1.067 ms**, con ~124.000 12.229–13.144 ms → **1.079 ms** (con 212.000 leads: 1.119 y 1.086 ms); el tiempo por fila de 124.000 sobre el de 23.000, 3,3–3,5 veces → **1,0**. Assert (`supabase/tests/medir-importacion-volumen.sql`, en `db:medir:volumen`): 500 filas ≤ 2 s con ≈ 124.000 filas de `actividad` y la mediana de los lotes entre 0,8 y 1,2 veces la de ≈ 23.000. Forzar el índice parcial (`materialized`, `registro_id::uuid`) no alcanzaba: con 25 % de adopciones y 123.000 filas vuelve a `actividad_pkey` (316 ms). _Original:_ con `actividad` chica, 500 filas son ~1,0–1,1 s con 0, 62.000 y 212.000 leads; con 25.309 filas de `actividad`, 3.037 ms, y con 126.307, 10.467 ms; causa y diagnóstico repetible en `supabase/tests/medir-importacion-etapas.sql`.
     - **5a-4 · la suite: 39,1 min, 49 % de ellos el celular** (medición, no Nivel 3: 1.009 pasan, 29 saltos, 0 fallos). La preparación (reset 29,5 s, carreras 9,5 s, build 6,3 s) es el 1,9 %; escritorio 19,7 min y celular 19,3 min; la prueba más lenta dura 11 s y la media 2,1 s, así que no hay un spec que explique el tiempo. De los 101 specs del celular, **65 (342 pruebas, 12,9 min) no afirman nada del ancho**, 19 mezclan (4,2 min) y 17 sí lo necesitan (2,2 min); sólo 6 pruebas no usan `page`. Bajar de nivel (Vitest o `db:probar`) libera ~116 s, el 5 %: lista con la razón de cada una en `docs/RENDIMIENTO.md` › «C». **Assert hoy:** ninguno (la suite no mide su tiempo). **Arreglo propuesto, sin aplicar y con decisión de la persona:** (a) los 65 specs sin celular corren sólo en escritorio, marcados en el propio spec (`test.skip` por proyecto con el motivo, o un proyecto `movil` con `testMatch` de los que sí lo necesitan) y una guarda que lista los marcados; (b) bajar las pruebas de la lista de RENDIMIENTO a Vitest o `db:probar`, una por una y comprobando que el caso queda cubierto; (c) `vehiculos-apibara-funcion` y `capturas-quietas` en un solo proyecto. **Assert del arreglo:** el Nivel 3 ≤ 25 min con las mismas áreas cubiertas (`--list` por proyecto antes y después, los nombres que bajan están en la lista de qué cubre cada uno) y la guarda de specs sin celular en `pnpm test`. _Prompt:_ **5a-fix-3**, antes del Nivel 3 (5c).
     - **5a-5 · «todos» con pocos leads propios recorre el índice del listado entero** (la supervisora, «míos»). Con 212.000 leads: **75,8 ms**, 200.021 descartes por `leads_listado_idx`; por la cartera sería **1,4 ms** (24 descartes). **Mecanismo:** ningún operador, es el enrutamiento por alcance de 5a-fix-1a (`fuenteDelListado()`: «todos» lee `leads_vista`, donde `en_cartera` —un uid opaco para el plan genérico— no tiene índice); se dejó así porque a la dueña (cartera del 40 %) la vista por la cartera le cuesta (campo privado 5.318 → 5.871 de 6.000). **Assert del arreglo:** «míos» de una persona con «todos» y 3 leads propios, página 1 ≤ 30 ms con 62.000 y con 212.000 (en `medir-escala.sql`, como la «chica»). **Lugar:** `entities/fuente-del-listado.ts` y `condicionesDeLeads` (decidir la fuente por cuántos leads tiene la cartera, que la lectura puede saber —`leads_candidatos()` ya recorre la cartera—, y no por el alcance).
     - **5a-6 · el kanban de la dueña oscila 67–111 ms con 212.000** (presupuesto 100) **con el índice de antes y con el nuevo** (A/B en la misma base, dos rondas: de antes 102–111 y 69–70; el nuevo 82–91 y 67–72). **Mecanismo:** `_mis_leads_vivos()`, la policy de `oportunidades`, lee 80.000 filas de `leads_asesores` y `leads` por su clave (`Buffers: read=1.454` con la caché fría; 128 MB de `shared_buffers`); nada que ver con la búsqueda. **Assert del arreglo:** las tres filas de la columna del kanban de la dueña ≤ 100 ms en tres corridas seguidas con 212.000. **Lugar:** la policy de `oportunidades` (guardar la lista de leads vivos de la cartera, o filtrar por `oportunidades.usuario_id` antes de unir).
     - **5a-7 · la etiqueta de la dueña en «míos» crece con N.** Su etiqueta: **83,3 ms** con 212.000 (12.674 descartes) y **112 ms** con 62.000; una etiqueta que ningún lead tiene: **368 ms** con 212.000 (recorre las 200.000 filas); la de Ana (cartera de 8.000): 66,4 ms. **Mecanismo:** `etiquetas` es una subconsulta por fila de `leads_vista`, que ningún índice de `leads_etiquetas` puede guiar: el plan recorre `leads_listado_idx` y calcula las etiquetas de cada fila. No es el de la búsqueda (no hay un operador no _leakproof_). **Assert del arreglo:** su etiqueta, con y sin resultados, ≤ 100 ms con 62.000 y con 212.000. **Lugar:** la misma ventana de candidatos con una condición `etiquetas` (por `leads_etiquetas`, que necesita un índice por `etiqueta_id`), o resolver antes los ids de las etiquetas, como `#n`; `entities/candidatos.ts`, `leads_candidatos()` y `condiciones.ts`.
     - **5a-8 · un término sin tramo de 3 letras o dígitos, escaso, recorre la cartera de quien busca** (`x`, `zq`, `a_b`, `%`: el trigram no tiene qué buscar). Con 212.000 leads, los dos pasos: la dueña en «todos» **241–255 ms** (62.000: 59–67), en «míos» 156–161 (62.000: 23–40), Berta (28.000) **90–94** (62.000: 24–26), Ana (8.000) 33–34 (62.000: 8–9), la «chica» 0,7. Hoy cuesta lo mismo que antes del cambio (la dueña «todos» 211, Berta 115, Ana 43: no empeoró). Uno **denso** (`v`, `ol`) sí está dentro: 22–44. **Mecanismo:** sin un tramo de 3, `pg_trgm` recorre la columna entera, así que la etapa de índice es un recorrido por el orden del listado sin tope. **Probado y descartado:** un índice de n-gramas de 1 y 2 caracteres (`_lead_ngramas(nombre)` en el mismo GIN): 500 altas pasan de 1,1–1,7 s a 2,8–3,7 s (hasta 2,5 veces) y se rompería el tope de 2 s de la importación (`medir-importacion-volumen.sql`); además 3,3 s para crearlo con 62.000 leads. **Assert del arreglo:** `x`, `zq`, `a_b` y `%` ≤ 50 ms para las cuatro personas con 62.000 y con 212.000, sin pasar de 2 s en 500 filas importadas. **Lugar y decisión de la persona:** o se paga ese costo de escritura (con otro formato de clave: sólo bigramas, una columna aparte), o el buscador pide 3 caracteres para el nombre (cambia lo que se encuentra con 1 y 2: «Ñ» o «Al» dejarían de buscar; `#n` sigue con un dígito). `leads_busqueda_idx`, `_leads_candidatos_indexable()` y `filtros.ts` (`interpretarBusqueda`).
     - **5a-9 · filtros de texto y de rango sobre un campo público, sin resultados, crecen con N.** `atributos_publicos ->> 'clave' ilike '%x%'` sin resultados: la dueña **118,2** ms, Ana 57,9, la «chica» 50,4 con 212.000; un rango de texto sin resultados 71,8 / 52,5 / 50,9; uno común (`%lp%`) 15,8 / 18,0 / 1,1. **Mecanismo:** el mismo (`ilike` y comparaciones sobre `->>` no son _leakproof_, y el GIN `jsonb_path_ops` sólo sirve a `@>`); el filtro por una opción (`@>`) sí entra a los candidatos. **Assert del arreglo:** ≤ 50 ms con 62.000 y con 212.000, sin resultados. **Lugar:** una ventana de candidatos con la condición de texto o de rango (`->>` con `ilike` o `>=`, por la ventana de recorrido: W termina cuando junta K) y, para el rango, un índice por clave si la empresa filtra mucho por una fecha; `leads_candidatos()` y `entities/candidatos.ts`.
     - **Orden propuesto de lo que sigue:** ~~5a-fix-1a (5a-2: la persona con pocos leads)~~ hecho → ~~5a-fix-1b (5a-1: la búsqueda por nombre)~~ hecho → ~~5a-fix-2 (5a-3: la importación)~~ hecho → **5b** (higiene) → 5a-fix-3 (5a-4: la suite) → **5c** (Nivel 3, con el código y la suite ya cambiados).

**Candidatos que decide la persona (no entran solos):** (a) una pantalla para los **tipos de seguimiento** (hoy sólo están en `seed.sql`: sin pantalla, sin orden ni icono; sería la pestaña que sigue a «Orígenes del lead» en Configuración › Leads, con el mismo patrón); (b) un **icono** para el origen del lead y el tipo de seguimiento, que pide un catálogo cerrado en `shared` y dibujarlo (el de `tipos_seguimiento` hoy se guarda y no se muestra); (c) un origen del lead «por defecto» de la empresa (hoy el alta propone el último que usó la persona); (d) separar `leads.campos.gestionar` de `leads.configurar`.

**Terminado cuando:** cada empresa arma los campos de sus leads sin tocar SQL (crea «Signo zodiacal»,
apaga «Edad», marca uno «solo la cartera») y quien ve un lead sin estar en su cartera no recibe un
privado, ni por la vista ni filtrando; registrar lead + seguimiento ≤ 25 s desde `N` con el duplicado
detectado al terminar de tipear el teléfono (e2e lo mide); la dueña ve el lead ajeno con teléfono enmascarado;
dar de baja a un asesor manda sus leads al limbo y otro los adopta al registrar el teléfono; el
código del portal es dictable.

## Fase 4 — Cotizaciones

Módulo `cotizaciones`: motor del grafo en `entities/` (evaluación topológica, buckets por tipo de
cambio, `total`, `base_imponible`, `aparte`; tests contra la fórmula del seed); editor de la
fórmula en configuración (nodos, constantes, tablas de referencia editables inline, borrador /
publicar con nota / historial / revertir); `XCell` (núcleo de ip: valor, default, revertir,
secundario, sugerido, deshabilitado con motivo, ⚙ que publica N+1, teclado); wizard de cotizar
(origen → vehículo por link/inventario/manual → lead → hoja → resumen con modo de TC y Live);
guardar preventa con snapshot; editar recalcula con SU versión; cotizar encima (versión N+1);
plantilla de tarjeta versionada y PDF en servidor con `@react-pdf/renderer`; compartir (texto +
PDF); comentarios anidados, adjuntos, favoritos, reportes, revisiones con diff; marcar final
(RPC) y comprobantes de venta. **Al marcar la cotización final, el lead pasa a la clase «cliente» (el primer
tipo activo de esa clase por orden): el sistema razona por la clase del tipo de lead (`tipos_lead.clase`), nunca
por su nombre ni su clave, que la empresa configura** (9j).

**Terminado cuando:** cotización completa ≤ 90 s con link de subasta y sólo teclado en la hoja;
el total del PDF es la suma de las líneas del snapshot (e2e lo verifica); cambiar una constante
desde el ⚙ publica v2 y la cotización abierta sigue usando v1 hasta recotizar; un vehículo tiene a
lo sumo una final activa.

## Fase 5 — Flujos (configuración)

Módulo `flujos`: configuración por origen (y el de repuestos): fases con todos sus atributos,
transiciones con acción y nota obligatoria, roles por fase y por transición, requisitos
(documento con tipo/min/max/formatos, dato con las claves del catálogo, espera a fase de otro
flujo), reglas del flujo (encender/apagar con impacto), tipos de documento globales y por flujo
con vencimiento, oferta de transporte, franja «Revisar» (`revisar_flujo`), jubilar/eliminar fase
(`fase_eliminar`), «fuera de regla» y el aviso de impacto antes de volver bloqueante un requisito.

**Terminado cuando:** el dueño arma desde cero un flujo de 5 fases con requisitos de los tres tipos
sin tocar SQL, «Revisar» marca una fase sin salida y una espera cruzada, y jubilar una fase con
historial la saca de los destinos sin romper nada.

## Fase 6 — Logística

Módulo `logistica`: cadena (kanban por fase con alerta por demora, filtros en URL), panel del
vehículo con «qué falta» (`previsualizar_cambio_fase`), mover con nota y `PT409`, lote con vista
previa por unidad y resultado parcial; documentos (subida con commit diferido, cámara en móvil,
aprobar/rechazar con motivo, vencimientos, visible en portal); transporte 1:1 y grupos
(embarques por booking, contenedores), editar grupo todo-o-nada; declaraciones aduaneras (DUI N:M,
canal de aforo, «pagada» derivada); gastos y pagos (confirmar sellado); notas; «dónde está»;
cotización final vs real y margen (`margen_vehiculo`); bandeja de logística en inicio;
alertas por demora (cron + notificación).

**Terminado cuando:** mover 1 vehículo ≤ 15 s y marcar llegada de un contenedor de 8 ≤ 60 s con
vista previa por unidad; no se puede mover sin el documento bloqueante y el conflicto da `PT409`
legible (e2e); el margen muestra `null` como «Sin venta registrada», nunca $0.

## Fase 7 — Agenda, chat, notificaciones y buscador

Módulos `agenda` (calendario mes/semana/día con eventos, tareas, recordatorios y subastas;
visibilidad; reasignar tarea; vínculos a lead/vehículo/cotización), `chat` (directos deduplicados,
grupos, canal global por permiso, menciones `#` con drawer de la entidad, `/tarea` y `/evento`
desde el mensaje, realtime, widget flotante, editar/borrar), `notificaciones` (campana con
«requiere acción», realtime, push web con VAPID y `supabase/functions/push`, preferencias por
usuario), `buscador` (Ctrl/Cmd+K: RPC por sección con mínimo 3 caracteres y ámbito en servidor,
acciones, últimos abiertos).

**Terminado cuando:** una tarea dada desde el chat le llega como notificación y push al
responsable; una mención a un lead que no puedo ver muestra placeholder; el buscador nunca
devuelve algo que la RLS esconde ni busca por teléfono.

## Fase 8 — Web pública (contenido, cola y portal) y repuestos

Módulo `web`: ajustes del sitio (lema, redes, legales con editor, orígenes visibles, política de
la cola), guías con Tiptap y publicación por permiso, FAQs, testimonios con consentimiento,
tablero de la cola (`estado_cola_web`, `unassigned` destacado, prioridades y cupos), tarjeta de
turno con «Contacté» y «Vincular a lead» en 2 toques, interruptor de disponibilidad en el perfil,
revalidación de la web por trigger + `WEB_PUBLICA_REVALIDAR_URL`, route handlers del portal
(`api/portal/*` con cookie firmada y `web.portal_*`: el contrato está en `docs/DECISIONES.md`, «Contrato del portal
para la Fase 8», 2026-10-16). Módulo `repuestos`: proyectos e ítems,
imágenes, stock y movimientos, compras (permiso de costos), flujo de repuestos con la misma cadena,
esperas que destraban al vehículo, cotizador de repuestos (config append-only, tramos, cajas,
líneas importado/local, aceptar), catálogos.

**Terminado cuando:** confirmar un turno toma 2 toques en viewport móvil y la tasa de contacto se
actualiza; un visitante anónimo (test contra `web.solicitar_asesor`) recibe asesor, el mismo
asesor dentro del plazo pegajoso y respaldo cuando nadie está disponible; un repuesto en fase
«Recibido» cumple la espera del vehículo en «En taller».

## Fase 9 — Tablero, datos, PWA y pulido

Módulo `tablero` (métricas y gráficas por rol con widgets personalizables guardados en
`preferencias_usuario`, dataviz con los tokens), `datos` (exportar/importar de todo para el dueño
con `supabase/functions/importar-csv`), `actividad` (listado por día con diff), PWA (instalación,
push, `sw.js` mínimo), transiciones y esqueletos revisados pantalla por pantalla contra
`docs/UX.md`, auditoría de accesibilidad AA, e2e completo de las cuatro tareas de oro en móvil y
escritorio, `splinter` en verde, despliegue en Vercel con `supabase db push --dry-run` revisado. **La conversión de
leads del tablero cuenta por la clase del tipo de lead (`tipos_lead.clase`: de prospecto a cliente), nunca por el
nombre ni la clave de un tipo** (9j).

**Terminado cuando:** las cuatro tareas de oro cumplen su meta en e2e móvil y escritorio, el
tablero del dueño muestra conversión de leads, cola web y margen del mes con datos reales,
splinter y los advisors están en cero errores, y la app está desplegada apuntando al proyecto Pro.

---

## Fuera de alcance

- Multiidioma. Offline real. Editor de artes (Konva). Directorio de contactos/empresas.
- API de WhatsApp/Meta. Multi-empresa por despliegue.
- La web pública en sí (repo aparte con `sitio-marketing` sobre el esquema `web`).

Si algo de esta lista se vuelve necesario, se discute y se agrega al plan explícitamente. No se
cuela dentro de otra fase.

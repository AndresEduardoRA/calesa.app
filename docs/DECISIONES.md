# Decisiones

Registro ligero. Una entrada por decisión que costaría entender de nuevo dentro de tres meses.
No documentes lo obvio.

Formato:

## AAAA-MM-DD — <decisión en una línea>

**Contexto:** qué problema había.
**Decisión:** qué se eligió.
**Alternativas:** qué se descartó y por qué.
**Consecuencia:** qué se vuelve fácil y qué se vuelve difícil por haber elegido esto.

---

## Índice

Una línea por entrada: su línea en este archivo, su fecha y su título. **Se lee por aquí, no entero** (el archivo pesa ~400 KB y crece con
cada parte): busca el tema en el índice y abre la entrada con `Read` y `offset` = esa línea; las más nuevas están al final. Lo genera
`bash scripts/mapa.sh` (el hook Stop lo corre y `--check` falla si quedó viejo): no se edita.

<!-- indice:inicio (generado por scripts/mapa.sh: no se edita) -->

- L296 · 2026-10-11 · Stack y andamiaje inicial
- L313 · 2026-10-11 · Nivel 2, monolito modular con 17 módulos
- L325 · 2026-10-11 · Un motor de flujos para vehículos y repuestos, no tres copias
- L339 · 2026-10-11 · Orígenes configurables: campos comunes como columnas, el resto en `atributos`
- L349 · 2026-10-11 · La fórmula de cotización es un grafo versionado validado en SQL
- L364 · 2026-10-11 · Permisos: catálogo fijo por código, roles libres, origen y alcance como parámetros
- L375 · 2026-10-11 · Teléfono único global y enmascarado salvo cartera; leads en limbo
- L386 · 2026-10-11 · Policies de la fila propia inline, no por función
- L395 · 2026-10-11 · Embarques y contenedores son grupos; la DUI es entidad
- L403 · 2026-10-11 · Secretos fuera de la base; integraciones como interruptor
- L410 · 2026-10-11 · Monedas: base + N tipos de cambio nombrados, congelados por cotización
- L418 · 2026-10-11 · Cola web: habilitado nace en false; prioridad ponderada
- L425 · 2026-10-11 · PDF de cotizaciones en servidor con `@react-pdf/renderer`
- L433 · 2026-10-11 · Íconos PWA neutros hasta que la empresa cargue su logo
- L441 · 2026-10-11 · Lo que se dejó fuera a propósito
- L447 · 2026-10-11 · Boundaries con la sintaxis v7, no la legacy
- L459 · 2026-10-11 · Migración base generada desde `supabase/schemas`
- L478 · 2026-10-11 · shadcn dentro de `src/shared/ui`, con sus variables puenteadas a los tokens
- L495 · 2026-10-11 · `puede()` y el catálogo de claves viven en `src/shared/lib/permisos.ts`
- L505 · 2026-10-11 · Lo que se ve sin sesión sale de `web.ajustes_acceso()`, con `primer_registro`
- L519 · 2026-10-11 · `/auth/callback` canjea `code` (Google) y `token_hash` (correos)
- L532 · 2026-10-11 · `mi_sesion()`: la sesión entera en una ida a la base
- L546 · 2026-10-11 · Google sin variable de entorno; el botón depende de lo que diga Auth
- L556 · 2026-10-11 · El `index.ts` de un módulo se importa sólo desde Server Components
- L571 · 2026-10-11 · La navegación se declara entera y un test la compara con las rutas que existen
- L579 · 2026-10-11 · El e2e de acceso exige la base local sin personas
- L588 · 2026-10-11 · Un módulo tiene dos entradas: `index.ts` (servidor) y `client.ts` (cliente)
- L603 · 2026-10-11 · El cliente admin tiene una sola excepción: `conAdminDeAuth()`
- L618 · 2026-10-11 · El registro cerrado se comprueba al cerrar la transacción, no al insertar
- L633 · 2026-10-11 · Un solo enlace de invitación vigente por persona
- L647 · 2026-10-11 · La perspectiva «ver como» viaja en una cookie y se calcula en SQL
- L662 · 2026-10-11 · La vista previa de una baja es una RPC que sólo cuenta
- L675 · 2026-10-11 · La versión de un rol cubre sus concesiones; bloquear usa el estado
- L690 · 2026-10-11 · El guardián cuenta la unión de roles y cuida todo `equipo.*` del dueño
- L701 · 2026-10-11 · Voz: español neutro con tuteo, también en la base
- L709 · 2026-10-12 · Secretos: Vault por RPC para lo que se edita en la interfaz
- L730 · 2026-10-12 · La empresa se escribe sólo por RPC; sus tablas son de sólo lectura
- L745 · 2026-10-12 · El color de la marca se acepta si el texto de un botón se lee sobre él
- L761 · 2026-10-12 · Íconos: dibujados en el navegador, guardados en Storage, servidos por el manifest
- L777 · 2026-10-12 · Empresa es una pantalla con pestañas; cada formulario lleva de `key` lo que edita
- L795 · 2026-10-12 · Un logo no pasa por la compresión de fotos
- L805 · 2026-10-12 · Toda RPC de edición exige la versión: un nulo se rechaza
- L820 · 2026-10-12 · Orígenes, campos y categorías se escriben sólo por RPC, con versión por fila
- L838 · 2026-10-12 · Un origen con uso se desactiva; sólo uno sin uso se elimina
- L855 · 2026-10-12 · Un campo con datos no cambia de tipo ni se elimina: se desactiva
- L872 · 2026-10-12 · El tipo de un origen (subasta o manual) no cambia
- L885 · 2026-10-12 · Nombre, sustantivo y género: tres datos de la fila y reglas puras
- L899 · 2026-10-12 · El orden se cambia con botones y por movimiento relativo, no arrastrando
- L914 · 2026-10-12 · Quién abre Configuración › Orígenes: sin `origenes.ver`
- L927 · 2026-10-13 · FilterShell vive en `shared`; las vistas guardadas las posee `equipo`
- L944 · 2026-10-13 · Un solo esquema Zod, armado desde el layout, valida en el navegador y en el servidor
- L962 · 2026-10-13 · Filtros sobre `atributos` por PostgREST, keyset y policy de InitPlan; el GIN no cuenta
- L981 · 2026-10-13 · Vehículos se escriben sólo por RPC; el alta entra a la única fase inicial
- L1002 · 2026-10-13 · Campos sensibles: el esquema no los resuelve, y el inventario no muestra costos
- L1017 · 2026-10-13 · Un VIN repetido bloquea, y se dice junto al campo
- L1027 · 2026-10-13 · Los e2e del inventario no piden el equipo vacío
- L1036 · 2026-10-13 · Las fotos van a un bucket público, cada una en la carpeta de su vehículo
- L1054 · 2026-10-13 · Dos tamaños por foto, hechos en el navegador; sin optimizador
- L1070 · 2026-10-13 · Las fotos tienen su propia versión, aparte de la de la ficha
- L1087 · 2026-10-13 · La limpieza de Storage reclama antes de borrar; la función queda para la parte 4
- L1107 · 2026-10-13 · Una foto se valida decodificándola, y se reconoce por el hash del archivo original
- L1122 · 2026-10-13 · Vínculo e interesados: RPC y lectura ahora, interfaz con leads
- L1141 · 2026-10-13 · En plpgsql un permiso se pregunta con `puede_*()`, no con un `if` sobre `in (…)`
- L1153 · 2026-10-13 · La vitrina muestra identidad, precio público, campos públicos y la portada; nada más
- L1172 · 2026-10-13 · Una sola definición de lo público: el esquema `interno`
- L1191 · 2026-10-13 · Publicar lleva la versión del vehículo y manda el estado entero
- L1201 · 2026-10-13 · Qué no va a la papelera, y que todo lo que entra se pueda purgar
- L1221 · 2026-10-13 · Los vehículos tienen su papelera; el envío es por lote, con versión por vehículo
- L1242 · 2026-10-13 · La purga manual y la automática son la misma función
- L1264 · 2026-10-13 · `storage-gc` se dispara desde la base y se autentica con un pase de un solo uso
- L1289 · 2026-10-13 · Vitrina y papelera no suman permisos: los cuatro que había, todos con enforcement
- L1309 · 2026-10-14 · apibara: se guarda todo lo que devuelve, y cada dato normalizado es un campo
- L1336 · 2026-10-14 · Refrescar no pisa lo que la persona editó: tres vías con el bruto anterior
- L1352 · 2026-10-14 · Las fotos de una subasta pasan por la tubería del navegador, en primer plano
- L1371 · 2026-10-14 · La llamada a apibara vive en la edge function y la hace el navegador
- L1392 · 2026-10-14 · «Subastas próximas en la ficha» es la subasta de ese vehículo
- L1405 · 2026-10-14 · Migraciones sobre una base viva, y e2e que no exigen la base vacía
- L1421 · 2026-10-14 · El bruto de apibara lo origina la función; el navegador manda una referencia
- L1443 · 2026-10-14 · La regla de limpieza vive en un solo lugar de la base
- L1464 · 2026-10-14 · Qué ancla y qué no; la cotización final queda para la Fase 4
- L1480 · 2026-10-14 · «Conservar» es una marca aparte, sin versión, y restaurar la deja puesta
- L1494 · 2026-10-14 · El job: una vez por día local, desde las 03:00, lote acotado y con registro
- L1514 · 2026-10-14 · El lote de la limpieza lo ven y restauran quienes pueden vaciar la papelera
- L1523 · 2026-10-14 · El aviso: los próximos 3 días, y el interruptor apagado lo borra todo
- L1532 · 2026-10-14 · Los textos de uso diario dicen «subasta»; el proveedor se nombra donde se configura
- L1548 · 2026-10-14 · El motor de campos es de `shared`, y los leads lo usan
- L1568 · 2026-10-14 · Los leads suman `correo` y `documento`, y nacen «solo la cartera»
- L1580 · 2026-10-14 · Configuración › Leads reusa `leads.configurar`
- L1593 · 2026-10-14 · Las seis columnas de un lead pasan a atributos, sobre la base viva
- L1609 · 2026-10-14 · Los privados se recortan al leer, con la cartera de ese momento; filtrar es leer
- L1632 · 2026-10-14 · «La de la empresa» es una columna, no una referencia dentro del valor
- L1642 · 2026-10-14 · «De fábrica» reemplaza a «de sistema» para los campos
- L1649 · 2026-10-14 · El alta rápida pide los requeridos propios, y el panel lo dice
- L1659 · 2026-10-14 · El alta rápida es una sola RPC: el lead, su seguimiento y el recordatorio entran juntos
- L1679 · 2026-10-14 · El teléfono lo normaliza la base y el código de país es de la empresa
- L1695 · 2026-10-14 · Tomar un lead sin dueño exige aceptarlo, deja de dueño y no pisa
- L1708 · 2026-10-14 · Ctrl/Cmd+Enter avanza al seguimiento y se guarda al final
- L1720 · 2026-10-14 · `N` es de la pantalla; «Nuevo lead» siempre tiene botón
- L1732 · 2026-10-14 · El resumen de un seguimiento es un título corto y un detalle en texto plano
- L1739 · 2026-10-14 · El formulario por bloques y los controles por tipo son de `shared`
- L1749 · 2026-10-14 · La guardia de los e2e: respaldo en disco, funciones servidas y teardown
- L1767 · 2026-10-14 · Cómo se mide la tarea de oro 1
- L1776 · 2026-10-14 · El listado de leads: orden, «míos», búsqueda, privados y drawer
- L1813 · 2026-10-14 · `alcance_de()` y `atributos_lead()` más baratas: lo que midió el listado
- L1835 · 2026-10-14 · La guardia de los e2e no respalda la base, y un respaldo viejo puede pisar un cambio
- L1858 · 2026-10-14 · La versión de un lead la mueve lo que la ficha edita, y nada más
- L1883 · 2026-10-14 · `lead_guardar` es la única puerta, y los atributos viajan como parche
- L1903 · 2026-10-14 · Los teléfonos de un lead se leen por función, y `telefono_lead()` da nulo a quien no ve
- L1922 · 2026-10-14 · Teléfonos extra y cambio del principal: las reglas (para la parte 4b)
- L1939 · 2026-10-14 · La ficha: tres lecturas, el código de país del lead y el tope de KB
- L1957 · 2026-10-14 · Tachados y claves de campo en la URL: no hay choque y no se reserva la clave
- L1970 · 2026-10-14 · Teléfonos de la ficha: cómo se aterrizó la 4b
- L2001 · 2026-10-15 · El e2e completo parte de un reset, la guardia sólo comprueba las funciones, y el atajo de la…
- L2056 · 2026-10-15 · Seguimientos y recordatorios se escriben sólo por RPC, y actuar exige la cartera
- L2079 · 2026-10-15 · Privado es sólo de su autor; ni el co-asesor ni «todos» leen lo privado ajeno
- L2090 · 2026-10-15 · El detalle viaja como documento del editor, nunca como HTML
- L2114 · 2026-10-15 · El editor: carga diferida, atajos del marco y borrador en la pestaña
- L2128 · 2026-10-15 · Recordatorios: crear exige la cartera; si se pierde el lead, sigue sin él
- L2142 · 2026-10-15 · Un seguimiento no mueve la versión del lead; la actividad deja constancia sin contenido
- L2153 · 2026-10-15 · Parte 5 partida en 5a y 5b; el diseño de la 5b
- L2174 · 2026-10-15 · Un corte del runtime local de funciones se vuelve a pedir, con una sola regla
- L2188 · 2026-10-15 · Las marcas se escriben sólo por RPC, y marcar exige ver el lead (no la cartera)
- L2215 · 2026-10-15 · El listado lee las marcas como columnas de `leads_vista`; lo que midió
- L2243 · 2026-10-15 · Los tachados se ocultan, salvo mientras se busca; el aviso cuenta con los mismos filtros
- L2261 · 2026-10-15 · Paleta de ocho claves en tokens; selector con cmdk; confirmar en la fila; sin atajo
- L2285 · 2026-10-15 · Parte 6a: toda RPC que recibe un lead cae en una de tres clases
- L2404 · 2026-10-15 · La papelera de leads: todo o nada, el lote lo genera el cliente, y lo vinculado no entra
- L2434 · 2026-10-15 · El documento de la ficha pasa de 40 a 48 KB
- L2443 · 2026-10-15 · Lo que dejó la revisión de la 6a: carreras, `lead_id` en otras tablas y un cinturón más ancho
- L2472 · 2026-10-15 · Parte 6b: vincular desde el lead, sin oráculo y con el lead bloqueado
- L2509 · 2026-10-15 · La sección «Vehículos» vive en `vehiculos`, y lo que no se ve no se cuenta
- L2531 · 2026-10-15 · `vehiculo_id` en seguimientos y recordatorios: uno que se ve, y si deja de verse sigue
- L2543 · 2026-10-15 · Las carreras se prueban con dos conexiones reales (`pnpm db:carreras`)
- L2561 · 2026-10-15 · El tope del documento de la ficha vuelve a 44 KB; diferir los paneles no ahorra documento
- L2573 · 2026-10-15 · Parte 7 partida en 7a y 7b; las quince preguntas se resolvieron con la recomendación
- L2585 · 2026-10-15 · Los embudos son personales y se escriben sólo por RPC; las etapas se guardan como conjunto
- L2609 · 2026-10-15 · Una oportunidad es de su dueña, con la cartera del lead; nadie más la ve
- L2633 · 2026-10-15 · Transferir lleva las abiertas al embudo del destino; la baja sigue cancelando
- L2645 · 2026-10-15 · El kanban: 50 por columna, «Ver más», pestañas en el celular, y la sección de la ficha
- L2662 · 2026-10-15 · La auditoría ampliada de la 7a, y lo que encontraron las pruebas
- L2687 · 2026-10-15 · Parte 7b: las dieciséis preguntas se resolvieron con la recomendación
- L2702 · 2026-10-15 · El acceso del cliente: clase 1, sólo por RPC, con la versión del acceso
- L2739 · 2026-10-15 · La clave del cliente nunca queda en claro
- L2761 · 2026-10-15 · El texto para WhatsApp: la plantilla en el código, la dirección en `ajustes_web`
- L2773 · 2026-10-15 · Contrato del portal para la Fase 8
- L2803 · 2026-10-15 · La auditoría ampliada de la 7b, y lo que encontraron las pruebas
- L2846 · 2026-10-15 · CSV de leads (Fase 3, parte 8a): exportar la cartera e importar con las reglas del alta
- L2907 · 2026-10-15 · El reintento al volver la conexión sólo sale al volver: la causa del fallo de `leads-alta-casos`
- L2926 · 2026-10-15 · Deshacer una importación (Fase 3, parte 8b): clase X, sólo lo intacto, 24 horas
- L2982 · 2026-10-15 · El país del teléfono: una tabla estática en el cliente, y «País» sigue al número
- L3037 · 2026-10-16 · El primer seguimiento del alta, opcional y enriquecido (Fase 3, parte 9b)
- L3099 · 2026-10-16 · Guardar en Empresa: el formulario espera a lo guardado, y el borrador mide contra lo que mandó el…
- L3146 · 2026-10-16 · Los avisos no reciben el puntero; el freno de CPU se borra; lo del borrador no se reproduce
- L3194 · 2026-10-16 · Los e2e reusan la sesión de cada cuenta dentro del proceso, y sólo eso
- L3217 · 2026-10-16 · Parte 9c: los formularios que aparecen al pulsar algo van en un modal con su URL
- L3276 · 2026-10-16 · Parte 9d: un solo modal de seguimiento, la pestaña del drawer y las acciones de la fila
- L3336 · 2026-10-16 · Parte 9d-2: el drawer con tres pestañas y las listas de un lead a escala
- L3392 · 2026-10-16 · Parte 9d-3: el recorrido de la IA con dos cuentas
- L3425 · 2026-10-16 · Parte 9e: la escala de toda la app, medida y con guardas
- L3487 · 2026-10-16 · Parte 9f-1: el origen del lead es configurable, y se escribe sólo por RPC
- L3503 · 2026-10-17 · Parte 9f-2: los dos números de un lead, y el global sólo con un permiso
- L3523 · 2026-10-17 · Parte 9g: ítems por página configurables, y la base acota toda página
- L3543 · 2026-10-17 · Parte 9h: la cartera de «todos» a escala, con la regla escrita una vez y estimable
- L3570 · 2026-10-17 · Cierre 1 (A): la baja de una persona va en dos tiempos, y la regla ya sabe que hay una baja en curso
- L3611 · 2026-10-17 · Cierre 1 (B): una sola vista por lista, elegida en el servidor con el ancho de la petición
- L3641 · 2026-10-17 · Cierre 1 (G): «página N» se descarta; arriba se dice lo que sí es verdad
- L3658 · 2026-10-17 · Cierre 1 (C): un lote de la papelera muestra sus primeros 20, y la papelera no entra al selector
- L3679 · 2026-10-17 · Cierre 1 (D): los topes se dicen, con un solo aviso y sin inventar un camino que no existe
- L3696 · 2026-10-17 · Cierre 1 (E): para llegar a lo antiguo de una columna del kanban, buscar
- L3714 · 2026-10-17 · Cierre 1 (F, d): el barrido de huérfanos de storage-gc sigue un cursor por bucket
- L3731 · 2026-10-17 · Cierre 1 (F, c): el avatar chico, con el relleno en una edge function
- L3756 · 2026-10-17 · Cierre 2 (0a): quien está en una baja en curso no figura como dueño para los demás
- L3778 · 2026-10-17 · Cierre 2 (0a): `_bajas_en_curso()` no le dice nada a una cuenta que no está activa
- L3792 · 2026-10-17 · Cierre 2 (0b): la carrera real de `…002400` es de dos corridas de la misma baja, no la del commit
- L3804 · 2026-10-17 · Cierre 2 (1): todo `<Confirmar>` tiene su URL, y una guarda lo exige
- L3824 · 2026-10-17 · Cierre 2 (2, 4): «Mover a…» no se parte, y la tabla del listado se desplaza dentro de su tarjeta
- L3837 · 2026-10-17 · Cierre 2 (3): un formulario que se reemplaza al llegar lo guardado apaga sus campos hasta entonces
- L3847 · 2026-10-17 · Cierre 2 (5): los avisos con un modal abierto sí se anuncian; lo que faltaba era preguntar al salir
- L3860 · 2026-10-17 · Cierre 2 (6, 7, 8): la barra que se desplaza lo dice, la barra superior cabe al 200 %, y los…
- L3875 · 2026-10-17 · Cierre 3 (0a): la policy de `leads_asesores` no entrega la fila de quien está en una baja en curso
- L3894 · 2026-10-17 · Cierre 3 (0b): el comentario de `…002400` dice la carrera que existe
- L3900 · 2026-10-17 · Cierre 3 (1): las tarjetas del listado no ensanchan la página con el texto al 200 %
- L3914 · 2026-10-17 · Cierre 3 (2): todo `<Drawer>` pregunta al salir desde un aviso; el `<Drawer>` lo hace, el…
- L3939 · 2026-10-17 · Cierre 3 (3): el aviso sube sobre el pie de un panel, y crece con el texto
- L3954 · 2026-10-17 · Cierre 3 (4): las etiquetas de los botones sí crecían; lo que las hacía parecer quietas era…
- L3967 · 2026-10-17 · Cierre 4 (1): todo modal con algo escrito pregunta al descartar; un hook compartido y una guarda
- L3989 · 2026-10-17 · Cierre 4 (2): la nota de un interés sin mandar cuenta como «hay cambios» y no se pierde al cambiar…
- L4001 · 2026-10-17 · Cierre 4 (3): el aviso con descripción crece con el texto; la letra ya crecía, el ancho no
- L4014 · 2026-10-17 · Cierre 4 (4): una captura se toma con la pantalla quieta
- L4026 · 2026-10-17 · Cierre 4 (5): hojas de contacto, y mirar es abrir todas
- L4034 · 2026-10-17 · Cierre 4 (6): `importaciones-vinculos-purgar` no es lento; la importación recién creada sí, por…
- L4053 · 2026-10-17 · Cierre 4 (7): una base recién creada tarda 20 s en su primera importación; la semilla analiza
- L4066 · 2026-10-17 · Cierre 4 (8): el lote de la importación se queda en 50, y tiene su guarda
- L4080 · 2026-10-17 · Cierre 4 (9): los `beforeAll`/`afterAll` son 1,15 s por spec y proyecto; las cuentas se crean y se…
- L4091 · 2026-10-17 · Cierre 4 (10): al 200 % los campos de un modal caben en él
- L4099 · 2026-10-18 · Parte 9i: un patrón de lista para toda tabla, el resumen de vehículos y el «⋯» del lead desde una…
- L4173 · 2026-10-18 · Parte 9j (0a): `listas-por-pagina` en la página 3 no se reprodujo; qué se probó y qué quedó…
- L4198 · 2026-10-18 · Parte 9j (0b): el «⋯» cuesta 3 nodos con un símbolo SVG compartido
- L4209 · 2026-10-18 · Parte 9j: los tipos de lead son una tabla con una clase fija, y el sistema razona por la clase
- L4244 · 2026-10-18 · Cierre 5a: medir antes de arreglar (la búsqueda, la persona con pocos leads, la importación y la…
- L4264 · 2026-10-18 · Cierre 5a-fix-2: importar en volumen no depende de `actividad` (la adopción del intento sólo se…
- L4279 · 2026-10-18 · Cierre 5a-fix-1a: «míos» de quien tiene «propios» se lee por su cartera (la persona con pocos…
- L4308 · 2026-10-18 · Cierre 5a-fix-1b: la búsqueda por nombre no depende de cuántos leads hay (candidatos por ventana…
- L4336 · 2026-10-18 · Cierre 5b: el `index.ts` de un módulo no exporta componentes, la ficha manda lo que dibuja y los…
- L4362 · 2026-10-19 · Cierre 5a-fix-3: la suite de e2e baja de 42,0 a 31,7 min; el celular sale por demostración, no por…
- L4389 · 2026-10-19 · Cierre 5b-fix: el buscador cabe por el ancho de la barra, el kanban no ensancha la página y «Nuevo…
- L4407 · 2026-10-19 · Cierre 5b-fix-2: «Nuevo lead» es un solo drawer, montado cerrado, que cambia de cuerpo
- L4436 · 2026-10-19 · 5a-8: el buscador pide 3 caracteres para buscar por nombre; no se pagan n-gramas
- L4446 · 2026-10-19 · 5a-4b: no se monta la segunda pila local de Supabase
- L4456 · 2026-10-19 · Cierre 5a-fix-4: el nombre se busca con 3 letras seguidas, «míos» por la cartera si es corta, la…
- L4494 · 2026-10-19 · Buscar un número entre los propios ajenos (5a-14), y 5a-9 a la Fase 4 sin cambios
- L4518 · 2026-10-21 · La rueda de turnos de la web, por rol (`web.cola.participar`)
- L4540 · 2026-10-21 · 5a-15 no se reproduce: el hook se queda y el selector ignora un tamaño que no ofrece
- L4549 · 2026-10-21 · La matriz de Roles en el celular es una lista de un rol, y el panel de filtros va al costado sólo…
- L4556 · 2026-10-21 · 8-2: `web.solicitar_asesor` responde el vencimiento que escribió
- L4562 · 2026-10-21 · Dominancia sobre la persona: la regla (la implementación, a 9-1)
- L4569 · 2026-10-21 · Vencimiento de la invitación (`otp_expiry`): 24 horas en la nube
- L4575 · 2026-10-21 · Fotos de una subasta en segundo plano: no se hace
- L4581 · 2026-10-21 · Rango de un campo numérico, `leads.campos.gestionar` y el campo «principal»: no antes de…
- L4588 · 2026-10-21 · Configuración de leads: tipos de seguimiento, iconos del catálogo y origen por defecto
- L4612 · 2026-10-21 · Cierre de defectos al 200 %: la lista del equipo, la matriz de Roles, el interruptor, Empresa y la…
- L4636 · 2026-10-21 · Cierre de pendientes del 200 %: el origen inactivo, el chip, el modal y la columna «Persona»
- L4660 · 2026-10-22 · La lista del equipo tiene tope de 100 y busca con tildes en el servidor; el interruptor era un…
- L4686 · 2026-10-22 · Apertura de la Fase 4 — Cotizaciones
- L4770 · 2026-10-22 · 5a-4b: la cifra pasa a 40,1
- L4786 · 2026-10-22 · D7 · La hoja configurable: diseño, niveles de acceso y tipos de cambio
- L4896 · 2026-10-22 · Paso 4.02: el equipo busca desde 3 letras con su propio mínimo, y Roles cuenta por una RPC con el…
- L4923 · 2026-10-22 · Paso 4.03 (5a-10): un campo privado se filtra por los candidatos de la cartera, sin índice
- L4961 · 2026-10-22 · Paso 4.03, prompt 2 (5a-35): el lead del número entra a los candidatos aunque el pedido no traiga…
- L4981 · 2026-10-22 · Paso 4.03, prompt 3 (5a-9 y 5a-34): el texto y el rango de un campo, y los ocultos y la…
- L5021 · 2026-10-23 · Paso 4.04: dos e2e que no dependen del azar, la medición de la baja sin el cron, y 5a-11 sin arreglo
- L5035 · 2026-10-23 · Cierre del 4.04: 5a-11 se acepta con la causa corregida, y la guarda baja sus topes
- L5045 · 2026-10-23 · Paso 4.05 (1 de 4): la forma ampliada del grafo del cotizador
- L5106 · 2026-10-23 · Paso 4.05 (2 de 4): el motor del cotizador y sus faltantes
- L5171 · 2026-10-23 · Paso 4.05 (3 de 4): la variante, lo sobrescribible y las fuentes del motor
- L5241 · 2026-10-23 · Paso 4.05 (4 de 4): `validar_formula()` en la base, espejo exacto de `validar.ts`
- L5302 · 2026-10-23 · Paso 4.06 (1 de 2): `evaluar_formula()` en la base, espejo exacto de `evaluar()`
- L5375 · 2026-10-23 · Paso 4.06 (2 de 2): `cotizacion_evaluar()` sobre `evaluar_formula()` y su assert de tiempo
- L5447 · 2026-10-23 · Paso 4.07 (1 de 2): el compilador de fórmulas como texto y el cierre de 4-2
- L5523 · 2026-10-24 · Paso 4.07 (2 de 2): 4-3, el texto de la fila, el literal que no cabe y la salida por index
- L5581 · 2026-10-24 · Paso 4.07 (remiendo, prompt 3): el mínimo del `texto` y su mensaje
- L5607 · 2026-10-24 · Paso 4.08 (1 de 3): el modelo del diseño de la hoja y su validación
- L5678 · 2026-10-24 · Paso 4.08 (2 de 3): el diseño en la fórmula, su visibilidad y el catálogo de tonos
- L5745 · 2026-10-24 · Paso 4.08 (3 de 3): la semilla del cotizador, el check de «publicada tiene diseño» y un origen…
- L5819 · 2026-10-24 · Paso 4.09 (1 de 2): los niveles de acceso en la base
- L5896 · 2026-10-24 · Paso 4.09 (2 de 2): la pantalla de niveles, la matriz de Roles y deshacer un retiro
- L5947 · 2026-10-25 · Paso 4.10 (1 de 3): lo que no se ve no viaja (la lectura)
- L6013 · 2026-10-25 · Paso 4.10 (2 de 3): escribir por RPC, cerrar la escritura directa y `cotizacion_crear`
- L6063 · 2026-10-25 · Paso 4.10 (3 de 3): `cotizacion_guardar`, D2 en el alta, el detector y los candados
- L6104 · 2026-10-25 · CI-1: GitHub Actions por niveles, el e2e en cuatro bloques y lo que queda fuera de CI
- L6215 · 2026-10-25 · CI-2: un spec prepara su estado, las esperas son de un estado, y los minutos medidos
- L6269 · 2026-10-25 · CI-3: lo que acomoda la hidratación se mide con una espera propia, no cambiando…
- L6301 · 2026-10-26 · Niveles de e2e en la Fase 4: los pasos de pura pantalla van con Nivel 1 y el completo cada 3
- L6322 · 2026-10-26 · Paso 4.11: `puede_vehiculo()` y `vehiculos: leer` por fila, con la misma visibilidad
- L6369 · 2026-10-26 · Paso 4.12 (1 de 2): el núcleo de la `XCell`
- L6412 · 2026-10-26 · Paso 4.12 (2 de 2): la ayuda y el ⚙ de la `XCell`, y el cierre de la fila
- L6453 · 2026-10-26 · CI-4: una prueba que lee un texto que depende de un POST lento espera el POST, con un tope propio
- L6482 · 2026-10-26 · Paso 4.13 (1 de 4): la lectura que abre la hoja y el modo por clave
- L6527 · 2026-10-26 · Paso 4.13 (2 de 4): la hoja dibujada y el recálculo, sin guardar
- L6573 · 2026-10-26 · Paso 4.13 (3a de 5): la hoja abierta que firma la base, y cotizar pide ver
- L6602 · 2026-10-26 · Paso A0: el piloto avanza PLAN un paso por sesión, con un bucle que no es un modelo
- L6629 · 2026-10-26 · E1: el piloto se queda en la PC; la nube queda como verificador futuro
- L6639 · 2026-10-26 · DEP-1: Next 16.4.3 y Node 24 (cierra 4-35 y 4-37)
- L6649 · 2026-10-27 · Paso 4.13 (3b de 6): guardar la hoja
- L6682 · 2026-10-27 · FIX-PILOTO-1: los e2e dirigidos del bucle no exigen las funciones edge
- L6692 · 2026-10-27 · CAL-1: la calibración del piloto con el 4.13-3b

<!-- indice:fin -->

---

## 2026-10-11 — Stack y andamiaje inicial

**Contexto:** proyecto nuevo, construido principalmente con asistencia de IA, que reemplaza al
prototipo `ip` (Next 16 + Supabase, 120 tablas, 20 features) cuyos problemas fueron mala
documentación, difícil de escalar y exceso de peticiones a la base.
**Decisión:** Next 16 App Router + React 19 + TypeScript 6 + Tailwind 4 + shadcn + TanStack Query +
Zod 4 + next-safe-action + nuqs + Supabase (SSR, RLS, Realtime, Storage, pg_cron, edge functions)
sobre Vercel Pro y Supabase Pro; pnpm; ESLint 10 con `eslint-plugin-boundaries` y typed linting,
Prettier, lefthook + commitlint, Vitest 4 + Playwright; hooks de Claude Code que bloquean (lint por
archivo, verificación al terminar, comandos peligrosos); memoria del proyecto por capas (mapa
generado, fichas por módulo, glosario, UX).
**Alternativas:** TypeScript 7 (10× más rápido, pero sin API del compilador: se pierde
`no-floating-promises`); Biome (sin boundaries, que es la regla central); husky (sin publicar desde
2024); Serwist para offline (el brief pide shell mínimo, no offline).
**Consecuencia:** el lint y los hooks bloquean antes que la revisión humana; el setup inicial es
más pesado y cambiar de arquitectura después cuesta más.

## 2026-10-11 — Nivel 2, monolito modular con 17 módulos

**Contexto:** más de diez áreas de negocio con datos y reglas propias; `ip` empezó en features
planas y a las 20 features ya nadie sabía qué dependía de qué.
**Decisión:** `src/modules/<dominio>/` con capas adentro (`features`, `entities`, `infra`) y API
pública en `index.ts`; dependencias en un solo sentido declaradas en `docs/ARQUITECTURA.md` y
verificadas por `scripts/mapa.sh --check`.
**Alternativas:** nivel 1 (features planas: lo que no escaló); nivel 3 (monorepo: no hay dos apps
Next que compartan código; la web pública es otro repo sobre el mismo Supabase).
**Consecuencia:** un nivel más de carpeta y una ficha por módulo; a cambio, cada módulo se puede
entender solo y el mapa muestra los ciclos.

## 2026-10-11 — Un motor de flujos para vehículos y repuestos, no tres copias

**Contexto:** `ip` tiene `vehicle_states`, `part_states` y `china_unit_states` con requisitos,
historial, documentos, transporte y RPC triplicados; agregar un origen (Corea) era copiar todo.
**Decisión:** `flujos` (uno por origen + uno de repuestos) con `fases`, `fases_transiciones`,
`fases_requisitos` (documento | dato | espera), roles por fase/transición, reglas por flujo;
`historial_fases`, `documentos`, `transportes`, `gastos`, `pagos`, `notas` con dos FK nullable
(`vehiculo_id` | `repuesto_id`) + CHECK; una única RPC `cambiar_fase`.
**Alternativas:** tabla `unidades` genérica con extensiones 1:1 (más indirección en PostgREST y
FKs menos claras); mantener tablas por origen (lo que se quiere dejar atrás).
**Consecuencia:** un origen nuevo es una fila y su flujo nace por trigger; a cambio, cada consulta
de hijas lleva `coalesce`/CHECK de dos columnas y las claves de dato de los requisitos son código
(`_requisito_dato_cumplido`).

## 2026-10-11 — Orígenes configurables: campos comunes como columnas, el resto en `atributos`

**Contexto:** el brief pide orígenes custom con layout propio (preconfig subasta/apibara o manual).
**Decisión:** `origenes_campos` describe el layout; `vehiculos` tiene columnas para lo común
(marca, modelo, año, VIN, lote, precio…) y `atributos jsonb` validado por trigger para lo
específico; los filtros se derivan de `origenes_campos.filtrable`.
**Alternativas:** todo jsonb (no se indexa ni se pone UNIQUE al VIN); una tabla por origen.
**Consecuencia:** agregar un campo no toca el schema; a cambio, un campo nuevo que necesite índice
o unicidad sí es migración (se promueve a columna).

## 2026-10-11 — La fórmula de cotización es un grafo versionado validado en SQL

**Contexto:** `ip` tiene 28 constantes por código y tres cotizadores escritos a mano; el brief
pide que un origen custom se cotice sin programar.
**Decisión:** `formulas.definicion` = lista ordenada de nodos (input, constante, tipo_cambio,
campo_vehiculo, bandera, tabla, tramo, calculo con operaciones cerradas), `params` para las
constantes, `buckets` por tipo de cambio; `validar_formula()` es el candado (sin ciclos, un único
total); versionado append-only con un borrador y una publicada por origen; snapshot de valores por
cotización; el motor TS en `entities/` evalúa; el ⚙ de una XCell publica N+1. Detalle en
`docs/COTIZADOR.md`.
**Alternativas:** expresiones libres (un motor de expresiones en SQL es un riesgo y una deuda);
constantes por código como `ip` (obliga a programar cada origen).
**Consecuencia:** el editor de fórmulas es trabajo de UI real (fase 4); a cambio, cotizar un origen
nuevo es configurar.

## 2026-10-11 — Permisos: catálogo fijo por código, roles libres, origen y alcance como parámetros

**Contexto:** el brief pide permisos «hasta el más mínimo detalle» y roles creados por el dueño.
**Decisión:** `permisos` se siembra por migración (una clave existe sólo si hay enforcement);
`roles_permisos(rol, clave, origen_id NULL=todos, alcance propios|todos)`; unión sin herencia;
dominancia (nadie otorga lo que no tiene); guardián diferido; `dueno` nunca pierde `equipo.*`.
**Alternativas:** permisos creables desde la UI (un toggle que no protege nada); claves por origen
(`flujos.china.mover`: no escala a orígenes custom).
**Consecuencia:** un permiso nuevo es una migración con su policy; a cambio, cada toggle de la
matriz protege algo de verdad.

## 2026-10-11 — Teléfono único global y enmascarado salvo cartera; leads en limbo

**Contexto:** el brief: el teléfono identifica al lead, «el que registra se lo queda», nadie más lo
ve; al dar de baja, los leads quedan «de nadie» hasta que alguien registre ese teléfono.
**Decisión:** índice único parcial entre leads vivos; `revoke select (telefono_principal)` y
`leads_vista` con `telefono_lead()` definer (enmascara incluso al dueño); limbo = sin filas
vigentes en `leads_asesores` (sin columna); `crear_lead` adopta y audita.
**Alternativas:** receptor obligatorio al dar de baja (lo que hace `ip`): el brief pide lo contrario.
**Consecuencia:** un lead en limbo es invisible para todos hasta que alguien tipea su teléfono;
el tablero debe mostrar cuántos hay para que no se olviden (fase 9).

## 2026-10-11 — Policies de la fila propia inline, no por función

**Contexto:** la prueba de humo falló: `INSERT … RETURNING` sobre `vehiculos` con policy SELECT
`puede_vehiculo(id)` — una función STABLE no ve la fila insertada en la misma sentencia.
**Decisión:** las policies de `vehiculos`, `leads` y `cotizaciones` se escriben sobre las columnas
de la fila; `puede_*(id)` queda para las tablas hijas.
**Consecuencia:** regla en `.claude/rules/migraciones.md`; una policy nueva sobre una tabla raíz
se escribe inline.

## 2026-10-11 — Embarques y contenedores son grupos; la DUI es entidad

**Contexto:** `ip` congeló `shipments` tras una auditoría: una tabla dueña de datos que había que
sincronizar con el transporte por vehículo.
**Decisión:** `transportes` 1:1 por unidad; embarque = grupo por `booking`, contenedor = grupo por
`contenedor` (vistas); `declaraciones_aduana` N:M con `removido_en`.
**Consecuencia:** editar un embarque es «aplicar a todos los del grupo», todo o nada con `PT409`.

## 2026-10-11 — Secretos fuera de la base; integraciones como interruptor

**Decisión:** `integraciones.config` nunca guarda claves; apibara, VAPID y el secreto de
revalidación de la web van en variables de entorno de Vercel y de las edge functions (o Vault).
**Consecuencia:** activar apibara es un switch en la UI + una variable en el entorno.
Reemplazada más abajo: «Secretos: Vault por RPC para lo que se edita en la interfaz».

## 2026-10-11 — Monedas: base + N tipos de cambio nombrados, congelados por cotización

**Contexto:** «agnóstico al país»; Bolivia usa oficial y paralelo, otro país puede usar uno.
**Decisión:** `monedas`, `tipos_cambio(clave, moneda_de, moneda_a, valor)` con historial; la fórmula
declara `buckets` → clave de tipo de cambio; la cotización guarda `tipos_cambio` usados.
**Consecuencia:** cambiar el TC no mueve cotizaciones guardadas; el Modo Live oculta símbolos y
cifras en toda la app, no sólo en el cotizador.

## 2026-10-11 — Cola web: habilitado nace en false; prioridad ponderada

**Decisión:** conserva la ruleta de `ip` (puntero al asignar, pegajoso, cupo, reasignación fuera
de la cadena) y agrega `prioridad` (divide la carga abierta por prioridad+1) y `max_intentos`.
`habilitado` arranca apagado: un asesor entra a la rueda cuando alguien lo decide.
**Consecuencia:** publicar de menos; el tablero de la cola es la pantalla que lo enciende.

## 2026-10-11 — PDF de cotizaciones en servidor con `@react-pdf/renderer`

**Contexto:** `ip` usaba `jspdf` + `html-to-image` en el cliente: resultados distintos por navegador.
**Decisión:** la plantilla versionada (`plantillas_tarjeta.definicion`) se renderiza a PDF en un
route handler con `@react-pdf/renderer` (fuentes TTF), idéntico siempre; la tarjeta en pantalla
usa el mismo modelo de vista.
**Consecuencia:** una sola fuente de verdad del layout; no hay imágenes de cotización en el cliente.

## 2026-10-11 — Íconos PWA neutros hasta que la empresa cargue su logo

**Contexto:** producto white-label; no hay logo del producto, cada empresa carga el suyo.
**Decisión:** `public/` lleva un ícono neutro generado (glifo de tres tramos con flecha sobre el
primario `#3b5bdb`, ver `design/ICONOS.md`); en la fase 1, «Regenerar íconos» los produce desde
`ajustes_empresa.logo_ruta` y `manifest.ts` los prefiere cuando existen.
**Consecuencia:** no hay placeholders feos ni marca ajena; el despliegue se identifica al configurar.

## 2026-10-11 — Lo que se dejó fuera a propósito

Editor de artes (Konva) y directorio de contactos (`navieras` es un catálogo plano; proveedores
son texto en gastos): el usuario los marcó como fuera. Modo Live se conserva y además oculta los
símbolos de moneda. Comprobantes de venta internos se conservan.

## 2026-10-11 — Boundaries con la sintaxis v7, no la legacy

**Contexto:** `eslint-plugin-boundaries` 7.2 acepta la sintaxis vieja (`rules`, `mode: "full"`,
`${from.modulo}`) pero avisa que desaparece en la v8, y con patrones `**/*` + `partialMatch`
clasificaba mal los archivos que cuelgan directo de `infra/` (quedaban «unknown» y la regla no
los veía).
**Decisión:** elementos como carpetas (`src/modules/*/features`, sin `**/*`), `policies`, y
`captured: { modulo: "{{ from.element.captured.modulo }}" }` para «mismo módulo»; probado contra
un árbol de ejemplo con las cuatro violaciones típicas (features→infra, app→infra, tripas de otro
módulo desde features y desde infra) y las importaciones permitidas.
**Consecuencia:** el lint sí atrapa la regla central; el PROMPT 0 lo vuelve a probar en el repo real.

## 2026-10-11 — Migración base generada desde `supabase/schemas`

**Contexto:** las tablas vivían sólo en `supabase/schemas/` y las migraciones a mano arrancaban en
`000100_rbac.sql` dándolas por creadas. `supabase start` y `supabase db reset` aplican únicamente
`migrations/`: la base local no levantaba (`type public.alcance_permiso does not exist`).
`pnpm db:probar` no lo veía porque aplica `schemas/` y `migrations/` por su cuenta.
**Decisión:** `scripts/esquema-base.mjs` (`pnpm db:base`) concatena los `schema_paths` de
`config.toml`, en su orden, en `migrations/20261011000000_esquema_base.sql`. Ese archivo es
generado y no se edita. `db:probar` lo salta al aplicar (ya aplica `schemas/`) y falla si quedó
desactualizado, así que el pre-commit lo vigila.
**Alternativas:** `supabase db diff` para generarla (no se probó: pasa por una herramienta de diff
en vez de copiar el SQL tal cual, y las migraciones a mano tendrían que apartarse para correrlo);
mover las tablas a una migración escrita a mano y abandonar `schemas/` (se pierde el estado
declarativo por dominio, que es lo que lee `docs/MAPA.md`).
**Consecuencia:** mientras no exista base en producción, un cambio de schema es editar `schemas/`
y correr `db:base` + `db:reset` + `db:types` + `db:probar`. Después del primer `db push` la base
queda congelada (ya está aplicada) y los cambios pasan a ser migraciones incrementales: ese día
hay que cambiar esta regla y el chequeo de `db:probar`.

## 2026-10-11 — shadcn dentro de `src/shared/ui`, con sus variables puenteadas a los tokens

**Contexto:** `shadcn init` dejó los componentes en `src/components/ui` y su propio tema neutro en
`globals.css`, fuera de las capas que vigila boundaries y sin relación con `design/tokens.css`.
Los nombres chocaban: `--sidebar` (un ancho en los tokens, un color en shadcn) y `--radius-sm|md`.
**Decisión:** los componentes viven en `src/shared/ui` (alias de `components.json` apuntando ahí).
`globals.css` importa `design/tokens.css` sin capa y define las variables semánticas de shadcn
(`--primary`, `--border`, `--muted-foreground`…) como referencias a tokens. Se eliminaron las
variables de sidebar y de gráficas de shadcn. Los tokens no se registran en `@theme`: en
componentes propios se usan con la sintaxis de variable (`bg-(--color-surface)`), como pide la
cabecera de `tokens.css`.
**Alternativas:** copiar los tokens dentro de `@theme` (dos fuentes que se desincronizan);
reescribir los componentes de shadcn con los nombres de los tokens (se pierde `shadcn add`).
**Consecuencia:** `shadcn add` sigue funcionando y lo nuevo nace con el diseño del proyecto, en
claro y en oscuro, sin tocar cada componente. Un token nuevo que shadcn deba usar necesita su
línea en el puente.

## 2026-10-11 — `puede()` y el catálogo de claves viven en `src/shared/lib/permisos.ts`

**Contexto:** la ficha de `equipo` los ubicaba en su `entities/permisos.ts`, pero `entities/` de
cualquier otro módulo sólo puede importar `@/shared`, y todos necesitan `puede()`.
**Decisión:** el tipo `ClavePermiso`, `puede()`, `alcanceDe()` y `origenesCon()` están en `shared`,
con la misma semántica que `tiene_permiso()`, `alcance_de()` y `origenes_con_permiso()`. Un test
lee `supabase/seed.sql` y falla si el catálogo y el archivo divergen.
**Consecuencia:** `equipo` aporta los datos (`mis_permisos()`), no la regla. Un permiso nuevo se
agrega en el seed (o su migración) y en `permisos.ts` en el mismo commit, o el test lo frena.

## 2026-10-11 — Lo que se ve sin sesión sale de `web.ajustes_acceso()`, con `primer_registro`

**Contexto:** las pantallas de acceso necesitan el nombre, el logo y saber si ofrecer «Crear
cuenta», pero corren como `anon` y `ajustes_empresa` sólo la lee `authenticated`. Además
`registro_abierto` nace en `false`: mirando sólo esa columna, en una instalación recién hecha el
botón queda oculto y la primera persona (la dueña) no tiene por dónde entrar.
**Decisión:** función DEFINER `web.ajustes_acceso()` con las columnas contadas (nombre, logo,
locale, moneda base, registro abierto) más `primer_registro` (no hay perfiles todavía).
`registroDisponible()` repite en TS la condición del trigger `auth_registro_permitido()`.
**Alternativas:** un grant de columnas a `anon` sobre la tabla (rompe «`anon` sólo toca `web`» y
no resuelve `primer_registro`); leer con el cliente admin (la regla lo reserva a portal y crons).
**Consecuencia:** `web` deja de ser sólo «lo que consume la web pública»: también lleva lo poco
que el propio sistema muestra antes de ingresar. Lo que haga falta ahí se suma a esa función.

## 2026-10-11 — `/auth/callback` canjea `code` (Google) y `token_hash` (correos)

**Contexto:** el pedido era un handler que canjea el código. Con PKCE ese código sólo sirve en el
navegador que lo pidió: recuperar la contraseña desde la computadora y abrir el correo en el
celular falla. Y los enlaces que genera la API admin (las invitaciones) no traen `code`.
**Decisión:** las plantillas de correo (`supabase/templates/`, declaradas en `config.toml`) arman
el enlace como `{{ .SiteURL }}/auth/callback?token_hash=…&type=…`; el handler acepta las dos
formas y los errores que Auth devuelve por redirección. `recovery` e `invite` siguen a
`/auth/nueva-contrasena`; lo que falla vuelve a una pantalla con su `?aviso=`.
**Consecuencia:** un enlace funciona en cualquier dispositivo y las invitaciones entran por la
misma puerta. En la nube las plantillas se cargan a mano (Auth › Emails) y `Site URL` tiene que
ser la dirección real de la app; los e2e reescriben el origen porque corren en otro puerto.

## 2026-10-11 — `mi_sesion()`: la sesión entera en una ida a la base

**Contexto:** cada pantalla necesita perfil, roles, permisos y preferencias (cuatro consultas), y
una persona bloqueada ni siquiera puede leer su perfil (la policy exige estar activa), así que
la app no tenía cómo decirle por qué no entra. El exceso de peticiones fue un problema de `ip`.
**Decisión:** RPC DEFINER `mi_sesion()` que devuelve estado de la cuenta (`activa`, `bloqueada`,
`baja`), perfil, roles, concesiones y preferencias de quien llama; `getSesion()` la envuelve en
`cache()` de React: una verificación del JWT y una RPC por request.
**Alternativas:** `'use cache: private'` (guarda la sesión cinco minutos en el navegador: un
permiso quitado se seguiría viendo); el hook de access token (ya anotado como deuda, sólo si esto
se vuelve caro).
**Consecuencia:** un dato nuevo que el shell necesite de la persona se suma a esa función.
`actionClient` sigue llamando a `mis_permisos()` por su lado.

## 2026-10-11 — Google sin variable de entorno; el botón depende de lo que diga Auth

**Contexto:** con el proveedor apagado, mandar a alguien a `/authorize` le muestra un JSON de error.
**Decisión:** `/ingreso` consulta `/auth/v1/settings` (público) y dibuja el botón sólo si Google
está encendido. Lo que falla después vuelve por `/auth/callback` y se lee como aviso (cancelado,
registro cerrado, error genérico).
**Consecuencia:** no hay nada que configurar del lado de la app. Queda un caso sin cubrir:
proveedor encendido con credenciales de relleno (el local de hoy), donde el error lo muestra
Google en su propia página. Se resuelve apagando el proveedor donde no hay credenciales.

## 2026-10-11 — El `index.ts` de un módulo se importa sólo desde Server Components

**Contexto:** la API de `equipo` mezcla código de servidor (`requerirSesion`, actions) con
componentes de cliente. Probado: un Client Component que importa `@/modules/equipo` rompe el build
(arrastra `next/headers` y `server-only` al navegador).
**Decisión:** un Client Component de `app/` o de otro módulo recibe la action o el dato por props
desde un Server Component (así llega `cerrarSesion` al menú del usuario). Dentro del módulo,
`features/` toma las implementaciones de `composicion.ts` (servidor) y `composicion.client.ts`
(navegador), nunca de `infra/`.
**Alternativas:** una segunda entrada `cliente.ts` por módulo: hoy `scripts/mapa.sh --check` la
contaría como «importar las tripas».
**Consecuencia:** cuando `equipo` exponga hooks (`usePerspectiva()`) para Client Components de
otros módulos, hará falta esa segunda entrada y ajustar el mapa y el lint. Resuelto más abajo:
«Un módulo tiene dos entradas».

## 2026-10-11 — La navegación se declara entera y un test la compara con las rutas que existen

**Decisión:** `src/app/(app)/_shell/navegacion.ts` lista todas las pantallas de `docs/UX.md` con
su permiso y un `disponible`; sólo se muestran las disponibles. `navegacion.test.ts` falla si
`disponible` no coincide con que exista `page.tsx`.
**Consecuencia:** ningún enlace del menú lleva a un 404, y quien agrega una pantalla tiene que
prender su entrada (el test se lo recuerda).

## 2026-10-11 — El e2e de acceso exige la base local sin personas

**Contexto:** «la primera persona nace dueña» sólo se puede probar con el equipo vacío.
**Decisión:** el e2e crea cuentas `@e2e.importadora.test`, borra sólo esas y, si encuentra otras,
frena y pide correr `pnpm db:reset`. Se niega a correr contra un Supabase que no sea local.
**Alternativas:** borrar a todos (destruye datos de quien desarrolla); un stack aparte para e2e.
**Consecuencia:** quien tenga gente cargada en su base local tiene que resetearla para correr los
e2e. Si molesta, la salida es un segundo stack de Supabase sólo para e2e.

## 2026-10-11 — Un módulo tiene dos entradas: `index.ts` (servidor) y `client.ts` (cliente)

**Contexto:** `usePerspectiva()` lo necesita el menú del usuario, que es un Client Component de
`app/`. Importar `@/modules/equipo` desde el navegador rompe el build, y un hook no se puede
entregar por props.
**Decisión:** `src/modules/<x>/client.ts` es la segunda entrada pública: sólo hooks, componentes
de cliente (o puros) y tipos de `entities/`. El lint pasó de vetar tres carpetas a vetar todo
`@/modules/*/*` salvo `/client`, y un override le prohíbe a `client.ts` importar `./composicion`,
`./infra`, `server-only` y `next/headers`; lo transitivo lo frena el build. `scripts/mapa.sh` la
lista como «API de cliente» y deja de contarla como importar las tripas.
**Alternativas:** todo por props (no alcanza para hooks); mover el hook a `shared` (mete una regla
de `equipo` donde no hay reglas de negocio).
**Consecuencia:** de paso se cerró un hueco: `@/modules/equipo/composicion` se podía importar
desde otro módulo. Un componente puro puede salir por las dos entradas (`RoleBadge`).

## 2026-10-11 — El cliente admin tiene una sola excepción: `conAdminDeAuth()`

**Contexto:** invitar exige `auth.admin.*`, que sólo anda con la secret key, y la regla reservaba
ese cliente al portal, los webhooks y los crons.
**Decisión:** una única función, en `equipo/infra/invitaciones.ts`, lo crea. Antes comprueba
`equipo.usuarios.gestionar` en la base con el cliente de quien invita, y entrega sólo `auth.admin`
envuelto en `CuentasInvitadas` (crear, borrar, enviar correo, generar enlace): nadie recibe
`.from()` ni `.rpc()`. El rol no lo asigna ella: lo hace `rbac_asignar_rol` con la sesión de quien
invita, para que valga la dominancia. El lint prohíbe importar el cliente admin desde otro archivo.
**Alternativas:** una RPC `equipo_invitar` en SQL (no puede crear cuentas de Auth); pasar el
cliente admin entero a la action (nada impediría leer `leads` con él).
**Consecuencia:** los pasos de invitar viven en `features/equipo/invitar.ts` contra puertos, y se
prueban con un Auth de mentira. El portal, los webhooks y los crons se suman a la lista del lint
cuando existan.

## 2026-10-11 — El registro cerrado se comprueba al cerrar la transacción, no al insertar

**Contexto:** el diseño decía «los invitados pasan porque traen `app_metadata.invitado`». Probado
contra Auth: `createUser` inserta la cuenta y recién después, en un UPDATE de la misma
transacción, le pone `app_metadata`. El trigger `BEFORE INSERT` nunca veía la marca y rechazaba
también a los invitados. La prueba de humo pasaba porque insertaba la fila con la marca puesta.
**Decisión:** `auth_registro_permitido()` pasa a ser un constraint trigger diferido que lee la fila
como quedó. La prueba de humo ahora imita a Auth (INSERT sin marca, UPDATE con marca).
**Alternativas:** una tabla de invitaciones preautorizadas por correo, escrita con la sesión de
quien invita (más superficie; queda como salida si Auth deja de hacer las dos cosas en una
transacción).
**Consecuencia:** al fallar en el commit, Auth ya no responde «Database error saving new user»
sino un error sin detalle. La app comprueba `registroDisponible()` antes de pedir el alta y al
volver de Google. El e2e de invitación es la alarma si un cambio de Auth rompe el supuesto.

## 2026-10-11 — Un solo enlace de invitación vigente por persona

**Contexto:** se pedía enlace copiable **y** correo. Auth guarda un solo token de invitación por
cuenta y `generateLink` no envía correo: el enlace de la pantalla y el del correo no pueden ser el
mismo sin un servicio de correo propio.
**Decisión:** al invitar se intenta el correo de Auth. Si falla, el enlace se genera y se muestra
solo. Si sale, «Copiar enlace» genera uno nuevo a pedido y avisa que el del correo deja de servir.
Generar un enlace exige dominar los roles de esa persona (quien lo abre elige su contraseña).
**Alternativas:** dos tokens (invitación por correo + recuperación copiable): el segundo seguía
sirviendo hasta una hora después de que la persona entrara; correo propio con SMTP en la app
(dependencia nueva y configuración repetida).
**Consecuencia:** nada queda vivo después de que la persona entra. La invitación vence con
`otp_expiry` (1 h en local, tope de 24 h en la nube): la lista ofrece «Generar otro enlace».

## 2026-10-11 — La perspectiva «ver como» viaja en una cookie y se calcula en SQL

**Contexto:** quien diseña roles necesita ver la app como la ve cada rol, sin que eso le dé nada.
**Decisión:** una cookie `perspectiva` (`httpOnly`, de sesión, sin firma) guarda el id del rol.
`getSesion()` la lee y llama `mi_sesion(p_perspectiva)`, que devuelve los permisos efectivos de
`permisos_efectivos()`: los míos ∩ los del rol (origen más angosto, alcance menor). La usa sólo
quien tiene `equipo.roles.gestionar` real; para el resto la función ignora el parámetro. RLS, las
RPC y `actionClient` siguen con `mis_permisos()`.
**Alternativas:** guardarla en `preferencias_usuario` (seguiría puesta en otro dispositivo y al
día siguiente); un permiso nuevo `equipo.perspectiva.usar` (a quien no diseña roles sólo le
serviría para ver menos); calcular la intersección en TypeScript (la regla quedaría en dos lados).
**Consecuencia:** la cookie no necesita firma: lo peor que logra quien la falsea es ver menos.
Sigue siendo una ida a la base por request. «Salir» sale del permiso real, así no se pierde al
mirar como un rol sin `equipo.*`. La perspectiva no protege nada: sólo dibuja.

## 2026-10-11 — La vista previa de una baja es una RPC que sólo cuenta

**Contexto:** antes de dar de baja hay que decir cuántos leads van al limbo, y quien gestiona
personas no necesariamente ve los leads ajenos. Además `equipo_dar_de_baja` contaba filas de
dueño revocadas: un lead con un compartido vigente se contaba aunque no cayera al limbo.
**Decisión:** `equipo_vista_previa_baja()` (STABLE, DEFINER, con `assert_permiso`) devuelve sólo
conteos. Comparte `_leads_al_limbo_de()` con la baja, que ahora devuelve lo mismo. El diálogo
tiene URL (`?baja=`): el Server Component lee el conteo y lo pasa por props.
**Alternativas:** contar para toda la lista (una consulta por persona); una action que lea al
abrir el diálogo (el botón existiría antes que el número).
**Consecuencia:** nadie confirma sin ver el número, y la vista previa y el resultado no pueden
decir cosas distintas.

## 2026-10-11 — La versión de un rol cubre sus concesiones; bloquear usa el estado

**Contexto:** `roles_permisos` y `usuarios_roles` no tienen `actualizado_en`, y la regla pide que
toda edición mande la versión esperada.
**Decisión:** la versión de un rol es `roles.actualizado_en`: otorgar, revocar y eliminar la
reciben, bloquean la fila, levantan `PT409` y devuelven la nueva. En la matriz, cada celda es una
edición y van de a una por rol, para no chocar consigo misma. Bloquear y dar de baja usan como
precondición el estado de la cuenta (ya bloqueada, ya de baja → `PT409`). Asignar y quitar un rol
son idempotentes y no llevan control.
**Alternativas:** `perfiles.actualizado_en` para bloquear (cambia cuando la persona edita su
nombre: conflictos falsos); guardar la matriz entera con un botón (un conflicto perdería todos
los cambios).
**Consecuencia:** dos personas editando el mismo rol se enteran; dos editando roles distintos no
se molestan.

## 2026-10-11 — El guardián cuenta la unión de roles y cuida todo `equipo.*` del dueño

**Contexto:** exigía que un mismo rol tuviera los dos permisos de administración (los permisos
son la unión de roles) y al rol dueño sólo le cuidaba `equipo.roles.gestionar`.
**Decisión:** queda al menos una persona que puede operar (activa, sin bloqueo, invitación
aceptada) cuyos roles sumados dan los dos permisos; y el rol dueño conserva todos los permisos
del módulo `equipo`. Una invitación pendiente no cuenta.
**Consecuencia:** un permiso nuevo de `equipo` se le otorga al dueño en la misma migración que lo
crea, o el guardián rechaza el siguiente cambio. Bloquear y dar de baja siguen sin exigir dominar
los roles de la persona: se decidió dejarlo fuera de esta parte.

## 2026-10-11 — Voz: español neutro con tuteo, también en la base

**Contexto:** la interfaz nueva hablaba de tú y `errores.ts`, `safe-action.ts` y las RPC de vos.
**Decisión:** tuteo en todo lo que llega a la pantalla, incluidos los `raise exception` (el
mensaje de una RPC se muestra tal cual). Se reescribieron `errores.ts`, `safe-action.ts` y las
funciones SQL de equipo y roles.
**Consecuencia:** las RPC de leads, flujos y cotizaciones siguen de vos hasta que su fase las toque.

## 2026-10-12 — Secretos: Vault por RPC para lo que se edita en la interfaz

**Contexto:** la decisión anterior mandaba el secreto de apibara a una variable de entorno, y la
ficha de `empresa` lo dejaba pendiente. El producto se vende por repositorio: quien configura
apibara es el dueño, que no entra a Vercel. Además apibara corre en una edge function y la
revalidación de la web sale de un trigger: los dos leen de la base, no del entorno de la app.
**Decisión:** lo que el dueño carga desde la interfaz vive en Vault. `integracion_guardar_secreto()`
(con `empresa.ajustes.gestionar`) crea o reemplaza `vault.secrets` con el nombre
`integracion:<clave>` y sella `integraciones.secreto_guardado_en`, que es lo único que la app lee:
la pantalla dice «Guardada el …» y ofrece reemplazarla. `integracion_secreto()` lo devuelve sólo a
`service_role`. La dirección a la que apibara manda la clave sólo puede ser de `apibara.tech` (Zod
y la RPC): si fuera libre, quien edita la configuración podría llevársela. Variables de entorno quedan para la infraestructura del despliegue:
`SUPABASE_SECRET_KEY`, `VAPID_PRIVATE_KEY`, las credenciales de Google.
**Alternativas:** todo en variables de entorno (activar una integración exige a alguien con acceso
al despliegue, y un trigger no las lee); una columna cifrada propia (reinventa Vault).
**Consecuencia:** activar apibara es guardar la clave y prender el interruptor, sin tocar el
despliegue. PGlite no trae Vault: `scripts/probar-schema.mjs` lo imita, así que la prueba de humo
cubre nuestras funciones y sus grants; contra el Supabase local, el e2e guarda la clave en el Vault
real y comprueba que ni quien la guardó ni alguien sin sesión ejecutan `integracion_secreto()`.
No hay borrado desde la interfaz: apagar el interruptor alcanza.

## 2026-10-12 — La empresa se escribe sólo por RPC; sus tablas son de sólo lectura

**Contexto:** `ajustes_empresa`, `monedas`, `tipos_cambio` e `integraciones` se editaban con
`.update()` bajo RLS. El grant de tabla dejaba escribir a mano `moneda_base`, `registro_abierto` y
`actualizado_por`, no había control de versión y nada impedía dos tipos de cambio por defecto.
**Decisión:** se quitaron las policies de escritura y cada edición pasa por una RPC DEFINER
(`…001200_empresa.sql`): comprueba el permiso, compara `actualizado_en` (`PT409`), sella quién
cambió y aplica lo que un CHECK no expresa (la moneda base no cambia con datos cargados; un solo
tipo por defecto entre dos monedas; apibara no se activa sin su clave). Los ajustes viajan como
`jsonb` porque ahí «no tocar» y «vaciar» son cosas distintas; el resto, con parámetros opcionales.
**Alternativas:** `.update().eq('actualizado_en', …)` como en `perfiles` (cero filas no distingue
un conflicto de una falta de permiso, y la guarda de la moneda base quedaba sólo en la interfaz).
**Consecuencia:** una columna editable nueva de `ajustes_empresa` se suma a la lista de la RPC, no
a un grant. Nada de esto se borra desde la app: monedas y tipos de cambio se desactivan.

## 2026-10-12 — El color de la marca se acepta si el texto de un botón se lee sobre él

**Contexto:** se pedía rechazar un color que no diera contraste AA «en claro y oscuro». El relleno
(`--color-primario`) es el mismo en los dos temas, así que exigirle contraste contra las dos
superficies a la vez es imposible: lo que es legible sobre blanco no lo es sobre casi negro.
**Decisión:** se rechaza el color sobre el que el texto de un botón no llega a 4,5:1 ni en blanco
ni en la tinta oscura (un rojo puro, por ejemplo); el que mejor dé pasa a ser
`--color-sobre-primario`, que deja de ser blanco fijo. El texto en el color de la marca (`-ink`)
se deriva por tema, oscureciendo o aclarando hasta llegar a AA sobre su superficie. El rechazo
dice cuánto da y propone el tono más cercano que sí sirve. Entra por un `<style>` y no por
`<html style>`: un estilo en línea le ganaría al bloque `.dark`, y el layout raíz es estático.
**Alternativas:** exigir además 3:1 del relleno contra las dos superficies (deja una franja de
tonos tan angosta que ni el color neutro del producto pasa).
**Consecuencia:** negro, azul marino y amarillo se aceptan. En una carga completa, el esqueleto
del marco sale con el color neutro un instante antes de que llegue el de la empresa.

## 2026-10-12 — Íconos: dibujados en el navegador, guardados en Storage, servidos por el manifest

**Contexto:** «Regenerar íconos» tenía que salir del logo. `sharp` es sólo una dependencia
transitiva de Next y el layout raíz, que lleva los `<link rel="icon">`, es estático.
**Decisión:** se dibujan con Canvas (cero dependencias, como las fotos), se muestran y recién al
confirmar se suben a `marca/iconos/<hash>.png`; las rutas van a `ajustes_empresa.iconos`.
`manifest.ts` lee los ajustes y declara esas direcciones, que cambian en cada regeneración. Los
`<link>` apuntan a `/iconos/vigente/<tamaño>`, que redirige al de Storage o al neutro. El fondo se
elige (color de la marca o blanco): un logo del color de la marca no se ve sobre ese color.
**Alternativas:** `generateMetadata()` en el layout raíz (con Cache Components rompe las rutas
estáticas, como `/_not-found`); `sharp` en el servidor (una dependencia más y una subida desde el
servidor que hoy no existe); un route handler que los dibuje en cada pedido (sin hash en la
dirección, el navegador no se entera del cambio).
**Consecuencia:** el título de la pestaña y `favicon.ico` siguen neutros. En iOS, una PWA ya
instalada no cambia de ícono hasta que se reinstala; en Android cambia sola, con días de demora.

## 2026-10-12 — Empresa es una pantalla con pestañas; cada formulario lleva de `key` lo que edita

**Contexto:** hay dos permisos de empresa y ninguno de «ver»: quien tiene uno lee todo. Y los
ajustes son una sola fila que editan dos cosas distintas (el formulario y los íconos).
**Decisión:** una ruta, `/configuracion/empresa`, con la pestaña en la URL (`?seccion=`). Entra
quien tiene cualquiera de los dos permisos y ve deshabilitada, con el motivo, la parte que no
puede editar. La versión de la fila llega por props, y cada formulario lleva de `key` una huella
de lo que él muestra (`huellaDelFormulario()`): arranca de lo guardado cuando eso cambia (lo
guardó esta persona u otra), sin estado local de versión que mantener.
**Alternativas:** tres secciones en el hub (cada una se esconde sin su permiso: no hay dónde
mostrar «ves pero no editas»); `key={actualizadoEn}` (se probó: regenerar los íconos o prender una
integración, que tocan la misma fila, reiniciaban el formulario de al lado y borraban lo tipeado);
sin `key` (al volver a la pantalla, Next conserva el formulario viejo con la versión nueva, y
guardar pisaría sin conflicto lo que otra persona cambió).
**Consecuencia:** al guardar, los bloques vuelven a su estado inicial (el secundario se pliega).
El borrador de `sessionStorage` guarda sólo lo que la persona cambió, no el formulario entero:
reponerlo todo revertiría en silencio lo que otra guardó mientras tanto.

## 2026-10-12 — Un logo no pasa por la compresión de fotos

**Decisión:** el SVG se sube tal cual (hasta 200 KB; se rechaza si trae código, contenido
incrustado o no dice cuánto mide). Un raster va tal cual si su lado mayor no pasa de 1024 px; si
pasa, se reduce a PNG, sin pérdida y con su transparencia. Tope de lo que se sube: 1 MB.
**Alternativas:** `comprimirImagen()` como una foto (WebP con pérdida: ensucia los bordes de un
logo plano y convierte un SVG en una imagen).
**Consecuencia:** `comprimirImagen()` acepta el formato de salida. «Retenciones», que el plan
nombraba sin definir, son `papelera_dias` y `actividad_dias` (`docs/PRODUCTO.md`).

## 2026-10-12 — Toda RPC de edición exige la versión: un nulo se rechaza

**Contexto:** `_rol_para_editar()` y `_exigir_version()` saltaban el control con la versión nula
«para el seed y las pruebas», y las tres RPC de roles llevaban `default null`. Quien olvidara mandar
la versión pisaba en silencio lo que otra persona había cambiado, y nada en los tipos lo avisaba.
**Decisión:** `p_actualizado_en_esperado` es obligatorio y un nulo se rechaza con un mensaje legible
(`…001300_version_obligatoria.sql`). En las RPC de roles pasa antes de `p_origen` y `p_alcance`:
Postgres exige que lo que sigue a un parámetro con default también lo tenga. Las pruebas de humo
pasan la versión real. La regla quedó en `.claude/rules/migraciones.md` y `datos.md`.
**Alternativas:** dejar el nulo para las pruebas (un control que se salta en la prueba no está
probado); sólo rechazarlo en el helper y mantener el default (el tipo generado seguía diciendo
«opcional»).
**Consecuencia:** el parámetro es obligatorio en `database.types.ts` y `typecheck` caza al llamador
que lo omite. Crear una fila no lleva versión: no hay nada que versionar.

## 2026-10-12 — Orígenes, campos y categorías se escriben sólo por RPC, con versión por fila

**Contexto:** las tres tablas se editaban con `.update()` bajo RLS: sin control de versión, sin
regla sobre lo que ya tiene datos y con un `INSERT` del origen que dependía de que la interfaz no
duplicara lo que los triggers ya crean. Campos y categorías no tenían `actualizado_en`.
**Decisión:** `origenes`, `origenes_campos` y `categorias` son de sólo lectura; cada operación es una
RPC con permiso, versión y sus reglas (`…001400_origenes.sql`). Campos y categorías ganan su
`actualizado_en`: editar una fila sólo choca con otra edición de **esa** fila. Ordenar toma el
origen entero `FOR UPDATE` y renumera 10, 20, 30… tocando sólo las filas que cambian. Crear un origen
es un solo `INSERT`: sus triggers (flujo, reglas, campos) corren en la misma transacción, así que no
queda uno a medias. El nombre del origen y el de una categoría no se repiten sin importar
mayúsculas ni espacios (índice único; en categorías, con el padre nulo bajo una constante).
**Alternativas:** la versión del origen como versión de su layout (dos personas editando campos
distintos chocarían siempre); un `UNIQUE` común en categorías (los nulos no chocan: dos raíces con el
mismo nombre pasaban).
**Consecuencia:** el layout editado por dos personas a la vez sólo avisa si tocan lo mismo; reordenar
sí conflictúa con otro reordenamiento. Un campo o categoría nuevo no necesita versión.

## 2026-10-12 — Un origen con uso se desactiva; sólo uno sin uso se elimina

**Contexto:** un origen cuelga de vehículos (`restrict`), cotizaciones (`restrict`), un flujo, una
fórmula, categorías, campos y concesiones de roles (`cascade`). Eliminarlo con datos rompe fichas y
cotizaciones; dejarlo para siempre estorba al dar de alta.
**Decisión:** desactivar (`activo = false`) siempre se puede y es reversible: se hace y sale
«Deshacer». Deja de ofrecerse y un trigger le impide recibir vehículos y cotizaciones nuevos; sus
fichas se siguen viendo y la matriz de roles lo sigue listando, marcado «inactivo». Eliminar sólo
vale sin vehículos (papelera incluida), cotizaciones ni fórmula publicada; es irreversible y pide
tipear el nombre porque la cascada (campos, categorías, flujo, borrador, concesiones) no se ve. Con
uso, el botón sale apagado y dice qué lo ata («tiene 12 vehículos y 3 cotizaciones: desactívalo»).
**Alternativas:** archivar con una fecha (otra columna que significa lo mismo que `activo`);
bloquear toda baja (un origen creado por error quedaba para siempre); cascada con confirmación (se
llevaba vehículos y cotizaciones).
**Consecuencia:** desactivar el último origen activo deja el alta sin dónde caer (se avisa, no se
bloquea). Antes de que haya vehículos, un origen equivocado se elimina y se vuelve a crear.

## 2026-10-12 — Un campo con datos no cambia de tipo ni se elimina: se desactiva

**Contexto:** los valores de un campo viven en `vehiculos.atributos`. Cambiar el tipo de uno con
datos deja valores que ya no son de ese tipo, y `vehiculo_validar_atributos` sólo mira al escribir
el vehículo: el dato malo aparecería recién cuando alguien lo edite.
**Decisión:** la regla vive en la base y la pantalla la cuenta antes (`origen_campo_impacto`, que
incluye la papelera). **Quitar** es desactivar: el dato queda y reactivar lo devuelve (reversible,
«Deshacer»). **Eliminar** sólo un campo propio sin ningún valor. **Cambiar el tipo** sólo con 0
vehículos con valor; el de un campo de sistema no cambia nunca. **Volver requerido** se permite con
aviso («2 vehículos no tienen este dato: no podrán guardarse hasta completarlo»): no toca
vehículos. **Sacar una opción en uso** se permite con el conteo por opción: el valor se conserva. El
aviso va dentro del panel del campo, no en un diálogo: un modal no abre otro modal.
**Alternativas:** convertir los valores al cambiar el tipo (reescribir datos sin que nadie lo vea);
bloquear también «volver requerido» (impide ordenar el layout antes de cargar datos).
**Consecuencia:** para «cambiar» el tipo de un campo con datos hay que desactivarlo y crear otro. Un
campo desactivado sigue ocupando su clave: no se puede crear otro con ella.

## 2026-10-12 — El tipo de un origen (subasta o manual) no cambia

**Contexto:** el tipo decide, sólo al insertar, los campos preconfigurados, la regla `aduana` del
flujo y el mapeo `clave_apibara`. Cambiarlo después dejaría un origen con la mitad de cada mundo.
**Decisión:** no se edita: la RPC no lo recibe y un trigger `before update of tipo` lo impide para
cualquier escritor. El alta muestra qué trae cada tipo (espejo `entities/preconfiguraciones.ts`,
comparado por un test con el SQL de los triggers). Un origen equivocado y todavía sin uso se elimina
y se crea de nuevo. `clave_apibara` y `apibara_plataformas` sólo existen en subasta (RPC y trigger).
**Alternativas:** re-preconfigurar al cambiar (borra y vuelve a crear campos de sistema con datos
posibles, y decide si `aduana` se apaga con fases ya armadas); permitirlo sólo sin uso (dos caminos
para lo mismo: ya existe eliminar y crear).
**Consecuencia:** acierta o se rehace: por eso la decisión de eliminar «sin uso» va con ésta.

## 2026-10-12 — Nombre, sustantivo y género: tres datos de la fila y reglas puras

**Contexto:** `docs/UX.md` pide que ningún texto fijo nombre un origen, y la interfaz necesita
concordar («ninguna unidad en Corea todavía»). El esquema ya tiene `nombre`, `sustantivo` y `genero`.
**Decisión:** un formulario con tres campos: el nombre, cómo se llama lo que entra por ahí (con
sugerencias, libre) y su género, que acompaña al sustantivo mientras la persona no lo elige. Debajo,
la frase con la concordancia a la vista. Las reglas son puras y salen por `client.ts`
(`claveDeNombre`, `generoSugerido`, `pluralDe`, `contados`, `frasePorVacio`) para que cualquier
pantalla las use sin repetirlas. La clave sale del nombre en el servidor, una vez.
**Alternativas:** plural editable (una columna más sin necesidad todavía); género de un
diccionario cerrado (obliga a programar cada sustantivo nuevo).
**Consecuencia:** el esquema no tiene plural: `pluralDe()` es una regla (vocal → s, consonante → es,
z → ces, -ón → -ones). Si falla en un caso real, la salida es una columna `sustantivo_plural`.

## 2026-10-12 — El orden se cambia con botones y por movimiento relativo, no arrastrando

**Contexto:** reordenar el layout de campos y las categorías no puede depender de arrastrar: no
funciona con teclado ni bien en el celular, y arrastrar exige una dependencia (dnd-kit) que
`CLAUDE.md` pide verificar el día que se agrega.
**Decisión:** «Subir» y «Bajar» por fila, con `aria-label` del campo y apagados en los extremos con
el motivo. La RPC recibe «después de X» (nulo = primero) y no una posición: si otra persona agregó un
campo entre tanto, queda junto al vecino que se eligió. `destinoDeMovimiento()` lo calcula sobre el
origen entero (desactivados incluidos) pero sólo se mueve dentro del grupo; cambiar de grupo es
editar `grupo`, y lo manda al final del grupo nuevo.
**Alternativas:** posición numérica (con un campo nuevo entre tanto, queda en otro lugar sin
avisar); arrastrar con una dependencia nueva (queda sumable: la RPC ya admite «después de X»).
**Consecuencia:** mover un campo muy lejos cuesta varios toques. El arrastre es una mejora de
interfaz que no toca la base.

## 2026-10-12 — Quién abre Configuración › Orígenes: sin `origenes.ver`

**Contexto:** el esquema sólo tiene `origenes.gestionar`, y la lectura de las tres tablas es `true`
para toda cuenta (los selectores y las fichas la necesitan). Quien configura el flujo o la fórmula
de un origen necesita ver cómo está armado.
**Decisión:** entra quien tiene `origenes.gestionar` y, de sólo lectura (todo deshabilitado con el
motivo), quien tiene `flujos.configurar` o `cotizaciones.configurar`. El resto ve «No tienes permiso»
y la tarjeta no aparece en el hub. No se crea `origenes.ver`: sin enforcement no hay permiso, y
restringir el `select` rompería los selectores de todos. Contar vehículos por origen y por categoría
pide uno de esos tres permisos (`origenes_resumen()`).
**Consecuencia:** una cuenta sin esos permisos sigue pudiendo leer `origenes` por la API; es lo que
ya pasaba y lo que necesita el resto de la aplicación.

## 2026-10-13 — FilterShell vive en `shared`; las vistas guardadas las posee `equipo`

**Contexto:** el inventario necesita filtros en la URL, chips, panel lateral y hoja inferior, y lo
mismo van a necesitar leads y cotizaciones. Las vistas guardadas están en una tabla de `equipo`.
**Decisión:** `shared/lib/filtros` (el esquema declarativo, la lectura tolerante de la URL, los
chips) y `shared/ui/filtros` (`<FilterShell>`), sin importar ningún módulo: cada listado arma su
esquema en `entities/` y se lo pasa. La lectura no usa nuqs (`nuqs` a secas es `'use client'` y la
página la corre en el servidor): todas las claves son texto y `leerFiltros()` decide qué significan,
igual en las dos partes. Las vistas son de `equipo`: `leerVistas(pantalla)` por `index.ts` y
`<MenuDeVistas>` por `client.ts`; el listado lo monta en un hueco del FilterShell. Una vista guarda
parámetros de URL, así que `equipo` no conoce los filtros de nadie.
**Alternativas:** FilterShell dentro de `vehiculos` (leads lo importaría de otro módulo); las vistas
en `shared` (una lectura con reglas va en `infra/` de un módulo, y la tabla ya tenía dueño); parsers
tipados de nuqs por filtro (tipos heterogéneos por un mapa que se arma en ejecución, y dos lectores).
**Consecuencia:** un listado nuevo declara su esquema y suma su pantalla a `RUTA_DE_PANTALLA`. Una
vista de un origen que la persona ya no ve no se lista; un filtro que dejó de existir se ignora solo.

## 2026-10-13 — Un solo esquema Zod, armado desde el layout, valida en el navegador y en el servidor

**Contexto:** los campos de un vehículo dependen del layout de su origen: no hay un schema fijo que
poner en `schemas/`, y el trigger de la base valida tarde, de a un error y sin conocer las opciones.
**Decisión:** `esquemaDeVehiculo(fuentes)` (en `vehiculos/entities/esquema.ts`) arma un `z.object`
con los datos comunes y un validador por tipo de campo. El formulario lo usa antes de enviar; la
Server Action recibe el estado del formulario, **vuelve a leer el layout** y usa la misma función.
Los motivos vuelven por campo en un resultado propio (`porCampo`): `returnValidationErrors` sólo
aplana un nivel. La base es la última línea y dice en `hint` qué campo frenó el guardado. Una opción
que se sacó del campo, o una categoría desactivada, siguen valiendo mientras el vehículo las tenga.
`origenes_campos` gana `valor_defecto`, que sólo precarga el alta.
**Alternativas:** confiar en el trigger (errores tardíos); guardar un JSON Schema en la base (otra
fuente que mantener igual al layout); mandar al servidor el dato ya convertido (el servidor tendría
que confiar en la conversión del navegador).
**Consecuencia:** un tipo de campo nuevo se suma en `ESQUEMA_POR_TIPO`, `CONTROL_DE_TIPO`,
`LECTOR_POR_TIPO` y `FILTRO_POR_TIPO`: son `Record<TipoDeCampo, …>` y no compilan si falta uno.
`entities/` no importa otros módulos: declara la forma de campo que necesita y recibe el de `origenes`.

## 2026-10-13 — Filtros sobre `atributos` por PostgREST, keyset y policy de InitPlan; el GIN no cuenta

**Contexto:** hay que filtrar por atributos dinámicos y paginar con eficiencia. Se daba por hecho
que las policies eran de InitPlan y que el GIN de `atributos` servía a los filtros.
**Decisión:** una consulta por página, siempre de un origen. Opciones y sí o no por contención
(`@>`), números por rango sobre `atributos->clave`, fechas como texto ISO, texto con `ilike`; la clave
sale del layout, nunca de la URL, y todo texto de la persona pasa por `citar()` o `patronContiene()`.
Keyset `(creado_en, id)` con índice propio (`vehiculos_origen_listado_idx`). La policy de lectura se
reescribió: `origen_id = any ((select origenes_con_alcance(…))::uuid[])` es InitPlan; la anterior,
`(select alcance_de('x', origen_id))`, corría por fila. Una prueba de humo lo comprueba con `EXPLAIN`.
**Lo que se encontró:** bajo RLS, `@>` e `ilike` no son `leakproof` y Postgres no los evalúa antes
que la policy: ni el GIN ni los trigram se usan. La consulta camina el índice del listado, filtra y
corta. En `atributos` nunca se guarda un `null` (entraría en todo «hasta N»).
**Alternativas:** una función `definer` de búsqueda desde el primer día (ahí el GIN sí entra, pero el
permiso queda en dos lugares antes de saber si hace falta); una tabla EAV; `offset`.
**Consecuencia:** alcanza para miles de vehículos por origen. Si un origen pasa de decenas de miles y
un filtro poco selectivo se siente, el listado pasa a esa función `definer`. Los planes se midieron
con la tabla vacía: hay que volver a mirarlos con datos reales.

## 2026-10-13 — Vehículos se escriben sólo por RPC; el alta entra a la única fase inicial

**Contexto:** no había RPC de alta ni de edición. El `INSERT` directo dejaba poner `fase_id` y
`publicado_web` (el grant por columna sólo cubría el `UPDATE`) y editar no comparaba versión. Ningún
trigger ponía la fase inicial, y quien carga un vehículo no suele tener `flujos.mover`.
**Decisión:** la tabla queda de sólo lectura y se escribe por `vehiculo_crear(p_id, p_origen,
p_datos)` y `vehiculo_guardar(p_vehiculo, p_actualizado_en_esperado, p_datos)`, con una lista cerrada
de claves. El `id` del alta lo genera el navegador: reintentar no duplica. Al nacer, el vehículo entra
a la fase inicial **sólo si no hay nada que decidir** (una sola inicial activa, sin nota obligatoria,
sin requisitos bloqueantes pendientes, sin roles que excluyan a quien crea), con su fila en
`historial_fases`; si no, nace «Sin fase». Es la segunda y última escritura de `fase_id`. El conflicto
dice quién y cuándo, sacado de `actividad`; guardar lo ya guardado no es conflicto. Un origen
desactivado conserva y deja editar lo suyo, pero no recibe altas.
**Alternativas:** `INSERT` con grant por columna (deja la fase y la versión del lado de la app);
`.update().eq('actualizado_en', …)` (cero filas no distingue conflicto de falta de permiso); una
columna `actualizado_por` (la auditoría ya lo sabe); dejar siempre la fase en nulo (lo que carga un
asesor no aparecería en la cadena hasta que otra persona lo ubique).
**Consecuencia:** `lead_id`, `subasta_*` y `apibara_*` quedaron sin escritor: el vínculo y apibara
traen su RPC. Cualquier escritura sobre la fila (mover de fase) mueve la versión, y quien edita la
ficha en ese momento ve un conflicto: pierde un clic, no pisa nada.

## 2026-10-13 — Campos sensibles: el esquema no los resuelve, y el inventario no muestra costos

**Contexto:** se pedía respetar los campos sensibles (costos) en el listado y la ficha.
**Decisión:** no hay marca de «sensible» en `origenes_campos` ni permiso de costos de vehículos, y RLS
no esconde columnas ni claves de un jsonb. Nada de lo que muestra el inventario es un costo
(`vehiculos.precio` es precio de lista; los `moneda` del layout son datos de la subasta), así que no
se inventó un control. Todo monto pasa por `<Monto>` (Modo Live). Los costos reales (gastos, pagos,
margen) llegan con logística, ya protegidos por `logistica.gastos.ver`, `.pagos.ver` y `.margen.ver`.
**Alternativas:** una columna `sensible` y esconder el campo en la interfaz (no protege nada: el dato
viaja igual en `atributos`).
**Consecuencia:** el día que haga falta ocultar un campo del layout, es esa columna **más** una vista
o RPC que recorte `atributos` (como `leads_vista`), con su permiso sembrado en la misma migración.
**Actualización (2026-10-14):** para los leads ese día llegó: ver «Los privados se recortan al leer».
Vehículos sigue sin marca de sensible.

## 2026-10-13 — Un VIN repetido bloquea, y se dice junto al campo

**Contexto:** la ficha decía «un VIN repetido avisa, no bloquea». `vehiculos_vin_unico` es UNIQUE
entre los vehículos vivos y global, no por origen; fue una decisión del 10-11 (por eso el VIN es
columna y no atributo).
**Decisión:** se respeta el índice. La RPC lo detecta antes y responde con el VIN y `hint = 'vin'`; el
lote se frena también con la plataforma vacía, que el índice deja pasar.
**Consecuencia:** puede chocar con un vehículo de un origen que la persona no ve: el mensaje dice que
existe, no cuál. Si eso molesta, la salida es hacer el índice por origen.

## 2026-10-13 — Los e2e del inventario no piden el equipo vacío

**Contexto:** los e2e existentes exigen la base local sin personas ajenas (`pnpm db:reset`), porque
prueban que la primera persona nace dueña. Resetear borra la cuenta de quien está usando la app local.
**Decisión:** `e2e/soporte/inventario.ts` crea sus personas como invitadas con un rol de prueba que
tiene los permisos de vehículos, y limpia sólo lo suyo (orígenes `e2e_…`, cuentas `@e2e…`, roles «E2E …»).
**Consecuencia:** se pueden correr mientras alguien usa la app local. `pnpm test:e2e` entero sigue
necesitando el reset por los otros specs.

## 2026-10-13 — Las fotos van a un bucket público, cada una en la carpeta de su vehículo

**Contexto:** había que decidir bucket público o privado, la ruta, y qué pasa con las policies cuando
la misma foto la usan dos vehículos de orígenes distintos. La policy que había dejaba a `anon` listar
el bucket entero (ids de vehículos y fotos de lo no publicado) y a quien edita borrar objetos.
**Decisión:** bucket `vehiculos` público, ruta `<vehiculo_id>/<sha-256 del contenido>.<webp|jpg>`.
Subir exige `vehiculos.editar` sobre el vehículo de la carpeta; listar, `vehiculos.ver` (sólo con
sesión); borrar y pisar, nadie desde la app. La misma foto en dos vehículos son dos objetos, y la
base rechaza una fila cuya ruta no empiece por su propio vehículo.
**Alternativas:** bucket privado con URL firmada (la firma cambia en cada lectura: ni el navegador ni
el CDN cachean, y la vitrina necesita URL pública igual); un objeto por hash compartido entre
vehículos (ahorra ~0,3 MB cuando ocurre, pero un objeto compartido no tiene origen: su policy sólo
podría decir «edita vehículos en algún lado», y borrar en uno dependería del otro).
**Consecuencia:** storage se limita por origen igual que las tablas. La foto de un vehículo no
publicado es alcanzable por quien tenga su URL (uuid + SHA-256, no adivinable): lo confidencial va a
`documentos`, que es privado. Para fotos de vehículos el refcount vale 0 o 1 (2 si la foto es tan
chica que su miniatura es el mismo objeto): es la red de la limpieza, no un mecanismo de compartir.

## 2026-10-13 — Dos tamaños por foto, hechos en el navegador; sin optimizador

**Contexto:** el listado muestra la portada en un hueco de 56 a 96 px y había una sola ruta, la de
1600 px. El egress de Storage se cobra, las transformaciones de imagen de Supabase también (por
imagen de origen), y el optimizador de Next volvería a bajar cada foto desde Supabase.
**Decisión:** el navegador decodifica el archivo una vez y genera la completa (≤ 1600 px) y la
miniatura (≤ 480 px), con nombre por hash y caché de un año. El listado, la cabecera y la grilla
cargan sólo miniaturas, con `<Image unoptimized loading="lazy">`; la completa se abre aparte. La
miniatura se genera al elegir el archivo y es la vista previa.
**Alternativas:** un solo tamaño (una página de 50 filas pesaría ~15 MB en vez de ≤ 2 MB);
tres tamaños con `srcset` (el más chico ahorra unos KB por fila y suma un objeto y una columna);
transformaciones de Supabase o el optimizador de Next (se pagan y no hacen falta: ya llega chica).
**Consecuencia:** 480 px sobra en el listado y alcanza para la tarjeta de la vitrina. Safari no
codifica WebP en un canvas y devuelve PNG sin avisar: se mira el tipo del blob y ahí se usa JPEG.
Eso no lo cubren los e2e (corren en Chromium): hay que probarlo a mano en un iPhone.

## 2026-10-13 — Las fotos tienen su propia versión, aparte de la de la ficha

**Contexto:** reordenar, fijar portada y eliminar necesitan una versión para dar `PT409`. La del
vehículo estaba a mano, pero cualquier escritura la mueve: subir fotos desde el celular le daría un
conflicto a quien tiene la ficha abierta en el escritorio (la misma deuda de «mover de fase»).
**Decisión:** `vehiculos_imagenes_version (vehiculo_id, actualizado_en)`. Las tres RPC de edición la
mandan; agregar no lleva versión (sumar no pisa a nadie y es idempotente por hash). Su fila es además
el candado que ordena las operaciones sobre las fotos de un vehículo: el tope de 24 se cuenta con
ella bloqueada. La versión se pone con la hora del reloj, no con la de inicio de la transacción.
**Alternativas:** la versión del vehículo (conflictos falsos entre quien sube fotos y quien edita
datos); una columna en `vehiculos` (el trigger genérico mueve `actualizado_en` igual, y `auditar`
anotaría cada foto como un cambio del vehículo); comparar el conjunto de ids (detecta altas y bajas,
no dos reordenamientos).
**Consecuencia:** un conflicto de fotos dice «<quién> cambió las fotos de este vehículo»: el quién
sale de `actividad`, donde cada operación de fotos deja su registro. Una tabla más, de una fila
por vehículo con fotos.

## 2026-10-13 — La limpieza de Storage reclama antes de borrar; la función queda para la parte 4

**Contexto:** `quitarSiHuerfano()` cuenta referencias y después borra, desde el navegador: entre las
dos cosas puede nacer una fila (deshacer un eliminar, volver a subir la misma foto) que queda
apuntando a nada. La cola existía pero sólo la llenaba la purga y no tenía estados.
**Decisión:** nadie borra objetos de `vehiculos` desde la app. Eliminar una foto borra la fila y
encola sus rutas. La limpieza **reclama** antes de borrar: con el candado consultivo del objeto
tomado recuenta, y sólo si da 0 lo marca `reclamado_en`; sólo se borra lo reclamado, y sólo lo que
lleva 24 h en la cola. Toda fila nueva pasa por un trigger que toma el mismo candado: si el objeto
está reclamado no nace (reintentable), y si sólo estaba en la cola lo saca. El mismo trigger exige
que los dos objetos existan. Lo que se subió y no llegó a tener fila lo encola un barrido en SQL.
La edge function `storage-gc` (un bucle sobre reclamar y confirmar) no se construye ahora.
**Alternativas:** bloquear la fila de la cola en vez del objeto (un objeto puede no estar todavía en
la cola cuando alguien lo referencia); borrar desde SQL (`delete` sobre `storage.objects` deja el
archivo en el disco); que el navegador avise qué descartar (no avisa si se cierra la pestaña);
construir la función ya (no hay proyecto en la nube, ni `pg_cron`, ni forma de dejarla en verde).
**Consecuencia:** una fila de foto nunca apunta a un objeto borrado; el peor caso es un «vuelve a
intentarlo». Hasta la parte 4 nada se borra de Storage: cada foto eliminada deja ~0,35 MB.
`marca` y `avatares` siguen con `quitarSiHuerfano()`: tienen un solo dueño y la ventana no les pega.

## 2026-10-13 — Una foto se valida decodificándola, y se reconoce por el hash del archivo original

**Contexto:** qué formatos entran, qué pasa con un HEIC, cuánto puede pesar un archivo y cómo se
detecta «la misma foto».
**Decisión:** el selector ofrece `image/*` (así un iPhone entrega sus HEIC como JPEG). Lo que no
declara ser imagen se rechaza sin abrirlo; lo demás se intenta decodificar, y si no se puede se dice
(con un mensaje propio para HEIC). Tope de entrada: 25 MB por archivo. La misma foto se detecta por
el SHA-256 del **archivo que eligió la persona** (`vehiculos_imagenes.hash`, único por vehículo).
**Alternativas:** validar por extensión (miente en los dos sentidos); un decodificador HEIC en wasm
(1 a 2 MB para un caso que iOS ya resuelve); detectar el duplicado por el hash del WebP (cambia de
un navegador a otro, y de WebP a JPEG).
**Consecuencia:** los motivos se dicen en la bandeja, antes de subir, y sus textos viven en un solo
lugar (`entities/seleccion-de-fotos.ts`). Dos copias de la misma foto con distintos bytes (una
reenviada por WhatsApp) cuentan como dos fotos.

## 2026-10-13 — Vínculo e interesados: RPC y lectura ahora, interfaz con leads

**Contexto:** el vínculo y los interesados dependen de `leads`, que llega en la Fase 3: `vehiculos`
no puede importar una API que no existe. Y `vehiculos.lead_id`, que con alcance «propios» da ver y
editar, había quedado sin escritor.
**Decisión:** en la parte 3, las RPC (`vehiculo_vincular` con la versión del vehículo;
`vehiculo_interesado_marcar` y `_quitar`, idempotentes y sin versión porque no editan nada), dos
funciones de lectura que corren con la RLS de quien llama y devuelven el nombre del lead sólo si lo
ve, y un bloque de sólo lectura bajo la ficha. La interfaz que escribe llega en la Fase 3, se muestra
en la ficha del lead y **vive en `vehiculos`**, compuesta por `app/`. «Editar» deja de copiar la
regla: `vehiculos_editables(ids)` le pregunta a la base por lo vinculado a un lead de la cartera.
**Alternativas:** embeber `leads(nombre)` por PostgREST desde `vehiculos` (lee una tabla de otro
módulo); poner la interfaz de escritura en `leads` (`vehiculos` depende de `leads` por
`<SelectorLead>`: sería un ciclo); traer toda la cartera al servidor para decidir «Editar» (no tiene
cota).
**Consecuencia:** hay tres RPC sin interfaz hasta la Fase 3; las cubre el humo. Desvincular un
vehículo con una cotización final no se frena todavía (el portal del cliente deja de mostrarlo): se
decide cuando exista el botón.

## 2026-10-13 — En plpgsql un permiso se pregunta con `puede_*()`, no con un `if` sobre `in (…)`

**Contexto:** `vehiculo_guardar` decidía el alcance «propios» con
`if not (creado_por = yo or lead_id in (select mis_leads()))`. Con `lead_id` nulo y la cartera no
vacía, `in` da nulo, el `if` no levanta y se editaba cualquier vehículo sin vínculo del origen. No
se veía porque en las pruebas nadie tenía leads.
**Decisión:** las RPC de vehículos comprueban con `puede_vehiculo(id, clave)`, que es la regla de las
policies y vive en un `where` (ahí un nulo es «no»). El humo lo prueba con una persona que tiene un
lead en su cartera.
**Consecuencia:** una sola regla para leer, escribir y dibujar. Lo mismo vale para las RPC de
leads y cotizaciones cuando se reescriban: se revisan con esta lupa.

## 2026-10-13 — La vitrina muestra identidad, precio público, campos públicos y la portada; nada más

**Contexto:** `web.vehiculos` exponía, además de los campos que el origen marcó como públicos, el
kilometraje, el lote, la fecha y el estado de la subasta, parte del VIN, el nombre interno de la
fase, si el precio es negociable, si acepta permuta y **todas** las fotos. Las columnas comunes no
tienen fila en `origenes_campos`: nadie las puede marcar ni desmarcar como públicas.
**Decisión:** la vista queda en `id, numero, origen, origen_nombre, titulo, marca, modelo, anio,
categoria, precio, precio_hasta, precio_nota, destacado, atributos, imagen, miniatura,
actualizado_en`. De las columnas comunes sale sólo la identidad; `atributos` trae sólo los campos
`publico_web` activos (y `{}`, no nulo, si no hay ninguno); de las fotos, la portada en sus dos
tamaños. Las filas no cambian: publicado, fuera de la papelera, fase activa que publica, origen
activo y visible, integración web activa.
**Alternativas:** dejar las diez columnas como estaban (el sitio todavía no existe para decir cuáles
necesita, y el lote más la fecha de subasta dejan encontrar el precio de martillo); una marca
«público» para las columnas comunes (es una pantalla de configuración nueva: va con el sitio).
**Consecuencia:** hoy no hay consumidor (el sitio es la Fase 8), así que achicar no rompe nada;
agrandar después es deliberado y columna por columna, con su razón acá. El tipado del sitio sale de
esta lista. Despublicar no revoca una URL de foto que alguien ya tenga: el bucket es público.

## 2026-10-13 — Una sola definición de lo público: el esquema `interno`

**Contexto:** la ficha tiene que mostrar «así lo verá el visitante» también antes de publicar, y el
listado, cuáles de los publicados se ven de verdad. Copiar la proyección o el `WHERE` de la vista en
una RPC o en TypeScript es la forma de que la vista previa mienta el día que la vista cambie.
**Decisión:** `interno.vitrina_vehiculos` proyecta **todo** vehículo vivo a lo público y calcula sus
cinco condiciones (`publicado`, `fase_publica`, `origen_activo`, `origen_visible`, `web_activa`) y
`visible`. `web.vehiculos` es esa vista `where visible`; `vehiculo_vitrina_previa()` devuelve su
fila sin las banderas; `vitrina_del_origen()` da las condiciones que no son del vehículo, y con ellas
el listado arma el filtro y el indicador. `interno` no se expone en PostgREST y ningún rol de la app
tiene `usage`.
**Alternativas:** la vista interna en `public` (toda relación nueva nace ahí con privilegios para
`anon`, y una vista sin `security_invoker` en un esquema expuesto es un error de los advisors); en
`web` sin grants (aparece en los tipos del sitio); una función que devuelva la proyección (no se
integra al plan: cada lectura del sitio recorrería todo el inventario).
**Consecuencia:** el humo compara la vista previa con la fila de `web.vehiculos` campo por campo.
Publicar no exige que la fase publique: la marca es del vehículo y la visibilidad se calcula, así
que existe el estado «publicado, no visible», y la interfaz tiene que decir por qué.

## 2026-10-13 — Publicar lleva la versión del vehículo y manda el estado entero

**Contexto:** `vehiculo_vitrina()` no llevaba versión ni bloqueaba la fila, y sus parámetros con
default pisaban el precio y la nota cuando alguien despublicaba sin reenviarlos.
**Decisión:** siete parámetros sin default, con `p_actualizado_en_esperado` obligatorio; exige
`vehiculos.vitrina` del origen **y** ver el vehículo; guardar lo ya guardado no es conflicto; el
precio nulo es «Consultar»; despublicar apaga el destacado.
**Consecuencia:** como toda escritura sobre la fila, publicar mueve la versión: quien tiene la ficha
abierta en edición ve un conflicto (la misma deuda que mover de fase).

## 2026-10-13 — Qué no va a la papelera, y que todo lo que entra se pueda purgar

**Contexto:** `papelera_enviar` sólo frenaba un vehículo con un comprobante **no anulado**; la FK de
`comprobantes` es `restrict` para cualquiera, y la purga borra en cascada pagos, gastos, documentos
y transportes. Un vehículo podía entrar a la papelera y no salir nunca, o salir llevándose dinero
registrado. Tampoco miraba el vínculo, la fase ni la vitrina.
**Decisión:** una sola lista (`_vehiculo_motivo_de_bloqueo`) para enviar y para purgar. **Bloquea:**
vínculo activo (es de un cliente y su portal lo muestra); estar fuera de la fase inicial (ya entró a
logística: sacarlo de la cadena no lo decide quien sólo tiene `vehiculos.eliminar`); cualquier
comprobante, pagos, gastos, una declaración aduanera vigente o un proyecto de repuestos vivo.
**Despublica y sigue** lo publicado (en la misma RPC; conserva el precio). **Sigue** con
interesados: se conservan y vuelven. Las cotizaciones del vehículo viajan con él, como antes.
**Alternativas:** avisar en vez de bloquear (el patrón de la papelera es «hacer y deshacer», sin
diálogo previo: un aviso llegaría después del hecho); permitir cualquier fase (hoy nadie llega a
otra fase sin `cambiar_fase`, así que bloquear no le cuesta a nadie; relajarlo en la Fase 6, con la
cadena a la vista, es seguro, y endurecerlo después dejaría vehículos en proceso ya en la papelera).
**Consecuencia:** para mandar a la papelera un vehículo vinculado hay que desvincularlo, y eso no
tiene interfaz hasta la Fase 3. La purga vuelve a preguntar: `cotizacion_marcar_final` puede
vincular un vehículo que ya está adentro.

## 2026-10-13 — Los vehículos tienen su papelera; el envío es por lote, con versión por vehículo

**Contexto:** `papelera_*` servía a leads, vehículos y cotizaciones con una función por operación:
sin versión, todo o nada, con el uuid en los mensajes y restaurando sólo el lote entero.
**Decisión:** `vehiculos_papelera_enviar(p_vehiculos jsonb)` recibe `[{id, actualizado_en}]`, va uno
por uno en su subtransacción y devuelve `enviados` y `rechazados` (con `codigo` y `motivo`, y el
título sólo de lo que quien llama ve). Un envío es un lote; si no pasa ninguno, no queda lote.
`lotes_papelera` gana `actualizado_en`, su versión: restaurar (y purgar) la mandan y aceptan el lote
entero o algunos de sus vehículos; el lote se cierra cuando no le queda nada. **Restaurar** vuelve
sin publicar —también con «Deshacer»— y deja pendiente, con el motivo, lo que choca con un VIN o un
lote de subasta que ya tomó otro. Lo hace quien envió el lote o quien tiene
`vehiculos.papelera.purgar`: no hay permiso nuevo. Las genéricas rechazan vehículos, por el tipo que
reciben y por el del lote.
**Alternativas:** reescribir las genéricas (las reglas de un vehículo —vínculo, fase, vitrina, VIN—
no son las de un lead; cada una se reescribe con su fase); una RPC de uno y otra de lote (dos
puertas para la misma regla); `p_actualizado_en_esperado` escalar (un lote no tiene una versión
antes de existir: la versión que protege es la de cada vehículo).
**Consecuencia:** la regla «toda RPC de edición lleva `p_actualizado_en_esperado`» se lee, para un
lote, como «cada elemento lleva su versión». `vehiculos.papelera.purgar` sigue siendo global y
gobernando también la papelera de leads y cotizaciones: se parte cuando lleguen sus fases.

## 2026-10-13 — La purga manual y la automática son la misma función

**Contexto:** `papelera_purgar` borraba el lote entero sin versión y sin mirar qué se llevaba la
cascada; encolaba sólo la foto completa (no la miniatura) y con 24 h de espera;
`papelera_purgar_vencidos` abortaba entera si un lote fallaba, y su job nunca se había programado:
`papelera_dias` no hacía nada.
**Decisión:** `vehiculos_papelera_purgar(p_lote, p_actualizado_en_esperado, p_vehiculos)` (con
`vehiculos.papelera.purgar`) y `papelera_purgar_vencidos()` (el job, sin sesión) llaman a
`_papelera_purgar_vehiculos()`, que vuelve a preguntar qué no se purga. La automática no puede
purgar lo que la manual bloquea: lo bloqueado se queda en la papelera, la lista dice por qué, y el
lote sigue abierto. Cada lote y cada vehículo van en su subtransacción. Se encolan las dos rutas de
cada foto y lo que haya quedado en la carpeta del vehículo, sólo lo que quedó sin referencia, y
**sin espera** (`encolado_en` retro-fechado, como ya hace el barrido de huérfanos): un vehículo
purgado no tiene «Deshacer». Documentos y adjuntos conservan las 24 h.
**Alternativas:** una columna `reclamable_en` (el barrido ya usa `encolado_en` como «desde cuándo
corre la espera»: una columna más para decir lo mismo); no filtrar por referencias al encolar
(reclamar recuenta igual, pero la cola se llenaría de lo que se sabe que no se va a borrar).
**Consecuencia:** la automática, por ahora, sólo purga lotes de vehículos: los de leads y
cotizaciones esperan las reglas de sus fases. Si alguien recreara un vehículo con el mismo id antes
de que corra la limpieza, lo que protege sus fotos es `storage_gc_rescatar()` bajo candado, no la
espera.

## 2026-10-13 — `storage-gc` se dispara desde la base y se autentica con un pase de un solo uso

**Contexto:** los archivos sólo se borran por la API de Storage, así que hace falta una función con
la service key y algo que la llame cada tanto. El contrato decía «secreto en Vault»; Vault quedó
para lo que el dueño edita desde la interfaz (decisión del 10-12), y un secreto de infraestructura
vive en el entorno de un despliegue. Pero quien llama es la base (`pg_cron` → `pg_net`), que no
tiene entorno: el secreto tendría que estar en Vault o en claro dentro de `cron.job`. Además
`pg_cron` y `pg_net` nunca se habían instalado: ningún job había corrido jamás.
**Decisión:** la base no guarda ningún secreto. `storage_gc_disparar(url)` crea un pase (uuid, un
uso, 10 minutos) y lo manda; la función lo canjea con `storage_gc_abrir()` usando la service key
que el runtime ya le inyecta, que es el único secreto en juego, y sin pase válido no hace nada
(`verify_jwt = false`). La migración instala las extensiones donde están disponibles y programa la
purga automática; `storage_gc_programar(url)` programa la limpieza cada hora y es el único paso
por despliegue, porque la dirección de la función no se conoce desde una migración. La función no
tiene dependencias: habla con PostgREST y Storage por HTTP.
**Alternativas:** `STORAGE_GC_SECRET` compartido (`supabase secrets set` + el mismo valor incrustado
en el job: queda en claro en `cron.job` y en cada fila de `cron.job_run_details`, y hay que rotarlo
en dos lados); Vault (descartado arriba; PGlite no lo trae); un cron de Vercel que llame a un route
handler (el cliente admin saldría de la edge function, y el despliegue todavía no existe);
dejar la función abierta (el barrido de huérfanos recorre el bucket: cualquiera lo dispararía).
**Consecuencia:** nada que sincronizar entre despliegues, y `cola_gc_pases` es la bitácora de las
corridas. `pg_cron` da por bueno un job que sólo encola un pedido: si la función deja de responder
no avisa, y por eso existe `storage_gc_pendiente()`. Deno queda fuera de lint y typecheck: a la
función la cubre el e2e. Los otros cuatro jobs de `…000800` siguen sin programar hasta sus fases.

## 2026-10-13 — Vitrina y papelera no suman permisos: los cuatro que había, todos con enforcement

**Contexto:** había que saber qué permisos existen para publicar, enviar, restaurar y purgar, y si
alguno no tenía enforcement en la base.
**Decisión:** ninguna clave nueva. **Publicar:** `vehiculos.vitrina`, por origen, en
`vehiculo_vitrina()`, que ahora exige además ver el vehículo. **Enviar:** `vehiculos.eliminar`, por
origen y con alcance, en `vehiculos_papelera_enviar()` (con `puede_vehiculo`, la regla de las
policies) y en `vehiculos_con_permiso()`, que es lo que le pregunta la interfaz para dibujar las
casillas. **Restaurar:** sin permiso propio: quien envió el lote, o quien purga. **Purgar y ver toda
la papelera:** `vehiculos.papelera.purgar`, global, en `vehiculos_papelera_listar/restaurar/purgar`
y en la policy de `lotes_papelera`. Las cuatro acciones tenían enforcement; lo que faltaba era la
versión, el resultado parcial y las reglas de qué no entra.
**Alternativas:** un `vehiculos.restaurar` (quien envió algo por error tiene que poder traerlo de
vuelta sin pedirle permiso a nadie; quien purga ya ve todo); `vehiculos.papelera.purgar` por origen
(hoy gobierna también la papelera de leads y cotizaciones, que no tienen origen: se parte con sus
fases).
**Consecuencia:** quien tiene `vehiculos.papelera.purgar` ve en la papelera títulos de orígenes
donde quizá no tiene `vehiculos.ver`. Es un permiso de administración, y así se describe en el
catálogo.

## 2026-10-14 — apibara: se guarda todo lo que devuelve, y cada dato normalizado es un campo

**Contexto:** el pedido era traer _todo_ lo que la API devuelve y dejar que el dueño decida después
qué no usar. Las 17 `clave_apibara` del preset eran suposiciones: ninguna calzaba con la respuesta
real (`drivetrain`, `title_code`, `location`…), y una clave plana no alcanza para los grupos
anidados (`vehicle_specs.engine.raw`). La respuesta de IAAI trae además `details`, el volcado de su
página (~450 hojas con `$id`, HTML y «You are not logged in»).
**Decisión:** dos capas. **La respuesta entera** en `vehiculos.apibara_raw` (tope 512 KB, que la base
repite), con `apibara_sync_en`. **Cada hoja normalizada** (106 campos con los 17 de siempre) es un
campo del origen con su ruta con puntos como `clave_apibara`, activo, sin tarjeta ni filtro y **no
público**: la vitrina es segura por defecto. El catálogo vive en `_apibara_catalogo()` y lo espeja
`catalogo-apibara.ts`, con un test que lo compara con el SQL y con las respuestas grabadas. Quedan
fuera de los campos (y siguen en el bruto): `details`, las listas, lo que caduca al minuto, los
duplicados, las clases CSS y lo que ya es columna. Los orígenes que existían reciben el catálogo
por migración (`origen_apibara_completar()`, idempotente); los cinco campos de opciones del preset
sin opciones pasan a texto, porque un valor de la API no calza con una lista vacía. Un dato nuevo
de la API **no crea un campo solo**: queda en el bruto y la pestaña Campos avisa, con «Agregarlos».
**Alternativas:** todo en `atributos` sin campo (el dueño no podría apagar nada ni verlo en el
layout); incluir `details` (580 campos, la mayoría ruido de una página de IAAI); crear el campo
solo al ver un dato nuevo (el alta es de un asesor y el layout, del dueño: un campo que aparece
solo mueve la versión de todo el origen).
**Consecuencia:** el formulario de alta de un origen de subasta tiene ~100 campos más (los grupos
secundarios nacen plegados). Un campo nuevo no rellena a los vehículos que ya estaban: se llena
desde su próximo refresco. `estado_subasta` pasó de texto libre a un enum (`abierta`, `en_vivo`,
`terminada`, `vendida`) que deriva la base del bruto: una sola regla para el alta, el refresco y la
limpieza que viene.

## 2026-10-14 — Refrescar no pisa lo que la persona editó: tres vías con el bruto anterior

**Contexto:** al volver a consultar cambian la puja, el estado y la fecha; pero un asesor pudo
corregir el título o el color a mano, y la API volvería a pisarlos.
**Decisión:** siempre se actualizan `apibara_raw`, `apibara_sync_en`, `subasta_en`, `subasta_fin_en`
y `estado_subasta` (son del sistema y nadie los edita). Del resto (columnas mapeadas y atributos con
ruta), `fusionarRefresco(previo, nuevo, actual)` compara tres cosas: si lo guardado es lo que la API
había dicho la vez anterior, la persona no lo tocó y toma el valor nuevo; si difiere, lo editó y se
conserva. Un dato que la API no cambió no se escribe ni se cuenta como conservado; uno que dejó de
traer no borra nada. El refresco lleva la versión del vehículo (`PT409` si alguien editó en el medio).
**Alternativas:** una columna con «qué editó la persona» (hay que mantenerla en cada edición, y
`vehiculo_guardar` no sabe de apibara); pisar siempre (pierde ediciones); no actualizar nada salvo
la puja (deja el vehículo con datos viejos).
**Consecuencia:** sin columnas nuevas. Un vehículo cargado a mano no tiene bruto anterior: el
refresco llena lo vacío y respeta lo escrito.

## 2026-10-14 — Las fotos de una subasta pasan por la tubería del navegador, en primer plano

**Contexto:** bajar 24 fotos por `/image-proxy` y dejarlas como las de la parte 3 (dos tamaños,
nombre por hash, registro idempotente). La clave sólo la tiene la edge function.
**Decisión:** la edge function descarga (sólo de `cs.copart.com` y `vis.iaai.com`: la clave no es un
proxy abierto) y devuelve los bytes; el navegador los pasa por `prepararFoto()` y `subirFoto()` y
registra con **una** llamada a `vehiculo_fotos_agregar`, que ahora guarda `origen_url`. Las primeras
24 imágenes (`full` en Copart, `large` en IAAI: ninguna pasa de 1600 px); la primera es la portada
sólo si el vehículo no tenía fotos; el video y el 360° quedan en el bruto. Cuesta ~1,4 s por foto sin
caché, de a tres (24 fotos en 10–15 s) y ~120 KB por foto cruzando la edge function (~3 MB de egress
por vehículo; con 500 altas al mes, ~1,5 GB frente a los 250 GB del plan Pro). **No se hace en
segundo plano en el servidor:** el aviso de progreso es de la pantalla y sigue aunque se cierre el
panel; si se cierra la pestaña, lo que falta se trae después con «Traer las que faltan».
**Alternativas:** generar los tamaños en el servidor (`sharp` o un codificador WebP en WASM dentro de
Deno: una dependencia y otra tubería, sin ganancia); una cola con un job con la service role (las
RPC de fotos piden `auth.uid()` y habría que duplicar el registro).
**Consecuencia:** a revisar con uso real si alguien carga decenas de lotes y cierra la pestaña en
el medio.

## 2026-10-14 — La llamada a apibara vive en la edge function y la hace el navegador

**Contexto:** `.claude/rules/acciones.md` decía «apibara en lote: encolar y procesar en
`supabase/functions/`», y `datos.md` prohíbe el cliente admin fuera de portal, webhooks, crons e
invitar. La clave está en Vault y `integracion_secreto()` sólo la entrega a `service_role`.
**Decisión:** la única que lee la clave es la edge function `apibara`, con la service key que le
inyecta el runtime. La llama el **navegador** con su sesión (`functions.invoke`), no una Server
Action: antes de leerla le pregunta a la base **como quien llama** `apibara_contexto(origen)` (si
está activa, a qué dirección, qué plataformas, y si esa persona puede crear o editar ahí). La
dirección sólo puede ser de `apibara.tech`. Los errores salen como valores (`{ ok: false, error: {
codigo } }`, siempre HTTP 200): apagada, sin permiso, entrada, plataforma, no soportado, no
encontrado, clave inválida, cuota, tiempo, proveedor. **Guardar** sigue siendo una Server Action
con RPC. El alta de varias líneas son consultas cortas de a dos con resultado por línea; con la
cuota agotada o la clave rechazada se deja de consultar. «Ver uso» (`/usage`) se pide a mano.
**Alternativas:** una Server Action que lea el secreto con el cliente admin (rompe la regla del
admin); encolar el lote (no hay dónde mostrar el resultado por línea y no es trabajo largo);
llamar a la API desde el navegador con la clave (nunca).
**Consecuencia:** la función se prueba cargándola en Node con un `fetch` simulado que responde con
lo grabado; el e2e la intercepta en el navegador y otro spec sólo toca la verdadera en los caminos
que no llegan a apibara. Ningún test llama a la API real.

## 2026-10-14 — «Subastas próximas en la ficha» es la subasta de ese vehículo

**Contexto:** `docs/PLAN.md` lo nombra y `docs/PRODUCTO.md` no lo define (sólo «subastas en un
calendario», de la Agenda, Fase 7). `GET /vehicles?upcoming=only` lista subastas de cualquier
vehículo, no las nuestras.
**Decisión:** el bloque «Subasta» de la ficha de un vehículo de subasta muestra su fecha en la zona
de la empresa con la cuenta regresiva, su estado, la puja y cuándo se consultó, con «Refrescar». Si
la hora pasó y el estado sigue «abierta», avisa que quedó vieja. No usa `/related` ni `upcoming`:
gastan cuota y la Agenda compondrá su calendario con `subasta_en`, que ya está indexada.
**Consecuencia:** `subasta_en`, `estado_subasta` y `apibara_sync_en` quedan en columnas con índices
parciales (`(estado_subasta, subasta_en)` y `(apibara_sync_en)`, sólo vivos): lo que necesita la
limpieza automática de la parte 6 sin tocar el bruto.

## 2026-10-14 — Migraciones sobre una base viva, y e2e que no exigen la base vacía

_Relajada, en propuesta, más abajo (2026-10-15): con `db:reset` disponible ya no hace falta la idempotencia. Los e2e ya no se saltan «la primera persona nace dueña» ni el guardián._

**Contexto:** la base local tenía una cuenta real y la clave real de apibara; `pnpm db:reset` las
habría borrado, y cuatro specs exigían el equipo vacío.
**Decisión:** el cambio de esquema va en `supabase/schemas/` (para la migración base) **y**, de forma
idempotente, en su migración (`do` con `if not exists`, `create … if not exists`): se aplicó con
`supabase migration up` y `pnpm db:probar` prueba el camino desde cero. Los e2e no exigen la base
vacía: la dueña de prueba entra invitada con el rol de dueño cuando ya hay cuentas. Sólo «la primera
persona nace dueña» y el guardián (que protege a la _última_ que administra) necesitan el equipo
vacío: se saltan en local con un aviso y corren siempre en CI. El spec de empresa guarda cómo estaba
la empresa y la clave real y los deja como estaban.
**Consecuencia:** quien corre los e2e con cuentas reales no pierde su clave ni sus ajustes, pero esas
dos pruebas no corren en su máquina.

## 2026-10-14 — El bruto de apibara lo origina la función; el navegador manda una referencia

**Contexto:** `vehiculo_crear(…, p_apibara)` y `vehiculo_subasta_refrescar(…, p_apibara, …)` guardaban el
JSON que mandaba el navegador, y de él la base deriva `subasta_en` y `estado_subasta`. Quien crea o
edita podía falsear la fecha o el estado de lo suyo, y la limpieza automática decide por ellos.
**Decisión:** la edge function guarda cada ficha que trae en `apibara_consultas` (sólo `service_role`) a
nombre de quien consultó (`apibara_contexto()` devuelve su `usuario`) y devuelve `{ consulta, data, url }`.
El alta y el refresco reciben el id y la base copia el bruto, con cuatro condiciones: la consulta es de
quien llama, es del mismo origen, tiene menos de 24 h y la usa un solo vehículo (reintentar el mismo
no choca). Las firmas viejas desaparecen (`drop function`). Nace `vehiculos.importado_apibara`, que sólo
pone `vehiculo_crear` con consulta y no cambia nunca; en la base viva se rellenó con `apibara_raw is not null`.
La action de refrescar lee el bruto nuevo con `apibara_consulta_leer()`, no del input. Un job borra las
consultas de más de 48 h.
**Alternativas:** re-consultar a apibara dentro de la limpieza (gasta cuota y el pedido de la limpieza
es no llamar); firmar el bruto con un HMAC (hay que guardar un secreto en la base y rotarlo); una tabla
con la clave del cliente y su bruto sin vencimiento (crece sin cota).
**Consecuencia:** el navegador sigue recibiendo `data` (llena el formulario y lista las fotos), pero lo que
viaja al guardar es el id. Costo: un INSERT por línea dentro de la función y un SELECT más al refrescar; ni
una consulta más a la API. Un vehículo cargado a mano y refrescado después nunca fue «importado» (no pasa
por `vehiculo_crear` con consulta): el relleno inicial de la base viva los contó como importados porque
la base no podía distinguirlos; es el único caso.

## 2026-10-14 — La regla de limpieza vive en un solo lugar de la base

**Contexto:** el job, el filtro «Se limpiará pronto» y el banner de la ficha necesitan la misma regla:
si un vehículo es basura, qué lo retiene y en qué fecha se va. Copiarla en TypeScript es la forma de que
el banner prometa una fecha distinta de la que aplica el job.
**Decisión:** funciones SQL, y sólo ellas: `_limpieza_aplica` (importado por apibara, de un origen de
subasta, vivo), `_limpieza_termino` (por la fecha guardada: fin o inicio si ya pasó; fecha en el futuro =
no terminó aunque el estado diga «terminada»; sin fecha y estado terminal, desde la última consulta; sin
fecha y sin estado terminal, nunca), `_limpieza_vence` (el día **local** en que cumple los días de
gracia), `_limpieza_ancla` (el código de la primera ancla) y `_limpieza_fecha` (el día en que el job lo
mueve). `limpieza_el(vehiculos)` es la columna calculada que leen el filtro (`.lte('limpieza_el', hasta)`),
la insignia y el banner. La fecha es **un día, no una hora**: lo que cumple después de las 03:00 locales
espera al día siguiente, así que banner y job no discrepan por minutos; una fecha ya vencida se dice como
la próxima corrida. Cambiar los días de gracia o la zona mueve los dos por igual, porque los dos leen
`ajustes_empresa`. El interruptor apagado hace nulas las fechas: desaparecen filtro, insignia y banner.
**Alternativas:** una vista `vehiculos_a_limpiar` (no compone con el listado ni se filtra por `or()`);
persistir la fecha en una columna (caduca con cada cambio de ajustes o de ancla); calcularla en la app.
**Consecuencia:** la columna calculada corre con los derechos de la base (mira pagos y documentos que
quien lista quizá no lee) y sólo devuelve una fecha o nulo: revela, como mucho, que algo retiene al
vehículo. Se evalúa por fila (50 por página): medirla con 5 a 10 mil vehículos es de la Fase 9.

## 2026-10-14 — Qué ancla y qué no; la cotización final queda para la Fase 4

**Contexto:** un vehículo de subasta que nadie compró se va; uno al que alguien le puso algo encima, no.
**Decisión:** ancla = marca «Conservar», vínculo activo con un lead, fase posterior a la inicial,
documentos, gastos, pagos (cuentan todas las filas, también las borradas: la purga las llevaría en
cascada), publicado en la vitrina, y lo que la papelera manual ya rechaza (comprobante, declaración
aduanera, proyecto de repuestos): la limpieza nunca intenta lo que la puerta de siempre cerraría. Los
**interesados no anclan**. «Sin fase» no ancla. El orden de los códigos es `conservar`, `vinculo`, `fase`,
`documentos`, `gastos`, `pagos`, `vitrina`, `bloqueo`, y la corrida cuenta cada ancla por separado.
**La cotización final será ancla en la Fase 4:** `cotizaciones.clase = 'final' and estado = 'activa'`
ya existe en la base; no se suma ahora porque nada la crea todavía. Se suma con una línea en
`_limpieza_ancla()` (hay un comentario en el punto exacto). Hoy `cotizacion_marcar_final` vincula el lead
si no tenía, y eso ya ancla por el vínculo.
**Consecuencia:** hasta la Fase 3 ninguna ancla de vínculo se puede crear desde la pantalla, y hasta la
Fase 6 tampoco documentos, gastos ni pagos: en la práctica sólo retienen «Conservar» y la vitrina.

## 2026-10-14 — «Conservar» es una marca aparte, sin versión, y restaurar la deja puesta

**Contexto:** hay que poder decir «éste no», sin mover la versión de la ficha (que le daría un conflicto
a quien la está editando) y sin que un vehículo restaurado vuelva a irse esa noche.
**Decisión:** `vehiculos_conservados (vehiculo_id, conservado_por, conservado_en)`, de sólo lectura para la
app, escrita por `vehiculo_conservar(p_vehiculo, p_conservar)`. La marca y quitarla las hace quien puede
editar el vehículo (`puede_vehiculo`), sólo en un importado de apibara, y dejan una fila en `actividad`
(`vehiculo.conservado` / `vehiculo.conservar_quitado`). Manda el estado deseado y no lleva
`p_actualizado_en_esperado`: es idempotente y no edita la ficha; es la misma razón por la que marcar un
interesado no la lleva. Al restaurar un lote de limpieza un trigger deja el vehículo conservado, con quien
restauró: la puerta de restaurar no se reescribe.
**Consecuencia:** coherente con el pendiente de la Fase 6 (mover de fase sin cambiar la versión de la
ficha). Quien quita la marca a mano lo devuelve a la limpieza, y se irá la noche en que le toque.

## 2026-10-14 — El job: una vez por día local, desde las 03:00, lote acotado y con registro

**Contexto:** `pg_cron` corre en UTC (`cron.timezone = GMT`) y ningún job miraba la zona de la empresa:
`papelera-purgar` «03:30» es la madrugada de Greenwich (las 23:30 en La Paz).
**Decisión:** `limpieza_automatica_correr(p_ahora, p_origenes)`, sólo `service_role`, programada **cada
hora** (`7 * * * *`) y que actúa a lo sumo una vez por día local, a partir de las 03:00 de la zona de la
empresa: una corrida perdida (base caída) se recupera a la hora siguiente y un cambio de zona no la
desplaza. La reserva del día es una fila de `limpieza_corridas` con índice único por fecha, tomada antes de
mover nada; dos a la vez no duplican. Por vehículo: fila bloqueada con `for update skip locked` (si alguien
la está editando, se salta y queda para la noche siguiente), se vuelve a decidir con la fila en la mano, y
sube a un lote `es_limpieza` sin autor con hasta 200 (el tope de un lote de papelera; el resto queda en
`pendientes`). Deja la corrida (movidos, saltados por ancla, pendientes) y una fila en `actividad` sin
autor. `p_origenes` hace la corrida «parcial»: no espera la hora ni tapa la de verdad (es lo que usan las
pruebas, sobre sus propios orígenes). `_vehiculo_a_lote()` es el movimiento que comparten la papelera manual
y la limpieza: la manual lo llama ahora, con el mismo comportamiento que ya cubría el humo.
**Consecuencia:** desde el lote sigue el camino que ya existía (`papelera_dias`, purga, `storage-gc`).
Quien edita un vehículo que el job movió recibe el PT409 de siempre («ya no existe o está en la papelera»),
que ya es legible. `papelera-purgar` sigue a las 03:30 UTC: alinearlo con la zona de la empresa es un
pendiente para la nube.

## 2026-10-14 — El lote de la limpieza lo ven y restauran quienes pueden vaciar la papelera

**Contexto:** un lote armado por el sistema no tiene autor, y la papelera muestra lo propio o, con
`vehiculos.papelera.purgar`, todo.
**Decisión:** nadie más lo ve. Quien creó el vehículo tuvo el aviso previo y «Conservar»; si se le fue,
se lo pide a quien administra. Se lee igual que un lote ajeno y se dice «Limpieza automática del dd/mm».
**Alternativas:** que cada persona vea sus vehículos dentro del lote (obliga a reescribir el listado y
la restauración de la papelera, que esta parte no toca).

## 2026-10-14 — El aviso: los próximos 3 días, y el interruptor apagado lo borra todo

**Decisión:** «Se limpiará pronto» son los vehículos con fecha de limpieza en los próximos 3 días, hoy
incluido (`VENTANA_DE_AVISO_DIAS`, el mismo número en el filtro, la insignia y el banner); los anclados no
aparecen porque su fecha es nula. El banner dice «Se limpiará el dd/mm» con «Conservar»; fuera de la
ventana, una línea con la fecha; conservado, «Se conserva · lo marcó X el dd/mm» con «Quitar». El
interruptor general nace encendido; apagado, no hay filtro, insignia, banner ni corrida (y encenderlo más
tarde el mismo día todavía limpia esa noche). La notificación llega en la Fase 7.

## 2026-10-14 — Los textos de uso diario dicen «subasta»; el proveedor se nombra donde se configura

**Contexto:** al cerrar la Fase 2 se revisó la interfaz: nada de voseo y ningún nombre de proveedor fuera
de lo que viene del dato. No había voseo en `src/`; el nombre del proveedor estaba escrito en unos veinte textos,
entre pantallas de uso diario (alta, ficha, fotos, errores) y pantallas que configuran la integración.
**Decisión:** el alta, la ficha, las fotos y los mensajes de error de la consulta dicen «la subasta»,
«la consulta de subastas» o «el servicio de subastas» (`mensajeDeApibara()`, `<AltaPorSubasta>`,
`<BloqueDeSubasta>`, `<SeccionDeFotos>`). El nombre de la plataforma sigue saliendo del dato
(`raw.platform` → `NOMBRE_DE_PLATAFORMA`). El proveedor se nombra sólo donde se lo configura:
Configuración › Integraciones («apibara», su dirección y su cuota), el campo de apibara de un campo del
layout, «Plataformas» al crear un origen y el paso «Activa apibara» de sus siguientes pasos.
**Consecuencia:** quedan los textos de configuración y las etiquetas del catálogo («Estado según apibara»,
«Actualizado en apibara»): son filas de `origenes_campos`, datos del origen que el dueño puede renombrar.
Los mensajes con voseo que quedan están en tres RPC de leads, flujos y cotizaciones que ninguna pantalla
llama todavía: se reescriben con su fase.

## 2026-10-14 — El motor de campos es de `shared`, y los leads lo usan

**Contexto:** cada empresa tiene que armar los campos de sus leads como arma los de un origen. El
motor vivía repartido entre `origenes` (editor, valor por defecto, impacto) y `vehiculos` (esquema,
control, filtro), con dos copias de `TipoDeCampo`; copiarlo a `leads` habría sido la tercera.
**Decisión:** lo que no depende de qué se configura pasa a `shared/lib/campos` (puro: tipos, orden
relativo, clave, valor por defecto, cambios, impacto con el sustantivo del módulo, piezas Zod) y
`shared/ui/campos` (el editor entero, con la configuración y las operaciones del módulo por props y un
hueco para lo propio). En la base, las mismas reglas son funciones `_campo_*`, `_campos_*` y
`_atributos_*` que no leen tablas (reciben lo que tienen que mirar); las `_origen_*` y el trigger de
vehículos delegan en ellas con los mismos mensajes. Cada módulo conserva su política: qué campos hay,
claves reservadas, permiso, banderas. El refactor fue su propio commit y no cambió a vehículos: sus e2e
quedaron en verde. Lo que sólo tiene un consumidor (el formulario por bloques, la ficha por grupos, el
traductor de filtros) se queda en `vehiculos` hasta que leads lo use.
**Alternativas:** un módulo `campos` (ningún `entities/` podría importarlo: habría que sacar la
validación de `entities`); que `leads` importe de `origenes` (dependencia falsa y otra copia de los
tipos); copiar el motor.
**Consecuencia:** un tipo de campo nuevo es una sola lista y sus `Record` por tipo; el mismo editor
sirve a un tercer módulo. `shared` sigue sin reglas de negocio: no sabe qué es un lead.

## 2026-10-14 — Los leads suman `correo` y `documento`, y nacen «solo la cartera»

**Decisión:** los tipos de un lead son los de un vehículo sin VIN ni lote, más `correo` y `documento`
(validación propia: correo con forma de correo; documento con letras, números y separadores, hasta 30).
No llevan valor por defecto y nacen «solo la cartera» si la persona no dice otra cosa. Cada layout
limita sus tipos con un `check` (`leads_campos` sin vin y lote; `origenes_campos` sin correo y
documento) y el editor ofrece sólo los suyos. Los teléfonos extra siguen en `leads_telefonos`.
**Alternativas:** un tipo `telefono` (duplicaría `leads_telefonos`); dejar los sensibles como texto (la
persona tendría que acordarse de marcarlos).
**Consecuencia:** el enum se amplió en su propia migración (un valor nuevo no se usa en la transacción
que lo crea) y un test compara la lista de TypeScript con el enum de la base.

## 2026-10-14 — Configuración › Leads reusa `leads.configurar`

**Contexto:** se pedía un permiso nuevo, pero `leads.configurar` ya existía (sembrado, tipado, en el
menú, sólo del dueño) y ya gobierna los orígenes de lead y los tipos de seguimiento: las otras pestañas
de la misma pantalla.
**Decisión:** un solo permiso para toda la configuración de leads, como `origenes.gestionar` cubre
campos y categorías. Se amplió su descripción y su `aplicado_en`. Sin él no se entra (no hay otro
permiso que necesite leer esta configuración: el layout lo leen las pantallas de leads por su cuenta).
**Alternativas:** `leads.campos.gestionar` (más fino: quien edita seguimientos no tocaría la privacidad
de los campos; exige insertar un permiso por migración, algo que ninguna ha hecho). Si hace falta
separar, es un permiso nuevo con su enforcement.
**Consecuencia:** la dominancia de la matriz sale sola del catálogo.

## 2026-10-14 — Las seis columnas de un lead pasan a atributos, sobre la base viva

**Contexto:** edad, ciudad, país, dirección, género y notas eran columnas fijas; ahora son campos de
fábrica de `leads_campos`. La base local tenía una cuenta real: nada de `db:reset`.
**Decisión:** una migración idempotente copia lo que haya a `leads.atributos` (género «sin especificar»
y un texto en blanco son «sin dato»), retira las columnas y el enum `genero_persona`, y recrea la vista
y `crear_lead`. La copia es una función interna (`_leads_columnas_a_atributos()`) para que el humo vuelva
a crear las columnas y la ejercite. Las migraciones antiguas dejaron de nombrar las seis columnas (una
vista se valida al crearse) y la definición actual de `leads_vista` es `_leads_vista_crear()`. Las claves
de fábrica son las de las columnas viejas, así que lo que ya está en `actividad` sigue la misma regla.
`crear_lead` conserva su firma: los datos propios van en `atributos` y una clave suelta se rechaza
diciendo dónde va. La base ya no pone el país por defecto: lo precarga el formulario, como en vehículos.
**Alternativas:** dejar las columnas y sumar atributos (dos lugares para la misma cosa); una tabla EAV.
**Consecuencia:** el campo «Edad» pierde el `between 1 and 120` de la columna: el motor no tiene topes
por campo. Si hace falta, es una regla del motor para todos los campos.

## 2026-10-14 — Los privados se recortan al leer, con la cartera de ese momento; filtrar es leer

**Contexto:** RLS no esconde columnas ni claves de un `jsonb`, y un filtro sobre un campo privado
revelaría su valor aunque la pantalla no lo muestre.
**Decisión:** `leads.atributos` no tiene grant: se lee por `leads_vista.atributos`, que sale de
`atributos_lead()` (definer, estable). La cartera recibe todo; quien sólo ve el lead recibe las claves
que el layout conoce como no privadas, **activas o no** (falla cerrada: desactivar un privado no lo
expone); quien no ve el lead, nada. PostgREST sólo filtra sobre la columna recortada, así que no hay
oráculo. Como se decide al leer, compartir, transferir y adoptar del limbo dan los privados y revocar
los quita sin mover datos. Un trigger valida el estado final contra el layout y no deja que quien está
fuera de la cartera cambie un privado ni le exige uno que no ve. `actividad` deja de entregar `antes` y
`despues` (la fila entera, con el teléfono): la pantalla de Actividad (Fase 9) leerá el diff por una
función que recorta según la cartera. Los conteos del aviso de impacto son agregados, nunca valores.
**Alternativas:** guardar los privados aparte (otra tabla por lead); recortar en la pantalla (el dato
viaja igual); una función de búsqueda definer (todavía no hace falta).
**Consecuencia:** filtrar por un campo evalúa `atributos_lead()` por fila y no usa índice (bajo RLS
tampoco lo usaría un GIN, como en vehículos): **no está medido**. Se mira con datos reales (Fase 9) y,
si pesa, el listado pasa a una función que recorta una vez por consulta. Un `select *` de `leads` o de
`actividad` desde la API falla a propósito.
**Lo que se encontró y no se cambió** (tocan el enmascarado, que esta parte deja fijo): `leads_telefonos`
no se enmascara a quien ve el lead sin la cartera; `telefono_lead(id)` no comprueba acceso; quien tiene
`leads.editar` «todos» puede compartirse un lead ajeno. Van con la parte de la cartera.

## 2026-10-14 — «La de la empresa» es una columna, no una referencia dentro del valor

**Contexto:** Ciudad trae por defecto la de la empresa (`docs/UX.md`, Flujo 1).
**Decisión:** `leads_campos.valor_defecto_empresa` (`ciudad` o `pais`), excluyente con un valor fijo y
sólo en un campo de texto. Se resuelve al leer el layout con los ajustes de la empresa, así que sigue a
la empresa si cambia de ciudad. Sin dato de la empresa, el alta sale vacía y el editor lo dice.
**Alternativas:** una referencia `{"empresa": "ciudad"}` dentro de `valor_defecto` (ensucia el motor,
sus lectores y la comparación de cambios con una noción de empresa); copiar la ciudad al campo al
sembrarlo (no sigue a la empresa).

## 2026-10-14 — «De fábrica» reemplaza a «de sistema» para los campos

**Decisión:** un campo que nació con la preconfiguración (de un origen o de los leads) se llama «de
fábrica»: insignia, motivo del panel y mensajes de la base. «Sistema» ya nombra otra cosa (el rol
dueño). La columna sigue siendo `es_sistema`. Un campo de fábrica se edita, se apaga y se renombra;
no se elimina ni cambia de tipo ni de clave.

## 2026-10-14 — El alta rápida pide los requeridos propios, y el panel lo dice

**Decisión:** el drawer de «Nuevo lead» lleva los cuatro fijos y los campos activos requeridos; el
resto va plegado en «Más datos», ya precargado, con un resumen en el encabezado. Volver requerido un
campo avisa dentro del panel, con el número, cuántos datos pedirá el alta; desde el cuarto, que la meta
de 25 segundos cuesta cumplirla. Sin un campo requerido, la base lo rechaza con el campo en el `hint`:
vale también para el cliente de servicio, así que los e2e que cargan leads completan los requeridos.
**Consecuencia:** el aviso es de la pantalla de configuración; el alta (parte siguiente) lo
materializa.

## 2026-10-14 — El alta rápida es una sola RPC: el lead, su seguimiento y el recordatorio entran juntos

**Contexto:** `crear_lead(jsonb)` devolvía sólo un `uuid`, no tenía forma de distinguir un reintento de un
duplicado y el seguimiento se escribía directo en la tabla: dos pasos, y un fallo en el segundo dejaba
un lead sin seguimiento.
**Decisión:** `crear_lead(p_id, p_lead, p_seguimiento, p_recordatorio)` escribe el lead (o lo adopta),
el seguimiento, el recordatorio y el último origen usado (`preferencias_usuario`) en una transacción.
El navegador genera `p_id` al abrir el drawer y lo conserva en cada reintento: si ya entró, devuelve lo
mismo con `repetido` (el patrón de `vehiculo_crear`; una adopción se reconoce por el `intento` de su
constancia en `actividad`). Un teléfono que ya existe, es de otra persona o está sin dueño sin tomar es
un **valor** (`existe`, `de_otro`, `limbo`), no una excepción: la pantalla lo dice junto al teléfono. Dos
personas que guardan el mismo teléfono a la vez terminan ahí: el `unique_violation` se atrapa y se
vuelve a verificar. `p_seguimiento` es opcional en la firma (la importación CSV, parte 7, no lo trae);
el drawer lo manda siempre y el resumen es obligatorio.
**Alternativas:** dos llamadas (si el seguimiento falla queda un lead a medias); una clave de
idempotencia en una tabla aparte (otra tabla para algo que `leads.id` ya resuelve).
**Consecuencia:** un rechazo no deja nada. El humo prueba la atomicidad, un fallo a mitad y el reintento;
el e2e, la carrera real. Los dos pendientes de la parte 4 (policies directas de `seguimientos` y
`recordatorios`) siguen: esta RPC es la única puerta del primer seguimiento, no la de los siguientes.

## 2026-10-14 — El teléfono lo normaliza la base y el código de país es de la empresa

**Decisión:** `normalizar_telefono(cc, tel)` entiende espacios, guiones, puntos y paréntesis; «+» o «00»
al inicio es internacional (el número ya trae su código); sin ellos es nacional (código de la empresa
y un 0 troncal menos); rechaza con el motivo letras, un «+» en medio y lo que no tiene entre 8 y 15
dígitos. `leads/entities/telefono.ts` es su espejo, para responder al tipear, y un test **ejecuta** la
función SQL en PGlite sobre la misma tabla de casos y exige el mismo número y el mismo motivo. El código
de país es `ajustes_empresa.telefono_cc` (Empresa › Región); `leads.telefono_cc` deja de tener default y
guarda el código sólo cuando el número es el de la empresa. Sin código de empresa, el alta pide el número
con «+» y lo dice. La migración conservó el `+591` que la instalación ya usaba como dato de la empresa.
**No se adivina:** un número que empieza con el código de la empresa pero se escribió sin «+» ni «00» se
toma como nacional. La pantalla dice cómo va a quedar guardado («Se guardará como +591 70011002») para
que se vea antes de guardar.
**Alternativas:** derivar el código del `locale` (una tabla más, y falla con un locale raro); espejo
sólo con regex sobre el SQL (no prueba que haga lo mismo).

## 2026-10-14 — Tomar un lead sin dueño exige aceptarlo, deja de dueño y no pisa

**Contexto:** `crear_lead` adoptaba solo, dejaba al adoptante como «adoptado» (sin dueño: «Lo tiene
null») y reemplazaba el nombre y los atributos del lead con lo que se tipeaba.
**Decisión:** el lead sin dueño se adopta sólo con `adoptar = true` («Tomar lead»); sin eso, el servidor
dice `limbo` y nada cambia (nadie adopta por una verificación que llegó tarde). Quien lo toma entra como
**dueño**, el nombre se conserva, el origen sólo se completa si estaba vacío y de los atributos entran
las claves que faltan (`_atributos_completar`). La fila de cartera que ya tenía (revocada) se reactiva.
El drawer lo dice antes de guardar. El valor `adoptado` del enum queda sin uso: quitar un valor de un
enum cuesta más que dejarlo.
**Consecuencia:** «Lo tiene …» siempre nombra a alguien. Un campo requerido que el lead no tiene lo
completa quien lo toma; uno que ya tenía no se toca.

## 2026-10-14 — Ctrl/Cmd+Enter avanza al seguimiento y se guarda al final

**Contexto:** `docs/UX.md` decía «guarda y abre el primer seguimiento»: dos escrituras. Con la RPC
atómica eso dejaría de ser una transacción.
**Decisión:** en el paso de los datos, `Ctrl/Cmd+Enter` valida y abre «Primer seguimiento» sin escribir
nada; el segundo `Ctrl/Cmd+Enter` guarda todo. Los dos pasos son un solo formulario en el mismo drawer
(el que no se ve queda oculto, no desmontado: lo escrito no se pierde al ir y volver); `Esc` del segundo
vuelve al primero. No hay «guardar sin seguimiento»: el resumen es obligatorio, así que no nace un lead
sin seguimiento. Los atajos de fecha van **antes** del campo de fecha: un `datetime-local` tiene una
parada de Tab por cada parte.
**Consecuencia:** 7 teclas de control desde `N` hasta el lead guardado con seguimiento y recordatorio.

## 2026-10-14 — `N` es de la pantalla; «Nuevo lead» siempre tiene botón

**Contexto:** `docs/UX.md` decía «en cualquier pantalla `N` abre Nuevo lead» y, más abajo, «`N` nuevo
(lead, vehículo o cotización según pantalla)».
**Decisión:** `N` abre lo propio de la pantalla (en vehículos, un vehículo). Donde la pantalla no tiene
un «nuevo» propio (Inicio, Configuración, Perfil) cae a «Nuevo lead». En vehículos `N` es siempre del
vehículo: si no se puede (origen desactivado, sin permiso, otro panel abierto) no hace nada, no cae a
lead. El botón «Nuevo lead» está siempre en la barra superior de quien tiene `leads.crear`, así que la
meta se mide también desde él. Sin `leads.crear` no se monta nada: ni botón, ni atajo, ni URL.
**Consecuencia:** la pila de `ProveedorAtajos` ya resolvía «el más adentro gana»; no hizo falta otro
mecanismo. La lista de atajos con `?` sigue sin dibujarse (pendiente).

## 2026-10-14 — El resumen de un seguimiento es un título corto y un detalle en texto plano

**Decisión:** hasta que llegue el editor enriquecido (parte 4), el primer seguimiento lleva `titulo`
(≤ 120) y `detalle_texto` (≤ 5000, texto plano); `detalle_html` queda nulo. Lo que se guarde hoy sigue
siendo válido: el editor mostrará `detalle_texto` cuando no haya HTML. El recordatorio usa el título del
seguimiento (no se pide otro).

## 2026-10-14 — El formulario por bloques y los controles por tipo son de `shared`

**Contexto:** `docs/ESTADO.md` lo anticipaba; el alta de leads necesita lo mismo que el de vehículos.
**Decisión:** `shared/lib/campos` suma `valor.ts` (el estado de un formulario de campos), `controles.ts`
(un `Control` por cada uno de los 14 tipos, la clave del dato la pone quien llama) y `esquema-de-valor.ts`
(el Zod de cada tipo; correo y documento espejan `_lead_atributos_formato()`); `shared/ui/campos` suma
`<CampoDeFormulario>` y `<BloqueDeCampos>`. Vehículos conserva sus datos comunes, sus bloques, la
conversión de apibara, el lector y el filtro por tipo (los usa el listado). Fue su propio commit, sin
cambios de comportamiento: los e2e de vehículos y orígenes siguieron en verde.

## 2026-10-14 — La guardia de los e2e: respaldo en disco, funciones servidas y teardown

_Reemplazada más abajo: «El e2e completo parte de un reset, la guardia sólo comprueba las funciones, y el atajo de la pantalla gana» (2026-10-15)._

**Contexto:** un e2e que falló a mitad dejó apagada la integración de apibara y la corrida siguiente
respaldó ese estado ya malo: el respaldo era una variable de cada spec, tomada de la base viva.
**Decisión:** `globalSetup`/`globalTeardown` de Playwright. Antes de empezar: si existe
`e2e/.estado/respaldo.json`, una corrida anterior no restauró: se **repone desde el archivo** antes de
tomar uno nuevo, y nunca se lo pisa con lo que hay en la base. Se respalda `integraciones` de apibara
(sin la clave: nunca va a disco). Se prueba con `OPTIONS` (no llama a apibara) que `apibara` y
`storage-gc` estén servidas y, si no, falla en segundos diciendo qué correr. Al terminar: restaura,
comprueba que la clave de Vault sigue y borra los leads `E2E …` que hayan quedado. Los `afterAll` de
empresa y de la limpieza restauran en `finally`.
**Costo:** los e2e exigen `npx supabase functions serve` siempre (`E2E_SIN_FUNCIONES=1` lo salta, y lo
avisa); unas 120 líneas. **No cubre** un `kill -9` en medio de una corrida: lo cubre la siguiente.
**Una base de pruebas aparte no hace falta todavía:** el riesgo era el estado compartido que se pisa,
no la base; si algún día los e2e tienen que correr en paralelo o contra datos reales sensibles, sí.

## 2026-10-14 — Cómo se mide la tarea de oro 1

**Decisión:** el e2e hace el recorrido entero con el teclado, sin un solo clic, y cuenta lo que se pulsa
(sin contar lo que se tipea). Lo que comprueba: ≤ 8 teclas de control, el reloj del robot bajo un tope
generoso y la estimación de una persona por KLM (0,28 s por tecla, 1,35 s por decisión) ≤ 25 s. El
reloj del robot **no** es la hora de una persona: tipea sin demora. La meta de 25 s se sostiene por la
cuenta de pulsaciones y por el KLM; la detección del duplicado se mide aparte (≈ 0,8 s después de
tipear: 400 ms de espera y un viaje).

## 2026-10-14 — El listado de leads: orden, «míos», búsqueda, privados y drawer

**Contexto:** `/leads` es la primera pantalla donde otra persona ve un lead que no es suyo, así que cada
decisión es también una decisión de qué se entrega y qué se deduce.
**Decisión:**

- **Orden `creado_en desc, id desc`**, con el cursor y el índice del inventario (`leads_listado_idx`, sólo
  vivos). «Actividad reciente» (`ultimo_seguimiento_en`) sirve más a un asesor, pero es nulo en todo lead
  sin seguimientos (el keyset necesita una rama `nulls last` y un cursor de tres partes), las filas
  cambian de página mientras se pagina, y cada seguimiento reescribe la fila. Entra como orden
  alternativo cuando la parte 5 deje esa columna estable.
- **«Míos» es `leads_vista.en_cartera`**, no `telefono_visible`: las dos son `en_cartera(id)` hoy, pero
  una dice «de mi cartera» y la otra «veo el teléfono»; atarlas por casualidad rompería el listado el día
  que el teléfono dependa de otra cosa. «Todos» no suma condición: lo que hay lo decide la RLS de `leads`.
  Con «ver como», `sesion.permisos` son los efectivos del rol: un rol con «propios» fuerza «míos» (y el
  drawer no muestra un lead ajeno). La RLS sigue con los permisos reales: es la UI, no la base, la que
  simula (como en vehículos, donde las filas de una pestaña no se acotan).
- **La búsqueda es por nombre y por número (`#124`), nunca por teléfono:** buscar dígitos sobre lo ajeno
  sería un oráculo para saber si un número ya está cargado (lo que `verificar_telefono` ya acota). El
  texto entra a `or()` por `citar(patronContiene())`; `%`, `_`, `*`, coma, paréntesis y comillas son
  texto.
- **Filtrar por un privado teniendo «todos» sólo encuentra lo propio, y se dice:** la ayuda bajo el filtro
  («Solo busca en tus leads…») y una línea sobre el resultado, sólo para quien ve «todos». En la tabla,
  la celda de un privado ajeno dice «Solo la cartera», no un guion que haría creer que no hay dato.
- **Un filtro de la URL que ya no vale se dice** (campo desactivado, no filtrable o inexistente) y se
  quita con «Entendido»; antes `leerFiltros()` lo tiraba en silencio y la vista parecía vieja sin
  explicación.
- **El drawer lee desde el navegador** (`leads_vista` con la sesión de quien mira) y relee al volver a la
  pestaña: no pide una página entera al servidor para cada vistazo y puede decir «ya no está
  disponible» si le quitaron el acceso mientras tanto, con el mismo texto para papelera, limbo y
  revocación. Se dibuja primero con la fila de la página. No tiene enlace a la ficha: llega con ella.
- **De `atributos` el listado sólo pide las claves `en_tabla`** (alias `a_<clave>`), validadas contra el
  formato de clave de la base antes de armar la consulta; el drawer pide todos los que le llegan.
- **El estado vacío por filtro usa el compartido** («Nada coincide con los filtros»), no un texto propio.
  **Costo:** una pantalla más que depende de `equipo` (vistas) y de la composición de `app/`; el drawer
  tiene una lectura propia en el navegador (`infra/lead-rapido.client.ts`).

## 2026-10-14 — `alcance_de()` y `atributos_lead()` más baratas: lo que midió el listado

**Contexto:** `DECISIONES` (2026-10-14, «filtrar es leer») dejaba sin medir el costo de filtrar por un
atributo, que pasa por `atributos_lead()` en cada fila. Con 2.000 leads sintéticos, en una transacción
revertida, tardaba **~850 ms** (0,43 ms por fila): la RLS ya era barata (InitPlan, 12 µs por fila); el
costo estaba en `alcance_de()`, que materializaba los ~75 permisos de una dueña en cada llamada
(`mis_permisos()`), dos veces por fila.
**Decisión:** `alcance_de()` lee `usuarios_roles ⨝ roles_permisos ⨝ perfiles` con la clave en el WHERE y
una pasada (8 veces más rápida) y `atributos_lead()` resuelve alcance, vida, limbo y cartera en una
llamada y una lectura. **Misma semántica**, y un caso de `humo.sql` compara `alcance_de()` con
`mis_permisos()` para cada permiso y origen y varias personas, porque la regla ahora está en dos
lugares. Resultado: página sin filtro ~30 ms, con un atributo ~180 ms, búsqueda por nombre ~30 ms,
«propios» con 50 de 2.000 ~10 ms (antes 47, 887, 45 y 64 ms).
**Costo y lo que sigue:** sigue siendo 0,08 ms por fila en cada filtro por atributo (lineal: ~0,8 s con 10 mil
leads «todos»). La medición con 5 a 10 mil queda para la Fase 9; si pesa, el listado pasa a una función
`definer` que recorta una vez por consulta. El plan no usa `leads_listado_idx` para la página sin
filtro con 2.000 filas (sort sobre un `Seq Scan`); sí lo usa por cursor. Con más filas hay que volver a
mirar. La medición consume 2 ids de la identidad de `actividad` por corrida (los inserts de usuarios):
huecos de numeración, sin filas.
**Una migración sobre la base viva:** con cuentas reales en la base local, los cambios van con
`supabase migration up` (aplica sólo lo pendiente), no con `db:reset`.

## 2026-10-14 — La guardia de los e2e no respalda la base, y un respaldo viejo puede pisar un cambio

_Reemplazada más abajo: «El e2e completo parte de un reset, la guardia sólo comprueba las funciones, y el atajo de la pantalla gana» (2026-10-15)._

**Contexto:** se revisó qué cubre exactamente la guardia (`e2e/soporte/guardia.ts`) antes de apoyarse en
ella con cuentas reales en la base local.
**Qué hace:** respalda **sólo** la fila de apibara de `integraciones` (`activa`, `config` y
`secreto_guardado_en`, nunca la clave) en `e2e/.estado/respaldo.json` (ignorado por git); al terminar la
repone, comprueba que la clave de Vault siga y borra los leads `E2E …`. No respalda leads, cuentas ni
campos: esos los limpian los propios specs.
**Tras un `kill -9`:** el archivo queda; la corrida siguiente lo repone **antes** de tomar uno nuevo y
avisa. Los leads `E2E …` que quedaron se borran recién al final de esa corrida. Qué hacer: volver a
correr `pnpm test:e2e` (o borrar `e2e/.estado/respaldo.json` si cambiaste apibara a mano y no querés
que se reponga).
**Riesgo anotado, sin construir nada:** **sí**, restaurar un respaldo viejo pisa un cambio hecho a mano
entre corridas. La reposición no mira `creadoEn` ni compara con lo que hay: si encendés apibara o
cambiás su configuración en Integraciones después de un `kill -9` y antes de la corrida siguiente, el
setup lo pisa con el estado viejo (sólo un `console.warn`); pasa igual con un cambio hecho _durante_ una
corrida, que el teardown deshace. `secreto_guardado_en` vuelve con la fecha vieja: si la clave se
cambió en el medio, la fila queda con una marca que ya no es la de Vault; si se borró, dice que hay una
que no hay. Mitigación posible (no hecha): comparar `actualizado_en` de la fila con `creadoEn` del
respaldo y, si es posterior, no pisar y avisar.

## 2026-10-14 — La versión de un lead la mueve lo que la ficha edita, y nada más

**Contexto:** `leads.actualizado_en` es la versión con la que se edita la ficha, y la movía cualquier
`update`, entre ellos el trigger de `seguimientos` que escribe `ultimo_seguimiento_en`: cada seguimiento
nuevo le habría dado un conflicto a quien editaba. La auditoría genérica además guardaba la fila entera
(con `telefono_principal`) y `_conflicto_de_edicion()` nombraba a quien hubiera dejado la última fila de
`actividad` del lead, fuera compartir, transferir o un seguimiento.
**Decisión:** `lead_version()` (BEFORE UPDATE) mueve la versión sólo si cambió nombre, tipo, origen,
atributos, teléfono (principal o su código) o la papelera (`eliminado_en`, `lote_papelera_id`); si no,
repone la anterior. **No la mueven:** `ultimo_seguimiento_en` (ni lo derivado que sume la parte 5), la
cartera (compartir, transferir, revocar, baja) ni `creado_por`. Adoptar del limbo la mueve sólo si
completa el origen o los atributos (entonces sí cambió la ficha). Se sella con
`greatest(clock_timestamp(), anterior + 1 µs)`: dos ediciones en una transacción tienen versiones
distintas. **Transferir mientras otra persona edita no le da conflicto:** no cambia nada de lo que edita;
si por eso quien edita pierde el lead, `lead_guardar()` lo dice al guardar («No encontramos este lead o
no tienes acceso.»); si entra a otra cartera, el trigger de privados decide qué puede cambiar.
`lead_auditar()` reemplaza a `auditar()` en `leads`: nunca guarda `telefono_principal` y sólo escribe
cuando la versión se movió (un seguimiento no deja fila). `_lead_conflicto()` nombra al actor de la última
`leads.update`: lo que cambió la versión, no cualquier cosa del lead.
**Alternativas:** una columna `version` aparte (otra cosa que mantener, y toda RPC existente ya habla
de `actualizado_en`); que el trigger de seguimientos restaure la versión después (dos escrituras).
**Consecuencia:** una columna derivada nueva se suma fuera de la lista de `lead_version()`. El humo
prueba que un seguimiento, compartir y transferir no la mueven, que la papelera sí y a quién nombra el
conflicto. `_leads_columnas_a_atributos()` (de una migración vieja) se recreó con los triggers nuevos.

## 2026-10-14 — `lead_guardar` es la única puerta, y los atributos viajan como parche

**Contexto:** `leads` tenía `grant update (nombre, tipo, origen_lead_id)` y una policy: un `.update()` del
navegador saltaba la versión. Mandar los atributos enteros, como hace vehículos, habría pisado los
privados de quien edita sin estar en la cartera (no los recibe).
**Decisión:** `lead_guardar(p_lead, p_actualizado_en_esperado, p_cambios)`; `leads` queda sin UPDATE
para la app. `p_cambios` lleva sólo `nombre`, `tipo`, `origen_lead_id` y `atributos`, que es un parche:
`{clave: valor}` pone o cambia y `{clave: null}` quita; lo que no se nombra no se toca. La versión es
obligatoria; lo que ya está guardado no es un conflicto (un reintento no choca consigo mismo).
`atributos` va siempre en el `SET`: el trigger del layout se dispara por columna nombrada, así que un
requerido que se sumó después falta aunque sólo cambie el tipo, que es lo que promete el aviso de
impacto de Configuración («no podrán guardarse hasta completarlo»). El origen sólo se valida si
cambia: uno apagado que el lead ya tiene se conserva; pasar a otro apagado se rechaza con el campo en el
`hint`. Un campo desactivado con dato se conserva y no se cambia (el parche no lo nombra y el trigger
acepta lo que no cambia). Inexistente, limbo, papelera y sin acceso responden el mismo mensaje y el mismo
código (`42501`); sólo quien ya ve el lead recibe «No tienes permiso para editar este lead.».
**Qué cubre y qué no:** el teléfono y los extras no pasan por acá (parte 4b), así que un requerido nuevo
no frena cambiar un teléfono; frena guardar la ficha.
**Alternativas:** mandar el estado entero de `atributos` (pisa lo que no se recibe); una RPC por campo.

## 2026-10-14 — Los teléfonos de un lead se leen por función, y `telefono_lead()` da nulo a quien no ve

**Contexto:** RLS no esconde columnas. `leads_telefonos` se leía directo con la policy de «ver el lead»,
sin enmascarar, y `telefono_lead(id)` daba el número enmascarado de cualquier id, también de leads que
la persona no ve.
**Decisión:** la tabla queda sin grant ni policy para la app (RLS encendida): se lee por
`lead_telefonos(p_lead)` (definer), que da el número completo a la cartera, enmascarado al resto y
nada a quien no ve el lead. Una función y no una vista: una vista `security_invoker` necesitaría el grant
sobre la tabla. `telefono_lead()` pasa a plpgsql con la forma de `atributos_lead()` (un `alcance_de` y una
lectura) y devuelve nulo si no se ve el lead (sin `leads.ver`, «propios» fuera de la cartera, limbo,
papelera o inexistente). La tabla suma `creado_en`, formato `^[0-9]{7,15}$`, etiqueta de 1 a 40 y
`unique (lead_id, telefono)`; no suma `creado_por` (una FK más sin índice; la constancia en `actividad`
lleva quién). Nadie leía la tabla: no hubo código que cambiar.
**Lo que cierra a la vez:** `leads_asesores` la lee entera quien ve el lead; ahora, quien no está en la
cartera sólo ve la fila del dueño («Lo tiene X»), no con quién está compartido.
**Medido** con 2.000 leads sintéticos en una transacción revertida: página sin filtro 13,5 ms (antes
~30), filtro por un atributo 119 ms (antes ~180), búsqueda por nombre 15 ms, «míos» 32 ms, `lead_ficha()`
5,9 ms.

## 2026-10-14 — Teléfonos extra y cambio del principal: las reglas (para la parte 4b)

**Decisión (los extras):** no se verifican contra otros leads: son alternos y no tienen unicidad. Hasta
10 por lead. Un duplicado dentro del mismo lead, o igual al principal, se rechaza junto al campo («Ese
número ya está en este lead»). La etiqueta es opcional: vacía se guarda nula y la ficha muestra sólo el
número. Agregar es idempotente por id; quitar lleva «Deshacer». Se normalizan con la función y el código
de país del alta.
**Decisión (el principal):** `cambiar_telefono_lead(p_lead, p_actualizado_en_esperado, p_cc, p_tel)`
reemplaza a la de tres parámetros (que no llevaba versión, pedía `leads.editar` sin mirar la cartera,
guardaba el código crudo, daba un duplicado como excepción y no dejaba constancia). Sólo la cartera. Un
número que ya existe (mío, de otro o en limbo) es un **valor**, dicho como en el alta, sin cambiar nada y
sin adoptar; el mismo número es «sin cambios» (también el reintento). El anterior queda como extra con
la etiqueta «Anterior» (si ya era extra no se duplica; si el nuevo era extra, sale de los extras).
Constancia `lead.telefono_cambiado` con los dos números enmascarados: la auditoría ya no deja el número en
un diff legible. La verificación al tipear es `verificar_telefono_de_lead(p_lead, p_cc, p_tel)`: exige la
cartera, se excluye a sí misma y reusa `_lead_verificar()`; el campo del alta se generaliza.

## 2026-10-14 — La ficha: tres lecturas, el código de país del lead y el tope de KB

**Decisión:** abrir la ficha son tres lecturas de datos, en paralelo y sin caché: `lead_ficha()` (la fila
de `leads_vista`, quién lo tiene y los extras, todo recortado según quien mira; nulo si no se ve), el
layout y los orígenes (también los apagados). No se lee `ajustes_empresa`: el número se parte con el
código que guardó el lead (`leads.telefono_cc`, sólo cuando es el de la empresa), así que un extra de
otro país se ve «+54…» sin partir, como en el listado. El layout **no** está cacheado (la lectura
necesita la sesión: `anon` no tiene grant sobre `leads_campos` y el cliente admin está prohibido fuera
de `conAdminDeAuth()`), y la ficha se dibuja por request: abrirla desde el drawer rápido no muestra
datos viejos. Al volver a la pestaña con el panel cerrado se vuelve a leer; con el panel abierto no, para
no reiniciar lo que se escribe. Un test cuenta las lecturas. Quien edita sin la cartera no recibe los
privados, así que el panel no los ofrece y lo dice; la base tampoco le deja cambiarlos.
**Medido (e2e, build de producción):** el documento de la ficha pesa ~104 KB, de los cuales ~29 KB son
de la ficha (el shell de otra pantalla pesa ~75 KB), y navegar desde el listado transfiere ~33 KB de
payload RSC (suma la precarga). El terreno tiene un campo de 60 opciones: un layout típico es más
liviano. El tope del e2e es 40 KB para cada número, y no el de 60 KB del documento entero que se supuso
antes de medir.

## 2026-10-14 — Tachados y claves de campo en la URL: no hay choque y no se reserva la clave

**Contexto:** el layout real de la base local ya tiene un campo propio con clave `tachado`, y la parte 5
trae el estado «tachado» de cada persona y su filtro de 3 estados.
**Revisado:** los campos van en la URL con el prefijo `a.` (`PREFIJO_DE_FILTRO`): el campo es
`a.tachado`, y el filtro de tachados será `?tachados=` (o como se llame), sin superponerse. En la vista,
la columna es `leads_vista.esta_tachado` y el alias de tabla de un campo es `a_tachado`.
**Decisión:** no reservar la clave en `CLAVES_RESERVADAS_DE_LEAD` (rompería un campo que ya existe) y
no prefijar más los filtros. El choque es de nombre en la pantalla: el campo privado «tachado» y el estado
por persona «tachado» se leerían igual. La parte 5 le pone al estado un nombre que no se pise (el del
glosario) y lo avisa; si hiciera falta, se renombra la **etiqueta** del campo, que es un dato de quien lo
creó. ESTADO lo ubica en la parte 5 (donde llegan los tachados); el pedido lo pensaba en la 6.

## 2026-10-14 — Teléfonos de la ficha: cómo se aterrizó la 4b

**Contexto:** las reglas ya estaban escritas («Teléfonos extra y cambio del principal»). Al
contrastarlas con la base apareció que `cambiar_telefono_lead(uuid, text, text)` pedía `leads.editar`
sin mirar la cartera: quien tiene «todos» podía cambiar el teléfono de un lead ajeno llamando a la RPC.
**Decisión (el principal):** `cambiar_telefono_lead(p_lead, p_actualizado_en_esperado, p_cc, p_tel)`
va en este orden: acceso, normalizar, igual al principal (`sin_cambios`, **antes** de mirar la versión,
porque el reintento tras una respuesta perdida llega con la de antes), un número que ya existe como valor,
versión (`PT409`), escribir. El «Anterior» siempre entra: **el tope de 10 lo aplica «agregar»**, no el
cambio (rechazar un cambio de teléfono porque hay 10 extras no tiene explicación para quien lo pide). El
código de país es el del lead (`leads.telefono_cc`); si es nulo —el número no era el de la empresa— **no se
adivina** y se pide el número con «+», así la ficha no lee los ajustes de la empresa.
**Decisión (los extras):** `lead_telefono_guardar` es un upsert por id (agrega, rotula y restituye) y
`lead_telefono_quitar` devuelve lo quitado. **No llevan versión** (excepción a la regla de versión
obligatoria): operan sobre una fila, son idempotentes por id y una versión sólo daría conflictos falsos
entre dos personas que agregan números distintos; la integridad (único por lead, tope) la dan el índice y
el bloqueo de la fila del lead, sin cambiarla. «Deshacer» restituye con el mismo id, etiqueta y
`creado_en` (la base lo acota a ahora); si entretanto ese número ya está, se rechaza como duplicado.
**Decisión (el aviso):** un número libre que es teléfono extra de otro lead avisa sin bloquear
(`_lead_verificar(p_tel, p_excluir)` → `alterno`, con la misma regla de qué se dice que el principal; un
lead en limbo no se nombra) y pide `leads_telefonos(telefono)`. La interfaz dice «teléfono extra», el
nombre del glosario, no «alterno».
**Decisión (la interfaz):** el cambio vive en `?panel=cambiar-telefono`, la misma clave que la edición:
no pueden estar abiertos a la vez, y aun así «Cambiar» se deshabilita con el motivo. No hace falta releer
la versión al abrir la edición: el cambio hace `revalidatePath` dentro de su action y la versión viaja en
la misma respuesta. Los extras no revalidan: la respuesta trae la lista (≤ 10 filas) y la pantalla la pone
en su lugar; el estado local se vuelve a sembrar sólo si cambian las props.
**Consecuencia:** una petición por acción. `puedeCambiarTelefonoDeLead()` (cartera y `leads.editar`) es
distinto de `puedeEditarLead()`. El humo prueba las cuatro RPC sin cartera, incluida la dueña con «todos»;
el e2e, la pantalla y la llamada a mano con su sesión.

## 2026-10-15 — El e2e completo parte de un reset, la guardia sólo comprueba las funciones, y el atajo de la pantalla gana

**Contexto:** la base local dejó de ser sagrada (decisión del dueño del proyecto: se pierden su cuenta,
sus leads de prueba, su layout y sus ajustes de Empresa, y los vuelve a crear) y no va a cargar una clave
real de apibara en desarrollo. Lo que la guardia de los e2e protegía (la clave y la fila de apibara, las
cuentas reales, los leads `E2E …`) ya no existe, y `empresa.spec` y cuatro pruebas del equipo vacío
quedaban fuera de lo que corría una persona con cuentas reales. **Reemplaza** a «La guardia de los e2e»
y a «La guardia de los e2e no respalda la base» (2026-10-14).
**Decisión (cómo se corre):** `pnpm test:e2e:completo` comprueba con `OPTIONS` que `apibara` y `storage-gc`
estén servidas, hace `db:reset` y corre todo con `E2E_COMPLETO=1`, que convierte en error las pruebas que
exigen el equipo vacío (antes se saltaban). Es lo que vale como «el e2e pasa». `pnpm test:e2e <spec>`
sigue corriendo un spec suelto sobre la base como esté, con datos.
**Decisión (la guardia):** queda una sola cosa: fallar en segundos, diciendo qué correr, si las funciones
edge no están servidas (`e2e/soporte/guardia.ts`, ~40 líneas en vez de ~120). Se retiran el respaldo en
disco de apibara, su reposición, el teardown que borraba los leads «E2E …» y el chequeo de la clave de
Vault; con el respaldo desaparece el riesgo de que uno viejo pisara un cambio hecho a mano. Los specs
siguen dejando limpio lo suyo (la empresa es una fila única y el spec que sigue la comparte).
**Decisión (apibara y credenciales):** la integración queda apagada y sin clave; todo lo de apibara se
prueba con `e2e/fixtures/apibara/` y la función interceptada. Ningún e2e lee ni guarda la clave real
(`empresa.spec` ya no pasa por `integracion_secreto`). Probarla con una clave real es un pendiente de
**antes de desplegar** (`docs/ESTADO.md`).
**Decisión (la intermitencia de móvil):** no era la transición de página ni se arregla con
`reducedMotion`: sin `ViewTransition` y con `reducedMotion: 'reduce'` seguía fallando. Un documento recién
pedido trae, unos 300 ms (el respiro con que React revela un Suspense), el contenido de cada frontera dos
veces: la copia visible y un `<div hidden id="S:n">`. Los locators de Playwright cuentan lo oculto y un
`getByText` estricto que cae en esa ventana falla sin reintentar. Para una persona no hay nada que ver, y
no hay código de la app que lo cause. La corrección es de las pruebas, una sola vez: `soporte/prueba.ts`
exporta el `test` con `goto` y `reload` que esperan a que no queden contenedores `S:` (los `<template
id="B:n">` no sirven: una frontera que se dibuja en el cliente deja el suyo para siempre). `retries`
sigue en 0.
**Decisión (un cambio de producto, el único):** esa espera dejó ver que, pasada la primera fracción de
segundo, la tecla `N` en el inventario abría «Nuevo lead» y no «Nuevo vehículo». `ProveedorAtajos`
responde el último registrado y el orden de registro es el de hidratación, no el del árbol: el alta de
leads del marco vive detrás de su propio Suspense y hidrata después de la pantalla. Antes los e2e
pulsaban demasiado pronto para verlo. `useAtajo` suma `{ respaldo }` (sólo responde si nadie más
registró el atajo) y el alta de leads registra así su `nuevo` mientras está cerrada. Commit propio.
**Costo de la opción elegida:** cada corrida completa borra los datos de desarrollo y la sesión de
`next dev`, y dura ~11 minutos (build, reset y 280 pruebas). **Una base de pruebas aparte** (un segundo
`supabase start` con otro `project_id` y otros puertos, y su `.env`) mantendría viva la de desarrollo a
cambio de ~1,8 GB más de RAM (medido: los 12 contenedores del stack actual suman 1.781 MiB, 575 sólo
`analytics`), unos seis puertos propios, ~1 minuto de arranque y una segunda configuración que mantener;
las imágenes se comparten. Conviene si la corrida completa pasa a ser diaria o si alguien más
desarrolla sobre la misma máquina. No hace falta todavía.

**Propuesta, sin aprobar — política de migraciones** (relaja «Migraciones sobre una base viva», 2026-10-14):
con `db:reset` disponible, una migración nueva **y sin commitear** se corrige en el archivo y se resetea;
ya no hace falta que sea idempotente (`if not exists`, bloques `do`) ni usar `supabase migration up` /
`migration repair`. **No cambia:** el esquema se edita en `supabase/schemas/`, se corre `pnpm db:base` y
se agrega una migración nueva; las ya commiteadas no se editan; `pnpm db:probar` prueba el camino desde
cero; un permiso o catálogo nuevo lleva su `insert … on conflict` en la misma migración (la nube no
vuelve a correr el seed); y el relleno de datos de una columna nueva sigue escrito para una base con
filas, porque la nube las tendrá. Desde el primer `db push` ninguna se corrige: se agrega otra.

**Aprobada (2026-10-15, en el pedido de la parte 5):** la política de migraciones de arriba queda vigente.

## 2026-10-15 — Seguimientos y recordatorios se escriben sólo por RPC, y actuar exige la cartera

**Contexto:** las policies directas tenían huecos que la ficha no decía. Con `leads.editar` «todos» se
anotaba en un lead ajeno sin estar en la cartera; el UPDATE de un seguimiento sólo pedía ser su autor,
así que dejaba moverlo a **cualquier** lead (también uno que no se ve), pasarlo a un tipo apagado o
«borrarlo» a mano. El de un recordatorio no miraba el lead y dejaba escribir `notificado_en`. El SELECT
de seguimientos dejaba a quien ve «todos» leer los privados de todos.
**Decisión:** las dos tablas quedan de sólo lectura para la app. Las escriben `seguimiento_crear|guardar|
eliminar|restaurar` y `recordatorio_crear|guardar|completar|eliminar|restaurar` (y `crear_lead`). Cada una
es idempotente por `p_id` generado en el cliente y la de edición pide `p_actualizado_en_esperado`. La
versión la sella la RPC con la hora del reloj (sin `trg_actualizado_en`). Actuar sobre un lead pasa por
`_lead_mio()`: `leads.ver`, `leads.editar` **y** la cartera. Cualquiera que falte, el limbo, la papelera o
un lead inexistente dan **el mismo** `42501` «No encontramos este lead o no tienes acceso.» (sin
oráculo). `_lead_de_cartera()` de la 4b no se reutilizó: su mensaje habla de teléfonos y distingue «lo ves
pero no es tuyo»; la parte 6 los unifica al auditar. Editar, eliminar y restaurar un seguimiento: sólo
su autor, y sólo con el lead en la cartera (si se la revocan, deja de poder corregirlo). Un recordatorio
es de su dueño: uno ajeno «no existe» (`No encontramos este recordatorio.`).
**Alternativas:** cerrar las policies con más condiciones (la lógica de tipo activo, fecha y cartera en
una `with check` no se lee ni se prueba bien); permitir editar a cualquiera de la cartera (un co-asesor
corrigiendo la nota de otro, sin rastro de quién dijo qué).
**Consecuencia:** el humo prueba las RPC sin cartera, con la dueña con «todos», en limbo, en la papelera e
inexistente, y que la escritura directa da `permission denied`; el e2e, la RPC llamada a mano con la sesión.

## 2026-10-15 — Privado es sólo de su autor; ni el co-asesor ni «todos» leen lo privado ajeno

**Decisión:** un seguimiento nace privado. Privado = sólo lo ve su autor; público («Visible para el
cliente», sin nombrar el portal) = lo ven quienes ven el lead y el portal. Se quitó el `or alcance =
'todos'` del SELECT: quien ve «todos» sin la cartera lee lo mismo que un co-asesor, como pasa con el
teléfono y los campos «solo la cartera». La pantalla no insinúa lo que no se ve: «Seguimientos» va sin
número, `lead_seguimientos()` no cuenta y la ficha no muestra «último seguimiento» (la fecha derivada
sigue en el lead, para la bandeja de «leads sin seguimiento»).
**Alternativas:** que «todos» lea los privados para supervisar (si hace falta, será un permiso propio y
explícito, no un efecto de `leads.ver`).

## 2026-10-15 — El detalle viaja como documento del editor, nunca como HTML

**Contexto:** una RPC es llamable sin pasar por la action: sanear sólo al escribir desde el servidor de
Next se evade. Postgres no tiene un parser de HTML (plv8 y plpython no están en Supabase) y un saneador
por expresiones regulares se esquiva (anidado, entidades, mutación del DOM).
**Decisión:** el editor (Tiptap) manda su documento (JSON de ProseMirror). La base lo valida contra una
lista blanca en plpgsql (`_seguimiento_detalle()`): nodos `doc`, `paragraph`, `text`, `hardBreak`,
`bulletList`, `orderedList` (sólo `start`) y `listItem`; marcas `bold`, `italic` y `link` (sólo `href`,
`http`, `https`, `mailto` o `tel`, sin espacios ni caracteres de control, ≤ 2000); profundidad ≤ 6 (dos
niveles de lista), ≤ 20 KB medido como lo escribe la base y ≤ 5000 caracteres de texto. Lo que no está
**se rechaza** (`22023`, hint `detalle`), no se recorta en silencio; un documento sin texto es «sin
detalle». La base deriva `detalle_texto` (búsqueda, portal y respaldo). La pantalla dibuja con la misma
lista y React (`DocumentoDeSeguimiento`), sin `innerHTML`; un enlace sale con `rel="noopener noreferrer
nofollow"` y `target="_blank"` sólo si es web; un nodo desconocido se dibuja como su texto, y un
documento que no pasa la lista cae al texto plano. `entities/documento.ts` es el espejo y un test corre
la función SQL en PGlite sobre la misma tabla de casos (`documento.casos.ts`). Se quitaron
`seguimientos.detalle_html`, `recordatorios.detalle_html` y la dependencia `sanitize-html`, que nadie
usaba; entró `seguimientos.detalle_doc`.
**Alternativas:** HTML saneado con `sanitize-html` en la action y otra vez al dibujar con DOMPurify (dos
saneadores que mantener y la RPC directa sin defensa); HTML más un `check` por regex en la base.
**Costo:** ~250 líneas de plpgsql, el espejo con su tabla de casos y el renderer. El alta sigue con su
textarea (no carga Tiptap ni cambia la tarea de oro): sus seguimientos se dibujan como texto y, al
editarlos, el editor arranca con un párrafo por línea.

## 2026-10-15 — El editor: carga diferida, atajos del marco y borrador en la pestaña

**Decisión:** Tiptap (`StarterKit` con encabezados, código, citas, tachado, subrayado y regla
apagados, y `Link` con la lista de protocolos) se pide con `next/dynamic` recién al abrir el redactor:
la ficha no lo paga para mostrar la línea de tiempo (medido: la ficha aporta 31,8 KB al documento, bajo el
tope de 40). El editor es un solo chunk de 388 KB (122 KB con gzip) que se pide al abrir el redactor:
**tope 130 KB con gzip**; si lo pasa, se cambia `StarterKit` por las extensiones sueltas. `Ctrl/Cmd+Enter` guarda (se le quitó a `hardBreak`; el salto es `Shift+Enter`) y `N` no se
dispara adentro (`ProveedorAtajos` ignora `isContentEditable`). El borrador va en `sessionStorage`
(`useBorradorDeEstado`), por lead al anotar y por seguimiento al editar: sobrevive a recargar y a
cambiar de pantalla, no a cerrar la pestaña, como el resto de los formularios; una nota privada no
queda en un equipo compartido. Con un borrador, el redactor arranca abierto (se mira una sola vez al
montar: releerlo mientras se repone lo cerraba). Anotar y editar son en línea, sin `?panel=` (como los
teléfonos extra): no chocan con el panel de edición de los datos.

## 2026-10-15 — Recordatorios: crear exige la cartera; si se pierde el lead, sigue sin él

**Decisión:** crear uno sobre un lead exige tenerlo en la cartera (`recordatorio_crear` acepta también
uno sin lead, personal, para la agenda de la Fase 7). Si después se pierde el acceso, el recordatorio
sigue siendo de su dueño y `recordatorios_vista` (invoker) lo entrega con el lead nulo; lo puede editar,
completar y eliminar igual. Completar es «poner» (`p_completado`): repetirlo es `sin_cambios`, `false`
lo reabre. Cambiar la hora exige que sea futura y le pone `notificado_en = null` para que vuelva a
avisar; cambiar sólo el título de uno que ya pasó no pide otra hora. Eliminar es lógico
(`recordatorios.eliminado_en`) con «Deshacer». La ficha lee los vencidos propios en `lead_ficha()`
(`recordatorios_vencidos`, sin otra lectura) y los avisa arriba. Un seguimiento puede llevar su
recordatorio en la misma transacción, como el alta.
**Fuera de esta parte:** el disparo a su hora (`recordatorios_notificar()` existe y nunca se programó) y el
push (Fase 7); que esa notificación no nombre un lead que su dueño ya no ve.

## 2026-10-15 — Un seguimiento no mueve la versión del lead; la actividad deja constancia sin contenido

**Decisión:** `ultimo_seguimiento_en` sigue fuera de `lead_version()`, y su trigger corre sólo si
cambian `ocurrido_en`, `eliminado_en` o `lead_id` (antes reescribía la fila del lead al corregir un
título). Es el máximo de los vivos: eliminar el último lo devuelve al anterior. Los seguimientos dejan
`lead.seguimiento_creado|editado|eliminado|restaurado` con `{seguimiento, tipo, visibilidad}`, sin título
ni detalle; pasar a «Visible para el cliente» queda en el `editado`. Recordatorios, favoritos, tachados y
etiquetas no dejan nada. `ocurrido_en` puede ser pasado, no futuro (5 minutos de margen por los relojes;
la pantalla no da margen). El humo y el e2e prueban que anotar con la edición abierta en otra pestaña
no da conflicto.

## 2026-10-15 — Parte 5 partida en 5a y 5b; el diseño de la 5b

**Decisión:** la 5a (seguimientos y recordatorios) se hizo en esta sesión; la 5b (favoritos, tachados
y etiquetas, con el listado y la medición) va en la siguiente, con lo ya decidido:

- **Dónde:** cabecera de la ficha y un menú «⋯» por fila (en el celular la tarjeta separa la zona que
  abre el drawer del botón del menú). El drawer muestra el estado, sin acciones.
- **Filtros:** `DefFiltro` suma una `seccion` («Tus marcas», con «Solo las ves tú», arriba; «Datos del
  lead» debajo, donde queda el campo propio `a.tachado` con su etiqueta) y un tipo `eleccion` con valor
  por defecto que no se escribe en la URL: `?tachados=` `ocultar` (por defecto) · `incluir` · `solo`;
  `?favoritos=si`; `?etiqueta=<id>,<id>` («cualquiera de»). Entran solos en las vistas guardadas; «ver
  como» no los toca (son de quien mira de verdad).
- **Orden:** ni favoritos ni tachados reordenan (el keyset `(creado_en, id)` no cambia); «el tachado va
  al final» se reemplaza por «oculto por defecto».
- **Etiquetas:** nombre 1 a 30, hasta 50 por persona y 20 por lead, `unique (usuario_id,
lower(nombre))`, color de una paleta cerrada guardado como clave, `actualizado_en`, y borrar una con
  leads pide confirmar diciendo a cuántos toca.
- **RPC:** `poner(valor)`, no alternar; exigen **ver** el lead (no la cartera), y lo que no se ve
  responde como inexistente.
- **Medición:** `supabase/tests/medir-listado.sql` committeado, con 2.000 leads sintéticos.

## 2026-10-15 — Un corte del runtime local de funciones se vuelve a pedir, con una sola regla

**Contexto:** en una corrida completa, `vehiculos-apibara-funcion.spec.ts` falló en móvil porque la
segunda de dos llamadas volvió con `data: null`. El registro del runtime dijo `connection aborted` a los
35 ms y el gateway contestó 503 sin cuerpo: la función nunca respondió. La guardia ya toleraba ese
corte con su propio bucle; el spec no.
**Decisión:** `e2e/soporte/funciones.ts` (`pedirAFuncion`) es la única definición de «sin respuesta» (el
pedido no llegó, o el gateway contestó 502, 503 o 504 **sin cuerpo**) y de la espera entre intentos (0,5
s). La usan la guardia y el spec. Hasta 3 intentos (la guardia, 4), nunca ante una respuesta de la
función (las nuestras contestan siempre con un cuerpo), una línea `[funciones] reintento: …` por cada
reintento en la salida, y «la función no respondió» si se agotan. El spec llama con `fetch` y el token de
la sesión en vez de `functions.invoke`, que escondía el corte como `data: null`.
**Consecuencia:** la guardia ya no insiste ante un 404 (la función no está servida): falla al primero.

## 2026-10-15 — Las marcas se escriben sólo por RPC, y marcar exige ver el lead (no la cartera)

**Contexto:** favoritos, tachados y etiquetas se escribían directo con RLS: el UPDATE de `etiquetas` dejaba
cualquier nombre o color (un hex libre), sin tope, sin versión y con un `unique (usuario_id, nombre)`
que distinguía mayúsculas.
**Decisión:** las cuatro tablas quedan de sólo lectura (cada quien las suyas) y las escriben seis RPC
(`…20261015000200_marcas_de_leads.sql`). `lead_favorito_poner`, `lead_tachado_poner` y
`lead_etiquetas_poner` son **«poner(valor)»**: repetir da `sin_cambios`, así un doble clic o un reintento
no deja la marca al revés. Exigen **ver** el lead (`_lead_visible()`: `puede_lead(…, 'leads.ver')`), no la
cartera ni `leads.editar`: una marca es una nota para uno mismo, no un cambio del lead, y quien ve
«todos» también organiza lo ajeno. Lo que no se ve da el mismo `42501` que un lead inexistente,
**también al quitar** (la marca sigue en la tabla, es suya, y el lead no aparece). Las marcas no llevan
versión (operan por fila, como los teléfonos extra: una versión sólo daría conflictos falsos) y no
tocan `leads` (ni versión, ni auditoría, ni `actividad`). Las etiquetas sí llevan versión al
renombrar, recolorear y eliminar (`PT409` «Cambiaste esta etiqueta … desde otra ventana»); crear es
idempotente por id (así «Deshacer» de un borrado la recrea con el mismo id) y eliminar una que ya no
está responde `sin_cambios` (la otra pestaña no falla y lo ajeno no se distingue de lo borrado). Una
etiqueta ajena o inexistente se rechaza igual: nunca se dice que existe. `lead_etiquetas_poner` pone o
quita **esas**, nunca reemplaza el conjunto: dos pestañas no se pisan.
**Topes:** 50 por persona y 20 suyas por lead, con un candado de transacción **por persona**
(`pg_advisory_xact_lock(hashtextextended('etiquetas:' || uid, 0))`) que toman crear, eliminar y poner:
no compite con nadie más. Bloquear `perfiles` frenaría la edición del perfil y bloquear el lead, a los
otros asesores. La carrera la prueba un e2e (dos RPC a la vez a una del tope: entra exactamente una),
porque PGlite no tiene concurrencia.
**Índices:** no faltaba ninguno: el bucle de `…000900_indices.sql` ya había creado los de `usuario_id` y
`etiqueta_id` (ESTADO decía lo contrario). Un `(usuario_id, lead_id)` compuesto se midió y no mejora.

## 2026-10-15 — El listado lee las marcas como columnas de `leads_vista`; lo que midió

**Contexto:** el listado necesita, por fila, si quien mira lo marcó, y filtrar por eso, sin degradarse.
**Decisión:** columnas en la vista: `es_favorito` y `esta_tachado` ya existían (un `exists` por fila) y se
suma `etiquetas uuid[]` (las de quien mira). Los filtros son condiciones sobre ellas (`eq`, y
`overlaps` para «cualquiera de»). El plan las resuelve como _hashed SubPlan_: una lectura de las
marcas de la persona por consulta, no una por fila. Los nombres y colores de las etiquetas no viajan
por fila: la página lee una vez las de la persona (≤ 50).
**Alternativas medidas:** la semiunión explícita (`id in (select lead_id …)`) dio 20,4 ms contra 19,2 de la
columna y PostgREST no la expresa sobre la vista; una consulta aparte con los ids de la página sirve
para dibujar pero no para filtrar (ocultar los tachados tiene que ser en la base); una función que
recorte una vez por consulta es el cambio de la Fase 9, y estos números no lo piden.
**Números** (`pnpm db:medir`, 2.000 leads, mediana de 5; «antes» sin marcas, «hoy» como lo pide el listado):

| Consulta                                        | Antes  | Hoy         |
| ----------------------------------------------- | ------ | ----------- |
| Página sin filtro (hoy, tachados fuera)         | 19 ms  | 20 ms       |
| Un atributo                                     | 126 ms | 127 ms      |
| Búsqueda por nombre                             | 21 ms  | 22 ms       |
| Página 2 por cursor                             | 31 ms  | 33 ms       |
| Asesor «propios» (50 de 2.000)                  | 7 ms   | 8 ms        |
| Etiqueta «cualquiera de» 2                      | —      | 14 ms       |
| Conteo de ocultos sin filtros / con un atributo | —      | 12 / 119 ms |

En una de tres corridas el planificador eligió recorrer `leads_listado_idx` en orden y cortar en 51 (8 ms
la página, 22 ms con un atributo): depende de sus estimaciones y no se fuerza. La medición queda en
`supabase/tests/medir-listado.sql`, en una transacción revertida (deja huecos en la numeración).

## 2026-10-15 — Los tachados se ocultan, salvo mientras se busca; el aviso cuenta con los mismos filtros

**Decisión:** `?tachados=` es una «elección» con `ocultar` por defecto (no se escribe en la URL), `incluir` y
`solo`. **Con texto de búsqueda (nombre o `#número`) `ocultar` no se aplica:** buscar algo que sabes
que existe y no encontrarlo es peor que verlo, y sale con la insignia «Tachado» y el nombre atenuado;
`solo` explícito sí se respeta. Un aviso discreto cuenta los tachados **que cumplen los filtros
activos** y que quien mira ve (la RLS), así «Mostrarlos» trae exactamente esa cantidad; contar sin
filtros mentiría. Corre en paralelo con la página: sin un atributo suma 12 ms de trabajo y nada de
espera; con uno, la base hace el doble de trabajo pero la espera es la misma. Si la página queda vacía
sólo por los tachados, el vacío lo dice («Lo que coincide está tachado») en vez de «Nada coincide».
**Vistas y URL:** los filtros de marcas entran solos en las vistas guardadas (`parametrosDeFiltros()`),
que son personales (las cuatro policies de `vistas_guardadas` son `usuario_id = (select auth.uid())`):
una etiqueta ajena en una vista no puede pasar, y aunque pasara no filtraría nada (la columna sólo
trae las propias). Un id de `?etiqueta=` que ya no es de quien mira (borrado, ajeno o mal escrito) se
quita y lo dice el aviso de filtros que ya no valen, con «Entendido», que deja las que sí valen. Un
valor raro en `?tachados=` o `?favoritos=` vuelve al valor por defecto **sin decir nada**, como tipo y
origen. «Ver como» no los toca: son de quien mira de verdad.

## 2026-10-15 — Paleta de ocho claves en tokens; selector con cmdk; confirmar en la fila; sin atajo

- **Paleta:** `gris`, `rojo`, `naranja`, `ambar`, `verde`, `turquesa`, `azul`, `violeta`, guardadas como clave
  (check en la tabla, `_etiquetas_paleta()` y `CLAVES_DE_COLOR`: un test compara los tres). Cada una
  tiene `--etiqueta-<clave>` (el punto), `-soft` (el fondo) e `-ink` (el texto) en `design/tokens.css`,
  redefinidos en `.dark`; un test exige ≥ 4,5:1 de `-ink` sobre `-soft` en los dos temas. El nombre se ve
  siempre: nunca sólo el color. Ocho se distinguen sin depender del color; más no aportan. Sin elegir,
  toca la menos usada (la base lo decide, `colorSugerido()` es su espejo).
- **Dónde:** el selector (Popover con cmdk: buscar, marcar y crear con Enter; las coincidencias primero y
  «Crear «X»» al final, así Enter sobre lo que existe la marca y sobre algo nuevo la crea) está en la
  cabecera de la ficha y lo abre «Etiquetas…» del «⋯» de cada fila, anclado al mismo botón
  (`PopoverContent anchor`). «Gestionar etiquetas» es un diálogo con URL (`?panel=etiquetas`) que se abre
  desde el selector y desde la sección «Tus marcas» del panel; en el celular reemplaza la hoja de
  filtros (comparten `?panel=`). Eliminar una etiqueta con leads **confirma en la misma fila** diciendo a
  cuántos toca: un `<Confirmar>` sería un modal sobre otro. Sin leads se elimina y se ofrece «Deshacer».
- **Accesibilidad:** «Favorito» y «Tachado» son interruptores con `aria-pressed` y nombre fijo; el «⋯» es
  el menú de base-ui (Enter, flechas, Esc), 44 px en el celular, y en la tarjeta es hermano de la zona
  que abre el drawer. **Sin atajo para favorito:** no habría dónde descubrirlo (la lista `?` no se
  dibuja) y la estrella está a un Tab; se reconsidera con esa lista. Nada roba la `N`.
- **Filtros con secciones:** `DefFiltro` suma `seccion` y el tipo `eleccion` (con `porDefecto`, que no va a
  la URL, no es chip ni cuenta); sin secciones el panel sigue plano, así vehículos no cambió.
- **El listado se relee al volver a la pestaña** (como la ficha): lo marcado en otra pestaña aparece sin
  recargar a mano.

## 2026-10-15 — Parte 6a: toda RPC que recibe un lead cae en una de tres clases

**Contexto:** la 4b y la 5a cerraron el hueco «actuar sobre un lead ajeno con `leads.editar` “todos” sin la
cartera» sólo en las RPC que tocaban esas partes; el resto seguía con `puede_lead(…, 'leads.editar')`, que
con «todos» no pide cartera, y `leads.compartir` ni siquiera tenía alcance. Esta parte lee la definición
**vigente** de cada función (`pg_get_functiondef`), cada policy y cada grant, y los clasifica.
**Decisión:** tres clases, y toda RPC de leads cae en una (más dos que no mueven nada):

1. **Contenido y datos privados** (editar, teléfonos, seguimientos, recordatorios con lead, portal, vínculo a
   vehículos, interesados): exige la **cartera y** el permiso, con cualquier alcance. «Todos» ve y no actúa.
2. **Quién lo tiene** (compartir, transferir, quitar acceso, salir): lo hace el dueño; con el permiso en
   «todos», también quien lo ve (la supervisión). **Nadie se concede acceso a sí mismo** a un lead que no tiene:
   ni como destino de transferir, ni de compartir. El destino es una persona activa, no bloqueada y con
   `leads.ver`. Un compartido puede salirse y no más; al dueño no se le quita, se transfiere; nadie deja un
   lead sin ninguna persona. Compartir y quitar son idempotentes; transferir lleva `p_dueno_esperado`.
3. **Papelera** (enviar, restaurar, purgar): vale el permiso con su alcance y no abre datos privados.

- **L, lecturas:** ver alcanza y la base recorta (privados, teléfono). **M, lo de quien mira:** marcas y
  recordatorios propios; ver alcanza (5b).
- **X, excepciones con nombre:** `crear_lead` con `adoptar` (la única autoconcesión válida: exige aceptarla
  y deja de dueño), `web_confirmar_contacto` (sólo anota a qué lead corresponde una solicitud: ver alcanza),
  `cotizacion_marcar_final` (Fase 4), y lo de administración o configuración que sólo cuenta
  (`equipo_dar_de_baja`, `equipo_vista_previa_baja`, `lead_campo_impacto`, `empresa_con_datos_cargados`).

**Una sola puerta por clase.** `puede_lead()` queda como estaba y sólo para **leer** (`leads.ver`: es lo
que usan las policies de lectura). Para actuar: `puede_actuar_lead(p_lead, p_clave)` (lo ve, está en la
cartera y la persona tiene el permiso con cualquier alcance) y `_lead_mio(p_lead, p_clave, p_bloquear)`
(levanta el `42501` de siempre), que **reemplaza** a `_lead_de_cartera()` (4b) y a `_lead_mio(uuid)` (5a):
un solo mensaje —«No encontramos este lead o no tienes acceso.»— para lo que no se ve, el limbo, la papelera,
lo inexistente, lo ajeno y «lo veo pero no es mío». La clase 2 va por `_lead_para_mover()` (visible,
`for update`, sin mover la versión).

### La auditoría

Leída contra la base viva, no contra los archivos. «Antes» es lo que exigía; «Ahora», lo que exige.

| Objeto                                                                                                                                                                                                                                         | Clase   | Antes                                                                                                                         | Ahora                                                                                                       | ¿Cambió?             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------- |
| `lead_guardar`                                                                                                                                                                                                                                 | 1       | ver + `editar` con alcance: «todos» sin cartera editaba lo no privado                                                         | cartera + `editar`                                                                                          | **sí**               |
| `cambiar_telefono_lead`, `lead_telefono_guardar`, `lead_telefono_quitar`, `verificar_telefono_de_lead`                                                                                                                                         | 1       | cartera + `editar` (mensaje propio: «Sólo quien tiene este lead en su cartera…»)                                              | cartera + `editar`, mensaje de siempre                                                                      | mensaje              |
| `seguimiento_crear                                                                                                                                                                                                                             | guardar | eliminar                                                                                                                      | restaurar`, `recordatorio_crear`(+`_seguimiento_mio`, `_lead_mio`)                                          | 1                    | `_lead_mio(uuid)` / `puede_lead` + `en_cartera`                                                                                                                                                                                                                   | `_lead_mio(…)` / `puede_actuar_lead`                                                                | no (misma regla, una puerta) |
| `otorgar_portal`, `revocar_portal`                                                                                                                                                                                                             | 1       | `puede_lead(portal.gestionar)`: «todos» sin cartera; «Sin acceso al lead.»                                                    | cartera + `portal.gestionar`; mensaje de siempre; revocar lo que no está vigente no deja constancia         | **sí**               |
| `vehiculo_vincular`                                                                                                                                                                                                                            | 1       | `vehiculos.editar` + `puede_lead(editar)`                                                                                     | + cartera del lead; desvincular sigue siendo del vehículo                                                   | **sí**               |
| `vehiculo_interesado_marcar`                                                                                                                                                                                                                   | 1       | ver el vehículo + `puede_lead(editar)`                                                                                        | ver el vehículo + cartera + `editar`                                                                        | **sí**               |
| `vehiculo_interesado_quitar`                                                                                                                                                                                                                   | 1       | `puede_lead(editar)`, ni miraba el vehículo                                                                                   | ver el vehículo + cartera + `editar`                                                                        | **sí**               |
| `oportunidades` INSERT / UPDATE                                                                                                                                                                                                                | 1       | INSERT con `puede_lead(editar)`; UPDATE con `usuario_id = uid` **sin mirar el lead** (a cualquier lead)                       | sin grant: la parte 7 trae sus RPC                                                                          | **sí**               |
| `compartir_lead` → `lead_compartir`                                                                                                                                                                                                            | 2       | `leads.compartir` (sin alcance) + cartera o `editar` «todos»; destino sin mirar; lead inexistente = `23503`; sacaba del limbo | dueño, o «todos»; destino válido; nunca a sí mismo; `sin_cambios`; sin oráculo                              | **sí** (firma nueva) |
| `transferir_lead` → `lead_transferir`                                                                                                                                                                                                          | 2       | dueño o «todos»; sin mirar existencia, limbo, papelera ni el destino; adoptaba del limbo sin «Tomar lead»                     | dueño, o «todos»; `p_dueno_esperado` (`PT409`); nunca a sí mismo; saliente compartido                       | **sí** (firma nueva) |
| `revocar_acceso_lead` → `lead_revocar_acceso`                                                                                                                                                                                                  | 2       | sólo `leads.compartir`: **cualquier asesor quitaba el acceso de cualquiera a cualquier lead**; sin constancia                 | dueño, o «todos»; al dueño no; no deja el lead sin nadie; constancia                                        | **sí** (firma nueva) |
| `lead_salir`                                                                                                                                                                                                                                   | 2       | no existía                                                                                                                    | un compartido se quita a sí mismo                                                                           | nueva                |
| `lead_cartera`, `lead_cartera_candidatos`                                                                                                                                                                                                      | L       | no existían (`leads_asesores` sólo mostraba al dueño a la supervisión)                                                        | nombres y tipo de acceso, sin contacto; candidatos sin quien mira                                           | nuevas               |
| `leads_papelera_enviar                                                                                                                                                                                                                         | listar  | restaurar                                                                                                                     | purgar`                                                                                                     | 3                    | las genéricas `papelera_*('leads')`: sin versión, el uuid en el mensaje, restaurar con el teléfono tomado daba `23505` y abortaba el lote, enviar no revocaba el portal, purgar prestado de `vehiculos.papelera.purgar`, **los leads no se purgaban nunca solos** | propias; todo o nada; lote del cliente; versión del lote; `leads.papelera.purgar`; el job las purga | **sí**                       |
| `papelera_enviar                                                                                                                                                                                                                               | listar  | restaurar                                                                                                                     | purgar`                                                                                                     | 3                    | vehículos, leads y cotizaciones                                                                                                                                                                                                                                   | sólo cotizaciones (rechazan `leads` y `vehiculos`)                                                  | **sí**                       |
| `papelera_purgar_vencidos`                                                                                                                                                                                                                     | 3       | sólo vehículos                                                                                                                | vehículos y leads, la misma función que la manual                                                           | **sí**               |
| policy `lotes_papelera: leer`                                                                                                                                                                                                                  | 3       | el creador o `vehiculos.papelera.purgar`                                                                                      | el creador o el permiso de su tipo (`leads.papelera.purgar` para leads)                                     | **sí**               |
| `lead_ficha`, `lead_telefonos`, `telefono_lead`, `atributos_lead`, `lead_seguimientos`, `leads_vista`, `en_cartera`, `lead_en_limbo`, `puede_lead`, `mis_leads`, `vehiculo_vinculos`, `vehiculo_interesados`                                   | L       | ver; la base recorta                                                                                                          | igual (`lead_seguimientos` pregunta `editar` sólo para decir si «puede»; el cinturón lo tiene en una lista) | no                   |
| `lead_favorito                                                                                                                                                                                                                                 | tachado | etiquetas_poner`, `etiqueta_*`, `recordatorio_guardar                                                                         | completar                                                                                                   | eliminar             | restaurar`                                                                                                                                                                                                                                                        | M                                                                                                   | ver / ser su dueño           | igual | no  |
| `web_confirmar_contacto`                                                                                                                                                                                                                       | X       | `puede_lead(ver)`, «Sin acceso al lead.»                                                                                      | igual                                                                                                       | no                   |
| `cotizacion_marcar_final`                                                                                                                                                                                                                      | X       | no mira el lead ni la papelera                                                                                                | igual (Fase 4)                                                                                              | no                   |
| `crear_lead`                                                                                                                                                                                                                                   | X       | adopta del limbo con `adoptar: true`                                                                                          | igual                                                                                                       | no                   |
| policy `accesos_portal: leer`                                                                                                                                                                                                                  | 1       | `puede_lead(portal.gestionar)`: «todos» leía el **código** de cualquiera (las columnas sí tenían grant)                       | `puede_actuar_lead(portal.gestionar)`                                                                       | **sí**               |
| `cotizaciones` INSERT                                                                                                                                                                                                                          | ✗       | `lead_id` de cualquier lead                                                                                                   | `lead_id` nulo o un lead que se ve                                                                          | **sí**               |
| `cotizaciones` UPDATE de `lead_id`                                                                                                                                                                                                             | ✗       | de cualquier lead: la cotización le aparecía a su cartera                                                                     | sin grant de columna: sólo al crearla; después, la RPC de la Fase 4                                         | **sí**               |
| funciones de trigger de las tablas de leads (`lead_crear_dueno`, `lead_validar_atributos`, `lead_version`, `oportunidad_historial`, `seguimiento_actualizar_lead`, `vehiculo_vinculo_historial`, `auditar`, `set_actualizado_en`…)             | —       | `execute` para `authenticated` (por omisión)                                                                                  | sin `execute`                                                                                               | **sí**               |
| `leads`, `leads_asesores`, `leads_telefonos`, `leads_favoritos`, `leads_tachados`, `etiquetas`, `leads_etiquetas`, `seguimientos`, `recordatorios`, `vehiculos_interesados`, `vehiculos_vinculos`, `lotes_papelera`, `oportunidades_historial` | —       | sólo SELECT para `authenticated`                                                                                              | igual                                                                                                       | no                   |
| `web.portal_*`                                                                                                                                                                                                                                 | —       | sólo `service_role`                                                                                                           | igual (parte 7)                                                                                             | no                   |

**Lo que resultó falso o más grave de lo que se creía:**

- Los mensajes de `revocar_acceso_lead` ya no hablaban de vos (la migración de la 3 los había reemplazado).
- `leads.compartir` **no tiene alcance** y el Asesor lo trae: el hueco no era «“todos” sin cartera» sino «cualquier
  asesor». Por eso ahora lo tiene («propios» = los leads de los que soy dueño; «todos» = supervisión), y la
  migración baja a «propios» a quien no ve «todos».
- Un lead sin dueño y con un compartido (tras una baja) no se rescataba: lo transfiere la supervisión con
  `p_dueno_esperado` nulo. `equipo_dar_de_baja` no cambia: el limbo sólo nace de una baja.
- `mis_leads()` no filtra la papelera: un lead enviado con un vehículo vinculado le seguía dando el vehículo a su
  cartera. Por eso un vehículo vinculado **impide** enviar el lead.
- La policy `accesos_portal: leer` no estaba muerta: tenía grants de columnas.

### Decisiones concretas y su porqué

- **`leads.papelera.purgar`, propio.** `vehiculos.papelera.purgar` gobernaba también la papelera de leads: quien
  vaciaba la de vehículos veía los nombres de todos los leads. La migración se lo da a quien ya tenía el otro,
  y el dueño lo trae por el seed.
- **Editar pide la cartera** (clase 1): la dueña con «todos» **deja de editar** el nombre, el tipo y el origen de
  un lead ajeno. Es lo que se decidió para el contenido en 4b y 5a, ahora para todo. «Editar» desaparece para
  ella, y con él el aviso «Los datos “solo la cartera” no se muestran…».
- **Desvincular un vehículo no pide el lead** (`vehiculo_vincular(…, null)`): es una acción sobre el vehículo y no
  entrega nada del lead; pedirle cartera dejaría a la supervisión de inventario sin poder corregir un vínculo
  equivocado. Vincular sí lo pide: es darle el vehículo a esa cartera.
- **`oportunidades` sin escritura directa y `cotizaciones.lead_id` sin UPDATE** en vez de endurecer policies: la
  lógica de lead visible + cartera + tipo en un `with check` no se lee ni se prueba bien, y ninguna pantalla las
  usa todavía; las RPC de la 7 y la Fase 4 las traen.
- **Nombres:** `lead_compartir`, `lead_transferir`, `lead_revocar_acceso`, `lead_salir`, `lead_cartera`,
  `lead_cartera_candidatos` (la convención desde la 4a). Las firmas viejas se `drop`ean: una que sobrevive con
  otros parámetros sigue llamable como sobrecarga, y el cinturón la detecta.
- **«Quién lo tiene» sale de `lead_cartera()` y no de abrir la policy de `leads_asesores`:** la policy sigue
  siendo la red para lo demás, y la función entrega nombres y tipo de acceso y nada de contacto.

### El cinturón y la matriz

- **`supabase/tests/auditoria-leads.sql`** (corre en `pnpm db:probar`, después del humo y de la matriz) lee el
  catálogo: toda función `security definer` que `authenticated` puede llamar y que recibe un lead (`p_lead`,
  `p_leads`, `lead_id`… o de tipo `leads`) **o** que nombra una tabla de leads en su cuerpo, tiene que estar en
  su lista con su clase. Falla además si: una de la lista no existe o tiene sobrecargas; una de clase 1, 2 o 3
  con `p_lead` no pasó por la matriz; una función o policy pregunta `puede_lead()` con un permiso que no es
  `leads.ver`; `authenticated` puede escribir una tabla de leads; una función de trigger de esas tablas, o una
  función de leads, la llama `anon`; o una `security definer` no fija `search_path`.
- **`supabase/tests/matriz-leads.sql`:** cada RPC × siete personas (dueño, compartido, supervisión sin cartera,
  asesor ajeno, sólo ve, dada de baja, bloqueado) × cinco leads (propio, ajeno, limbo, papelera, inexistente),
  805 celdas, cada una en su subtransacción. Prueba que lo que no se ve da el mismo mensaje.
- **Se probó que atrapan:** con `otorgar_portal` vuelto a `puede_lead(…, 'leads.portal.gestionar')` la matriz
  falló en 32 celdas; con una RPC `lead_dummy(p_lead)` el cinturón falló nombrándola.

**Alternativas:** forzar las excepciones a una de las tres clases (cambiaba reglas ya decididas, como «marcar
exige ver»); cambiar el significado de `puede_lead()` (lo usan las policies de lectura y el listado, medidos);
un `db:lint` a mano de cada RPC nueva (no escala: una RPC que se olvida se vuelve a abrir).
**Consecuencia:** una RPC de leads nueva rompe `db:probar` hasta que se audita y entra a la lista (y a la matriz).

## 2026-10-15 — La papelera de leads: todo o nada, el lote lo genera el cliente, y lo vinculado no entra

**Contexto:** `papelera_*('leads')` copiaba la de cotizaciones: sin versión, sin motivos legibles, restaurar
con el teléfono ya tomado abortaba con `23505` crudo, enviar no tocaba el portal y la purga automática sólo
miraba vehículos (un lead en la papelera guardaba su teléfono y sus privados para siempre).
**Decisión:**

- **Enviar** (`leads_papelera_enviar(p_lote, p_leads)`): de 1 a 200, **todo o nada** (un lead que no se ve o no
  se puede deja todo como estaba y no deja lote huérfano; el mensaje no dice cuál falló: sería un oráculo),
  **idempotente por `p_lote`**, que genera el cliente y conserva hasta que el envío termina. Sin versión por lead:
  no pisa nada y la versión de cada uno rechazaría un lote entero porque alguien anotó un dato (vehículos sí la
  lleva, por elemento: allí el resultado es parcial). Mueve la versión del lead (ya estaba decidido).
- **Portal y oportunidades:** se revoca el portal vigente al enviar y se dice; las oportunidades quedan (son de
  la 7). Restaurar **no** reabre el portal.
- **Un vehículo vinculado impide enviar** (y purgar): con el lead en la papelera, `mis_leads()` seguiría dándole el
  vehículo a su cartera. Hasta la 6b no hay botón para desvincular desde el lead; el rechazo lo dice y la
  pantalla no lo adelanta (el patrón de la papelera es «hacer y deshacer», sin diálogo previo).
- **Restaurar** (por lote o por lead, con la versión del lote): lo que choca con un teléfono vivo **queda
  adentro con el motivo**, que usa la regla de `_lead_verificar` (a quien ve el otro lead, cuál es; a quien no,
  de quién) y no ofrece cambiar el teléfono desde la papelera: sería editar un lead que nadie ve.
- **Purgar** (`leads.papelera.purgar`): no se lleva un lead con vehículo vinculado, pagos o el portal vigente
  (dinero y vínculo, como en vehículos); el resto se limpia por cascada (teléfonos, cartera, marcas,
  seguimientos, recordatorios, oportunidades, interesados y el historial de vínculos). `actividad` queda, sin
  datos. El job `papelera_purgar_vencidos()` llama a la misma `_papelera_purgar_leads()` a los `papelera_dias`.
- **Quién la ve:** quien envió el lote, o quien tiene `leads.papelera.purgar`. El nombre y el número del lead sólo
  salen por `leads_papelera_listar()` y sólo a esas personas; nunca teléfono ni privados.
- **`leads.eliminar` «propios» es el dueño**, no cualquiera de la cartera: un compartido no debería poder tirar
  el lead de otro; puede salir.
  **Consecuencia:** la papelera de un lead con un vehículo vinculado pide desvincular antes (6b).

## 2026-10-15 — El documento de la ficha pasa de 40 a 48 KB

**Contexto:** el e2e que mide la ficha (`leads-ficha.spec.ts`) fijó en 40 KB lo que el documento suma al shell
cuando la ficha pesaba ~29 KB. Con las marcas, los seguimientos, «Quién lo tiene» (con sus dos paneles y el
diálogo de salir) y el «⋯» de la papelera, aporta ~42 KB.
**Decisión:** el tope del documento pasa a 48 KB; el de lo que viaja al navegar desde el listado sigue en 40 KB
(33 KB hoy). No se recortó nada: el crecimiento es de funciones nuevas, y el aporte de cada una es pequeño
(el menú ~0,7 KB). Si vuelve a pasar, lo que cabe es sacar los paneles a una carga diferida (`next/dynamic`).

## 2026-10-15 — Lo que dejó la revisión de la 6a: carreras, `lead_id` en otras tablas y un cinturón más ancho

**Contexto:** una revisión adversarial de la parte (sin editar) encontró tres cosas que valía corregir.
**Decisión:**

- **Autorizar, bloquear y volver a autorizar.** `_lead_mio()`, `_lead_para_mover()` y `leads_papelera_enviar()`
  miraban el permiso antes de tomar el `for update` y no volvían a mirar: quien esperaba el lock mientras le
  quitaban la cartera (o le transferían el lead) escribía igual al despertar. Ahora, con el lead bloqueado, se
  vuelve a preguntar `puede_actuar_lead()` / el dueño sobre lo confirmado (cada sentencia nueva ve el commit).
  En `_lead_mio` la primera pregunta se conserva: no se regala un lock a quien no ve el lead. PGlite no tiene
  concurrencia: lo cubre la lectura y el cinturón no puede probarlo; un e2e con dos sesiones queda como deuda.
- **Un reintento con el mismo lote y otros leads se rechaza** (antes devolvía «repetido» sin enviar nada).
- **`lead_id` en `pagos`, `tareas`, `eventos`, `mensajes`, `repuestos_proyectos` y `web_testimonios`** se
  escribía con el de cualquier lead, lo viera o no: le impedía purgarse al lead (los pagos bloquean) y el error de
  la FK decía si existía. Un trigger común (`lead_visible_al_escribir`) exige ver el lead, con el mensaje de
  siempre, antes de la FK y de la RLS; sin sesión (job, servicio, web pública) no mira. Se eligió el trigger y
  no una policy por tabla: son seis tablas de fases que todavía no tienen pantalla y una regla única se prueba
  una vez. El cinturón exige que toda tabla con FK a `leads` que la app escribe lo tenga.
- **El cinturón mira más:** también las funciones de invocador que reciben un lead, las tablas de pagos,
  tareas, eventos, mensajes y cotizaciones en el cuerpo de una «definer», los permisos de acción de leads
  preguntados con `alcance_de()` o `tiene_permiso()` en una policy, y la escritura directa sobre `leads`.
- **Documentado, sin cambio:** purgar un lead desprende (`on delete set null`) sus cotizaciones, agenda, chat,
  logística, repuestos y solicitudes web: quedan sin lead. Un lead en limbo no se envía a la papelera ni con
  `leads.eliminar` «todos» (no se ve: se reasigna o se adopta primero). `leads_papelera_listar()` recorre todos
  los lotes visibles; con miles, medirlo en la Fase 9 (`pnpm db:medir`).
- **Rechazado de la revisión:** que `infra/cartera.client.ts` sea una excepción sin registrar. Leer desde el
  navegador con la sesión de quien mira ya es el patrón de `lead-rapido.client.ts` y `etiquetas.client.ts`:
  `*.client.ts` es para lecturas de navegador, no sólo para realtime.

## 2026-10-15 — Parte 6b: vincular desde el lead, sin oráculo y con el lead bloqueado

**Contexto:** leída la definición vigente, `vehiculo_vincular` distinguía un vehículo que no se ve de uno
inexistente (`42501` «No tienes permiso…» contra `PT409` «ya no existe o está en la papelera»), tomaba el
`for update` del vehículo antes de mirar el permiso, decía «ya está» antes de mirar la cartera y **no
bloqueaba el lead**: si la papelera bloqueaba primero, vincular esperaba sólo el `KEY SHARE` de la FK y al
despertar escribía igual, y el lead quedaba en la papelera con un vehículo vinculado (lo que la 6a prohibió).
Marcar interés con otra nota la ignoraba en silencio, y marcar y quitar no decían qué pasó.
**Decisión:**

- **Vincular** mira primero sin bloquear (lo que no se ve, la papelera y lo inexistente dan «Ese vehículo no
  existe o no tienes acceso.»; lo que se ve sin poder editarlo, «No tienes permiso para editar este
  vehículo.»), después bloquea **el lead** (`_lead_mio(…, true)`, que vuelve a mirar) y **después el
  vehículo** (y vuelve a mirar). Orden de los locks: lead → vehículo; desvincular sólo toma el vehículo y la
  papelera sólo el lead, así que no hay ciclo. `cotizacion_marcar_final` actualiza `lead_id` con el vehículo
  tomado (vehículo → `KEY SHARE` del lead): un deadlock posible con vincular, que se revisa en la Fase 4.
- **Reemplazar** el lead de un vehículo exige tener también el actual en la cartera: quien se lo quita a una
  cartera tiene que poder nombrarla, y la confirmación nombra a los dos leads. Si no, `23514` «Este vehículo ya
  está vinculado a otro lead. Para cambiarlo, desvincúlalo desde la ficha del vehículo.», sin decir cuál. El
  historial ya lo cuenta el trigger (cierra el anterior y abre el nuevo en la misma transacción).
- **Marcar es «poner»:** la misma nota es `sin_cambios`, otra la reemplaza (`nota_cambiada`), sin versión (una
  nota corta, la última escritura gana). Quitar devuelve la nota para que «Deshacer» la reponga. Las dos
  bloquean el lead como el resto de la clase 1.
- **Desvincular** sigue sin pedir el lead. En la pantalla se hace y ofrece «Deshacer» cuando quien desvincula
  podría volver a vincularlo (tiene el lead); si no (la supervisión de inventario), pide confirmar, porque para
  esa persona no hay vuelta atrás. Devuelve `limpieza_el`: desvincular le quita el ancla a un vehículo de
  subasta que nadie compró, y el aviso dice cuándo se lo llevaría la limpieza.
- Desvincular un vehículo con una cotización final no se frena todavía: ninguna pantalla crea una final; se
  decide en la Fase 4 (la ficha de `vehiculos` decía «Fase 3»).

**Matriz:** un bloque nuevo cruza las cuatro RPC de vínculo con seis personas (dueño, compartido, supervisión
sin cartera, asesor ajeno, sin rol, de baja) y seis estados del vehículo (propio, ajeno con «propios», que
sólo se ve, en la papelera, de un origen sin permiso e inexistente): 144 celdas. Con `vehiculo_vincular`
vuelto al orden y a los mensajes viejos, caen **50 de 144**; con `puede_lead(…,'leads.editar')`, caen 2 celdas
de la matriz por lead y el cinturón. `matriz_cubiertas` se creaba sólo en el primer bloque: si fallaba, los
siguientes no corrían; ahora cada bloque la crea si falta.

## 2026-10-15 — La sección «Vehículos» vive en `vehiculos`, y lo que no se ve no se cuenta

**Decisión:**

- La sección (y su selector, y el panel «Agregar vehículo») viven en `vehiculos` y las compone `app/`:
  `leads` no importa `vehiculos` (lo decidido en la Fase 2). Se lee con `lead_vehiculos()` y se busca con
  `vehiculos_para_lead()`, las dos de invocador: lo que la RLS del vehículo no deja ver no llega ni se cuenta.
  La pestaña sólo aparece con `vehiculos.ver` en algún origen (sin eso estaría siempre vacía).
- **Lo que ve cada quien:** un compartido con «propios» ve los vinculados (se los da el vínculo) y sólo los
  interesados que su propio alcance le deja ver; transferir no toca los vínculos.
- **Asimetría a propósito:** la ficha del vehículo dice que _hay_ un vínculo con un lead que no se ve («Un lead
  que no está en tu cartera»), porque `lead_id` es un dato del propio vehículo; la ficha del lead no cuenta los
  vehículos que no se ven, porque son otras entidades. El historial del lead no nombra personas (el del
  vehículo nombra a quien vinculó).
- **Lo que la ficha adelanta, sin oráculo:** `lead_ficha()` suma `vehiculos_vinculados` (los que quien mira ve).
  Con alguno, «Enviar a la papelera» se ve apagado con el motivo y lleva a «Vehículos»; compartir y transferir
  avisan que el vínculo le da los vehículos a quien recibe el lead. Si no ve ninguno no se dice nada: insinuar
  los otros sería decir algo que no ve. Si lo que frena la papelera es uno que no ve, la base lo dice al
  intentar («…que no ves: quien lo gestiona tiene que desvincularlo antes.»): que existe ya lo decía.
- La ficha del vehículo suma «Desvincular» para quien lo edita (con confirmación): es la salida del rechazo de
  reemplazar. El botón lo arma la página y el bloque lo recibe como hueco.

## 2026-10-15 — `vehiculo_id` en seguimientos y recordatorios: uno que se ve, y si deja de verse sigue

**Decisión:** las RPC lo reciben (`seguimiento_crear|guardar` en el json, `recordatorio_crear(…, p_vehiculo)`,
`recordatorio_guardar` en los cambios) y sólo lo validan cuando cambia: editar el título de una nota cuyo
vehículo ya no se ve lo conserva. La base sólo exige que se vea; la pantalla ofrece los vehículos del lead
(vinculados e interesados) que la página lee desde `vehiculos` y la sección provee por contexto: así no hace
falta una búsqueda global ni un ciclo entre módulos. Al leer, el vehículo se nombra sólo si se ve; a su autor
se le dice que había uno («un vehículo que ya no ves», el valor `oculto` del selector), al resto nada. El
recordatorio que nace con un seguimiento hereda su vehículo. **`recordatorios.vehiculo_id` pasó a
`on delete set null`** (era `cascade`): purgar un vehículo borraba el recordatorio de otra persona. Lo
«Visible para el cliente» con vehículo lo resuelve el portal de la parte 7.

## 2026-10-15 — Las carreras se prueban con dos conexiones reales (`pnpm db:carreras`)

**Contexto:** PGlite (el de `db:probar`) no tiene concurrencia: las carreras de la 6a quedaron sin prueba.
**Decisión:** `scripts/carreras.mjs` abre dos conexiones con `pg` a la base local y un orquestador. A abre una
transacción y actúa (retiene el lock), B lanza su llamada, el orquestador espera en `pg_stat_activity` a que B
figure esperando un lock (sin `sleep`) y recién ahí A confirma. Si B no llega a esperar, la carrera no se probó
y falla: no se reintenta. Doce carreras en los dos órdenes: dos transferencias, quitar el acceso mientras el
compartido edita, anota, corrige su seguimiento o agenda, la papelera mientras otro comparte, el mismo vehículo
a dos leads, y vincular mientras se envía el lead a la papelera (contra la RPC vieja, **roja**). Terreno propio
con prefijo «Carreras», escrito como `postgres`, borrado al terminar y al empezar; con el equipo vacío crea
primero una cuenta que nace dueña (sin alguien que gestione el equipo, el guardián no deja tocar a nadie).
Dura menos de un segundo. No entra en `db:probar` (es el pre-commit y exigiría Supabase arriba): corre con
`pnpm db:carreras` y dentro de `pnpm test:e2e:completo`, después del reset.
**Lo que encontró:** un compartido al que le quitaban el acceso **mientras** anotaba dejaba su seguimiento
igual: `seguimiento_crear` y `recordatorio_crear` llamaban a `_lead_mio(p_lead)` sin bloquear y
`_seguimiento_mio` no miraba el lead con lock. `_lead_mio` bloquea ahora por omisión y `_seguimiento_mio`
bloquea el lead y vuelve a mirar (`…20261015000700`).

## 2026-10-15 — El tope del documento de la ficha vuelve a 44 KB; diferir los paneles no ahorra documento

**Contexto:** la 6a subió el tope a 48 KB y anotó que, si hacía falta, se sacaran los paneles a una carga
diferida. **Medido** (el e2e ahora dice de qué está hecho lo que aporta la ficha): 42,0 KB sobre el shell =
25,8 de payload RSC (las props) + 16,1 de HTML de «Datos»; los scripts no suman. Los paneles cerrados (base-ui)
no dibujan nada, así que diferir los de la cartera ahorró **0,0 KB** del documento (sí, su código del primer
pedido). Con la sección «Vehículos» y lo que suma a la ficha, «Datos» aporta **43,0 KB** (26,7 de RSC); en el
terreno del e2e de vehículos, «Datos» 37,3 KB y «Vehículos» 31,4 KB.
**Decisión:** tope de 44 KB para «Datos» y para «Vehículos». Si se pasa, lo que pesa son las props: mandar a
`FichaDeLead` sólo los campos activos y los que el lead tiene con dato, y los orígenes activos más el del lead
(las opciones completas, al abrir «Editar»).

## 2026-10-15 — Parte 7 partida en 7a y 7b; las quince preguntas se resolvieron con la recomendación

**Contexto:** la parte 7 juntaba embudos, oportunidades, transferir, el acceso del cliente del lado del
equipo y el endurecimiento de `web.portal_*`. El plan se aprobó sin respuestas una por una: se tomó la
recomendación de cada pregunta.
**Decisión:** 7a = embudos, oportunidades (kanban y sección de la ficha) y transferir; 7b = acceso del
cliente y `web.portal_*`, con su verificación completa por separado. Permisos: `leads.editar` para crear,
editar, mover y cerrar; `leads.ver` para ver las propias; sin permisos nuevos (el seed ya describía así
`leads.editar`). Motivo de pérdida: texto libre hasta 200. Moneda: la de la empresa, guardada en cada
oportunidad, sin conversión. Eliminar una oportunidad: lógico, con «Deshacer». Crear desde el kanban: no
(pide el `<SelectorLead>` de la Fase 7).

## 2026-10-15 — Los embudos son personales y se escriben sólo por RPC; las etapas se guardan como conjunto

**Contexto:** leído contra la base viva, `embudos` y `embudos_etapas` tenían INSERT/UPDATE/DELETE para
`authenticated` (con RLS de la dueña): nada garantizaba una sola etapa inicial, una ganada y una perdida,
ni topes. El color era un hex libre, los nombres únicos distinguían mayúsculas, nada exigía que la etapa
fuera del embudo ni que el embudo fuera de la dueña de la oportunidad, y el embudo no tenía versión.
**Decisión:**

- **Sólo por RPC** (`embudo_por_defecto`, `embudo_crear`, `embudo_guardar`, `embudo_eliminar`,
  `embudo_etapas_guardar`), como las marcas: se leen las tablas (RLS de la dueña). Son de quien mira:
  clase **M** en el cinturón, sin lead.
- **Las etapas se guardan como conjunto**, de una vez y en su orden: nunca hay un estado intermedio
  inválido (dos iniciales mientras se cambia cuál es). Exactamente una inicial, al menos una ganada y una
  perdida, la inicial no es final, nombres sin repetir sin importar mayúsculas, la paleta cerrada de las
  etiquetas (guardada como clave) y de 3 a 12. Una etapa con oportunidades vivas no se quita: `23514` que
  la nombra; las eliminadas de esa etapa se van con ella. La versión es `embudos.actualizado_en`: dos
  pestañas que reordenan dan `PT409`.
- **El de por defecto** lo crea `embudo_por_defecto()` (idempotente, con un candado por persona) la primera
  vez que hace falta: «Ventas» con Nuevo, Contactado, Cotizado, Negociación, Ganado y Perdido. Si la persona
  ya tiene embudos, el más viejo pasa a ser el de por defecto. No se elimina; se renombra. Hasta 10.
- **FK compuestas**: `(usuario_id, embudo_id) → embudos (usuario_id, id)` y `(embudo_id, etapa_id) →
embudos_etapas (embudo_id, id)`. La base garantiza que la etapa es del embudo y el embudo de la dueña.
- Una plantilla de etapas por empresa queda pendiente.

## 2026-10-15 — Una oportunidad es de su dueña, con la cartera del lead; nadie más la ve

**Decisión:**

- Crear, editar, mover, eliminar y restaurar son **clase 1**: ser la dueña, la cartera del lead y
  `leads.editar`. `_oportunidad_mia()` mira sin bloquear, bloquea el lead, comparte el embudo y bloquea la
  oportunidad, y vuelve a mirar (orden de candados lead → embudo → oportunidad, el mismo que guardar las
  etapas: embudo → oportunidades). Lo ajeno, lo inexistente y un lead que ya no se tiene dan el mismo
  `42501`.
- **La policy de lectura cambió**: antes quien tenía `leads.ver` «todos» leía las de todo el equipo (y su
  historial). Ahora: la propia, viva, con `leads.ver` y sobre un lead vivo de su cartera
  (`_mis_leads_vivos()`, un arreglo que se calcula una vez por consulta: InitPlan, comprobado con EXPLAIN).
  Perder la cartera la oculta sin borrarla; recuperarla la devuelve. El tablero de equipo de la Fase 9
  necesitará una función con `tablero.metricas.ver`.
- **Mover** recibe la etapa que la persona cree que tiene: otra es `PT409` con el nombre de la actual; la
  misma es `sin_cambios` (un reintento no choca). Una etapa de otro embudo o de otra persona: «Esa etapa no es
  de este embudo.». El **estado lo deriva un trigger BEFORE** de la etapa (antes era un segundo UPDATE de la
  fila en un AFTER) y otro AFTER escribe el historial. `cancelada` sólo la pone la baja.
- Editar lleva versión (lo ya guardado no choca). El vehículo, como en las notas: uno que se ve, y si deja
  de verse, se conserva al editar lo demás. Ninguna toca `leads` ni mueve su versión. `actividad` deja
  `oportunidad.creada|ganada|perdida|transferida` sin montos ni notas.
- **Una cuenta que se borra se lleva sus oportunidades** (y sus embudos); el historial queda sin autor. La
  limpieza de los e2e lo encontró: la FK a `perfiles` no decía qué hacer. La baja (lo normal) no borra: cancela.

## 2026-10-15 — Transferir lleva las abiertas al embudo del destino; la baja sigue cancelando

**Decisión:** `lead_transferir` pasa las abiertas y vivas del saliente al embudo por defecto del destino
(creado si no tiene), a la etapa **abierta** del mismo nombre sin importar mayúsculas o, si no hay, a su
inicial (nunca a una final por coincidir el nombre), con fila de historial (quien transfiere) y constancia;
devuelve cuántas. Las cerradas y las eliminadas se quedan con quien las tenía. El saliente queda compartido y
deja de ver las que pasaron. Revocar, salirse y la papelera las ocultan (RLS); restaurar el lead las
devuelve. **La baja sigue poniendo `cancelada`**, como ya decía la pantalla de la baja: la persona no vuelve
y una «abierta» eterna inflaría el pipeline abierto.
**Efecto en la Fase 9:** las ganadas cuentan para quien las tiene al cerrarlas; el historial guarda quién
creó y quién movió, así que «creadas por» se mide aparte; las métricas por etapa son dentro de cada embudo.

## 2026-10-15 — El kanban: 50 por columna, «Ver más», pestañas en el celular, y la sección de la ficha

**Decisión:**

- `/leads?vista=embudo&embudo=<id>`: una columna por etapa con hasta 50 tarjetas (las movidas más
  recientemente) y «Ver más (N)» por keyset desde el navegador. En el celular, las etapas son pestañas
  (`?etapa=`); el cambio de forma lo decide el CSS, no una media query en JS (que pintaría primero la del
  celular). «Mover a…» es un menú (teclado y dedo); a una perdida pregunta el motivo. Un embudo vacío
  muestra sus columnas y el aviso. Los filtros de la lista no aplican y la pantalla lo dice.
- **Medido** (`pnpm db:medir`, 2.000 leads y 5.000 oportunidades propias en 6 etapas, más 5.000 de otra
  persona): el tablero de 6 columnas de 50 en 44 ms, «Ver más» 16 ms, las de un lead 3,4 ms, la policy sola
  3,3 ms. La medición encontró que `_tarjeta_json` recibía la fila entera de `leads` (con grants por
  columna, `permission denied`): ahora recibe sólo nombre y número.
- **La sección «Oportunidades» de la ficha** se mide aparte: con tres, 42,2 KB (cada tarjeta con dos botones
  de shadcn pesaba ~5 KB; «Editar» y «Eliminar» pasaron al «⋯» y quedó en ~2,5 KB). «Datos» pasó de 43,0 a
  43,3 KB por la pestaña nueva. El tope de 44 KB no se tocó.

## 2026-10-15 — La auditoría ampliada de la 7a, y lo que encontraron las pruebas

| Objeto                                                                                             | Clase | Antes                                                                | Ahora                                                                                 |
| -------------------------------------------------------------------------------------------------- | ----- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `embudos`, `embudos_etapas` INSERT/UPDATE/DELETE                                                   | M     | directo, con RLS de la dueña: sin invariantes ni topes               | sin grant: `embudo_*` (M)                                                             |
| `oportunidad_crear`                                                                                | 1     | no existía (la 6a sacó la escritura directa)                         | cartera + `leads.editar`; matriz principal                                            |
| `oportunidad_guardar\|mover\|eliminar\|restaurar`                                                  | 1     | no existían                                                          | dueña + cartera + `leads.editar`; bloque propio de la matriz (8 personas × 5 estados) |
| policy `oportunidades: leer`, `oportunidades_historial: leer`                                      | L     | las propias **o** las de todos con `leads.ver` «todos»               | las propias, vivas, sobre leads vivos de la cartera                                   |
| `lead_oportunidades`, `embudo_tablero`, `embudo_etapa_pagina`, `_tarjeta_json`, `_mis_leads_vivos` | L     | no existían                                                          | invocador (o un arreglo para la policy): la RLS decide                                |
| `lead_transferir`                                                                                  | 2     | pasaba las abiertas cambiando sólo `usuario_id`                      | al embudo por defecto del destino, por nombre o a la inicial; cerradas se quedan      |
| trigger `oportunidad_historial`                                                                    | —     | AFTER que escribía el historial y hacía un segundo UPDATE del estado | `oportunidad_estado` (BEFORE) + `oportunidad_historial` (AFTER)                       |

- **El cinturón** suma una regla: toda función «definer» llamable `oportunidad_*` o `embudo_*` pasa por su
  bloque de la matriz (reciben su id, no el lead).
- **Roto a propósito:** `_oportunidad_mia` con `puede_lead(…,'leads.editar')` lo atrapa el cinturón y un caso
  (la supervisión compartida que pierde la cartera edita la suya); la policy con el «todos» de antes no la
  atrapaba nada —la condición de la cartera la tapaba— hasta que un caso miró a la supervisión **con** el lead
  compartido. Los dos casos quedaron.
- **Encontrado al probar:** `embudo_por_defecto()` devolvía el embudo nulo la primera vez (una función STABLE
  lee con la foto de la sentencia que la llama: el insert y la lectura iban en la misma); mis casos
  comparaban contra nulos y no lo veían: ahora toda llamada que debe salir bien pasa por `pg_temp.bien()`.
- **Carreras** (`pnpm db:carreras`, 7 nuevas, todas en verde al primer intento): quitar el acceso mientras el
  compartido mueve (dos órdenes), quitar una etapa mientras se mueve a ella (dos órdenes), transferir mientras
  la dueña mueve (dos órdenes) y dos guardados de etapas a la vez.

## 2026-10-15 — Parte 7b: las dieciséis preguntas se resolvieron con la recomendación

**Contexto:** el plan de la 7b dejó dieciséis preguntas numeradas (ocho del pedido y ocho que salieron al leer
la base viva) y se aprobó sin responderlas una por una. Como en la 7a, se tomó la recomendación de cada una.
**Decisión:** (1) las firmas de abajo son el contrato; (2) «Generar» lo hace Postgres y
`logging.serverFunctions` se apaga; (3) la plantilla de WhatsApp vive en el código y se suma
`ajustes_web.direccion_publica` sin pantalla; (4) «Portal» aparece con la cartera y el permiso, nunca vacía, y
se mide aparte con su propio tope de 44 KB; (5) desbloquear no le avisa al cliente; (6) transferir no toca el
acceso y el panel lo avisa; (7) la baja no toca el acceso y nombra a quien lo otorgó «(ya no está en el
equipo)»; (8) cupo en una sesión; (9) el código tecleado lee 0→O y 1→I; (10) revocar se confirma, sin
«Deshacer»; (11) las novedades llevan título y texto plano, también las de un vehículo no vinculado (sin
nombrarlo), hasta 30; (12) bcrypt de costo 10 y la clave de 8 a 64 caracteres, ≤ 72 bytes, sin controles;
(13) la sección vuelve a mostrar el código, nunca la clave; (14) fuera `trg_auditar` de `accesos_portal`;
(15) la tabla no la lee la app; (16) cambiar la clave no corta la sesión.

## 2026-10-15 — El acceso del cliente: clase 1, sólo por RPC, con la versión del acceso

**Contexto:** leído contra la base viva: `otorgar_portal` reemplazaba sin versión, la policy
`accesos_portal: leer` dejaba leer la tabla (con el **código**) a la cartera con el permiso —la 6a la acotó,
no la cerró—, y `trg_auditar` escribía en `actividad` cada login del cliente (con `registro_id` nulo: la
tabla no tiene `id`). Borrar una cuenta que había otorgado un acceso fallaba (FK sin `on delete`).
**Decisión:**

- **Cuatro RPC de clase 1** (cartera + `leads.portal.gestionar`, por `_lead_mio`): `portal_estado` (sin
  bloquear; el estado, el código, quién y cuándo; nunca la clave ni el hash), `otorgar_portal(p_lead,
p_clave, p_otorgado_en_esperado)`, `revocar_portal` (idempotente) y `portal_desbloquear` (idempotente). Lo
  ajeno, el limbo, la papelera y lo inexistente dan el mismo `42501`.
- **La versión es `otorgado_en`**, truncado a milisegundos y siempre mayor que el anterior (sobrevive a un
  `Date` de JS en la cookie). `p_otorgado_en_esperado` nulo significa «creo que no hay acceso»: es la
  excepción a `_exigir_version()`, como crear, porque el primer otorgamiento no tiene fila. Otro valor da
  `PT409` «Ya lo otorgó Rosa hace 1 min.» (o «Ya lo otorgaste … desde otra ventana»). Revocar no mueve la
  versión: volver a otorgar desde «revocado» no choca.
- **Código nuevo siempre** al volver a otorgar; colisión: se comprueba y además se atrapa `unique_violation`,
  hasta 20 intentos. Un índice único sobre el código sin guion.
- **Sólo por RPC:** sin grant ni policy para `authenticated`; sin `trg_auditar`. `actividad` deja
  `portal.otorgado|reotorgado|revocado|desbloqueado` con el código (y el anterior), nunca la clave; revocar o
  desbloquear lo que no cambia no deja constancia. Los ingresos del cliente no van a `actividad`
  (`ultimo_ingreso_en` alcanza).
- **El código se vuelve a ver** en la sección: sin la clave no abre nada y sirve cuando el cliente lo pierde.
  La clave se ve una vez.
- **Revocar se confirma** (nombra el código): un «Deshacer» reabriría un código revocado. **Desbloquear** se
  hace en el lugar y no le avisa al cliente: lo hace la persona por WhatsApp.
- **Transferir y la baja no tocan el acceso** (es del lead). El panel de transferir lee `portal_estado` al
  abrirse —sólo para quien lo gestiona: no suma bytes a «Datos»— y avisa que el cliente verá al nuevo dueño.
  Con la baja, la sección dice «Rosa Mamani (ya no está en el equipo)»; si la cuenta se borra, la FK queda
  en nulo (`on delete set null`) y dice «alguien que ya no está en el equipo».
- **La sección «Portal»** (`?seccion=portal`) aparece con la cartera y el permiso (`puedeGestionarPortal()`),
  nunca vacía (sin acceso: la explicación y «Dar acceso»). Medida aparte: 33,7 KB; «Datos», 42,9 KB en su
  terreno (tope de 44 KB, sin tocar).
  **Alternativas:** «Deshacer» al revocar (otra RPC con otra semántica); leer el estado en `lead_ficha` (suma
  bytes a «Datos» para todos).

## 2026-10-15 — La clave del cliente nunca queda en claro

**Contexto:** la clave temporal es un secreto que la persona dicta. Al leer el runtime de Next 16 apareció que
el servidor de desarrollo imprime cada Server Action **con sus argumentos** (`logging.serverFunctions`, activo
por omisión).
**Decisión:**

- **«Generar» lo hace la base** (`codigo_dictable(10)`: 50 bits, sin I, O, 0 ni 1). Así la clave no viaja
  como argumento, sólo en la respuesta. La escrita viaja como parámetro (PostgREST nunca la pone en el texto
  de la consulta; `log_parameter_max_length_on_error = 0`), y ningún mensaje de error la repite.
- **`logging: { serverFunctions: false }`** en `next.config.ts`, para todo el proyecto: no hay forma de
  silenciar una sola action. Se pierde ese registro en desarrollo para todas.
- **En el navegador** vive sólo en el estado del diálogo: nada en la URL (el panel es `?panel=otorgar-portal`
  y nada más), en `console` ni en el almacenamiento. Se olvida al cerrar y cuando Next esconde la pantalla
  (`<Activity>`: el efecto se limpia). Un test lo comprueba con un `<Activity mode="hidden">` real y falla si
  se quita la limpieza. El campo va sin autocompletar ni corrector (el corrector mejorado de Chrome manda el
  texto a un servicio).
- **En la base:** bcrypt de costo 10 (antes `gen_salt('bf')`, costo 6). La regla: de 8 a 64 caracteres, hasta
  72 bytes (bcrypt ignora lo que sigue: dos claves con los mismos 72 bytes valdrían lo mismo) y sin
  caracteres de control; distingue mayúsculas y no se recorta. `codigo_dictable` pasa a `gen_random_bytes`
  (`random()` no es criptográfico) y ya no la llama la app.

## 2026-10-15 — El texto para WhatsApp: la plantilla en el código, la dirección en `ajustes_web`

**Contexto:** no había ninguna dirección pública de la web: `ajustes_web` no tenía columna y
`WEB_PUBLICA_REVALIDAR_URL` es el endpoint de revalidación, no el sitio.
**Decisión:** la plantilla vive en `entities/portal-mensaje.ts` (español neutro, el nombre de
`ajustes_empresa.nombre`, el código, la clave y que se le pedirá cambiarla). `ajustes_web.direccion_publica`
(nula, `check ^https://`) sin pantalla hasta Configuración › Sitio web (Fase 8); sin ella el texto dice «la
web de <empresa>» y la sección lo avisa a quien otorga. `leads` no importa `empresa` ni `web`: la página
compone `getAjustes()` y `leerDireccionPublica()` (lo primero que exporta `web`). La plantilla editable por
empresa queda pendiente.
**Alternativas:** una variable de entorno (no se puede probar por e2e con y sin dirección); nada hasta la Fase 8.

## 2026-10-15 — Contrato del portal para la Fase 8

**Contexto:** las `web.portal_*` no tenían consumidores; la 7b las endureció y fija lo que la Fase 8 construye
encima (route handlers `api/portal/*`, la cookie y las pantallas). Todas son sólo de `service_role` (el cinturón
falla si una función de `web` que recibe un lead la puede llamar `anon` o `authenticated`).
**Las firmas:**

| Función                                                                                         | Devuelve                                                  | Contrato                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web.portal_login(p_codigo text, p_clave text)`                                                 | `table(lead_id, nombre, debe_cambiar_clave, otorgado_en)` | Normaliza el código (mayúsculas, sin espacios ni signos, 0→O, 1→I). **Una sola respuesta, vacía,** para código inexistente, revocado, bloqueado, lead en la papelera o clave errónea, siempre con un `crypt` del mismo costo (un hash falso si no hay fila). Cinco fallos: 15 min de bloqueo, que no se alarga. |
| `web.portal_snapshot(p_lead uuid, p_otorgado_en timestamptz)`                                   | `jsonb` o `null`                                          | `null` si la sesión no vale (revocado, vuelto a otorgar, otra versión, lead en la papelera). Claves: `cliente` (sólo `nombre`), `asesor`, `vehiculos`, `novedades`.                                                                                                                                             |
| `web.portal_documento_ruta(p_lead uuid, p_otorgado_en timestamptz, p_documento uuid)`           | `text` o `null`                                           | La ruta privada de un documento visible: el handler la firma (URL corta) o la sirve; **nunca** la manda al navegador.                                                                                                                                                                                           |
| `web.portal_cambiar_clave(p_lead uuid, p_otorgado_en timestamptz, p_actual text, p_nueva text)` | `boolean`                                                 | `false` si la sesión no vale, si está bloqueado o si la actual no es (cuenta como un fallo del login). La nueva sigue la regla de la clave (`22023` con el motivo). No corta la sesión.                                                                                                                         |

- **La cookie:** firmada (HMAC con un secreto del servidor), `httpOnly`, `Secure`, `SameSite=Lax`, con
  `lead_id` y `otorgado_en` **tal cual los devolvió el login**. Toda lectura los pasa; un `null` o `false`
  borra la cookie y vuelve al ingreso. Así revocar, volver a otorgar o enviar el lead a la papelera cortan una
  sesión abierta en la siguiente lectura.
- **Límite por IP** en `api/portal/login` y en `cambiar-clave` (el bloqueo es por código: sin el límite, un
  atacante prueba una clave común contra muchos códigos). El prefijo es de la empresa y la parte al azar tiene
  32⁵ ≈ 33 millones de combinaciones.
- **El mismo mensaje** para cualquier fallo de ingreso («El código o la clave no son correctos.»), sin decir
  si el código existe o está bloqueado.
- **Lo que el cliente nunca ve:** costos, proveedores, rutas de buckets privados, el VIN completo (sale
  `vin_parcial`: 3 + 4), seguimientos privados ni eliminados, el documento del editor (sólo `detalle_texto`),
  los campos del lead, oportunidades, etiquetas, marcas ni teléfonos. Las rutas que salen (fotos, avatar)
  son de buckets públicos. Las **novedades** son lo «Visible para el cliente» sin vehículo o de un vehículo
  que no está vinculado a ese lead (sin nombrarlo), las 30 más nuevas; lo de un vehículo vinculado sale con él.
- Cambiar la clave no cambia `otorgado_en`: el corte de todas las sesiones es «Volver a otorgar».

## 2026-10-15 — La auditoría ampliada de la 7b, y lo que encontraron las pruebas

| Objeto                                                | Clase | Antes                                                                                  | Ahora                                                                                   |
| ----------------------------------------------------- | ----- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `otorgar_portal`                                      | 1     | `(p_lead, p_clave) → text`, reemplazaba sin versión, bcrypt costo 6, sin tope de largo | `(p_lead, p_clave, p_otorgado_en_esperado) → jsonb`; genera la clave; versión y `PT409` |
| `revocar_portal`                                      | 1     | igual                                                                                  | constancia con el código                                                                |
| `portal_estado`, `portal_desbloquear`                 | 1     | no existían                                                                            | matriz principal (7 personas × 5 leads) y un caso de la cartera sin el permiso          |
| policy `accesos_portal: leer` y su grant por columnas | —     | la cartera con el permiso leía la tabla, código incluido                               | sin policy ni grant: sólo `portal_estado`                                               |
| `trg_auditar` en `accesos_portal`                     | —     | una fila de `actividad` por cada login del cliente                                     | quitado                                                                                 |
| `codigo_dictable`                                     | —     | `random()`; la llamaban `anon` y `authenticated`                                       | `gen_random_bytes`; sólo las «definer»                                                  |
| `web.portal_login`                                    | web   | el bloqueo lanzaba `42501`; lo inexistente no pagaba el hash; el bloqueo se alargaba   | una respuesta, siempre un `crypt`, `for update`, sin alargar                            |
| `web.portal_snapshot`, `portal_documento_ruta`        | web   | sólo `p_lead`: revocar no cortaba; con el lead en la papelera daba los vehículos       | con `p_otorgado_en`; `null` si no vale; novedades                                       |
| `web.portal_cambiar_clave`                            | web   | sin contar intentos ni mirar el bloqueo                                                | con `p_otorgado_en`, cuenta y bloquea como el login                                     |

- **El cinturón** suma una regla: toda función del esquema `web` que recibe un lead (o, «definer», nombra una
  tabla de leads) y que `anon` o `authenticated` pueden llamar hace fallar; además, que existan las cuatro
  firmas del contrato con `service_role`, que la app no lea `accesos_portal` y que no llame a `_portal_*` ni a
  `codigo_dictable`.
- **Roto a propósito:** `otorgar_portal` con `puede_lead(…, 'leads.portal.gestionar')`: la matriz falló en 12
  celdas (la supervisión sin cartera otorgaba en propio y ajeno; la baja y el bloqueado perdían su mensaje) y
  el cinturón también.
- **Carreras** (`pnpm db:carreras`, 7 nuevas y 3 comprobaciones de bcrypt, todas verdes al primer intento):
  dos otorgan a la vez (los dos órdenes), revocar con el cliente entrando (los dos órdenes), desbloquear
  mientras caen fallos (los dos órdenes) y seis fallos en paralelo bloquean justo al quinto; bcrypt real:
  costo 10, la clave generada entra y el código anterior no, y el mismo tiempo para la clave errónea, el
  código inexistente, el bloqueado y el revocado (~42 ms cada uno).
- **Encontrado al probar:** el caso de «dos mil códigos sin repetir» tardaba ~50 s con `crear_lead` (el resto
  de `db:probar`, ~6 s): los leads se escriben directo y los accesos por la RPC (3 s). En el caso del código
  de colisión, un `$$` dentro de una función creada en el bloque cerraba el `do $$` (va con `$do$`).
- **Encontrado por el e2e completo (celular):** «Recargar» tras un conflicto borraba el aviso al pulsarlo,
  antes de que el refresh trajera la versión nueva; otorgar en ese instante mandaba la vieja y volvía a
  chocar. No era una intermitencia del test sino una carrera de la pantalla: el conflicto se va cuando llega
  la versión (`useOtorgarPortal` la compara en el render) y, mientras, los dos botones de otorgar están
  apagados. El e2e lo afirma («Dar acceso» apagado hasta la versión nueva) y un caso unitario también. La
  segunda corrida completa mostró **la misma carrera en el cambio del teléfono principal (parte 4b)**, que
  hasta ahora pasaba por tiempo: mismo arreglo (`useConflictoHastaLaVersionNueva`, con la versión o el
  principal). El redactor de seguimientos ya esperaba el refresh (`useTransition`); oportunidades y etapas
  recargan la página entera. La tercera corrida mostró otra del mismo formulario: si la conexión volvía antes
  de que la página procesara el envío fallido, el reintento automático salía con `isPending` todavía
  encendido y se descartaba. «Un cambio a la vez» pasó a una marca propia (`useCambioUnaVez`), y el e2e
  espera el aviso del envío pendiente, no el de «sin conexión» que ya estaba antes del clic. Era el único
  formulario con ese guardia.

## 2026-10-15 — CSV de leads (Fase 3, parte 8a): exportar la cartera e importar con las reglas del alta

**Qué se decidió, y por qué**

- **`leads.exportar` sin «todos» y la cartera forzada en la consulta.** El permiso no distingue alcance
  (`con_alcance = false`): lo que sale lo decide `en_cartera = true`, que la consulta pone siempre. Así no hay
  camino para un privado ajeno por el CSV ni para «probarlo» filtrando antes de exportar (filtrar sobre lo
  ajeno ya no encuentra nada). «Ver como» sólo esconde el botón; la base manda con los permisos reales.
- **El archivo se arma dentro del pedido, no en un flujo.** Un `ReadableStream` que lee páginas después de
  responder pierde la sesión (`cookies()` fuera del ámbito del request) y no puede cambiar el estado HTTP si
  falla a la mitad. Con 5.000 filas como tope pesa unos MB; una página que falla da un error, nunca un CSV
  cortado. La constancia (y el cupo) se escriben **después** de armar el archivo: una exportación que falló no
  gasta una de las cinco.
- **Límite por hora contado en `actividad`, con un índice nuevo.** Sin tabla aparte. `registrar_actividad()`
  la puede llamar cualquiera, pero falsear filas sólo bloquea a quien las falsea y nadie las borra. Un
  `pg_advisory_xact_lock` por persona evita que dos exportaciones a la vez pasen por debajo del tope.
- **Un solo `POST` con `Origin` comprobado.** Un `GET` se podría disparar desde otra página y gastaría el cupo.
- **El teléfono sale nacional si es el de la empresa y con «+» si no.** El «+» dispara la regla de fórmulas
  (apóstrofo); el nacional no, y vuelve a entrar igual. Un nacional que empezaría con 0 sale internacional
  (el 0 se tomaría por el troncal). La importación quita **un** apóstrofo delante de un carácter de fórmula.
- **Se parsea en el navegador, no en el servidor.** Las filas tienen que estar en el navegador para mandar
  lotes con ids y reanudar; parsear en una action exigiría subir `bodySizeLimit` para **todas** las actions y
  mandaría el archivo tres veces. La base vuelve a validar todo. Los encabezados nunca son claves de objeto y
  `papaparse` (que sólo hace falta ahí) se pide al elegir el archivo.
- **Cada fila pasa por `validarAlta()`.** El archivo no tiene reglas propias: nombre, teléfono, tipo y origen
  más los requeridos activos, con los mismos motivos. El origen se busca por nombre entre los **activos** (uno
  desconocido es un error de esa fila; no se crea uno al vuelo).
- **Una RPC de lote y `_lead_crear`.** `crear_lead` hacía por fila un Seq Scan sobre `actividad` (la
  búsqueda del intento de adopción) y escribía el «último origen»; el cuerpo pasó a `_lead_crear(…,
p_recordar_origen)` (sin grant) y `crear_lead` es su envoltorio. El lote procesa cada fila en su propia
  subtransacción (una mala no tumba a las demás), ordenado por teléfono (dos lotes que se cruzan toman los
  candados en el mismo orden) y devuelve `creado` (con `repetido` en un reintento), `ya_existe` o `error`. En
  masa **no se nombra a nadie** y **nada se adopta del limbo**.
- **Lotes de 50 filas (no 100), y además por peso.** Medido: un lote de 50 tarda ~49 ms con los índices y
  ~170 ms sin ellos; 500 filas, ~0,5 s de base (el tope es 8 s por consulta). 100 también cabría: queda como
  la constante `FILAS_POR_LOTE` y el tope de la RPC. El lote se parte además a ~600 KB: el cuerpo de una
  Server Action admite 1 MB y un rechazo por tamaño se tomaría por «sin red» y se reintentaría para siempre.
- **«Sin red» y «el servidor no contesta» no se tratan igual.** Sólo la pausa que empezó sin conexión se
  reanuda sola al volver la red; con la red presente, «Reintentar». Un servidor caído no se martilla.
- **Excepción razonada a `.claude/rules/acciones.md`.** «Nada de trabajo largo en una action»: los lotes son
  cortos (~50 ms) y los orquesta el navegador, como apibara; `importar-csv` (edge function) sigue siendo de la
  Fase 9 para el «todo» del dueño.
- **`importaciones` se reutiliza para leads** (`archivo_ruta` nulo sólo con `entidad = 'leads'`) con
  `importaciones_leads` (id del lead y fila): es lo que la 8b usará para deshacer y lo que `datos` leerá.

**Contrato para `datos` (Fase 9):** `shared/lib/csv` (escribir, leer, descargar), `_lead_crear` /
`leads_importar_lote` para leads, `importaciones` con su constancia (`leads.importado`), y la regla de que el
«ya existe» en masa no nombra a nadie.

**Lo que encontraron las pruebas**

- Probado y roto a propósito: sin la fila de `leads_importar_lote` en el cinturón, `db:probar` falla.
- **Regresión mía, encontrada por el e2e en el celular:** el botón «CSV» desbordaba la fila de acciones del
  listado; la página se ensanchaba y la hoja de filtros quedaba descolocada («Ver resultados» tapado). Las
  acciones del `FilterShell` ahora envuelven. Pasó en las dos specs del listado sólo con el menú visible.
- **Carreras** (`db:carreras`, 7 comprobaciones nuevas): dos personas importan el mismo teléfono (una lo crea,
  la otra recibe «ya existe»), el mismo lote desde dos pestañas (todo `repetido`, sin duplicar) y cinco rondas
  de dos lotes de 20 teléfonos en orden contrario, sin interbloqueo.
- **Pendiente de 8b:** deshacer durante 24 horas con una RPC propia (la papelera exige `leads.eliminar` y es
  todo o nada: no sirve para quien sólo importa).

## 2026-10-15 — El reintento al volver la conexión sólo sale al volver: la causa del fallo de `leads-alta-casos`

**Contexto:** en la primera corrida completa de la 8a, «la respuesta se perdió pero el lead entró…» no vio el aviso
«No pudimos llegar al servidor» en 5 s, y Playwright borró los artefactos. La hipótesis del plan (que `route.fetch()`
esperara el re-render de `/` bajo carga) resultó **falsa**: medido, `route.fetch()` tarda ~40 ms.
**Causa:** `useReintentoAlVolver` reenviaba en cuanto aparecía algo pendiente con la red presente, no sólo al volver
la conexión (lo contrario de lo que decía `shared/CLAUDE.md`). Que saliera dependía de una carrera con `isPending` de
`useAction`: si ya se había apagado cuando corría el efecto, el alta se reenviaba sola, la base devolvía `repetido`
y el formulario se limpiaba antes de que se viera el aviso (la captura lo mostró: el paso de datos, vacío). Se
reprodujo **3 de 15** sin carga.
**Decisión:** el hook sale sólo en la transición sin conexión → con conexión. Si el envío falló con la red presente,
la pantalla ofrece «Reintentar» (un servidor caído no se martilla, como ya decidió la 8a para la importación).
`use-importacion` deja de distinguir la pausa sin conexión a mano (`sinConexion`): lo hace el hook para todos.
Después del arreglo: 40 de 40 sin carga y 270 de 270 (el spec entero, ambos proyectos, ×15) con las 8 CPU ocupadas.
**Instrumentación:** `video` y `screenshot` en los fallos (la traza ya estaba) y `test:e2e:completo` copia
`test-results/` y el reporte a `e2e-fallos/<fecha>/` (ignorada por git, los cinco últimos) cuando algo falla.
**Alternativas:** alargar el timeout (sin causa, escondía el bug: también pasaba en la ficha, el redactor y el alta de
vehículos, que usan el mismo hook); esperar `isPending` dentro del hook (seguía siendo un reenvío que nadie pidió).

## 2026-10-15 — Deshacer una importación (Fase 3, parte 8b): clase X, sólo lo intacto, 24 horas

**Contexto:** la 8a dejó `importaciones_leads` para esto. El plan se aprobó sin responder las once preguntas por
número: se tomó la recomendación de cada una.
**Decisión:**

- **`leads_importacion_deshacer(p_importacion)` es de clase X**, no de clase 3: no la autoriza el permiso de la
  papelera sino **haber hecho la importación**, y sólo alcanza a lo que sigue siendo exclusivamente suyo y sin tocar.
  Por eso no pide `leads.crear` ni `leads.eliminar`, sólo estar activa; la supervisión tampoco puede. Ajena,
  inexistente o de otro tipo dan el mismo `42501` «No encontramos esta importación.». Entra al cinturón con su fila
  (probado: sin ella `db:probar` falla nombrándola) y tiene su bloque en la matriz («casos de deshacer»).
  `leads_importaciones_recientes()` también es X: sólo lo propio, con números.
- **«Intacto»** (`_lead_motivo_para_deshacer`, con el lead bloqueado): sigue fuera de la papelera; su única fila en
  `leads_asesores` es la de dueña de quien importó (cualquier otra, **aunque esté revocada**, cuenta: alguien lo tuvo);
  `actualizado_en = creado_en` (la versión de `lead_version()`); y ninguna fila en seguimientos (también eliminados),
  recordatorios, teléfonos extra, vehículos (vinculado, interesado o su historial), oportunidades, portal (también
  revocado), cotizaciones, pagos, eventos, tareas, mensajes, repuestos, testimonios ni solicitudes web. El motivo es el
  primero en ese orden: un lead cuenta una vez. **Las marcas no cuentan, de nadie**, y no se borran: viajan con el lead
  a la papelera (como en la papelera manual) — «descartarlas» habría sido borrar algo para siempre.
- **El futuro no se escapa:** el cinturón fija la lista de toda FK a `leads(id)` (cuenta / marca / vínculo) y exige que
  cada tabla que cuenta aparezca en el cuerpo de la función; fija también las columnas de `leads` y cuáles mueve
  `lead_version()`. Una tabla o columna nueva rompe `db:probar` hasta decidir (probado: sin mirar `pagos`, falla).
- **Plazo:** 24 h desde `terminada_en`, o desde su último lote si quedó abierta (la pestaña se cerró a medias): se
  deshace desde la lista y queda cerrada (un lote tardío recibe «Esta importación ya terminó.»). Fuera de plazo:
  `22023` sin tocar nada; ya deshecha, devuelve lo mismo aunque haya vencido.
- **Una transacción, todo o nada por lead:** candado de la importación (el mismo que toma cada lote: deshacer espera
  al lote en curso y se lleva lo que entró en él), después los leads por id (el orden de la papelera manual) y, con
  todo bloqueado, se vuelve a mirar cada uno. Un solo lote de papelera, de quien importó, que así lo puede restaurar.
  Idempotente: el resultado (conteos, motivos y números de fila) queda en `importaciones.deshecha_resultado`.
- **El tope de 200 no se toca:** el deshacer no pasa por `leads_papelera_enviar`; su tope es el de la importación
  (500). Medido (`pnpm db:medir`): deshacer 500, 102 ms; recientes con 500 intactos, 83 ms; la papelera con ese lote,
  30 ms; restaurarlo entero, 144 ms.
- **Los vínculos se borran 7 días después del plazo** (o de deshacerla) con `importaciones_vinculos_purgar()` en su
  propio cron (`importaciones-vinculos-purgar`, 03:35 UTC): sólo sirven para deshacer. La fila de `importaciones`
  queda, con números. No hizo falta el índice de `importaciones_leads (creado_en)` que decía el plan: la purga
  elige por importación.
- **`authenticated` ya no escribe `importaciones` directo** (se borraron las policies «crear» y «borrar»): con un
  INSERT se fabricaba un `terminada_en` futuro (una ventana sin fin) o se borraba la propia con sus vínculos.
- **Datos:** la respuesta, `leads.importacion_deshecha` (`movidos`, `quedaron`, `por_motivo`, `purgados`) y la lista
  llevan sólo números, claves de motivo y números de fila. El trigger `lead_auditar` sigue dejando en `actividad`,
  por cada lead que va a la papelera, el antes/después con nombre y atributos (sin teléfono), como en la papelera
  manual: cambiarlo es de la fase de Actividad, que ya tiene pendiente leer el diff recortado.
- **Reimportar lo deshecho:** sin cambios. `_lead_verificar` y el índice único ignoran la papelera, así que el mismo
  archivo vuelve a entrar como leads nuevos; si después se restaura el lote, esos quedan adentro con «ya tiene este
  teléfono», la regla de siempre.
- **Interfaz:** el botón en el resultado del asistente (con «Quedan N h») y «Tus importaciones recientes» en
  `/leads/importar`, que se ve aunque ya no se tenga `leads.crear`. La confirmación del asistente cuenta lo que entró
  (la pantalla no sabe qué cambió después); el resultado dice lo que decidió la base. La importación recién hecha
  aparece en los dos lugares: los dos botones son el mismo pedido idempotente.
- **No estaba en el plan:** `/leads/papelera` sólo abría con `leads.eliminar` o `leads.papelera.purgar`, así que quien
  importa sin ellos no podía restaurar su lote desde la pantalla. Ahora abre también con `leads.crear`; la base sigue
  mostrando sólo los lotes propios.
  **Alternativas:** reutilizar `leads_papelera_enviar` (todo o nada y con `leads.eliminar`: no servía); borrar en vez
  de mandar a la papelera (irreversible); un trigger por tabla que marque «tocado» (más superficie que mirar al
  deshacer, y escribiría en cada operación de leads).

## 2026-10-15 — El país del teléfono: una tabla estática en el cliente, y «País» sigue al número

**Contexto:** quien tipeaba «+54 9 11…» no veía de qué país era el número; «País» sólo traía el de la empresa; la
ficha partía únicamente los números de la empresa y un extra de otro país se veía «+5491155550000»; la importación
dejaba «País» vacío (ni el CSV ni la base aplican `valor_defecto_empresa`: eso era sólo del formulario del alta).
**Decisión:**

- **Tabla propia, no librería.** 242 países y territorios con código de llamada propio (plan E.164): `nombres.ts`
  (ISO → nombre en español, el de ICU salvo «Islas Åland» y «Costa de Marfil») y `prefijos.ts` (dígitos → ISO). El
  chunk compilado pesa 6,3 KB (3,4 KB comprimido) y sólo se pide con `import()`. `libphonenumber-js` (no está en el
  proyecto) pesa varias veces más, no trae los nombres en español y valida mucho más de lo que hace falta. La prueba
  compara cada ISO y cada nombre con `Intl.DisplayNames('es')`, exige prefijos sin 0 y sin choques entre códigos.
- **Sin SQL ni migración:** el país es texto dentro de `atributos.pais`; no hay nada que la base tenga que saber.
  `normalizar_telefono()` no cambia (el espejo `telefono.ts` tampoco).
- **Lo que no se adivina:** +1 (Estados Unidos y Canadá comparten plan y sus áreas se superponen y cambian) y +590
  (Guadalupe, San Bartolomé y San Martín) dicen «Estados Unidos o Canadá» y, con «País» activo, ofrecen un botón por
  país. El Caribe del +1 **sí** se sabe, por su área (809/829/849 → República Dominicana, 787/939 → Puerto Rico, 876
  y 658 → Jamaica, 242 → Bahamas…: 27 áreas). +7 es Rusia salvo 76 y 77 (Kazajistán). Sub-prefijos deterministas:
  +262 (Mayotte), +599 (Curazao y Caribe neerlandés), +358 18 (Åland), +39 06 698 (Vaticano), +47 79 (Svalbard),
  +61 8916 (Christmas y Cocos) y +212 5288/5289 (Sáhara Occidental). Guernsey, Jersey y Man quedan como Reino Unido:
  comparten el +44 y sus móviles no se distinguen. Un prefijo sin país dice «Código de país desconocido».
- **Qué se guarda:** el nombre como **texto**, igual que hoy. Si el número cae en la **misma regla** que el código
  de la empresa (o no trae «+» ni «00»), se guarda **el texto de la empresa**: no hay dos grafías de «Bolivia».
  Con +1 la regla es la misma para toda la zona: una empresa de Estados Unidos que escribe un número +1 416 queda
  con su texto («Estados Unidos»); con 809 es otra regla y queda República Dominicana. **Pendiente de revisar si
  molesta en una empresa en +1:** es la única parte que adivina, y lo hace a favor de la empresa.
- **«País» sigue al número** mientras esté vacío o tenga algo que puso el sistema: el de la empresa con el que nació
  el alta, el último sugerido, el que se eligió con un botón o el país del número que había antes (así un borrador
  repuesto sigue). Lo que la persona escribe no se pisa; si lo borra, vuelve a seguir **al próximo cambio del
  número** (no se vuelve a llenar solo en el momento: no se le puede impedir dejarlo vacío). Un número a medio tipear
  no toca nada. Sin tabla (todavía no llegó o falló la red), nada se llena.
- **Se busca por clave:** `clave === 'pais'` y activo (es de fábrica: no cambia de clave ni de tipo), así que
  renombrarlo («País de residencia») sigue andando y el aviso usa su etiqueta de hoy. Apagado: la línea con el país
  se dice igual, pero no se llena nada ni se ofrecen botones.
- **La línea sale al tipear**, no tras la verificación: es una cuenta local. Se esconde cuando la verificación dice
  «existe», «de otro» o «limbo» (manda el aviso y no se muestra nada del otro lead). Va en la `ayuda` del campo
  (enlazada por `aria-describedby`) y el cambio de país se anuncia aparte, una vez, en una región `sr-only`.
- **Un lead que ya existe nunca cambia de país por cambiar un teléfono:** el cambio del principal y los extras de la
  ficha sólo dicen el país del número, no tocan `atributos`. El lead del limbo que se toma completa «País» sólo si no
  lo tenía (la regla de siempre, `_atributos_completar`).
- **La ficha** pide la tabla ya hidratada: el documento (RSC y HTML) no cambia y el presupuesto de «Datos» no se
  toca. Parte cada número por su código y dice el país; el enmascarado («•••») no lleva país: con tres dígitos no es
  seguro (+1 809 queda «180») y no se revela más de lo que ya se ve. Como la ficha no lee `ajustes_empresa`, usa el
  nombre de la tabla, no el texto de la empresa.
- **El CSV** completa «País» en `prepararFilas()` con el mismo cálculo: sólo donde la celda viene vacía o el archivo
  no trae la columna. La vista previa lo dice en esa fila y el archivo de errores conserva las celdas originales.
  **Alternativas:** `libphonenumber-js` (peso y nombres); guardar el ISO en `atributos.pais` (el campo es de texto
  libre y hoy guarda «Bolivia»: habría dos formas en la cartera); preguntar el país al servidor (una petición más por
  dígito, y la tabla es estática); adivinar +1 (un lead de Canadá marcado como de Estados Unidos).
  **Consecuencia:** la tabla vive en `leads/entities/paises/` con su prueba; un import estático de ella en el shell
  rompe el e2e «la tabla de países no viaja con /leads».
  **Medido:** el JS cliente total creció 5,6 KB con gzip (788,5 → 794,1) contra la parte 8b: 3,4 KB son el chunk de la tabla y
  2,2 KB el pegamento que entra en el shell (el alta está en todas las rutas): `resolver`, `pais-del-telefono`, el estado del
  alta y los hooks. Es más de lo previsto; se acepta porque la tabla, que es lo grande, no viaja. «Datos» 43,4 de 44 KB.

## 2026-10-16 — El primer seguimiento del alta, opcional y enriquecido (Fase 3, parte 9b)

**Contexto.** «Nuevo lead» obligaba a escribir un resumen para guardar (~30 altas al día, muchas sin nada que anotar), el
detalle era un `Textarea` plano que `_lead_crear` guardaba sólo como `detalle_texto`, y «Recordatorio (opcional)» abierto
siempre empujaba a agendar incluso al anotar algo que ya pasó.

**Decidido**

- **El paso 2 es opcional y la pantalla lo dice sin bloquear** (nada de diálogo de confirmación). `Ctrl/Cmd+Enter` sigue
  avanzando (memoria muscular, y el e2e de los 25 s no cambia de forma); «Guardar lead» y `Ctrl/Cmd+S` guardan desde
  cualquier paso. Una sola regla: **se guarda lo escrito y lo vacío no**; por eso «Guardar lead» desde el paso 1 nunca
  tira lo que se escribió en el 2. El aviso va en el pie, unido por `aria-describedby` al botón: «Se creará sin primer
  seguimiento. Podrás anotarlo después desde la ficha.» (o «Se guardará con el primer seguimiento que escribiste.»).
- **`Ctrl/Cmd+S` en «Nuevo lead» guarda y deja el drawer listo para el siguiente; no lo cierra.** La regla global sólo
  dice «guardar»; lo de «guardar y cerrar» es de vehículos. El drawer es una herramienta de ráfaga y el toast ya lleva a
  la ficha.
- **Qué cuenta como «escrito»:** el resumen, un detalle con texto, una fecha elegida y un próximo contacto. Cambiar sólo el
  tipo, o abrir «Otra fecha» sin elegir, no cuenta. **Con un detalle o un próximo contacto sin resumen se exige el
  resumen, no se deriva del detalle:** es lo que se lee en la línea de tiempo y el título del recordatorio, un recorte de
  un documento con formato daría títulos rotos, y la ficha y la base ya lo exigen.
- **El toast sin seguimiento** dice «Lead #124 creado sin seguimiento» (o «tomado …») y su «Abrir ficha» va a
  `?seccion=seguimientos`, donde ya está «Anotar seguimiento»: cero componentes nuevos.
- **Un solo conjunto de campos** (`CamposDelSeguimiento`) para la ficha y el alta, sin `<form>`, pie ni foco propio: los
  modales de la 9c y la 9d lo montan tal cual. La ficha pone «Visible para el cliente» y el vehículo; el alta no
  (**«Visible para el cliente» no entra al alta**: la base rechaza `visibilidad` y `vehiculo_id` en `p_seguimiento`).
- **«Próximo contacto»** es el recordatorio que nace con un seguimiento, dicho por lo que hace: plegado detrás de
  «Programar próximo contacto», con la línea «Un recordatorio para ti: cuándo volver a contactar a este lead.» y sus
  atajos. En el código y en la base sigue siendo `recordatorio` (no hay entidad nueva). No promete un aviso: el disparo
  es de la Fase 7.
- **`ocurrido_en` pasado sí, futuro no** (`_seguimiento_fecha`: 5 minutos de margen por los relojes; la pantalla, ninguno).
- **La base reusa las reglas, no las copia:** `_lead_crear` valida el resumen, el detalle y la fecha con
  `_seguimiento_titulo`, `_seguimiento_detalle` y `_seguimiento_fecha` y vuelve a lanzar el mismo mensaje con el campo del
  alta en el `hint` (`seguimiento.detalle`, `seguimiento.ocurrido_en`). `p_seguimiento.detalle` es un documento o nulo; un
  texto se rechaza («formato que no se admite»). La forma de `crear_lead` (jsonb) no cambia, y la importación sigue sin
  seguimiento. Sin cambio de schema: `db:base` no hace falta y `db:types` sale igual.
- **Borrador:** uno solo (`lead-nuevo`), con los datos del lead y, bajo la clave `seguimiento`, los mismos valores que usa
  el redactor de la ficha (el documento como JSON; al reponerlo pasa otra vez por `documentoLimpio()`). Un solo
  «Recuperamos lo que habías escrito». **Sin tope de peso:** un documento válido pesa ≤ 20 000 octetos y uno que se pasa se
  conserva para recortarlo (perder lo tipeado es el error que no puede pasar); si `sessionStorage` no alcanza, el
  borrador ya lo calla. Los borradores viejos con `seguimiento.*` se ignoran solos.
- **Sin tipos de seguimiento activos** no hay paso 2: «Guardar lead» es el principal y el pie lo dice. No se bloquea.
- **La barra del editor tiene una sola parada de Tab** (patrón _toolbar_ de WAI-ARIA: flechas, Inicio y Fin). Antes eran
  cinco paradas antes del texto, también en la ficha; con el próximo contacto plegado, llegar a él con el teclado es Tab ×3.
- **La tarea de oro mide el seguimiento, no el próximo contacto:** `n`, Tab, `Ctrl+Enter`, resumen, `Ctrl+Enter`. El tope
  de 8 teclas de control, el KLM ≤ 25 s y el robot < 15 s siguen; el próximo contacto con teclado tiene su propio e2e.

**Un hallazgo de la verificación contra la base viva (arreglado en la misma migración).** Dos envíos del mismo intento
sobre un lead sin dueño pasaban los dos la búsqueda del intento en `actividad` (aún sin confirmar); el segundo esperaba el
`for update` y, al soltarse, **adoptaba otra vez e insertaba un segundo seguimiento y otro recordatorio**. Ahora vuelve a
mirar el intento tras el candado. Lo prueba `pnpm db:carreras` (`scripts/carreras/alta.mjs`: falla con la función
anterior, pasa con la nueva). Sigue abierto, y no es de esta parte, lo que pasa si _otra persona_ con _otro intento_
adopta el mismo lead entre la verificación y el candado.

**Alternativas.** Aceptar `detalle` como texto plano en `crear_lead` (compatibilidad que nadie usa: dos reglas para un
mismo campo). Derivar el resumen del detalle. Un botón «Guardar lead sin seguimiento» y otro «con»: el botón no sabe qué
se escribió. Tres botones con un diálogo de confirmación: son decenas de altas al día.

**Consecuencia.** `entities/primer-seguimiento.ts` (el validador del documento y las fechas) se pide con `import()` al
guardar con algo escrito, y los campos del paso 2 y Tiptap no viajan con el drawer (un e2e lo vigila: ningún chunk con
ProseMirror hasta abrir el paso 2). **Medido:** la carga en frío de `/leads` creció 0,7 KB con gzip (570,8 → 571,5 KB en
escritorio) contra el presupuesto de 1 KB del shell; el editor sigue siendo su chunk aparte. Lo que entra al shell es el estado del alta y `documento-limpio` (el borrador lo necesita para reponer el detalle por la lista blanca): moverlo a un `import()` ahorraría unos bytes pero, sin red, un borrador no se repondría y el siguiente `useEffect` lo borraría, y perder lo tipeado es el error que no puede pasar. Si el paso 2 no llega (sin red y sin caché) el drawer lo dice con «Recargar» en lugar de tumbar la pantalla; lo escrito queda en el borrador.

## 2026-10-16 — Guardar en Empresa: el formulario espera a lo guardado, y el borrador mide contra lo que mandó el servidor

**Contexto.** En la suite completa, «sin conexión, el formulario avisa y conserva lo tipeado» falló una vez: tras guardar,
el NIT tipeado y la recarga no repusieron nada. La traza lo explica. `guardarAjustes` hace `revalidatePath('/', 'layout')`:
la respuesta de la action trae el resultado y el árbol nuevo. `useGuardarAjustes` muestra «guardados» y llama a `limpiar()`
apenas se resuelve la promesa, pero `enCurso` (el `isPending` de la transición de next-safe-action) sigue activo hasta que React
dibuja el árbol, y ahí `key={huellaDelFormulario()}` reemplaza el formulario. En esa ventana (~130 ms con las 8 CPU ocupadas,
más en un celular) el campo con foco sale del DOM y lo que se teclea cae en ningún campo (Playwright parte `fill` en
`select()+focus()` y un `insertText` por CDP que no se vuelve a comprobar; una persona pierde cada tecla que cae después del
reemplazo). Se descartó que `activo` o `campos` cambiaran en Empresa (son constantes) y que el aviso no se viera (el NIT quedó vacío).

**Decisión.**

- **Bloquear hasta el remontaje, y por qué con `enCurso`.** El `<fieldset>` de Empresa se deshabilita con `!puedeEditar || enCurso`.
  `enCurso` es `subiendo || isPending` y `isPending` es el de la transición: no termina cuando llega la respuesta sino cuando se
  dibuja, que es justo el intervalo que hay que cubrir (una bandera propia, apagada al resolver la promesa, lo dejaría abierto).
  Si no cambió nada, la huella no cambia, no hay remontaje y la transición igual termina y desbloquea. Se deshabilita el
  formulario entero, no el botón: es el único lugar donde la persona puede estar tecleando.
- **La base del borrador es lo que mandó el servidor.** `useBorrador` ya no lee «lo guardado» del DOM al enganchar el efecto:
  usa `valoresGuardadosDe()` (junto a `valoresDe()` en `shared/lib/formularios.ts`): el `defaultValue` de cada campo y la opción
  marcada de un `<select>`, normalizados como los muestra el navegador (una entrada nueva, no un `cloneNode`: clonar copia lo
  escrito) y con lo deshabilitado vacío, igual que `FormData`. Así lo tipeado antes de enganchar (antes de hidratar, o entre el
  commit y el efecto pasivo) cuenta como cambio; al enganchar se guarda en el acto y no lo pisa un borrador viejo.
- **`controlado: true` para los formularios de React.** React sincroniza el atributo `value` de un `<input>` controlado pero no
  marca `defaultSelected` en un `<select>` controlado: sin `defaultValue` que leer, el valor inicial se vería como un cambio
  y saldría un «Recuperamos» falso en cada carga (lo cazó la prueba de carga limpia del formulario de campo de leads). Esos
  formularios (`FormularioDeCampo`) lo declaran y miden contra lo que se ve al enganchar, como antes. No hay forma de detectarlo
  desde el DOM sin mirar internos de React.
- **`campos` se compara por contenido.** `FormularioDeCampo` arma la lista en cada render; el efecto se reenganchaba en cada
  tecla y tomaba lo ya tipeado como guardado: escribir en un segundo campo borraba del borrador lo del primero (la hipótesis 1
  del diagnóstico era cierta, pero en el formulario de campo, no en Empresa).
- **`enfocarPrimerError` insiste** hasta 30 cuadros hasta que el campo con error exista y acepte el foco: los `aria-invalid` se
  pintan cuando React dibuja la respuesta y un fieldset deshabilitado no deja enfocar. Ya fallaba sin el bloqueo: 6 de 40 con la CPU ocupada.
- **`FormularioDeCampo` llama a `limpiar()`** al guardar o crear (lo ignoraba y el borrador sobrevivía).

**Alternativas.** Dejar el `key=huella` y no remontar tras el guardado propio (revierte la decisión que hace que el guardado de
otra persona reinicie el formulario). Sólo esperar «Guardar» habilitado en la prueba (esconde el defecto y deja la brecha
commit → efecto). `defaultValue`/`defaultSelected` por llamador (`guardado` por props, como `useBorradorDeEstado`): cada formulario
armaría strings que tienen que coincidir con lo que pinta el input.

**Consecuencia.** Quien guarda Empresa no puede teclear en el formulario hasta que se dibuja lo guardado (decenas de ms; un
celular lento, más): se ve «Guardando…» y los campos apagados. Un formulario con un `<select>` controlado que use `useBorrador`
tiene que pasar `controlado`; la prueba de carga limpia es la barandilla (falla si no). `useBorradorDeEstado` no tiene este problema:
mide contra `guardado` por props. **Barandillas:** `use-borrador.test.tsx`, la carga limpia de los 17 campos de Empresa y de los formularios de
campo de leads y de orígenes, y `e2e/empresa-guardado.spec.ts` (no se teclea mientras guarda; guardar con la CPU frenada, sólo escritorio:
con el freno solo la prueba pasa también sin el arreglo, así que la determinista es la que cuenta).

## 2026-10-16 — Los avisos no reciben el puntero; el freno de CPU se borra; lo del borrador no se reproduce

**Contexto.** «edita un tipo de cambio» (`empresa.spec.ts:158`) se colgaba a veces 30 s en el clic de «Cerrar» (1 de 40 y 2 de 40
con las 8 CPU ocupadas). Quedaban también el e2e del freno de CPU, que pasaba sin el arreglo del borrador, y un borrador que
había reaparecido tras `limpiar()`.

**Causa del toast (confirmada, no supuesta).** Tres medidas, la última aislada del test:

1. El registro de Playwright: 52 reintentos con `<li class="cn-toast" data-front="true">` interceptando el clic. «Cerrar» es el
   botón del **pie** (`.first()`: la ✕ de `SheetContent` va después de los hijos en el DOM).
2. La captura del fallo: el aviso (arriba en y≈643) cubre el pie y el centro de «Cerrar» está en y≈648, 5 px dentro. Por eso el
   fallo es de a ratos: depende de la fase de la animación de entrada. Con un aviso asentado en cualquier momento el centro
   queda tapado: la prueba determinista nueva falló **40 de 40** sin el arreglo, siempre en el `elementFromPoint` de «Cerrar»
   (escritorio y móvil).
3. La pausa: sonner 2.0.8 marca la pila expandida con `onMouseEnter`/`onMouseMove` del `<ol>` y `expanded` pausa el
   temporizador. Medido: sin puntero, el aviso se va antes de 6,5 s; con el puntero encima (aviso asentado) sigue a los 6,5 s con
   `data-expanded=true` y se va al sacar el puntero. Playwright mueve el puntero al punto del clic antes de comprobar el blanco: queda
   sobre el aviso, lo pausa y el clic no entra nunca.
   Es de producto, no del test: una persona que acaba de guardar tiene el pie del panel tapado ~4 s, y más si deja el puntero ahí.

**Decisión.** En `src/shared/ui/sonner.tsx`, `toast: 'cn-toast pointer-events-none [&_button]:pointer-events-auto'`: el aviso deja
pasar el puntero y sólo sus botones lo reciben («Descartar», «Deshacer», «Recargar», «Ingresar» y la ✕). Sin puntero encima no hay
pausa. **Alternativas:** mover el Toaster (arriba tapa la ✕ del panel y la barra superior; a la izquierda, la navegación; en móvil el
aviso ocupa todo el ancho de todas formas); subir el `offset` (hay que adivinar la altura del pie); cerrar el aviso o mover el puntero
en el test (taparía el fallo real; `descartarAviso()` de `e2e/soporte/inventario.ts` es ese parche y queda: sigue valiendo).
**Consecuencia.** Se pierde el deslizar para descartar en táctil y el hover que expande la pila: el aviso se va solo y su ✕ queda. Un
aviso con otro tipo de control tiene que ganarse su `pointer-events-auto`. La prueba (`empresa-guardado.spec.ts`) cubre dos avisos
apilados, escritorio y móvil, Escape con avisos abiertos y un aviso con acción («Descartar»).

**El freno de CPU se borra.** `guardar con la pantalla lenta…` (`Emulation.setCPUThrottlingRate`, rate 20) agrandaba la ventana
entre el aviso y el remontaje pero no fija el orden de los eventos: pasó sobre el código viejo 0 de 33 veces (y 0 de 40 sobre el nuevo).
Una prueba que pasa con y sin el arreglo no guarda nada. La barandilla es «mientras guarda no se puede teclear» (roja 33 de 33 sin el
arreglo, con la respuesta de la action retenida por `page.route`).

**Hallazgo de la medición (no se arregla acá).** El panel de un tipo de cambio tiene la misma ventana que Empresa: el aviso sale
antes de que el panel se dibuje con lo guardado, y lo que se teclea ahí se pierde (el formulario se reemplaza). Apareció una vez en 40
en mi prueba (el segundo valor tecleado desapareció del DOM y no hubo segundo guardado); la prueba ahora espera al historial. Otros
formularios con `key` por versión pueden tenerla; la barandilla de Empresa es «sin teclear mientras `enCurso`».

**Borrador tras `limpiar()`: no reproducido.** En el experimento con la respuesta retenida (Empresa, tecleando mientras guardaba) el
borrador seguía en `sessionStorage` tras el guardado, con `{razonSocial, nit}` y la base vieja. Experimento de esta parte: prueba
unitaria con `limpiar()`, desmontar y montar de nuevo con lo guardado ya cambiado → **no reproduce** (sin borrador y sin aviso;
pasa sin tocar el hook), y la prueba se descartó por pasar sobre el código actual. **No explicado.** Hipótesis, **no verificada**: el
formulario viejo salió del DOM con un campo enfocado, el navegador disparó `change` y el oyente viejo (todavía enganchado: su
limpieza corre después) volvió a escribir con la base vieja. Con el formulario deshabilitado mientras guarda ya no se puede teclear en esa
ventana; si reaparece un «Recuperamos» tras un guardado exitoso, esta es la pista (ignorar `change` tras `limpiar()` hasta el
próximo `input`) y lo que falta es un e2e que lo provoque.

## 2026-10-16 — Los e2e reusan la sesión de cada cuenta dentro del proceso, y sólo eso

**Decisión.** `entrar` (`e2e/soporte/alta.ts` e `inventario.ts`) llama a `entrarConSesion` (`e2e/soporte/pasos.ts`): la primera vez que
se entra con una cuenta es por la pantalla de ingreso; las siguientes, en el mismo proceso de Playwright, se inyectan las cookies de esa
sesión en el contexto nuevo del test y se pide `/`. Si `/` manda al ingreso (la sesión caducó, la cuenta se borró o se bloqueó), se
descarta la sesión y se entra por interfaz: nunca se sigue con una sesión rota. La caché vale 30 minutos (el token de acceso dura una hora).

**Por qué.** Era el único candidato que superaba el umbral: el ingreso eran 125 s de 577 s en escritorio, ~19 % del completo, y el
completo bajó de 22,1 a 20,5 min (la mitad de lo esperado: pedir `/` con la sesión puesta también cuesta). Los permisos se leen de la base en
cada pedido, no del token (no hay hook de JWT en `config.toml`), así que una sesión guardada no deja permisos viejos; y ningún e2e cierra sesión.

**Qué sigue cubriendo el ingreso real.** `acceso.spec.ts` ingresa sin caché (contraseña mala, ruta protegida que vuelve a donde iba,
la primera persona nace dueña); los specs de equipo, empresa, orígenes y configuración de leads tienen su propio `entrar` por interfaz
(bloquean a alguien, cambian de rol, abren el registro); y el primer `entrar` de cada cuenta de cada spec sigue siendo por interfaz.
Rompiendo `ingresar` a propósito, fallaron `acceso.spec` y el primer `entrar` de `leads-vehiculos-acceso`. Un test que cambie a la
persona o su acceso a mitad de camino pide `{ fresco: true }`.

**Lo que no se hizo, con su número.** «Solo escritorio»: los tests sin `page` son 5 (~12 s de móvil, 0,9 %) y el resto navega por interfaz,
así que no hay lista que aprobar. Reusar `.next-e2e` por una huella del código: el build son 8 s por `test:e2e` (3 s de TypeScript), bajo el
umbral; si algún día pesa, la huella debe incluir HEAD, el diff, `next.config.ts`, el lockfile y las `NEXT_PUBLIC_*` que se hornean en el
build (un `.next-e2e` viejo con código nuevo es peor que reconstruir). `tsc` ya era incremental. Video y traza (`retain-on-failure`) no
cuestan nada medible (A/B ×3: 77,3 s con ellos, 76,9 s sin ellos) y fueron los que permitieron diagnosticar el intermitente de Empresa.

## 2026-10-16 — Parte 9c: los formularios que aparecen al pulsar algo van en un modal con su URL

**Contexto.** «Agregar teléfono» y «Agendar / Editar recordatorio» se abrían dentro de la página, con estado local: recargar los
perdía, no tenían borrador ni «Recargar», y un Esc los cerraba sin preguntar. El diálogo «Dar acceso al portal» tenía tres
acciones en el pie, se salía de la pantalla en el celular y en 1280 (los tres botones empujaban el contenido fuera del borde), y la
clave podía reaparecer al reabrirlo.

**El patrón «modal por URL».** Un formulario que aparece al pulsar algo (y no es parte natural de la pantalla, como un campo en su
fila) es un `<Modal>` con su `?panel=` (y el id en otra clave: `?panel=editar-recordatorio&recordatorio=<id>`). Abrir suma al
historial («atrás» lo cierra) y recargar lo reabre. Sin permiso, la URL escrita a mano no abre nada. **Un id que no está** (ajeno,
eliminado, inventado o mal escrito: la lista sólo trae lo propio) o un estado que no se edita (completado) se revisa **una vez, al
abrir**: no se abre, lo dice un aviso y la URL se limpia. Si deja de estar **con el modal abierto**, el modal no se cierra: dice por
qué ya no se guarda y lo escrito queda a la vista. Quien monta el modal le da una `key` por apertura (`useApertura`): cada apertura
empieza de cero (un id de intento nuevo) sin cortar la animación de cierre. Se cargan con `next/dynamic` + `useAbiertoAlgunaVez`
(no cambia el documento —«Datos» sigue en 43,4 KB—: sólo el JS que se pide al abrir). `hayPanel` de la ficha pasa a ser «hay
un `?panel=`»: la lista de paneles se quedaba atrás (las oportunidades nunca estuvieron) y la ficha se releía con un modal abierto.
**Alternativa:** Drawer, sólo para lo que no cabe en una pantalla de celular (el redactor de seguimientos, a decidir en la 9d).

**Cerrar con cambios pregunta en el mismo modal, no en otro.** `Confirmar` es un `<Modal>`: abrirlo encima rompería «un modal
nunca abre otro modal». `useCierreConCambios` + `ConfirmarDescarte` cambian el pie a «Tienes cambios sin guardar.» con «Seguir
editando» (con el foco: un Enter de más no tira nada) y «Descartar». Esc durante la pregunta vuelve al formulario. Sin cambios, cierra
directo. «Atrás» del navegador no se puede interceptar y cierra sin preguntar: el recordatorio no pierde nada (su borrador lo repone
al reabrir); el teléfono extra (dos campos) sí, aceptado.

**Mientras guarda, el formulario no se toca y el modal no se cierra.** La regla de Empresa (2026-10-16: `<fieldset disabled>` con
`enCurso`) vale para todo formulario que se redibuja con la respuesta. El modal suma `bloqueado`: Esc, la ✕ y el clic afuera no lo
cierran mientras el pedido está en vuelo, porque la respuesta llegaría con el modal cerrado (en el portal, con la clave). Un envío a
la vez con una marca propia (`useRef`), no con `isPending`: el reintento al volver la conexión puede llegar mientras el anterior
termina (lo mismo que encontró la 7b en el cambio del teléfono).

**Esc tiene una sola fuente, y es Base UI.** El plan suponía que Esc llamaba dos veces a `alCerrar` (Base UI y el atajo «cerrar»).
Medido en un test: Base UI atiende Esc en el `document` y **detiene el evento**, así que el atajo de `window` nunca lo veía con un
diálogo abierto. El Modal deja de registrar el atajo (era código muerto). Para abrir un Modal desde un Drawer (9d), se dibuja dentro
de los hijos del Drawer: Base UI lo anida y Esc cierra sólo el de arriba.

**El portal: un solo botón principal.** El texto dice lo que hará con lo que hay en el campo: vacío, «Generar clave y dar acceso»;
con algo escrito, «Dar acceso con esta clave». Nunca queda deshabilitado sin motivo (sólo mientras otorga, o tras un conflicto, que
se explica adentro) y nunca tira en silencio una clave escrita (antes, «Generar» la ignoraba). **Alternativa:** «Generar una clave»
como enlace bajo el campo y «Dar acceso» como principal: dos caminos que hay que explicar. La clave se olvida **cuando el diálogo
termina de cerrarse** (`alTerminarDeCerrar`, el `onOpenChangeComplete` de Base UI) y no al cerrar: si se borraba al cerrar, el diálogo
volvía al formulario mientras se desvanecía. También se olvida al reabrir y al esconderse la pantalla; una respuesta que llega
después de olvidar (se cerró con «atrás» mientras otorgaba) se descarta por generación. En el celular el Modal va arriba, desplaza
su cuerpo y deja el pie a la vista, con botones de 44 px; el portal usa `ancho="amplio"` (512 px) por el texto de WhatsApp.

**Los campos del recordatorio son los del alta.** El «Próximo contacto» del alta y del redactor y el modal del recordatorio ya usaban
el mismo `CampoCuando` (con `atajosDeFecha()`) y el mismo `CampoVehiculo`: no había nada duplicado. `CamposDelRecordatorio` (sin
`<form>` ni pie) es lo que monta el modal. El teléfono extra reutiliza `CampoTelefono` con un estado sin verificación: un extra no es
único entre leads y no se pregunta a la base al tipear.

**Lo que encontró la revisión adversarial (corregido en commits propios).** El modal cerrado sigue montado (`useAbiertoAlgunaVez`):
un guardado que esperaba la red salía solo al volver aunque la persona lo hubiera descartado, y el borrador del recordatorio se
volvía a escribir con lo descartado si llegaba otra versión. Ahora `abierto` frena el reintento y el borrador (`activo`). La `key`
del modal de recordatorios lleva el destino (`agendar` o el id): pasar de uno a otro con el historial no mezcla lo escrito. Tras
«Recargar», lo que la persona no tocó toma la versión nueva (`conVersionNueva()`): antes se reenviaba entero y pisaba con lo viejo
un campo que había cambiado la otra ventana. `Ctrl/Cmd+S` no guarda mientras el pie pregunta por descartar. En el portal, un pedido
a la vez (un doble Enter otorgaba dos veces), otra generación también al reabrir, y si la clave llega con el diálogo ya cerrado se
avisa que el acceso cambió («Vuelve a otorgarlo para dictarle una nueva»). **Queda aceptado:** «atrás» durante un guardado cierra el
modal; si ese guardado falla, el motivo queda en el modal cerrado (al reabrir empieza de cero).

## 2026-10-16 — Parte 9d: un solo modal de seguimiento, la pestaña del drawer y las acciones de la fila

**Contexto.** Anotar y editar un seguimiento eran un redactor dentro de la ficha (sin URL; se abría solo si había un borrador;
Esc lo plegaba; el conflicto se borraba al pulsar «Recargar»). El drawer del lead era de sólo lectura y el «⋯» de la fila sólo
tenía marcas. La 9d los lleva al patrón «modal por URL» de la 9c.

**Un solo contrato, en una pieza de `shared`.** El modal del recordatorio (9c) y el del seguimiento repetían casi todo: avisos,
`<fieldset>` y `bloqueado` mientras guarda, el descarte en el mismo pie, atajos, la revisión al abrir, un envío a la vez y el
conflicto que espera la versión nueva. Todo salía **genérico y sin banderas** (lo que cambia son datos: el título, el texto del
conflicto, la etiqueta del botón), así que es `ModalDeFormulario` con tres hooks (`useUnEnvioALaVez`,
`useConflictoHastaLaVersion`, `useRevisionAlAbrir`), archivos nuevos de `shared/ui` con un solo test de contrato. El recordatorio,
el teléfono extra y el seguimiento son modales delgados encima. **Alternativa:** dos modales con el test de contrato copiado: la
próxima diferencia entre ellos sería un defecto. El foco va al primer motivo **tras un intento que no guardó**, no cada vez que
cambian los motivos: con dos campos con motivo, escribir en uno llevaba el foco al otro.

**El borrador no abre el modal solo.** Con el modal, abrirse al cargar la sección sería un modal que aparece sin pedirlo. En su
lugar, «Tienes un seguimiento sin guardar» con «Continuar» (las mismas claves de borrador que el redactor: lo viejo vuelve igual).

**«Recargar» vuelve a leer lo cargado, no la página.** `router.refresh()` volvía a sembrar sólo la primera página: un seguimiento de
«Ver más» desaparecía de la lista (y el conflicto, borrado al pulsar, volvía a chocar). `useSeguimientos.releer()` lee desde el
principio tantas páginas como había, con la misma RPC; sirve igual a la ficha y al drawer (que lee en el navegador). Un
`?seguimiento=<id>` que no está entre lo cargado se busca hasta 5 páginas antes de decir que no está. **Con el modal abierto, un lead
que deja de verse no recarga la pantalla:** el modal lo dice y lo escrito queda (en el drawer y en la tabla, volver a
leer no traería nada mejor).

**El drawer, con pestañas y sin RPC nueva.** «Resumen» (lo de antes) y «Seguimientos» (`?pestana=`), que lee al elegirla, desde el
navegador, las mismas tres consultas de la ficha (`lead_seguimientos`, `tipos_seguimiento`, `recordatorios_vista`). Cambiar de
pestaña no suma al historial: «atrás» cierra el drawer. Los modales de la pestaña se dibujan dentro del drawer (Base UI los anida).
**Con un `?panel=` abierto, el drawer no vuelve a leer al volver a la pestaña:** un «no disponible» reemplazaría el contenido y
desmontaría el modal con lo escrito. Las pestañas son propias (`role="tablist"`, flechas, Inicio y Fin, como las del embudo): las
de Base UI sumaban 4,3 KB con gzip a la carga del listado. El vehículo no se ofrece fuera de la ficha: `leads` no lee vehículos
(la página se los pasa a la sección), y pasarlos al drawer o a la tabla sería un ciclo con `vehiculos` o una prop más en el
listado; editar uno que ya tiene vehículo lo conserva.

**La regla `para=`.** Anotar o agendar desde el «⋯» de una fila no abre el drawer, así que el lead no puede ir en `?lead=`: va en
`?para=<id>`, con el mismo `?panel=` de la ficha. Los paneles de la ficha y del drawer no responden si hay `para`; los del listado
no responden si hay `lead` (nunca un modal del listado sobre el drawer). `para` tiene que ser una fila de la página, de la cartera de
quien mira, con `leads.editar`; si no, no abre y dice lo mismo que un lead que no existe. Ya abierto, el lead queda fijo (volver a
leer la lista no lo cierra), y el listado no se relee al volver a la pestaña con un panel abierto. El modal se monta una vez en el
listado y se pide al abrirse; los tipos se leen la primera vez. El listado suma una sola prop, `puedeAnotar` (un booleano):
una lista de ids como `eliminables` pesaría hasta 2 KB para decir lo mismo. Al guardar, un aviso de éxito: la fila no muestra nada
de seguimientos ni de recordatorios (privacidad), así que no hay nada que actualizar. El «⋯» pasa a llamarse «Más acciones de …».

**Medido.** «Datos» 43,3–43,4 KB (sin cambio). `/leads`: el documento 65,9 → 66,0 KB sobre `/perfil`; el JS en frío 505,0 →
508,9 KB con gzip (de 22 a 25 chunks): el código del menú, las acciones y el drawer, y un chunk compartido de entidades de leads
que ahora trae también la línea de tiempo (Turbopack la agrupa con lo que el listado ya usaba). Con las pestañas de Base UI eran
512,8. El presupuesto de `/leads` se fija en el cierre de la fase.

**Lo que encontró la revisión adversarial (corregido en commits propios).** `buscar()` salía en silencio con otra lectura en vuelo
(o si fallaba) y eso se leía como «no está»: ahora dice si buscó, espera a la lectura en vuelo y una falla no rechaza la URL. «Ver
más» y buscar reinstalaban la foto de cuando se pidió (un seguimiento eliminado mientras tanto volvía): suman sólo lo nuevo sobre la
lista de ahora. Lo que ya se abrió no se vuelve a decidir: perder el permiso o que el editado deje de estar no cierra el modal. El
drawer pausaba la relectura con cualquier `?panel=` (también uno huérfano) y una lectura ya lanzada podía desmontar el modal; con otro
lead en la URL mostraba las pestañas del anterior. Enter en un campo enviaba con un conflicto o lo editado ya no disponible, y un
segundo Enter tras guardar volvía a avisar: lo frena `ModalDeFormulario`. Un alta que salió sin red guarda su id de intento en la
pestaña hasta guardar o descartar: reabrir con el borrador no duplica. **Queda aceptado:** si ese primer envío había llegado y la
persona cambió lo escrito antes del reintento, la base devuelve el que llegó (`repetido`) y lo nuevo no se guarda; el modal de la
fila cambia de diálogo al llegar los tipos (un parpadeo); los tipos leídos quedan para la sesión del listado (uno que se apaga después
lo rechaza la base junto al campo); el «Descartar» del aviso de borrador repuesto apunta al modal en que apareció (como en la 9c).

## 2026-10-16 — Parte 9d-2: el drawer con tres pestañas y las listas de un lead a escala

**Contexto.** «Tus recordatorios» estaba debajo de la línea de tiempo del drawer, así que para agendar había que pasar por
todos los seguimientos. Las dos listas hijas de un lead no aguantaban volumen. «Recargar» releía todo lo cargado: con 1.000
seguimientos eran 51 pedidos. Lo dibujado crecía sin tope con cada «Ver más». Los recordatorios se leían con
`order by recordar_en limit 100`: los 100 más viejos, completados incluidos, así que con 3.000 completados no se veía ningún
pendiente. El aviso de vencidos contaba con `count(*)`. La regla que queda es `.claude/rules/escala.md`.

**Tres pestañas, cada una con su `import()` y su lectura.** «Resumen», «Seguimientos» y «Recordatorios» (`?pestana=`), con la
lista de pestañas propia de la 9d. «Tus recordatorios» es el mismo bloque en la ficha y en el drawer. En los dos casos se lee
desde el navegador al abrirse. La ficha ya no lo lee en el servidor: así hay una sola ruta de datos y su código no viaja con la
ficha. Las listas tienen `key={leadId}` y descartan la respuesta de otro lead.

**El tope y «Ir a una fecha».** Cada lista carga y dibuja hasta 500 (`TOPE_DE_LO_CARGADO`, de a `TAMANO_DE_PAGINA` = 20, en un
solo punto de `shared/lib/paginacion.ts`; la 9g los hará configurables). Al llegar se dice «Mostrando los 500 más recientes» y
«Ver más» desaparece. A lo antiguo se llega con «Ir a una fecha», que siembra el cursor de «Ver más» con el inicio del día
siguiente (en la zona de la empresa) y el id más alto: no hace falta una RPC nueva. Está disponible siempre que haya más, no
sólo en el tope: a una fecha de hace un año no se llega con 25 clics. **No va a la URL:** es una posición, como «Ver más».
Lo cargado es una «ventana» (`entities/pagina-de-seguimientos.ts`), y lo que vuelve de una RPC se pone sólo si cae dentro de
ella: ponerlo fuera correría el cursor y «Ver más» saltearía filas. Fuera de la vista, cada ítem no se dibuja
(`content-visibility: auto`). **Alternativas:** una lista virtual pesaba más que el problema que resuelve; sumar para siempre
crece con el uso.

**«Recargar» de costo fijo.** Tras un conflicto se relee sólo la primera página de la ventana. Si el seguimiento en conflicto
no vino en ella, se trae por su id con `lead_seguimiento(p_lead, p_id)`: invoker, la misma forma que una fila de la página,
clase L. Como mucho son dos pedidos. Lo traído queda en `sueltos`: lo ve el modal, la lista no. Lo cargado más allá de la
primera página vuelve a «Ver más». Se conserva la regla de la 9d: lo anotado, editado o eliminado mientras se esperaba se
vuelve a aplicar sobre lo que llega (`conLoPuestoMientras()`). Un recordatorio se recarga sólo él, por su id
(`recordatorios_vista` por la clave primaria): un pedido. `buscar` sigue acotado a 5 páginas; un recordatorio de la URL que no
está cargado se lee por su id.

**Los recordatorios, por RPC y no por la vista.** Con PostgREST el cursor sólo se escribe como `or()`, y un `or()` no es
condición de índice. Por eso es `lead_recordatorios()` (clase L, en `v_lecturas_con_accion` por `puedo_agendar`), sobre la
tabla: la vista unía `leads` y el planificador tomaba el índice por persona y filtraba el lead. Medido con plan genérico, en
plpgsql también rompen el índice `p_x is null or (…)` y `coalesce` en el cursor. Por eso con cursor y sin cursor son dos
consultas, y la fila se arma con su tipo (`select r from …`), sin avisos de `db:lint`. «Completados» va sin número (contarlos
crece con el total). Se muestra sólo si hay alguno, cosa que dice un `exists`, y se lee recién al abrirse.

**`lead_seguimientos` en dos ramas.** Quien ve el lead sin ser autor (la co-asesora, la dueña con «todos») recorría todos los
privados ajenos para no encontrar ninguno: la policy era un filtro sobre `(lead_id, ocurrido_en)`. Con 20.000 privados
ajenos, descartaba 20.000 filas en 4,6 ms. Ahora la página es la unión de los míos y los públicos, cada rama con su índice:
0,1 ms. La página 501 cuesta lo mismo que la 1.

**El aviso de vencidos cuenta hasta 21** («más de 20», `TOPE_DE_VENCIDOS`). La subconsulta lleva `order by recordar_en`: sin
él, el planificador tomaba el índice de la FK y recorría los completados del lead. Los demás conteos que se muestran
(`contarLeads()`, `vehiculos_vinculados`) quedan para la 9e.

**Los tipos de seguimiento no cuentan como pedido de la lista.** Abrir «Seguimientos» pide la página (uno) y los tipos activos,
que son una lista fija de configuración y no crecen con el lead. El e2e cuenta los pedidos de la lista.

**El JS en frío de `/leads` no sube: 509,6 KB, 25 chunks.** Medido sin cambios, el código nuevo sumaba 5,1 KB a **todas** las
pantallas. El layout `(app)` importa `@/modules/leads` y el `index.ts` reexporta la sección de la ficha: todo componente de
cliente alcanzable por ahí viaja en el shell (por eso `/perfil` pesa lo mismo que `/leads`). Sin tocar esa arquitectura
(queda para la 9e), el bloque de recordatorios de la ficha y lo de una línea larga («Ir a una fecha», «Desde el …», el aviso
del tope) van con `import()` diferido.

## 2026-10-16 — Parte 9d-3: el recorrido de la IA con dos cuentas

**Contexto.** Nadie prueba a mano: el recorrido lo hace la IA, con la app compilada, la dueña y una asesora, en
escritorio y celular, mirando cada captura. Dos preguntas quedaron abiertas en la 9d-2 y el cierre: qué pasa con un
clic en un aviso con un panel abierto (D) y cómo distinguir la red caída al paginar (E).

**La asesora es la de la semilla, no un rol «E2E …».** Los e2e de antes armaban asesoras con permisos a medida (tres
secciones en la ficha). Con el rol `asesor` de `seed.sql` la ficha tiene cinco y en el celular se salía de la pantalla.
Un recorrido se hace con lo que tiene una persona de verdad.

**Lo que se afirma y lo que se mira.** Al spec va lo determinista: quién recibe el clic (`elementFromPoint`), cajas
dentro de la pantalla (medidas cuando el panel terminó de animar), sin scroll horizontal, 44 px en el celular, foco,
URL y pedidos. Lo que sólo se juzga mirando (solapamientos, redacción, idioma) va a la bitácora, sin comparar píxeles.
Las capturas salen sólo con `E2E_CAPTURAS`: el spec permanente no deja archivos.

**D: el botón de un aviso recibe el clic con un modal abierto, y lo que sale de la pantalla pregunta.** El clic no
cierra el modal (el `outsidePress` de Base UI sólo cierra con el velo) y «Deshacer» actúa en el lugar. Lo que dejaba
la pantalla («Abrir ficha», «Recargar») se iba con el modal sucio. **Elegida (a):** un registro en `shared`
(`salida-con-cambios.ts`) donde se anota todo formulario abierto con algo escrito; las acciones con `sale: true` y
«Recargar» pasan por `salirSinPerder()`, que pregunta en el pie del de más arriba. Al descartar **no se cierra** el
modal: cerrar escribe la URL (sin `?panel=`) un instante después y pisaba la navegación; irse lo desmonta igual.
«Seguir editando» recibe el foco un cuadro después, porque sonner devuelve el foco al campo cuando el foco sale de los
avisos. **Alternativas:** (b) no mostrar acciones de navegación con un panel abierto (esconde la salida); (c) dejarlo
(el borrador repone lo escrito, pero se iba sin avisar).

**E: un fallo de transporte se dice como conexión, en un solo punto.** supabase-js no lanza cuando el `fetch` falla:
devuelve un error sin código con el texto del navegador. `errorDePostgrest()` lo reconoce por ese texto y, en el
navegador, dice «No hay conexión…» o «No pudimos llegar al servidor…» según `navigator.onLine`; en el servidor, lo
segundo (Node también tiene `navigator`, sin `onLine`). El código sigue siendo `inesperado`: nadie decide distinto por
él. **Sin arreglar, a la lista del cierre:** paginar el listado sin red (el `<Link>` cae a la navegación completa del
navegador) y abrir sin red un modal diferido que nunca se pidió (el `import()` falla y sube al `error.tsx`): son nueve
`diferidos.tsx` y hay que decidir qué hace el panel cuando su código no llega.

## 2026-10-16 — Parte 9e: la escala de toda la app, medida y con guardas

**Contexto.** La regla `.claude/rules/escala.md` (9d-2) sólo se había cumplido y medido en las listas de un lead. La 9e
midió **toda** la app con 50.000 leads (la dueña con «todos» y Ana, la asesora de la semilla, como `authenticated`: la RLS
cuenta), 10.000 vehículos, 200.000 seguimientos y 100.000 filas por purgar en cada job, y dejó guardas que hacen fallar la
próxima lista sin tope. Los números y el inventario: `docs/RENDIMIENTO.md`.

**Un número que se muestra nunca es un total exacto.** Una forma única: la consulta pide `tope + 1` (o cuenta sobre un
subselect con `limit tope + 1`), `conteoAcotado()` lo vuelve `{ n, hayMas }`, y se escribe «más de N» o «N+». Dos topes: el de
lo que se dibuja (500, el de las listas) y 1.000 para los de configuración. El conteo previo de la exportación pasó de exacto (815 ms)
a hasta 5.001 ids: no cabe en un pedido porque PostgREST corta en 1.000 (`max_rows`), así que `contarLeadsHasta` lee ids de a
1.000 por cursor (seis pedidos como mucho). Se probó quitarlo y leer las páginas de a 500 hasta ver si hay otra, y es peor: el
rechazo de un archivo de más de 5.000 tardaba más de lo que espera el diálogo. Lo que queda con `count(` sin tope en SQL son
validaciones puntuales, topes de la base (50 etiquetas, 10 teléfonos, 200 por lote) y acciones de administración: cada una
figura en `supabase/tests/escala.sql` con su motivo y su tope.

**El filtro de la dueña no era un problema de índice sino de costo.** Filtrar 50.000 leads por un atributo que coincide con
un cuarto tardaba 3,8 s; «sólo favoritos», 321 ms; una etiqueta, 667 ms. `atributos_lead()` (plpgsql `security definer`,
~75 µs por llamada) llevaba el `COST` por defecto (100 = 0,25 unidades): Postgres la tomaba por barata, leía los 50.000
leads, la calculaba en cada uno y ordenaba, en vez de caminar `leads_listado_idx` y cortar en 51. Con `COST 20000` camina el
índice: 3,8 s → 25 ms, 321 → 45 ms, 667 → 95 ms. **Descartado:** reescribir `leads_vista` con `left join` a favoritos y
tachados (la página 1 pasaba de 9 a 0,8 ms y «sólo favoritos» a 50 ms) y parametrizar `atributos_lead(p_lead, p_alcance,
p_publicas)` para recortar una vez por consulta. La unión hace que un filtro de selectividad mal estimada elija un
`Nested Loop` con un `Seq Scan` por fila (12 M comparaciones, 7 s), y el recorte por parámetro **no puede ser una
función que `authenticated` ejecute**: quien la llamara a mano con `p_alcance = 'todos'` leería los atributos públicos de
cualquier lead. Lo que no se evita, y queda **anotado como límite aceptado**: un filtro sobre un atributo que no coincide
con nadie y una búsqueda por nombre recorren la cartera visible (~80 µs por lead bajo RLS: ~4 s para la dueña con 50.000, 30
ms para una asesora con 2.000), y una página profunda del listado cuesta lo mismo que la primera cuando hay filtros (la
política de `leads` llama dos funciones `security definer` por fila; ~270 ms con 50.000). El paso siguiente, si la cartera
de «todos» pasa de unos 100.000 leads, es una columna con los atributos públicos mantenida por trigger (y la búsqueda por
`pg_trgm` a través de una función `definer` con el predicado de visibilidad repetido); queda en `docs/PLAN.md`.

**El shell importa una tercera entrada.** El layout `(app)` importaba `@/modules/leads`, `equipo` y `empresa`, y todo
componente de cliente que reexportan sus `index.ts` viajaba en el JS de todas las pantallas. Cada módulo suma `shell.ts`
(y `equipo`, `shell.client.ts` para `_shell/`) con lo que dibuja el marco; `eslint.config.mjs` las permite sólo desde el
layout y `_shell/`, y `mapa.sh` las lista. «Nuevo lead» es ahora un botón y la tecla `N`; el drawer (`alta-cargada.tsx`)
llega con `diferido()` la primera vez que se abre. **Resultado** (JS en frío con gzip, lo que el documento nombra): `/perfil`
547,5 → 434,9 KB (lo que pesaba sin leads en el shell: 434,8), `/vehiculos` 598,7 → 504,9, `/leads` 547,5 → 543,7. Medir
«lo que se pide hasta el `networkidle`» no sirve: Next prefetchea las otras rutas y las tres pantallas daban lo mismo; el
método nuevo cuenta los `.js` que el documento nombra y queda commiteado (`e2e/presupuesto-js.spec.ts`). **Queda:** una
pantalla paga todo lo que reexporta el `index.ts` del módulo que importa (`/perfil`, 25 KB por `ListaEquipo` y
`MatrizDeRoles`); partirlo por pantalla o hacerlo `diferido()` con SSR queda en `docs/PLAN.md`.

**`diferido()`: un solo lugar para el código que se pide al usarse.** Sin red, un `import()` que nunca se pidió falla al
abrirlo y la pantalla entera caía a `error.tsx` (9d-3). El ayudante reintenta una vez y, si no llega, dice «Sin conexión» en
su lugar con «Reintentar» y deja lo demás en pie. Los 9 `diferidos.tsx` y los dos `next/dynamic` sueltos pasan por él; el
lint prohíbe `next/dynamic`. Dos cosas que se aprendieron: una instancia que ya pasó por el `lazy` **no cambia de camino**
al terminar de cargar (cambiarlo desmontaba el modal y se perdía su estado: el resultado de «Dar acceso» volvía al
formulario), y no dibuja en el servidor (igual que `ssr: false`).

**Los jobs, con tope por lote y por corrida.** Medido con 100.000 filas por purgar: `papelera-purgar` 29 s en una corrida
y `limpieza-automatica` 24 s revisando 100.800 candidatos para contarlos. Ahora la papelera purga a lo sumo 50 lotes por
corrida (≈3 s) y **corre cada hora** (50 por hora son 240.000 leads por día), la limpieza revisa 1.000 más tras llenar el lote
(0,4 s) con `vehiculos_limpieza_orden_idx`, y las purgas de consultas de apibara y de vínculos de importación van de a 10.000
(hasta 10 por corrida). `storage-gc` encola a lo sumo 2.000 huérfanos por pasada. Lo que no entra queda para la siguiente.

**Las papeleras se leen de a 5 lotes por cursor.** Un lote ya está acotado (de 1 a 200); lo que crece es la cantidad de
lotes (60 lotes de 200 leads tardaban 597 ms y dibujaban 12.000 filas). `lotes_papelera_tipo_idx` sostiene el cursor.

**Las migraciones comprometidas no se editaron:** `20261019000100` a `…000500` son nuevas (la vista, el kanban, las
papeleras, los números acotados y los jobs).

## 2026-10-16 — Parte 9f-1: el origen del lead es configurable, y se escribe sólo por RPC

**Contexto:** `origenes_lead` (de dónde llegó un lead; no es el origen de los vehículos) sólo existía en `seed.sql`: sin pantalla, sin orden elegible, sin versión, con la RLS dejando que quien tenía `leads.configurar` escribiera directo, y la validación del origen en `_lead_crear` y `lead_guardar` con un `exists … activo` sin candado: una desactivación que llegaba a la vez que un alta podía dejar guardado un origen apagado.
**Decisión:**

- **Pantalla:** una pestaña «Orígenes del lead» en `/configuracion/leads?seccion=origenes`, sin shell nuevo. Un origen es nombre, activo y orden. **Sin icono** (el modelo no lo tenía y el repo no tiene un catálogo de iconos: el de `tipos_seguimiento` se guarda y nunca se dibuja) y **sin «por defecto»** (lo que hay es el último origen que usó cada persona, y sigue igual). Ambos quedan en `docs/PLAN.md` como candidatos junto con la pantalla de tipos de seguimiento.
- **Sólo por RPC, con el permiso que ya existía:** `origen_lead_crear|guardar|mover|eliminar` con `leads.configurar` (no hay permiso nuevo, y separar `leads.campos.gestionar` sigue por decidir), versión y `PT409`. `authenticated` ya no tiene insert, update ni delete sobre la tabla. Cada escritura devuelve la lista entera (≤ 100 filas) con las versiones nuevas: la pantalla no vuelve a leer.
- **Un lead no guarda un origen apagado, ni con una carrera:** un trigger de `leads` (`lead_origen_vigente`) mira el origen con `for share` al entrar o cambiar. La FK sólo toma `for key share`, que **no** choca con el `update` de desactivar; `for share` sí. O la desactivación espera a que el alta termine, o el alta ve el origen ya apagado y falla con «Ese origen del lead se desactivó: elige otro.» y el campo en el `hint`. Se eligió un trigger y no reescribir `_lead_crear` y `lead_guardar` (dos funciones enormes, ya auditadas y con su matriz): cubre también la importación, que pasa por `_lead_crear`. Lo que un lead ya tiene (un origen que se apagó después) no se toca: sólo cuenta cuando el origen entra o cambia.
- **Borrar sólo sin leads, la papelera incluida** (la FK es `restrict`): `exists … limit 1` sobre `leads_origen_lead_id_idx`, nunca un conteo; la lista trae `con_leads` de `origenes_lead_con_uso()` y la interfaz lo dice antes de intentarlo. Un alta que gana la carrera cae en `foreign_key_violation` y recibe el mismo mensaje. **Tope de 100** (activos e inactivos), dicho al llegar; la lista no se pagina.
- **Orden: botones, sin arrastrar, relativo («después de X») y bajo `lock table … share row exclusive`:** dos personas que reordenan a la vez van en fila y nadie comparte lugar. **Reordenar no mueve la versión** (`origen_lead_version()` sólo la mueve un cambio de nombre o de estado): así dos reordenamientos seguidos no se pisan y un nombre en pantalla no queda viejo porque otra persona movió el lugar. Cada escritura toma primero el candado de la tabla y después la fila, siempre en ese orden (si no, `guardar` y `mover` se interbloquean).
- **La clave** sale del nombre en la base (sin acentos, minúsculas, guion bajo; con sufijo si choca) y no cambia; la importación acepta nombre o clave. El nombre se normaliza (espacios) y es único sin importar mayúsculas (`origenes_lead_nombre_unico`).
- **El CSV nunca crea un origen por una errata:** una celda con un origen que no existe o está desactivado rechaza esa fila con «…no existe o está desactivado. Los activos: A, B…» (hasta 10 nombres y «y N más»; sin ninguno activo, «deja la celda vacía»).
- **El filtro por origen no tiene índice nuevo, a propósito.** Se midió con 50.000 leads: un origen con un quinto de la cartera cuesta ~100 ms (dueña) y ~20 (Ana), y uno sin leads 0,1 ms, por `leads_origen_lead_id_idx` (bitmap y top-N). Un índice compuesto `(origen_lead_id, creado_en desc, id desc) where eliminado_en is null` entrega la página en 3 ms si se fuerza el plan, pero el planificador no lo elige (estima que la policy de `leads` deja pasar ~24 de 8.000 filas): se probó, no se dejó. Es el mismo límite que el filtro sin resultados (9h).
  **Alternativas:** reescribir `_lead_crear` y `lead_guardar` con una función `_origen_lead_exigir` (más cambio sobre lo auditado, el mismo resultado); un permiso nuevo `leads.origenes.gestionar` (nada lo pedía); `advisory lock` para el alta (el `for share` ya es el candado de esa fila); un «por defecto» por empresa (no existe el concepto y el último usado por persona ya cubre el caso).
  **Consecuencia:** `humo.sql` prueba permiso, versión, nombres, tope, papelera y el trigger; `scripts/carreras/origenes.mjs`, las carreras (desactivar contra crear, contra editar, dos reordenamientos, eliminar contra crear, el 100 contra el 101); las demás carreras dejaron de pedir la clave `'web'` y toman el primer origen activo. La base sigue sin congelar (`docs/DECISIONES.md`, 2026-10-11): las columnas nuevas entran por `schemas/` y por la migración con `if not exists`.

## 2026-10-17 — Parte 9f-2: los dos números de un lead, y el global sólo con un permiso

**Contexto:** cada lead tenía un solo número, `leads.numero` (el consecutivo de toda la empresa), y cualquier persona que veía un lead lo veía: una asesora podía leer cuántos leads tiene la empresa y cuánto crece. Se pidió que cada lead lleve además un **número propio** (el consecutivo de quien lo creó, que cada quien cuenta desde 1) y que el **número global** sólo llegue a quien tiene un permiso, por ninguna ruta. Términos nuevos en `docs/GLOSARIO.md`: «número propio» y «número global».

**Decisión:**

- **El permiso es `leads.numero_global.ver`**, sin origen ni alcance, y nace con su punto de enforcement en la misma migración (`…20261019000900`): la policy de las dos copias. Por defecto lo tiene el dueño; la migración también se lo da a todo rol que ya veía «todos» los leads, para no quitarle a nadie lo que ya veía. Sin él se ve sólo el número propio, y sólo de los leads que uno creó; con él, el global y el propio de cualquiera (con el nombre de quien lo creó).
- **Enmascarar por filas, con tablas de lectura.** Una columna no puede ser legible según quién mira (un grant de columna no mira la fila) y la RLS no esconde columnas. Por eso los números se leen de `leads_numeros_globales` y `leads_numeros_propios`, copias cuya policy **es** la regla (`(select tiene_permiso(…))` como InitPlan, más `exists` sobre un lead que se ve), y `authenticated` ya no puede leer `leads.numero` (`revoke select (numero)`); `numero_propio` nunca tuvo grant. Enmascararlo sólo en `leads_vista` dejaba abierto `/rest/v1/leads?select=numero`. Lo que lee `leads` con los derechos de la base (la papelera, el alta, la importación, verificar un teléfono) calcula el permiso una vez por consulta y se lo pasa a `_lead_numeros()`. Donde había `numero` ahora hay `numero` (el global o nulo), `numero_propio` (el que se ve o nulo) y `numero_visible` (ya resuelto).
  - **Alternativas:** una columna calculada o una vista `security definer` (otro camino con la regla repetida y sin RLS); enmascarar sólo en la vista (deja abierta la API); quitar el global a todos (no se pidió: el permiso lo deja a quien lo necesite).
  - **Medido (50.000 leads):** una unión con las copias se evaluaba por cada fila recorrida y una página profunda costaba ~1.090 ms; como subconsulta escalar en la lista de columnas (se evalúa después del `limit`) bajó a ~330 ms, lo mismo que sin pedir los números (la página 100 por cursor, 12 ms). El permiso se calcula 3 veces por consulta de la dueña y 4 las de Ana (`pg_stat_xact_user_functions`), no por fila. `_lead_verificar` lo calcula perezoso: calcularlo al declarar subía la papelera de 62 a 364 ms.
- **El número propio lo asigna un trigger `before insert` de `leads`**, por cualquier camino (alta, importación, semilla, lo que venga), con una tabla de contadores de un renglón por creador (`leads_contadores`, upsert): el candado del renglón ordena a quienes crean a la vez y un rollback —también el de la subtransacción de una fila de la importación que falla— deshace el incremento y no deja un hueco. Una sequence no sirve: no vuelve atrás. Un lead sin creador vivo no lleva número propio; el que ya tenía se conserva si su creador desaparece. Los números **nunca se reasignan ni se reutilizan**: restaurar los conserva y purgar no baja el contador. `leads_numero_propio_unico` es `unique (creado_por, numero_propio) deferrable`, y el número propio es inmutable (`lead_numeros_inmutables`).
- **La importación renumera por fila.** Un archivo de 500 filas entra en lotes de 50 y cada fila vale por sí misma; el número propio se reparte en el orden de las filas del archivo, sin huecos y sin gastar con un reintento. Es la única excepción a la inmutabilidad: lo hace con `importadora.numerar_lote = 'si'`, sólo dentro de su transacción, y por eso la restricción es diferible. La columna «N.º» de un archivo no se importa (el número lo pone el sistema) y el asistente lo dice.
- **Buscar `#n` encuentra por el número que la persona ve primero** (`numeroQueSeBusca`): con el permiso, el global; sin él, el propio. **Enmendado el 2026-10-19 (5a-14, entrada «Buscar un número entre los propios ajenos»): con el permiso, `#n` resuelve el global y también los propios de cualquier creador visible; sin él, el propio de quien busca, y el global de un lead que se ve y no se creó sigue sin encontrarse sin el permiso.** Nunca el global de quien no lo tiene: buscar `#<global>` sería un oráculo que revela el número de un lead que se ve y no se creó. Se resuelve el número a su lead por la copia (`leads_numeros_globales_numero_key` o `leads_numeros_propios_creador_idx`, 0,7 y 2,7 ms con 50.000 leads) y la búsqueda entra como `id.in.(…)`.
- **La interfaz no decide qué número mostrar.** Los componentes dibujan `numero` y `numero_propio` tal como llegan, con la misma regla de `numero_visible` (el global si llegó; si no, el propio) en `escribirNumeros()`; ninguno pregunta por un rol o un permiso, y nadie lee `leads.numero` directo. Los textos: «N.º 1.234», «Tu n.º 12» y «N.º 12 · Berta» (el propio de otra persona, que sólo ve quien tiene el permiso). El listado lo dice **bajo el nombre, como hoy**, sin columna nueva. **La papelera muestra sólo el principal:** su RPC no trae quién creó el lead, y con el permiso un propio ajeno se habría leído como «Tu n.º»; el kanban y el vínculo de un vehículo también dicen sólo el principal. `numero_visible` existe en la vista y en las RPC pero la interfaz no lo lee (deriva el mismo valor de los dos campos): no es una decisión de acceso.
- **El CSV exportado** lleva «N.º» (sólo con el permiso) y «N.º propio» antes del nombre. Las constancias (`actividad`) no guardan ningún número: `actividad.antes/despues` excluyen `numero` y `numero_propio`, y la matriz de `db:probar` lo busca con un patrón.
- **Realtime no los publica, y una prueba lo cuida.** `supabase_realtime` no tiene ninguna tabla hoy: `select pubname, tablename from pg_publication_tables where tablename in ('leads', 'leads_numeros_globales', 'leads_numeros_propios')` da cero filas (Realtime reparte las filas que cambian y ninguna policy de columna cubriría ese canal). `numero-global.sql` falla si una migración las publica.
- **El relleno de la migración `…000900` apaga los triggers de `leads`** (`alter table public.leads disable trigger user`, transaccional): con 62.000 leads baja de ~12 s a ~3,5 s. Sirve para una base vacía o chica; **repetido sobre una base viva grande necesita lotes**, porque el `alter` toma un candado que bloquea las escrituras de `leads` mientras corre. Numera sólo lo que no tiene número, a continuación del mayor de cada creador (también cuentan los de la papelera).

**Consecuencia:** migraciones nuevas `…20261019000800` a `…001100` (las comprometidas no se editaron; el esquema base sólo por `pnpm db:base`). `db:probar` suma `numeracion.sql` y `numero-global.sql`: sondas de cada ruta que puede devolver un número (la persona sin el permiso no recibe uno con el patrón `9182xxxxx` en nada), un inventario por `pg_proc` que obliga a que una función nueva que pueda devolverlo esté cubierta, los privilegios (`information_schema.column_privileges` y `has_*_privilege`: falla si `authenticated`, `anon` o PUBLIC leen `leads.numero` o `numero_propio`, o tienen `select` de tabla sobre `leads`), la publicación de Realtime y el oráculo; cada una se probó con una fuga a propósito (un grant de tabla, de columna y a PUBLIC, una publicación y una policy abierta). e2e: `leads-numeros-recorrido.spec.ts` (la dueña, Ana, conceder y quitar el permiso con la sesión abierta, la importación, el rechazo `42501` de `/rest/v1/leads?select=numero` y el oráculo con un lead compartido) y `leads-numeros-pantallas.spec.ts` (kanban, papelera, vehículo, búsqueda y archivo exportado).

## 2026-10-17 — Parte 9g: ítems por página configurables, y la base acota toda página

**Contexto:** cada lista fijaba su tamaño en un lugar distinto: `TAMANO_DE_PAGINA_DE_LEADS` en `leads`, un `TAMANO_DE_PAGINA` local en la página de vehículos que tapaba al de `shared`, el 20 de «Ver más», el 50 del kanban, el 5 de las papeleras; y en SQL cada RPC acotaba con su `least(greatest(…))` y su literal (50, 51, 100, 1.000). El listado y el inventario, además, son lecturas de PostgREST sin otro tope que `max_rows`.

**Decisión:**

- **Una preferencia global de la persona, «Ítems por página» (10, 25, 50, 100), con un máximo por lista.** Se muestra el menor de lo pedido y el máximo de la lista, y el selector ofrece hasta ahí. Una por lista habría sido más control para casi nadie; la global sigue a la persona y el máximo protege a cada lista.
- **Va en `preferencias_usuario` (clave `listas.por_pagina`), no en una tabla ni una columna nuevas.** Es lo que `mi_sesion()` ya entrega en cada request (cacheado): la página la lee de `sesion.preferencias` sin ninguna consulta más. La base la valida con un `check` en `schemas/` (sólo 10, 25, 50 o 100 como número; ni 7, ni «50», ni 1000). **Sin versión, a propósito:** es una preferencia de una sola persona, la última escritura gana y no pisa trabajo de nadie (igual que densidad y tema).
- **`?por=` sólo puede pedir uno de los cuatro tamaños** (entero, sin ceros ni signos) y se acota al máximo de la lista; lo demás se ignora y manda la preferencia. Elegirlo en el selector pone `?por=` y lo guarda, no al revés: la primera lectura del servidor trae el tamaño nuevo sin esperar al guardado. «Ver como» no cambia nada: la sesión es la de quien mira.
- **Guardar y navegar van en ese orden, no a la vez.** Se probó a la vez y fallaba: la respuesta de la acción que guarda trae la página de la URL de antes y, si llegaba después de la navegación, la pisaba (la URL decía 25 y la lista seguía en 100). Cuesta una ida y vuelta (~50 ms) antes de que cambie la lista, con el selector mostrando ya lo elegido.
- **Sin red, el cambio se muestra y espera:** no navega ni guarda, y sale solo, una vez, al volver la conexión (como paginar). Si guardar falla con la red presente, la página igual cambia y se ofrece «Reintentar». Con el teclado las flechas recorren sin ir al servidor y Enter confirma (Esc cancela).
- **Las listas con selector son las dos que tienen Anterior y Siguiente con filtros:** el listado de leads y el inventario de vehículos. **Se quedan fijas, y por qué:** «Ver más» de seguimientos y recordatorios (20, hasta 500: más ítems por clic empeora el DOM sin acortar el camino a lo antiguo, que es «Ir a una fecha»); la columna del kanban (50, su propia unidad); las papeleras (5 lotes: **un lote ya trae hasta 200 filas**, así que 10 ya son hasta 2.000; entran cuando un lote muestre sólo los primeros 20, pendiente del cierre); «importaciones recientes» (20 de las últimas 24 h, sin páginas); el equipo (decenas, sin páginas); la vista previa de la importación (páginas en memoria de ≤ 500 filas).
- **El máximo del listado de leads es 50, no 100.** Se midió con 62.000 leads: la página 1 de la dueña («todos») cuesta 13 ms a 50 filas, 18 ms a 75 y **518 ms a 100**, porque con 101 filas el planificador deja de caminar `leads_listado_idx` y lee los 50.000 leads para ordenarlos (Ana, «propios», descarta 47.603 filas). Es la misma estimación de la política de `leads` que limita la cartera de «todos» (9h). El inventario sí cabe con 100 (0,6 ms con 10.000 vehículos, 57 KB comprimidos, 7.900 nodos también en el celular). Cuando la 9h arregle la estimación, `MAXIMO_DE_PAGINA_DE_LEADS` sube a 100 y `db:medir:volumen` lo asserta.
- **La base acota todo con un solo ayudante.** `_acotar_pagina(pedido, por_defecto, máximo)` (nulo da el valor por defecto; el resultado queda entre 1 y el máximo) reemplaza los seis `least(greatest(…))` de `lead_seguimientos`, `lead_recordatorios`, las dos papeleras y el kanban (misma firma y mismos errores), y el listado y el inventario, que no son RPC, quedan acotados por `max_rows` (1.000). La guarda de `pnpm test` (`scripts/guardas/paginas.test.ts`) lee la **última** definición de cada RPC registrada y exige que acote con el ayudante y que su máximo no sea menor que lo que pide el código; la de `pnpm db:probar` (`escala.sql`) recorre `pg_proc` y falla con toda función que un cliente pueda llamar con un tamaño y no lo acote. Las funciones de los jobs (`storage_gc_reclamar`, `web_expirar_solicitudes`) no las puede ejecutar `authenticated` ni `anon`: no entran.
- **El tamaño sale de `shared/lib/paginacion.ts`.** `TAMANO_DE_PAGINA` se renombró `TAMANO_DE_VER_MAS` (ya no decía de qué) y `TAMANO_DE_COLUMNA` y `LOTES_POR_PAGINA` se mudaron ahí; `scripts/medir-listado.mjs` lee los tamaños del código y se los pasa al SQL de la medición, que ya no escribe ninguno.

**Alternativas:** un valor por lista (más pantallas y más casos para casi nadie); guardarlo en el perfil como columna (otra lectura o otra columna en `mi_sesion`, y una migración de la tabla más caliente); una cookie (no viaja entre dispositivos, que era lo pedido); navegar y guardar a la vez (la carrera de arriba); un `select` de Base UI para confirmar con Enter (nadie lo usaba y sumaba JS a `/leads`: se usó el nativo y se difiere el cambio del teclado a mano); subir el máximo de leads y arreglar el plan aquí (es la 9h, que se decidió aparte); un RPC para el listado y el inventario (para acotarlos con el ayudante: cambiaba cómo se leen y filtran las dos pantallas más usadas).

**Consecuencia:** migración `…20261019001300_paginas_acotadas.sql` (más `…001200`, el nombre del creador del número propio, que sale con esta parte: ver BITACORA) y el `check` en `schemas/02_equipo` con `pnpm db:base`. `escala.md` dice el tamaño y la regla de la base; `RENDIMIENTO.md` suma «Selector» y «Máximo» a su inventario. **Pendiente:** el máximo de leads a 100 con la 9h; las papeleras al selector con «mostrar los primeros 20 de un lote» (cierre).

## 2026-10-17 — Parte 9h: la cartera de «todos» a escala, con la regla escrita una vez y estimable

**Contexto:** con 50.000 leads, para la dueña («todos»), un filtro sin resultados costaba ~4,4 s, una etiqueta 717 ms, los tachados 104 ms, un origen ~100 ms y la página 1 a 100 filas 518 ms (13 a 50): por eso el máximo de leads por página quedó en 50 en la 9g. La 9e propuso una columna de atributos públicos y `pg_trgm` por una `definer`; la 9f-1 probó un índice compuesto por origen que el planificador no eligió. Se midió primero (`EXPLAIN (ANALYZE, BUFFERS)` por cláusula, la dueña, Ana, Berta y una asesora con 3 leads, plan genérico y personalizado, 50.000 y 200.000 leads).

**La causa, medida:**

- **La estimación de la policy de `leads`.** `(select alcance_de('leads.ver')) = 'todos'` sola es un One-Time Filter, pero dentro del `OR` con la rama «propios» es un `Param = const` sin estadísticas: vale `DEFAULT_EQ_SEL` (0,005). La rama «propios» suma 0,0025 y el `OR` queda en 0,0075. `not (select lead_en_limbo(id))` es un SubPlan por fila: 0,5. Junta, 188 filas estimadas de 50.183 (152 en el plan real); pasan 50.000 para la dueña y 2.400 para Ana. En la vista, `en_cartera(l.id)` (SQL `definer`, no se inlinea) vale 1/3 y un filtro sobre `atributos_lead()` 0,005. Con `limit 101` y ~150 estimadas, «leer toda la cartera y ordenar» le parece tan barato como caminar `leads_listado_idx`: el plan cambiaba entre 51 y 101 filas, y con 200.000 leads volvía a cambiar (707 estimadas > 101). Plan genérico y personalizado dan lo mismo: el error está en los InitPlan, que no se conocen al planificar.
- **El costo por fila.** Leída la cartera entera, cada fila pagaba el SubPlan del limbo (4 buffers), las uniones de tachados y favoritos (~10 µs) y, al filtrar por un atributo, `atributos_lead()` (~75 µs).
- **Un hallazgo que no estaba en el inventario:** «míos», lo que la dueña ve por defecto, costaba 870 ms con 50.000 leads.

**Decisión:**

- **La cartera y los atributos públicos en la fila.** `leads.cartera` (los `usuario_id` vigentes de `leads_asesores`, ordenados; vacía = limbo) la recalculan tres triggers por sentencia de `leads_asesores`; cubre todo camino (transferir, compartir, revocar, salir, tomar del limbo, la baja de una persona —el lead queda sin dueño y con sus compartidos—, el alta, importar, deshacer). Eliminar y restaurar no la tocan: la policy mira `eliminado_en`. El trigger **bloquea los leads en orden de id antes de recalcular**, en otra sentencia: en READ COMMITTED esa sentencia ve lo que otra transacción confirmó mientras esperaba (sin el candado, `db:carreras` atrapa la baja contra compartir). `leads.atributos_publicos` (sin las claves que el layout no conoce como públicas, falla cerrada) la calcula un trigger `before` de `leads`, que toma `for share` los campos que lee. **Las dos las lee `authenticated`** (la vista es `security_invoker`): la cartera no da nada que `leads_asesores` no dé ya de un lead que se ve, y la copia es lo que ya recibe quien ve el lead sin la cartera. `atributos`, el teléfono y los números siguen sin grant.
- **La regla, una vez:** `_lead_visible_para(eliminado_en, cartera, alcance, yo)`, SQL inmutable y sin `set` (se inlinea), la usan la policy, `puede_lead()` y `atributos_lead()`, que antes la repetían cada una a su manera. **Se escribe `nullif(case alcance when 'todos' then true when 'propios' then yo = any(cartera) end, false) is not null` a propósito:** un `is not null` sin estadísticas vale 0,995, lo cierto para «todos», y para «propios» deja al planificador del lado seguro (caminar el índice y cortar). Con el `case` a secas valía 0,5 y un filtro opaco volvía a dejar la estimación bajo el límite (etiqueta 218 ms, un atributo 65). La regla de siempre (`lead_en_limbo`, `mis_leads`, `en_cartera`, que leen `leads_asesores`) queda como fuente, y `derivados-leads.sql` compara: las copias con su fuente para **todos** los leads tras 300 cambios al azar y por cada RPC, y lo que cada persona ve por la policy con la regla de siempre. Rompiendo la regla a propósito (sin la condición del limbo) fallan humo, la matriz y esta prueba.
- **Un campo público se filtra por su copia** (`columnaParaFiltrar()`); uno privado, por lo recortado y con `en_cartera = true` (sólo la cartera lo tiene).
- **Cambiar la privacidad de un campo va por lotes.** Quitar una clave de la copia en 200.000 leads cuesta 9 a 21 s en una sentencia (10 s aun sin los triggers por fila) y el `statement_timeout` de `authenticated` es de 8 s; hacerlo de a poco con el campo ya privado dejaría la clave legible mientras tanto. `solo_cartera_pendiente` dice a dónde va: **a privado** el campo sigue público hasta que ningún lead tenga la clave en la copia (desde que empieza, ningún lead nuevo la lleva); **a público** es inmediato y la copia se completa. `lead_campo_guardar` corre el primer lote y el job `leads-campos-privacidad` sigue cada minuto. La pantalla muestra lo pedido, con «Pasando a privado» en la fila.
- **El relleno de una base viva**, por lotes y reanudable: `…001400` agrega las columnas nulas y los triggers; `_leads_derivados_rellenar(p_lote)` llena de a lotes con `skip locked` (212.000 leads: 43 lotes de 5.000, ~450 ms cada uno); `…001600` se niega si queda algo y recién entonces pone `not null` y cambia la policy.
- **El máximo de leads por página es 100.**

**Resultado (50.000 leads; la dueña / Ana):** página 1 a 100 filas 518 → 19 / 17 ms; una profunda 390 → 19 / 17 ms; «míos» 870 → 10 ms; un filtro sin resultados 4.365 → 21 / 16 ms; etiqueta 717 → 42 / 24 ms; tachados 104 → 12 / 10 ms; un origen 100 → 10 / 10 ms; búsqueda sin resultados 404 → 51 / 16 ms; exportar 210 → 5 / 16 ms. En el navegador, con 100 filas: 5.020 nodos en escritorio y 5.015 en el celular (presupuesto 9.000), 46,6 KB comprimidos. **Lo que cuesta escribir:** alta 1,9 → 2,3 ms; importar 500 filas en lotes de 50 809 → 1.017 ms (el lote más lento 89 → 110 ms); transferir 5.000 de a uno 6,3 → 8,6 s; la baja de Berta (7.000 leads) 113 → 510 ms.

**Límites aceptados, con su número:** un filtro por un campo **privado** sin resultados recorre la cartera de quien filtra con `atributos_lead()` (~66 µs por lead: ~1 s la dueña con 20.000; antes ~4 s sobre todo lo visible); la baja de alguien con 80.000 leads tarda 6,7 s (era 0,75: se reescribe la fila de cada lead; recalcular por conjunto, sin el candado previo o con `fillfactor` no bajó de 5,3 s); una asesora con 3 leads sobre 200.000 recorre el índice entero (~70 ms; antes 58).

**Alternativas descartadas:** (c) una función `definer` que recorte una vez por consulta (repite la regla y, como mostró la 9e, si `authenticated` la llama con el alcance como parámetro filtra datos); (d) estadísticas extendidas o un índice parcial (no ven un InitPlan, y no hicieron falta: el origen camina `leads_listado_idx` en 10 ms); sólo reescribir la policy con `case`, sin columnas (arreglaba la página y la profundidad, no el filtro sin resultados: 4 s); una tabla aparte para la cartera (con su RLS abierta dejaría contar todos los leads de la empresa); `pg_trgm` para la búsqueda (bajo RLS `ilike` no es `leakproof`: necesitaría una `definer` con la regla repetida; con la cartera en la fila la búsqueda bajó a 51 ms con 50.000 y 185 con 200.000); una `atributos_lead()` en SQL (18,8 s: una función SQL que no se inlinea se vuelve a planificar en cada llamada; por la misma razón `alcance_de()` se llama fuera de su consulta, 265 → 66 µs).

**Consecuencia:** migraciones `…20261019001400_leads_derivados.sql`, `…001500_campos_privacidad_por_lotes.sql` y `…001600_leads_visibilidad_estimable.sql`; `supabase/tests/derivados-leads.sql` (en `db:probar`), `scripts/carreras/cartera.mjs`, `medir-escala.sql` con las metas, «míos», Berta y la asesora de 3 leads, y `pnpm db:sembrar-volumen -- --leads N`.

## 2026-10-17 — Cierre 1 (A): la baja de una persona va en dos tiempos, y la regla ya sabe que hay una baja en curso

**Contexto:** la 9h dejó la baja de una persona reescribiendo la fila de cada uno de sus leads en una sola sentencia: 6,7 s con
80.000 y, medido hoy, 17,9 s con 200.000, que `authenticated` corta a los 8 s. Además, mientras dura, esa transacción retiene
todos esos leads.

**Decisión:**

- **Dos tiempos.** `equipo_dar_de_baja` hace lo instantáneo (la cuenta, la cola de la web), anota la baja en `equipo_bajas`
  (tabla nueva: persona, quién, cuándo empezó y terminó, cuántos leads al limbo y oportunidades canceladas) y corre el primer
  lote de 5.000 en la misma llamada: una cartera chica termina ahí, como antes. Devuelve `{ terminada, leads_al_limbo }`. El
  resto lo hace el job `equipo-bajas` (cada minuto), que corta cada corrida pasados 1,5 s.
- **El lote nunca espera y no se interbloquea.** Toma los ids de la persona por `leads_asesores_usuario_vigente_idx` y después
  bloquea esos leads por su clave con `skip locked` (el mismo orden que compartir y transferir: `leads` y después
  `leads_asesores`). Un lead que otra RPC tiene bloqueado lo toma la corrida siguiente. Lo pendiente lo dicen los datos (filas
  vigentes de la persona): una corrida cortada se revierte entera y la siguiente sigue, sin duplicar ni perder.
- **Lo que ven los demás mientras dura es el estado final.** `_bajas_en_curso()` (un InitPlan sobre una tabla casi siempre
  vacía) entra a `_lead_visible_para(…, fuera)`, que pasa de «cartera no vacía» a «alguien de la cartera que no está en baja»
  (`not (cartera <@ fuera)`), y a `lead_en_limbo`, «Quién lo tiene», el dueño, la verificación del teléfono y la vista previa.
  Un lead que sólo tenía esa persona ya es limbo para todos y se adopta al registrar el teléfono; uno compartido lo sigue
  viendo quien lo comparte, sin dueño. Las RPC que escriben la cartera aplican la baja al lead que bloquearon
  (`_lead_aplicar_bajas`) y deciden sobre el estado final: adoptar no choca con el dueño único, transferir con el dueño viejo
  dice que cambió de dueño, quitar acceso no deja crear un limbo. Compartir o transferir **a** quien se da de baja toma su
  perfil `for share`: espera y ve la cuenta apagada (antes nada lo impedía y la fila nueva quedaba vigente).
- **La vista previa cuenta hasta 1.001** («más de 1.000 leads irán al limbo»): era exacta y crecía con la cartera. El aviso del
  final sí es exacto: son las filas que la baja pasó.

**Alternativas:** una transacción larga en un job sin `statement_timeout` (no se reanuda, retiene 200.000 leads ~18 s);
recalcular la cartera por conjunto o con `fillfactor` (la 9h: no bajó de 5,3 s con 80.000); dejar la regla como estaba y aceptar
que los leads sin nadie se vean un rato como de quien se fue (es justo lo que el encargo descarta); un procedimiento con
`commit` entre lotes (pg_cron lo admite, pero no se puede llamar dentro de una transacción de prueba y los demás jobs son
funciones).

**Consecuencia:** migración `…20261019001700_bajas_por_lotes.sql` y `equipo_bajas` en `schemas/02_equipo`. `humo.sql` (la baja en
curso: quién ve qué, adoptar, transferir, compartir, quitar acceso y el job), `derivados-leads.sql` (bajas a medias entre los
cambios al azar), `scripts/carreras/cartera.mjs` (siete carreras: compartir con la persona en los dos órdenes, transferir durante
un lote y después, dos bajas con un lead común, un lote cortado) y `medir-bajas.sql`, que **no** va en una transacción que se
revierte: ahí nada de lo revocado se puede descartar entre lotes y la medición mentía (6 s un lote); confirma como la base viva
y borra lo que crea. Un hallazgo en el camino: empezar cada lote desde el principio recorría, dentro de la misma corrida, lo que
los anteriores ya habían revocado (5,6 s una corrida); cada lote sigue ahora desde el último lead del anterior.

## 2026-10-17 — Cierre 1 (B): una sola vista por lista, elegida en el servidor con el ancho de la petición

**Contexto:** el listado de leads, el inventario y el kanban dibujaban sus dos vistas (tabla y tarjetas; columnas y pestañas) y
el CSS escondía una. Con 100 filas el HTML del inventario pesaba 1,39 MB crudos y había 7.900 nodos también en el celular. El
kanban ya dejaba una sola al hidratar, pero el HTML traía las dos. Y en el celular el selector «Ítems por página» quedaba al pie
de ~40.000 px de tarjetas.

**Decisión:**

- **El servidor sabe el ancho.** El navegador deja su ancho en una cookie (`ancho`, en px) al hidratar y cada vez que cruza un
  corte (640, 768, 1024); sin cookie, el `user-agent` decide (un celular, 400; lo demás, 1280). El layout `(app)` lo lee
  (`anchoDeEstaPeticion()`) y lo reparte con `<ProveedorDeAncho>`; `useAlMenos(corte)` es un `useSyncExternalStore` cuyo snapshot
  del servidor es ese ancho: el HTML trae una sola vista y la hidratación no la cambia. Girar el celular (girado mide más de 768)
  o redimensionar cambia de vista en el cliente, con las mismas filas, sin red. La única vez que la vista cambia al hidratar es
  una primera visita con un ancho que el `user-agent` no anticipa (una ventana de escritorio angosta); desde ahí manda la cookie.
- **Un proveedor en el layout y no una prop por pantalla:** las tres listas y el `FilterShell` lo usan sin que cada página
  tenga que leer cookies; una navegación del cliente no hidrata y usa la pantalla de verdad.
- **El selector va una sola vez:** en la barra desde `md`; por debajo, arriba de la lista, a la derecha. Sin «volver arriba»:
  Anterior y Siguiente quedan al pie, donde se llega leyendo. El panel de filtros también usa el ancho de la petición (una
  pintura de escritorio ya no abre la hoja un instante).

**Medido (100 filas, con volumen):** listado de leads 704.768 → 465.393 B crudos en escritorio y 427.052 en el celular (46,5 →
37,6 / 37,3 KB comprimidos), 5.020 → 2.594 nodos y 5.015 → 2.781; inventario 1.387.796 → 919.569 / 740.210 B (57,2 → 47,3 / 45,2
KB), 7.894 → 4.916 y 7.888 → 3.295 nodos. Lo que queda crudo es el flujo de React con las filas (una vez, no dos).

**Alternativas:** una sola marca que el CSS acomoda como tabla o como tarjeta (rompe la semántica de la tabla para el lector y
todos los localizadores); las dos en el HTML y una al hidratar (lo que hacía el kanban: el HTML sigue doble); Client Hints
(`Sec-CH-Viewport-Width` no llega en la primera visita y sólo en Chromium); una cookie de vista («tabla»/«tarjetas») en vez del
ancho (cada lista tiene su corte: el kanban, 640).

## 2026-10-17 — Cierre 1 (G): «página N» se descarta; arriba se dice lo que sí es verdad

**Contexto:** la 9e anotó que en el listado no se sabe en qué página se está. Con paginación por cursor no hay un número
verdadero: saberlo exige contar las filas anteriores al cursor (un costo que crece con la profundidad, y la regla de escala no
admite un número que crece con la tabla). Un contador en la URL (`?p=`) mentiría al llegar por un enlace o una vista guardada, al
volver con «atrás» a un cursor y cuando entran leads nuevos (la página «3» deja de ser la tercera); y no se puede comprobar
contra la base.

**Decisión:** no se muestra «página N». Arriba de la lista (leads e inventario) va lo que sí se sabe: sin página anterior, «Los
más recientes»; con ella, «Creados hasta el 2 sep 2026» (la fecha de la primera fila que se ve: las dos listas van de la más
nueva a la más vieja) y «Volver al principio», que quita el cursor y conserva filtros, búsqueda y tamaño
(`ubicacionDeLaPagina()` en `shared/lib/paginacion.ts`, `<UbicacionDeLaPagina>` en `shared/ui/paginacion.tsx`).

**Alternativas:** un contador en la URL (miente, ver arriba); contar hasta un tope («página 3 de más de 20», que exige leer las
filas anteriores y sigue sin saber dónde se está pasado el tope); el rango «del 2 sep al 14 ago» (más largo, y la última fecha ya
se ve al pie).

## 2026-10-17 — Cierre 1 (C): un lote de la papelera muestra sus primeros 20, y la papelera no entra al selector

**Contexto:** una página de papelera son 5 lotes y un lote, hasta 200 filas: 1.000 filas, ~8.200 nodos, y para cada lead la
base calculaba si puede volver (verifica su teléfono). La 9g dejó pendiente decidir si las papeleras entran a «Ítems por página».

**Decisión:**

- `leads_papelera_listar` y `vehiculos_papelera_listar` reciben `p_primeros` (acotado con `_acotar_pagina(p_primeros, 20, 200)`,
  `PRIMEROS_DEL_LOTE` en `paginacion.ts` y al registro de la guarda) y devuelven de cada lote los primeros 20 por número y
  `en_papelera` (cuántos quedan, exacto: a lo sumo 200, contado sobre 201). «Mostrar los N» pide **ese lote entero** desde el
  navegador (`leads_papelera_lote`, `vehiculos_papelera_lote`: el mismo filtro que la lista; nulo si el lote ya no está).
- **Sin selector:** la unidad es el lote, y 5 lotes de 20 ya son 100 filas, el máximo de una página. 10, 25, 50 o 100 lotes
  multiplicarían el DOM sin acercar lo antiguo, que está en Anterior y Siguiente.
- Lo leído vale para la versión del lote: restaurar o purgar vuelve a leer la página y el lote vuelve a sus primeros 20 (no se
  vuelve a pedir solo: hacerlo desde un efecto choca con la regla de hooks y no se desactivan reglas). Purgar el lote entero
  dice cuántos son de verdad y nombra a los primeros cinco de los que se ven.

**Alternativas:** las papeleras al selector con lotes de 20 (lo que proponía la 9g: no acorta nada y suma un control); traer los
200 y dibujar 20 (los bytes y el costo de la base siguen); un «Ver más» de a 20 dentro del lote (más clics para lo mismo que
«Mostrar los N», con un tope de 200 por la base).

## 2026-10-17 — Cierre 1 (D): los topes se dicen, con un solo aviso y sin inventar un camino que no existe

**Contexto:** cuatro lecturas cortaban en silencio: los vínculos (50) y los interesados (100) de un vehículo, los tres bloques
de «Vehículos» del lead (100 / 100 / 50) y el selector «Agregar vehículo» (20), más el historial de un tipo de cambio (30).
Cada lista que sí avisaba tenía su propio párrafo.

**Decisión:** cada lectura pide uno de más (`limit tope + 1`, mismas firmas: `…20261019001900_topes_que_se_dicen.sql`; el
historial de tipos de cambio desde la app) y `cortarAlTope()` de `shared/lib/conteo` corta y dice si había más. El aviso es uno,
`<AvisoDeTope>` de `shared/ui`: al pie, `role="status"`, «Mostrando los N … más recientes.» (`textoDelTope()`). Donde hay un
camino a lo que no se ve, se nombra (el selector: «Escribe más para afinar la búsqueda.»); donde no lo hay (cien interesados
de un vehículo, treinta cambios de un tipo de cambio), el aviso dice lo que se ve y nada más: inventarle un «Ver más» a una
lista que nadie va a recorrer sería código sin uso. «Vehículo (opcional)» de una nota lo dice como ayuda bajo el campo (un
`<select>` no tiene pie). `oportunidades-del-lead` dejó su copia local y usa el compartido.

**Alternativas:** un «Ver más» en cada una (más código y pedidos para listas que en la práctica no llegan al tope); contar el
total (la regla no admite un número que crece con la tabla).

## 2026-10-17 — Cierre 1 (E): para llegar a lo antiguo de una columna del kanban, buscar

**Contexto:** una columna dibuja a lo sumo 500 tarjetas (las de actividad más reciente) y el aviso decía «Las demás siguen en la
ficha de cada lead»: con 8.000 en una etapa, una oportunidad vieja no tenía camino desde el tablero.

**Decisión:** «Buscar en el embudo» (`?q=`): el título de la oportunidad o el nombre del lead, desde 2 caracteres, en **todas**
las columnas; el conteo de cada una cuenta lo que coincide. `embudo_tablero` y `embudo_etapa_pagina` reciben `p_buscar`
(`…20261019002000_embudo_busqueda.sql`, `_embudo_patron()` escapa los comodines); siguen siendo de invocador. Camina
`oportunidades_tablero_idx` y filtra: sin resultados recorre la columna de la persona, medido con 8.000 en una etapa en 175 ms (el
tablero sin buscar, 147). El aviso del tope pasa a «Busca para llegar a las demás.» con un botón que lleva el foco a la búsqueda.
«Ver más» conserva la búsqueda; una página que llega después de cambiar la búsqueda o el embudo se descarta; sin red no navega,
lo dice y se aplica sola al volver. La búsqueda es de esta vista: «Lista | Embudo» no lleva parámetros de una a la otra (como
hasta ahora con los filtros del listado).

**Alternativas:** «Ir a una fecha» por columna (el orden del índice, sin recorrer; se dejó como plan B si buscar no cabía en su
presupuesto, y cupo con margen: no se dejan los dos); filtros por monto o vehículo (no los pidió nadie y la búsqueda ya llega);
trigramas (bajo RLS un `ilike` no usa el índice: no es `leakproof`).

## 2026-10-17 — Cierre 1 (F, d): el barrido de huérfanos de storage-gc sigue un cursor por bucket

**Contexto:** `storage_gc_encolar_huerfanos` hacía un anti-join sobre el bucket entero en cada pasada (hasta 5 por corrida):
con 301.000 objetos ya encolados tardaba 208 ms aunque no quedara nada por encolar, y crece con el bucket.

**Decisión:** una tabla `cola_gc_barrido` (bucket, último nombre examinado, desde cuándo corre la vuelta) y una ventana de
**10.000 objetos examinados** por pasada en orden de nombre (el índice único `bucketid_objname` de `storage.objects`): se encolan
los huérfanos de esa ventana, el cursor avanza y, cuando la ventana no se llena, la próxima pasada empieza otra vuelta. El tope
pasa a ser lo examinado y no lo encolado. Medido: 82–175 ms por pasada al principio o al final del bucket; una vuelta por
301.000 son 31 pasadas (con 5 por corrida cada hora, unas 6 horas): los huérfanos son basura y pueden esperar. La fila del
cursor se toma `for update`: dos corridas que se cruzan no examinan la misma ventana. Lo de menos de 24 h que la ventana pasa
lo encuentra la vuelta siguiente.

**Alternativas:** un `created_at` como cursor (un objeto viejo que queda huérfano después no se volvería a ver); ventanas más
chicas (más pasadas para la misma vuelta, sin bajar mucho el costo fijo de cada una); recorrer todo con un hash anti-join una vez
por corrida (sigue creciendo con el bucket).

## 2026-10-17 — Cierre 1 (F, c): el avatar chico, con el relleno en una edge function

**Contexto:** la lista del equipo dibujaba a 32 px el avatar de 512.

**Decisión:** `perfiles.avatar_miniatura_ruta` (96 px, WebP) y `avatar_miniatura_fallo_en`. Al subir, el navegador saca los dos
tamaños de una sola decodificación (`comprimirEnTamanos`) y el perfil guarda las dos rutas; la lista dibuja la miniatura (o el
avatar mientras falte). **La miniatura es siempre del avatar vigente:** un trigger la deja nula si cambia el avatar sin una
nueva, y la que se reemplaza o se quita va a `cola_gc_storage` (la borra `storage-gc` recontando: `storage_refcount` la
cuenta); una que vuelve a usarse se rescata. **El relleno de lo que existía** es la edge function `avatares-miniaturas`, con el
mismo mecanismo que `storage-gc` (cron cada hora, pase de un uso): de a 20, decodifica con `@jsquash` (wasm; WebP, JPEG y PNG,
versiones verificadas hoy y fijadas en su `deno.json`), guarda sólo si el avatar sigue siendo el mismo y marca la imagen que no
puede leer para no reintentarla cada hora; también la de alguien dado de baja (la lista lo muestra). `<Avatar>` cae a las
iniciales si la imagen no carga.

**Alternativas:** las transformaciones de imágenes de Storage (dependen del plan y en local del servicio `imgproxy`, que está
apagado: el relleno quedaría probado sólo en la nube); `sharp` en un route handler de Next (otra URL que el cron tiene que
conocer, y el cliente admin fuera de su único lugar); hacerla en el navegador de cada persona al entrar (quien se dio de baja
nunca entra).

**Corrección (revisión del cierre 1):** el relleno no mueve la versión del perfil. Escribir la miniatura o su fallo pasaba por
el trigger genérico y sellaba `perfiles.actualizado_en`: quien tenía el perfil abierto recibía «Tu perfil cambió» sin que
nadie lo hubiera editado. `perfil_avatar_coherente()` restituye la versión cuando lo único que cambió es la miniatura o su
fallo (`…20261019002300`). Se eligió eso y no un `set_config` en las dos funciones del relleno porque la regla queda en un solo
lugar y vale también para cualquier escritura futura de esas columnas.

## 2026-10-17 — Cierre 2 (0a): quien está en una baja en curso no figura como dueño para los demás

**Contexto:** el cierre 1 dijo «los demás ven el estado final» de una baja a medias. Medido con una baja en curso sin lotes (P en
baja, Q asesora con el lead compartido), no era cierto en tres puntos: `leads_vista.dueno_id` (Q leía el id de P), la cabecera de
`lead_ficha()` («Lo tiene Pía Baja», mientras «Quién lo tiene» ya la había quitado) y `web.portal_snapshot()` (nombraba como
asesor a P, con su WhatsApp). El kanban y «Quién lo tiene» ya estaban bien.

**Decisión:** la migración `…002500` filtra con `la.usuario_id <> all ((select public._bajas_en_curso())::uuid[])` en las tres
(`_leads_vista_crear()`, `lead_ficha()`, `web.portal_snapshot()`) y reescribe la policy `"leads_asesores: leer"` sobre `leads_asesores`
(sólo por rendimiento: una subconsulta a `leads` en lugar de `puede_lead()` y `en_cartera()` por fila). **Corrección (cierre 3, 0a):**
esta entrada decía que esa policy hacía que la fila de quien está en baja no se leyera por otro camino. **No lo hacía**, ni la de
`…001300` ni la de `…002500`: ninguna miraba `_bajas_en_curso()`, y con una baja a medias una asesora que comparte el lead leía en
`leads_asesores` (que `authenticated` puede leer por PostgREST) la fila de dueño vigente de quien se iba. Lo cerró la migración
`…002700` (ver «Cierre 3 (0a)»). El filtro es un InitPlan sobre una tabla casi vacía: el plan del listado no cambió
(`docs/RENDIMIENTO.md`). `humo.sql` afirma que, como Q, `dueno_id` es nulo y la ficha dice «lo tienes tú»,
y que para todo lead que ve la dueña `dueno_id` es igual a `_lead_dueno(id)`; un **inventario** falla si aparece una función o vista
de `public` o `web` que lee `leads_asesores … revocado_en is null` sin `_bajas_en_curso()` y no está en la lista cerrada de sus
motivos («desde quien llama», «aplica la baja antes de decidir», «interna de la baja»).

**Alternativas:** dejarlo como un hecho documentado (la ficha de Q se contradiría a sí misma); filtrar sólo `dueno_id` (deja la
cabecera y el portal).

## 2026-10-17 — Cierre 2 (0a): `_bajas_en_curso()` no le dice nada a una cuenta que no está activa

**Contexto:** el cierre 1 dio por hecho que `_bajas_en_curso()` devolvía un subconjunto de lo que `perfiles` entrega a quien
llama. Para una cuenta activa es cierto (la policy de `perfiles` entrega todas las filas). Para una cuenta **apagada o bloqueada
con su JWT todavía vigente** no: la función devolvía los ids y `perfiles`, 0 filas.

**Decisión:** `…002600` agrega `and ((select auth.uid()) is null or exists (select 1 from public.perfiles p where p.id = (select
auth.uid()) and p.activo and not p.bloqueado))`: los jobs y `service_role` (sin `auth.uid()`) siguen viendo todo; una cuenta
que no está activa recibe `{}`. `humo.sql` afirma, como asesora activa, `_bajas_en_curso() <@ array(select id from perfiles)`, y
`{}` para la apagada y la bloqueada.

**Alternativas:** aceptar que una cuenta apagada pueda saber, mientras viva su JWT, quién más está en baja (es un oráculo
chico, pero la prueba de subconjunto quedaba falsa).

## 2026-10-17 — Cierre 2 (0b): la carrera real de `…002400` es de dos corridas de la misma baja, no la del commit

**Contexto:** el commit de `…002400` describía un camino (otra transacción con `_lead_aplicar_bajas` entre leer los ids y
bloquear) que, verificado, no cuenta dos veces: quien llama a esa función deja al lead fuera del limbo (adoptar suma a quien
adopta) o se revierte (salir y quitar acceso rechazan dejarlo vacío).

**Decisión:** el doble conteo real es el de **dos lotes de la misma baja a la vez** (una corrida manual de
`equipo_bajas_continuar()` mientras corre la de `pg_cron`). `scripts/carreras/cartera.mjs` lo provoca sin `sleep`: A toma
`lock table public.leads in exclusive mode`, B llama a `equipo_bajas_continuar()` y espera el candado (se ve en
`pg_stat_activity`), A corre la suya y confirma, B sigue; se espera `leads_al_limbo = 1`. Con la versión de `_baja_lote_desde` de
`…001700` la carrera falla con `leads_al_limbo = 2` (salida mostrada en el informe del cierre); con la vigente pasa.

## 2026-10-17 — Cierre 2 (1): todo `<Confirmar>` tiene su URL, y una guarda lo exige

**Contexto:** «Mover a…» con motivo y seis `<Confirmar>` (salir, desvincular, purgar en las dos papeleras, deshacer importación,
eliminar embudo, y los dos de eliminar origen) no sobrevivían a «atrás» ni a recargar, y no tenían la misma defensa contra el
doble envío ni contra la falta de red.

**Decisión:** `<Confirmar>` es un `Modal` que no se cierra mientras actúa, ignora el segundo clic (un solo vuelo), dice sin
conexión por sí solo («No hay conexión. No se hizo nada: vuelve a intentar cuando vuelva.») y devuelve el foco a quien lo abrió.
Cada uno vive en su URL con `usePanelPorUrl()` (`?panel=`; dentro de un panel que ya ocupa `?panel=`, otra clave: `?eliminar=`)
y lo que la URL nombra se revisa una vez al abrir (`useRevisionAlAbrir()`). «Mover a…» con motivo es un `ModalDeFormulario` en
`?panel=mover-oportunidad&oportunidad=<id>&destino=<id>`, el mismo en el kanban y en la ficha; la clave es `destino` y no `etapa`
porque `?etapa=` es la pestaña del kanban en el celular (el choque se encontró con un e2e). Se monta una vez por pantalla. La
guarda `scripts/guardas/confirmar-con-url.test.ts` tiene el registro de los once con su abridor y su señal, y falla si aparece
uno sin registrar. Los orígenes (de vehículo y de lead) y «Purgar» de vehículos entraron aunque no estaban en la lista: con la
guarda, la regla vale para todos y no nace con excepciones. «Salir» no cierra tras el éxito (la persona ya no ve el lead).
`useUltimo` necesita un valor estable: un valor que cambia en cada render lo vuelve un bucle (React #301); `useUltima` compara
por firma, con su test.

**Alternativas:** una URL por cada Confirmar sin guarda (el siguiente la olvida); `window.confirm` (prohibido).

## 2026-10-17 — Cierre 2 (2, 4): «Mover a…» no se parte, y la tabla del listado se desplaza dentro de su tarjeta

**Decisión:** el botón de «Mover a…» lleva `shrink-0 whitespace-nowrap` y la fecha de la tarjeta puede partirse: la columna del
kanban sigue en 288 px. La tabla del listado pasa a `w-max min-w-full`; la columna del nombre queda pegada a la izquierda
(`sticky`, con fondo propio en reposo, hover y foco, y un borde que se ve al desplazar) con 16 rem como mínimo (unos 32
caracteres), el resto cortado con «…» y el nombre entero en `title`. El desplazamiento horizontal ocurre dentro de la tarjeta; la
página no tiene scroll horizontal (`min-w-0` en el contenedor que es hijo de una grilla: sin él se ensanchaba la página). Con 100
filas queda dentro de los 3.500 nodos. **Corrección (el e2e completo):** con la tabla más ancha que su tarjeta, el «⋯» de cada fila quedaba
fuera de la vista y el recorrido de la asesora no podía pulsarlo (`recibeElClic`); la columna de las marcas también queda pegada, a la
derecha. El e2e de la tabla ancha lo exige sin desplazar y desplazada.

**Alternativas:** que el nombre nunca se corte (un nombre de 80 caracteres ensancharía toda la tabla).

## 2026-10-17 — Cierre 2 (3): un formulario que se reemplaza al llegar lo guardado apaga sus campos hasta entonces

**Contexto:** la ventana de pérdida de lo tecleado en el panel de tipos de cambio tenía dos tiempos: durante el envío (lo que se
teclea mientras guarda se borra cuando llega la versión nueva) y, sobre todo, entre el aviso de éxito (sale al resolverse la
promesa) y el remontaje por `key={id-actualizadoEn}`: unos 130 ms con «Guardar» ya activo.

**Decisión:** los campos de `panel-tipo-cambio.tsx` y `panel-moneda.tsx` se apagan mientras `enCurso` (que de `useAction` dura hasta
que se dibuja la respuesta) y el `<fieldset>` no basta porque los campos de Base UI no lo obedecen: se apagan uno a uno. La regla
es de `.claude/rules/ui.md`. Prueba con la action retenida (`page.route`): falló antes del arreglo y pasa después.

## 2026-10-17 — Cierre 2 (5): los avisos con un modal abierto sí se anuncian; lo que faltaba era preguntar al salir

**Contexto:** la bitácora de la 9d-3 decía que un aviso nuevo con un modal abierto «no se oye» porque Base UI deja todo bajo
`aria-hidden`. Con el árbol de accesibilidad real (CDP `Accessibility.getFullAXTree`) no se reproduce: Base UI 1.9 deja fuera del
`aria-hidden` lo que lleva `[aria-live]` y la región de sonner lo lleva siempre. Queda como guarda (`avisos-con-panel.spec.ts`,
`vehiculos-aviso-con-panel.spec.ts`).

**Decisión:** el clic en un aviso que sale de la pantalla («Abrir ficha», `sale: true`) con algo escrito en un panel **pregunta en
el pie del panel** (`useCierreConCambios()` y `salida` de `<PieDelPanel>`); «Deshacer» actúa en el lugar. Se extendió a los dos
`Drawer` donde un aviso así coexiste con un borrador (el alta de lead y el panel de vehículo). **Limitación (resuelta en el cierre 3, ver «Cierre 3 (2)» y «Cierre 3 (3)»):** los demás `Drawer`
con formulario no estaban registrados; en el alta de lead, el aviso con «Abrir ficha» se dibujaba encima del pie del panel (lo vimos en
las capturas).

## 2026-10-17 — Cierre 2 (6, 7, 8): la barra que se desplaza lo dice, la barra superior cabe al 200 %, y los avisos y la insignia heredan la app

**Decisión:** (6a) la barra de secciones de la ficha y las pestañas de etapas del celular muestran un degradado donde sigue la
barra (`useDesborde()` y `<PistaDeDesborde>`, que lleva `data-desborde` y `data-visible` para los tests) y dejan a la vista la
sección activa. (6b) La barra superior del celular usa 44 px en `px` para los blancos táctiles (con `size-11` en rem se duplicaban
al 200 %: la fila sumaba unos 456 px contra 412) y el tipo de cambio se dibuja en la barra sólo si ésta mide 24 rem o más
(`@container`); si no, está también en el menú. (7) El `<Toaster>` fija `fontFamily: 'var(--font-sans)'` en línea: sonner inyecta
`[data-sonner-toaster]{font-family: ui-sans-serif…}` sin capa y pisaba a Geist. (8) «Deshecha» tenía un solo lugar y un solo
estilo; lo que se veía era la transición de `transition-all` de `<Badge>` entre dos estados (el texto nuevo con el color del
viejo). Ahora sólo se anima el anillo de foco (`transition-shadow`); la prueba compara el estilo calculado recién deshecho con el
de después de recargar.

**Hallazgo fuera del alcance (en `docs/PLAN.md`):** con el texto al 200 % las tarjetas del listado en el celular se salen de la
página (los «⋯»).

## 2026-10-17 — Cierre 3 (0a): la policy de `leads_asesores` no entrega la fila de quien está en una baja en curso

**Contexto:** `DECISIONES` (cierre 2, 0a) afirmaba que la policy de `leads_asesores` evitaba leer la fila de quien está en baja por otro
camino. Se comprobó con una consulta real (`begin … rollback`, P en baja en curso y Q asesora con el lead compartido): como Q,
`select usuario_id, tipo_acceso from leads_asesores where lead_id = …` devolvía a **P como dueña vigente**, mientras `leads_vista.dueno_id`
era nulo. `authenticated` tiene `SELECT` sobre la tabla (PostgREST la expone) y ninguna versión de la policy miraba `_bajas_en_curso()`.

**Decisión:** la migración `…002700_cartera_sin_la_baja_en_curso.sql` suma a la policy
`leads_asesores.usuario_id <> all ((select public._bajas_en_curso())::uuid[])`: un InitPlan, se evalúa una vez por sentencia. Medido con
62.000 leads (`db:medir:volumen`): la página 1 de la dueña 14,8 ms (14,0–14,2 antes), con el máximo de la lista 24,6 ms (24,1); ningún
plan cambió. Las funciones `definer` que leen la tabla (`lead_cartera`, `_lead_dueno`) ya filtraban. Se prefirió filtrar a «declararlo con su
número»: es una comparación contra una tabla casi vacía y deja a `DECISIONES` diciendo lo que hace el código.

**Lo que lo vigila:** el humo afirma que, como la asesora, la tabla no devuelve la fila de quien se va; el inventario de `humo.sql` suma
las **policies** de `pg_policies` que leen `leads_asesores` (sólo miraba funciones y vistas: por eso no vio ésta); y
`supabase/tests/cartera-policy.sql` compara, para la dueña, dos asesoras y una con «todos», la huella md5 de lo que la policy entrega como
`authenticated` con la regla escrita aparte desde `leads_asesores` y `equipo_bajas`, en siete casos (solo, compartido, papelera, ajeno,
limbo, baja en curso y sólo de quien se va), con filas concretas para que una huella igual por error no pase. Falla sin la migración.

## 2026-10-17 — Cierre 3 (0b): el comentario de `…002400` dice la carrera que existe

**Decisión:** el encabezado de `…002400` y un comentario dentro del cuerpo de `_baja_lote_desde` (que Postgres guarda en `prosrc`)
describían un camino que no existe; ahora dicen la carrera real, de dos corridas de la misma baja. Sólo comentarios: el `pg_dump -s`
del esquema tras `db:reset` difiere únicamente en esas dos líneas. (Aún no hubo primer `db push`: la migración se puede corregir.)

## 2026-10-17 — Cierre 3 (1): las tarjetas del listado no ensanchan la página con el texto al 200 %

**Contexto:** el hallazgo decía que podía ser una regresión del defecto 4 del cierre 2 (`w-max min-w-full`). Se reprodujo el mismo spec en
un worktree del commit de docs del cierre 1: **falla igual, ya estaba** (también el inventario de vehículos). Las tarjetas no comparten
contenedor con la tabla.

**Decisión:** la causa: `<ul class="grid gap-2">` sin `grid-cols`, cuya columna `auto` tomaba el ancho mínimo de la tarjeta (nombre sin
partir, número, tipo y un «⋯» de `size-11`: 88 px al 200 %). Lista y tarjeta miden lo que la pantalla (`grid-cols-[minmax(0,1fr)]`,
`min-w-0`), el «⋯» mide 44 px y no se achica, `Anterior`/`Siguiente` se parten (`flex-wrap`: también se salían), y con una tarjeta de menos
de 16 rem (container query, que cambia sólo con el texto grande) el tipo pasa debajo del nombre y éste se parte en líneas (al verlo en
las capturas quedaba en «E2E…»). En vehículos la miniatura (`w-20`, rem), el título y «Editar» no cabían en una fila: el encabezado se
apila. Un título largo se parte; la casilla de selección mide 44 px. `sinScrollHorizontal()` nombra al elemento que se sale y a sus
ancestros e ignora lo que recorta una barra que se desplaza.

## 2026-10-17 — Cierre 3 (2): todo `<Drawer>` pregunta al salir desde un aviso; el `<Drawer>` lo hace, el formulario sólo dice que tiene algo escrito

**Contexto:** de los `Drawer` con formulario sólo el alta de lead y el panel de vehículo preguntaban cuando un aviso `sale: true`
(«Abrir ficha») se pulsaba con algo escrito. Eran **doce** los demás, no siete: además de editar el lead, teléfono, etapas, oportunidad,
tipos de cambio, moneda y cartera, también «Nuevo tipo de cambio», categoría, nuevo origen, vitrina y campo.

**Decisión:** el `<Drawer>` abre un contexto (`cambios-del-panel.ts`), anota la pregunta con `useCierreConCambios()` y la dibuja en su
ranura `pie`; un pie dentro del cuerpo la toma si es `<PieDelPanel>` o el nuevo `<PieConSalida>`. Cada formulario sólo llama
`useCambiosSinGuardar(hayCambios, alDescartar?)`, o `<CambiosSinGuardar>` si su estado vive en el mismo componente que el `<Drawer>` (el
contexto llega sólo a lo de adentro), y `useHayCambiosEnFormulario()` mide los de campos sin estado (`defaultValue` contra lo que mandó el
servidor, como el borrador). Por qué así y no un hook en cada panel con su pie: son doce pies distintos (ranura, dentro del cuerpo,
propios) y la pregunta tenía que verse igual. `useCierreConCambios()` deja de preguntar si lo escrito se guarda o se deshace mientras
pregunta. El alta de lead y el panel de vehículo conservan su mecanismo.

**La guarda:** `scripts/guardas/drawers-con-salida.ts` registra **todo** `<Drawer>` (no sólo los que tienen un `<form>`: «cartera» no lo
tiene) con su formulario o con el motivo de no tenerlo, y su test falla si aparece uno sin registrar, si un registrado deja de serlo o si un
formulario no dice que tiene cambios. Se comprobó que muerde (quitar el hook de un panel y quitar un registro la rompen).

**Pruebas:** e2e con el aviso del alta de lead (el único `sale: true` cotidiano) y cuatro paneles reales, con las dos formas de pie
(dentro del cuerpo: editar el lead y teléfono; en la ranura: oportunidad y etapas), en escritorio y celular; falla sin el hook. Los demás
(tipos de cambio, moneda, categoría, nuevo origen, vitrina, campo, cartera): pruebas de componente. **Límite declarado:** «Agregar
vehículo» (`panel-agregar-vehiculo`) queda sin formulario registrado: lo único tipeado es la nota de un interés (≤ 500) de una acción de un
clic por candidato; con varias notas escritas a la vez el contexto (un solo «hay cambios» por panel) no las distinguiría. Y tres modales con
formulario fuera de `ModalDeFormulario` (nuevo embudo, nuevo rol, invitar persona) no preguntan al descartar: en `docs/PLAN.md`.

## 2026-10-17 — Cierre 3 (3): el aviso sube sobre el pie de un panel, y crece con el texto

**Contexto:** en el alta de lead el aviso con «Abrir ficha» se dibujaba encima de «Cancelar» y «Guardar lead» (abajo a la derecha, donde un
panel tiene sus botones).

**Decisión:** `<Toaster>` pasa `offset`/`mobileOffset` `var(--avisos-abajo, 24px|16px)` y `useAvisosSobreElPie()` mide los pies abiertos
(`sheet-footer`, `dialog-footer` y `data-pie-de-panel`: `<PieDelPanel>` y `<PieConSalida>`) con un `MutationObserver` y un
`ResizeObserver` y pone la variable en `<html>`. Sólo cuenta un pie que cae en la columna de los avisos y en la franja de abajo: un modal
centrado en escritorio, o a media altura en el celular, no los mueve (`avisosAbajo()` es el cálculo puro, con su test). Con el panel
cerrado vuelven a su lugar. Alternativa descartada: mover los avisos a la izquierda con un drawer abierto en escritorio (dos reglas).
Al mirar las capturas del alta al 200 % apareció otro defecto del aviso: el icono (`size-4`, rem: 32 px) desbordaba la caja de 16 px
fija de sonner y se comía la primera letra, y el texto del aviso y del botón (13 y 12 px) no crecía. El texto y el botón siguen a la raíz
(`style`, `actionButtonStyle`, `cancelButtonStyle` en línea: le ganan al CSS de sonner, que va sin capa) y los iconos miden 16 px.
`avisoNoTapaElPie()` comprueba que las cajas no se solapan y que cada botón recibe el clic.

## 2026-10-17 — Cierre 3 (4): las etiquetas de los botones sí crecían; lo que las hacía parecer quietas era `transition-all`

**Contexto:** el hallazgo decía que las etiquetas de «Nuevo lead», «Filtros», «Vistas», «Importar», «Papelera» y «Etapas» no crecían con el
texto al 200 %. Todo `--text-*` es rem y la densidad sólo toca `--fila`; con el CSS compilado la etiqueta pasa de 13 a 26 px, igual que
los campos. Pero medido en la app enseguida de cambiar la raíz daba 13,4 px: el botón base llevaba `transition-all`, que anima también
`font-size` y el alto. Las capturas del cierre 1 y del cierre 2 miraron el mismo botón en dos instantes de esa animación (15 px y 13 px).

**Decisión:** el botón y las pestañas usan `transition` (colores, sombra, opacidad, transformaciones), como la insignia desde el cierre 2.
La guarda `scripts/guardas/sin-transition-all.test.ts` impide que vuelva (sólo el interruptor la conserva: no lleva texto). El e2e lee el
tamaño en el mismo instante del cambio y falla con el botón anterior («Filtros: 13 px → 13 px»). **«Nuevo lead» de la barra superior en el
celular es sólo un icono por diseño** (`hidden sm:inline`: un media query no sigue a la raíz); su etiqueta es la del lector. El texto del
botón (13 px) contra el del cuerpo (15 px) no es un defecto: es `--text-sm` contra `--text-base`.

## 2026-10-17 — Cierre 4 (1): todo modal con algo escrito pregunta al descartar; un hook compartido y una guarda

**Contexto:** tres modales con formulario fuera de `ModalDeFormulario` (nuevo embudo, nuevo rol, invitar persona) no preguntaban al
descartar, y se cerraban con Esc a mitad de un guardado. Al buscarlos apareció un cuarto, «Etiquetas» (el nombre de la etiqueta nueva), y
un defecto vecino: `?panel=nuevo-rol` abría el modal a quien sólo veía la matriz (`abierto` no miraba `puedeGestionar`).

**Decisión:** los tres pasan a `ModalDeFormulario` (ganan `bloqueado`, `<fieldset disabled>`, Ctrl/Cmd+S, el foco al primer error y el
guardado sin red que sale solo al volver). Lo que comparten —validar, un pedido a la vez, el rechazo junto al campo o arriba, el pedido
que no llegó— está una vez en `useEnvioDeModal()` (`shared/ui`); cada modal sólo pone su validación, su pedido y qué rechazos van junto a
qué campo (`useFormularioDeRol`, `useFormularioDeInvitacion`, `useNuevoEmbudo`). «Invitar» deja el formulario y, hecha la invitación,
abre otro modal («Invitación creada») en vez de cambiar el contenido del mismo: el pie del contrato no tiene otro estado. «Etiquetas» no es
un formulario sino una lista que se administra: pregunta por su cuenta (`useCierreConCambios` sobre el nombre sin crear). Un nombre repetido
o sin letras se dice ahora junto al campo (antes, un aviso arriba o un `alert` bajo el campo). El correo se recorta antes de validar (con un
espacio al final el esquema decía «correo inválido»).
**La guarda:** `scripts/guardas/modales-con-salida.ts` registra todo `<Modal>` que no es `ModalDeFormulario`: o `propio` (pregunta él:
`useCierreConCambios()`, `<ConfirmarDescarte>` y `bloqueado`) o `sinFormulario` con su motivo, y prohíbe un `<form>` en el archivo y en lo
local que dibuja. Se comprobó que muerde (sin registrar, sin `bloqueado`, un `<form>` en un registrado). **No registra nada de los
`ModalDeFormulario`:** cumplen por construcción.
**Alternativa descartada:** ponerles sólo el hook de cambios: no daba `bloqueado` ni el guardado sin red, que tampoco tenían.
**Límite declarado:** crear un rol o invitar no es idempotente (no llevan id de intento): si un pedido que «no llegó» sí llegó, el reintento
dice que ya existe. Lo que el servidor rechaza con «duplicado» se dice junto al campo, que es lo cierto.

## 2026-10-17 — Cierre 4 (2): la nota de un interés sin mandar cuenta como «hay cambios» y no se pierde al cambiar de vehículo

**Contexto:** «Agregar vehículo» no registraba nada: descartar el panel perdía la nota tipeada sin preguntar. La decisión del cierre 3
(«un solo "hay cambios" por panel») suponía varias notas a la vez; en realidad cada vehículo elegido monta la suya (`key`) y cambiar de
candidato o de búsqueda la tiraba.
**Decisión:** las notas viven en el panel (`{ id → nota }`): cambiar de vehículo o de búsqueda no tira ninguna, «hay cambios» es que alguna
tenga texto, y el panel lo dice con `useCambiosSinGuardar(hay, descartar, { preguntaAlCerrar: true })`. A diferencia del resto de los
paneles (cerrar no pregunta: lo escrito queda en su borrador), una nota sin borrador se pierde al cerrar, así que con esa opción el
`<Drawer>` pasa Esc, la ✕ y el clic afuera por `intentarCerrar` y, si el panel no tiene `pie`, la pregunta ocupa el pie. Marcar el interés
o vincular cierra sin preguntar. **Alternativa descartada:** un borrador en `sessionStorage` por lead y vehículo: más piezas para una nota
de 500 caracteres.

## 2026-10-17 — Cierre 4 (3): el aviso con descripción crece con el texto; la letra ya crecía, el ancho no

**Contexto:** el pendiente decía que los avisos con `description` «siguen con el tamaño de sonner». Medido, la descripción **sí** hereda el
`fontSize` en línea del aviso (sonner no le fija tamaño); lo que seguía siendo de sonner era el **ancho**: 356 px fijos, así que al 200 %
el aviso quedaba en una columna angosta (el título en tres líneas, la descripción en siete). Un e2e con el aviso de «sesión vencida» (el
único con descripción, provocado perdiendo la sesión con el panel de «Etapas» abierto) pasaba a 100 % y a 200 % en claro y en oscuro con
todo lo que se le preguntó (letra, que no corte su contenido, que no pase de la pantalla, contraste AA, que no tape el pie): salvo el
ancho.
**Decisión:** `--width` del `<Toaster>` es `min(22.25rem, 100vw − 2rem)` (356 px al 100 %, crece con la raíz y no pasa de la pantalla) y
`avisosAbajo()` toma el ancho de la columna con el `rem` de la raíz. Vale para todos los avisos, no sólo los de descripción. El color de
la descripción (`#3f3f3f`/`#e8e8e8` de sonner) pasa AA en los dos temas: no se cambió. El alto que sonner mide al montarse tampoco
quedó cortado (el e2e lo asserta con `scrollHeight`).

## 2026-10-17 — Cierre 4 (4): una captura se toma con la pantalla quieta

**Contexto:** las dos lecturas equivocadas de los botones (cierres 1 y 2) fueron capturas tomadas a media transición. Al abrir las 115 del
cierre 3 con las hojas, unas 15 de las que muestran un panel, un modal o un aviso estaban a medias (el panel entrando, un aviso
translúcido, un modal con su fondo a medio desenfocar).
**Decisión:** `capturar()` pasa por `capturarEn()` (`e2e/soporte/capturas.ts`): dos cuadros (lo que arranca en el cuadro siguiente a
montarse, como la entrada de un aviso, no existe aún en `document.getAnimations()`), todas las animaciones y transiciones **con fin**
terminadas (con tope de 2 s que dice cuáles seguían) y `animations: 'disabled'` + `caret: 'hide'` de respaldo. **Las dos cosas:** sólo
`disabled` no adelanta una transición que todavía no empezó; sólo esperar se cuelga con un spinner (infinito) o un esqueleto. Probado sin
la app (`e2e/capturas-quietas.spec.ts`): una captura cruda ve la transición a medias (rojo 40+) y la del ayudante el estado final; con un
spinner no se cuelga; si algo no termina dentro del tope lo dice.

## 2026-10-17 — Cierre 4 (5): hojas de contacto, y mirar es abrir todas

`scripts/hoja-de-contacto.mjs <carpeta>` monta las capturas de cada proyecto en hojas rotuladas (escritorio 2×2, celular 3×1, ≤ 2.000 px de
lado y a tamaño real o al 60–77 %, con Playwright, sin dependencias nuevas) más `hojas/indice.txt`. Se comprobó abriendo la primera de cada
proyecto: el texto de 12–13 px se lee. Con 115 capturas son 34 hojas. La regla (`.claude/rules/e2e.md`): «mirar las capturas» es abrir
**todas** las hojas y el informe las lista; una captura suelta sólo amplía un detalle. No se probó con otra disposición: por cuenta, 3×2 en el
celular da una escala de 0,43 y las letras de 12 px quedarían en ~5 px (no se leerían).

## 2026-10-17 — Cierre 4 (6): `importaciones-vinculos-purgar` no es lento; la importación recién creada sí, por falta de estadísticas

**Contexto:** `importaciones-vinculos-purgar` tardó 6.365 ms en una corrida y 199 ms en la siguiente; el cierre 1 lo atribuyó a una pestaña
del navegador sin medir, y el comentario de `medir-bajas.sql` documenta que las primeras escrituras tras una carga pagan su imagen
completa en el WAL. Se reprodujo con `db:medir:volumen` en nueve condiciones, con la carga de la máquina (`/proc/pressure`, loadavg) y los
contadores de WAL y checkpoints antes y después de cada corrida:
recién cargado 223 ms · `CHECKPOINT` antes 322 · segunda seguida 187 y 503 (con el IDE al 90 % de CPU) · 33 checkpoints forzados encima 191
· 7 checkpoints después de la carga 615 · un autovacuum de `seguimientos` activo 233. **No se reprodujo el 6,4 s.** La hipótesis de las
imágenes completas se refuta con números: 11 MB de imágenes completas cuestan 212 ms contra 241 con ninguna, y forzar 33 checkpoints
(24 MB de imágenes completas en la papelera contra 3,5) deja la papelera en 4.030 ms contra 4.044. El único caso lento (storage-gc 4.254 ms
contra 160, la papelera 6,6 s contra 4,0) tuvo +13,3 s de `sync` del checkpointer contra +0,3 s en las corridas rápidas: un `fsync`
lento del disco, una vez, sin poder repetirlo.
**Decisión:** (1) el estado estable **no** es «`CHECKPOINT` antes de cronometrar»: no mueve nada y `postgres` ni puede hacerlo; los
presupuestos de los jobs quedan como estaban (10 a 30 veces lo típico: atrapan una regresión de orden de magnitud, no una vuelta de disco).
(2) El runner (`scripts/medir-listado.mjs`) dice, al final de cada medición y en voz alta si falla, qué pasaba: carga, presión de disco y de
CPU, megabytes de WAL, imágenes completas, checkpoints (con el tiempo de escribir y de `sync`) y autovacuums activos: el próximo valor
fuera de lugar se explica con eso o no se explica. (3) El título de cada medición dice si es la mediana de 5 corridas o **una** (los jobs,
la baja y la importación gastan lo que miden: decía «mediana de 5» de todo).

## 2026-10-17 — Cierre 4 (7): una base recién creada tarda 20 s en su primera importación; la semilla analiza

**Contexto:** midiendo lo de arriba apareció lo que de verdad era «recién cargado»: tras un `db:reset` la primera importación de 500 filas
tardaba **20 s** (lotes de 3,8 s con 50 filas y de 7,3 s con 100, contra el corte de 8 s de `authenticated`) y la segunda ~1 s, todas las
veces (20,4 · 20,4 · 20,2 · 19,9 s). Con sólo un `CHECKPOINT` tras el reset, 19,9 s; con un `analyze` de todo, 1,2 s: **la causa son las
estadísticas que faltan**, no el WAL. Una empresa nueva (un despliegue por empresa) paga lo mismo en su primera importación, y el autovacuum
tarda minutos en analizar.
**Decisión:** `seed.sql` termina con un `analyze` de las tablas de `public` y `web` (aunque estén casi vacías ya basta: 1,25 s la primera
importación tras el reset). `medir-importacion.sql` tiene tres pasadas: «tal como queda tras el reset» con presupuesto (lote más lento ≤ 2 s,
500 filas ≤ 8 s; hoy ~0,15 y ~1,2 s; sin el `analyze` de la semilla falla con 3,7 s, comprobado), y las dos estables (sin y con los índices de
`actividad`) tras un `analyze`. Sobre una base que ya tiene estadísticas, la primera mide lo mismo que las otras y pasa. El e2e completo,
que parte de un `db:reset`, también deja de pagar los 20 s.

## 2026-10-17 — Cierre 4 (8): el lote de la importación se queda en 50, y tiene su guarda

**Contexto:** «100 también cabría» (DECISIONES, 8a). Se midió importar 500 filas con 50 y con 100 (la RPC con el tope cambiado dentro de un
`begin … rollback`, tres corridas alternadas), con la regla de pasar a 100 sólo si se cumplían las tres: el lote más lento ≤ 500 ms con
50.000 leads, 500 filas ≥ 20 % más rápido y la carrera de lotes cruzados sin cambios.
**Números:** base de la semilla, 500 filas: 50 → 1.116 · 1.377 · 981 · 1.209 ms (lote más lento 106–404); 100 → 974 · 1.024 · 1.042 · 1.009
(203–223): **13 % de mejora, no 20**. Con 62.000 leads: 50 → 2.990–3.151 (lote más lento ~310 ms); 100 → 2.903–3.026 (**~610 ms**, el doble:
el costo es por fila, no por lote). Recién creada sin estadísticas: el lote de 100 llegó a 7,3 s, a 0,7 s del corte (el de 50, 3,8 s).
**Decisión:** queda en 50 (falla el criterio de tiempo, y el margen contra el corte se come con una base fría). La carrera con 100 no se
midió: la regla pedía las tres y las dos primeras fallan. **La guarda:** el 50 estaba en cuatro lugares que no podían importarlo (el tope y
el mensaje de la última migración de `leads_importar_lote`, la prueba de la matriz que manda 51, el motivo de `escala.sql` y la medición);
`scripts/guardas/lote-de-importacion.test.ts` los compara con `FILAS_POR_LOTE` (cambiarlo a 100 rompe tres de las cinco pruebas, comprobado)
y la medición recibe el lote del código como variable de psql, sin ningún tamaño escrito.

## 2026-10-17 — Cierre 4 (9): los `beforeAll`/`afterAll` son 1,15 s por spec y proyecto; las cuentas se crean y se borran a la vez

**Contexto:** «los 105 s de `beforeAll`/`afterAll`» salió de un reporter descartable sobre 518 tests; en la corrida completa del cierre 3
(874 tests, 170 bloques spec × proyecto) son **197 s**: 126,6 de `beforeAll` y 70,6 de `afterAll`, ~1,15 s por bloque, ninguno de más de
3,5 s (los diez peores, de 1,4 a 3,5 s, están en `docs/RENDIMIENTO.md`). Con `fetch` envuelto: `createUser` ≈ 80 ms cada uno (bcrypt) y
`deleteUser` ≈ 55 ms, **todos en fila**: 65–73 % del `beforeAll` y 80 % del `afterAll`.
**Decisión (una mejora por commit, la regla era ahorrar ≥ 20 s):** `borrarPersonasDePrueba()` borra a todas a la vez salvo la más vieja (la
dueña: el guardián no deja al equipo sin quien lo administre mientras haya más gente) y a ella después (`afterAll` 430 → 220–240 ms);
`prepararAlta()` crea a la dueña primero y a las demás a la vez (`beforeAll` 710 → 400–460 ms). ~0,45 s por bloque; medido en la corrida completa: 197 → 119,6 s de hooks. Lo que
no se tocó: crear las cuentas por SQL con un hash precalculado (ahorraría más y cambia lo que prueba cada spec).

## 2026-10-17 — Cierre 4 (10): al 200 % los campos de un modal caben en él

Al mirar las capturas del cierre 4 en el celular al 200 %: el `<select>` del rol de «Invitar» (una opción larga) ensanchaba la columna del
formulario y el campo se salía del modal; el campo de «Nueva etiqueta» se achicaba hasta 112 px. `<fieldset>` de `ModalDeFormulario` es una
columna `minmax(0, 1fr)`, el select va `w-full min-w-0` y el campo de la etiqueta pasa a una fila que se parte (`flex-wrap`, mínimo 8 rem).
Lo asserta `e2e/modales-con-salida.spec.ts` (falla sin el arreglo: «el campo no se achica hasta no leerse», «no se sale del modal por la derecha»).
Se mide **sin desplazar** el cuerpo: desplazarlo de costado acomoda el campo a la vista y el desborde desaparece de la medida.

## 2026-10-18 — Parte 9i: un patrón de lista para toda tabla, el resumen de vehículos y el «⋯» del lead desde una sola lista

**Contexto:** el listado de leads y el inventario de vehículos resolvían lo mismo de dos maneras (leads abría un resumen y tenía el nombre y el
«⋯» pegados; vehículos sólo navegaba desde el título y tenía un lápiz), y el «⋯» del lead existía en dos superficies con ítems escritos por
separado (en el kanban y en el resumen no existía). El pedido traía diez cosas sin decidir; se tomaron las recomendaciones del plan.
**Decisión:**

1. **Teclado en la fila:** la parada de Tab es el botón del nombre («Abrir Ana Rojas», `<AbrirResumen>`, sin `onClick`: su clic sube a la fila);
   Enter o Espacio abren; la fila toma el color de abierta con `has-[:focus-visible]`. Un `<tr>` con `tabIndex` daría dos paradas por fila y
   los lectores lo leen mal.
2. **Ir y volver entre resumen y edición:** el panel de edición se dibuja **como hijo** del drawer del resumen (Base UI anida los diálogos por el
   árbol de React: Esc, «Cancelar» y Guardar cierran sólo el de arriba) y el foco vuelve a «Editar». Leads: `?lead=<id>&panel=editar-lead`
   (`EdicionDelResumen`, `diferido()`, lee `lead_ficha` **al pulsar**: el resumen no paga la ficha antes); vehículos: `?vehiculo=<id>&editar=<id>`
   (el `<PanelDeVehiculo>` de siempre). Con cambios sin guardar pregunta como todo panel (`useCambiosSinGuardar`).
3. **«Editar»** es un botón a la vista en las cabeceras (resumen y ficha) y el primer ítem del «⋯» sólo en la fila y la tarjeta de vehículos,
   donde no hay cabecera; el lápiz de la fila desaparece (queda una sola columna pegada a la derecha).
4. **«Principal» del layout:** el layout no tiene esa bandera (las banderas son `en_tarjeta`, `filtrable`, `publico_web`, `clave_apibara`,
   `activo`). La identidad de un vehículo en el resumen es título, «#número» y los campos `en_tarjeta`, los mismos de la lista. Una bandera
   `principal` pide migración, RPC y pantalla: otra parte (candidato en `docs/PLAN.md`).
5. **Marcas en la ficha del lead:** Favorito, Tachado y Etiquetas pasan al «⋯» de la cabecera; ésta conserva las insignias y «Editar».
   «Una sola lista» no sería cierta con otra fila de botones con lo mismo.
6. **«⋯» del kanban:** la tarjeta no trae marcas ni dueño; al **abrir el menú** se lee ese lead (un pedido a `leads_vista`), sin tocar la base
   (`_tarjeta_json` no cambió). Mientras llega, «Cargando…»; si no se pudo o ya no se ve, lo dice el menú.
7. **«⋯» del vehículo:** Editar (sólo fila, tarjeta y resumen) · Publicar en la web… · ─ · Enviar a la papelera, de `entities/acciones-de-vehiculo.ts`
   (`BLOQUES_DEL_MENU_DE_VEHICULO`, `accionesDeVehiculo(ofertas)` con `oculta | apagada | habilitada`). En la fila y el resumen «Publicar» lleva a
   `/vehiculos/<id>?panel=vitrina` (el panel y su vista previa viven en la ficha: montarlos en el inventario sumaría JS y una lectura) y **sin
   el permiso no aparece**; en la ficha abre el panel y sin el permiso se ve apagado con el motivo, como estaba el botón. La papelera se apaga con
   su motivo en las tres superficies. El nombre accesible es «Más acciones de …» en todas.
8. **«⋯» del lead:** Agendar recordatorio… · Anotar seguimiento… · ─ · Etiquetas… · Favorito · Tachado · ─ · Enviar a la papelera, de
   `entities/acciones-de-lead.ts` (`BLOQUES_DEL_MENU_DE_LEAD`, `accionesDeLead({ actuar, enviar })`); lo que no se puede no aparece y los permisos
   no cambiaron (`puedeEditarLead`, `puedeEnviarLead`; el kanban suma `puedeEnviarConAlcance`).
9. **La guarda** (`scripts/guardas/listas-con-patron.ts`) mira todo archivo de `src/modules` que dibuja `<Table>` o usa `CORTE_DE_LA_TABLA`: o
   importa `@/shared/ui/lista` o figura con su motivo (la tabla, la fila y la matriz del equipo). Las listas de `<li>` (seguimientos,
   papeleras) no entran: decenas de registros y poco valor. Su regex confundía `<TableroDeEmbudo` con `<Table` y se ajustó.
10. **Pestañas del resumen de vehículos:** «Resumen» (los datos de la ficha, sin pedir nada más), «Fotos» e «Interesados» (sólo con `leads.ver`),
    cada una con su `import()` y su lectura al elegirse; `?pestana=` sin sumar al historial.

**Desviaciones del plan, con su razón:**

- El nombre del vehículo **conserva `max-w-72 truncate`** (18 rem) como el del lead, con el nombre completo en `title` (`<AbrirResumen>`): el
  plan lo quitaba por ir contra `ui.md`, pero la columna pegada lleva además la casilla y la miniatura y, sin tope, un título largo la
  ensancharía hasta ocupar la pantalla y lo pegado dejaría de ser una ayuda.
- **El resumen no relee tras editar:** al guardar, la página revalida y trae la fila nueva; `vistaDelResumen()` elige la más nueva entre la
  lectura del navegador y la de la página por `actualizadoEn`. Es un pedido menos de lo planeado. «Editar» sólo se ofrece con el vehículo en
  la página (`editables`): uno que sólo llegó por la URL (de otra página) se abre sin él.
- Un vehículo de **otro origen** que llega por `?vehiculo=` dice «no disponible» (no se mezcla con la pestaña abierta).
- `useLecturaAlMontar`, `foco-de-quien-abre.ts` y `<Drawer focoAlCerrar>` nacieron en `shared` (leer al elegir una pestaña; devolver el
  foco al botón del nombre al cerrar un resumen).
- **El kanban pasa su presupuesto de nodos**: una columna de 500 tarjetas, de 8.212 a 11.212 nodos (el «⋯» suma 6 por tarjeta: envoltorio, botón,
  icono y tres círculos = 3.000). No se pudo evitar sin dejar el icono (con un solo glifo de texto y sin envoltorio quedaba en ~8.700, pero el
  «⋯» de las otras cuatro superficies es un icono y el glifo depende de la fuente). Se subió de 9.000 a 11.800 (lo medido más un 5 %) y el spec
  anota cuántos nodos son del menú. A 100 filas: leads 2.597 nodos y 39,5 KB comprimidos (presupuestos 3.500 y 48), inventario 5.020 y 49,6 (6.000 y 60).
- **JS en frío:** `/leads` 562,1 KB, `/perfil` 443,4, `/vehiculos` 519,2 (presupuestos 570, 460, 530). Medido en `master` antes de empezar: 560,6 y
  515,5 en `/leads` y `/vehiculos` (ya habían subido desde los 543,7 y 504,9 documentados); la 9i suma 1,5 y 3,7 KB. Ningún presupuesto cambió.

**Defecto que vieron las capturas y se arregló:** el resumen del vehículo al 200 % en el celular se cortaba (la cabecera con portada, datos y
tres botones; las pestañas fuera del panel). La cabecera se apila con un `@container`, las pestañas se desplazan con su pista, y el «⋯» de una
cabecera lleva borde (se confundía con texto). `nadaSeSaleDelPanel()` (`e2e/soporte/panel.ts`) mide que ningún elemento pase del borde del panel;
se verificó que muerde (con la cabecera vieja, falla) y hubo que reescribirla una vez porque la primera versión no mordía.

**Lo que se aprendió de las pruebas:** `supabase-js` en el navegador reintenta sin red ~7,4 s antes de fallar, así que un e2e de «sin red» espera
hasta 20 s; `listas-por-pagina` (página 3) falló una vez en una corrida larga y 0 de 35 aislada: sin explicar, se vigila en el Nivel 2.

**Niveles de verificación** (ahora en `.claude/rules/e2e.md` y `docs/ESTADO.md`): **Nivel 1** (toda tarea): lint, typecheck, `pnpm test` y los e2e
dirigidos en los dos proyectos; **Nivel 2** (si toca `shared`): `pnpm test:e2e:completo --project=escritorio` con `npx supabase functions serve`;
**Nivel 3** (un cierre): el completo con los dos proyectos.

**Alternativas:** el `<tr>` enfocable (dos paradas por fila); cambiar el contenido del mismo drawer en vez de apilar el panel (obligaba a
meter un panel que pregunta por su cuenta dentro de otro drawer); sumar las marcas al JSON de `embudo_tablero` (migración, medir 8.000 tarjetas,
y la lectura al abrir cuesta un pedido que casi nadie paga); una bandera `principal` (otra parte).
**Consecuencia:** una lista nueva sale con clic, teclado, nombre y «⋯» pegados sólo con importar el patrón, y la guarda lo exige; el «⋯» de un
módulo se cambia en un solo archivo. Cuesta: 3.000 nodos en una columna llena del kanban, ~6 por fila en las listas, y que un resumen sin su
fila en la página no ofrezca «Editar».

## 2026-10-18 — Parte 9j (0a): `listas-por-pagina` en la página 3 no se reprodujo; qué se probó y qué quedó instrumentado

**Contexto:** en la 9i falló una vez `listas-por-pagina` («la preferencia elegida vale en la página 3»): `toHaveCount(25)` recibió 10 durante 5 s, con el selector en
25 y la lista en 10. Fue la prueba n.º 2 de una corrida dirigida (`pnpm test:e2e`, 128 pruebas), con el servidor recién levantado, y no quedó ningún artefacto:
sólo `test:e2e:completo` copiaba a `e2e-fallos/`. Repetir hasta que pase no es un método.
**Qué se probó (con evidencia):**

- **E1, la condición real:** 20 invocaciones separadas de `playwright test e2e/listas-por-pagina.spec.ts --project=escritorio -g "sin haber elegido|página 3"`, cada
  una con su servidor frío y la prueba de la página 3 corriendo segunda: 20 de 20 en verde (~7 s cada una).
- **E1b, con la máquina cargada:** lo mismo con diez procesos ocupando los núcleos: 20 de 20 en verde (13 a 16 s cada una).
- **E2, el orden forzado con `page.route`** (dos pruebas nuevas, `e2e/listas-por-pagina.spec.ts`): el guardado de la preferencia demorado 1 s y 6 s, y la lectura de
  la página nueva (RSC de `?por=25`) demorada 5 s. En los tres casos la lista termina con 25 filas, la URL dice `por=25`, la cuenta guardó 25 y **el guardado va antes
  que la navegación** (la navegación sólo sale cuando la acción respondió). Con eso, las hipótesis de un cruce (H2: la respuesta de la acción, con el árbol viejo, pisa la
  navegación; H3: la navegación de nuqs se pierde) **no tienen dónde ocurrir con el orden actual**, y ninguna de las demoras las produjo.
  La de 6 s sí reproduce la firma del fallo con el `expect` de 5 s: **lo que pasó fue un guardado que tardó más de 5 s**, no un cruce.
- Estado compartido (H4) descartado por la evidencia: la prueba fija su preferencia, los contextos son nuevos y las cuentas llevan una marca por archivo.

**Decisión:** no hay un defecto de la app que reproducir (no hay prueba roja que volver verde) y no se alargó el `expect`: un guardado de más de 5 s es un hecho
que se quiere ver, no esconder. Quedó **instrumentado**: un reporter de Playwright (`e2e/soporte/reporter-de-fallos.ts`) copia `test-results/` y el reporte a
`e2e-fallos/<fecha>/` en **toda** corrida que falla (también la de un spec suelto; quedan los cinco últimos), y `listas-por-pagina` adjunta la línea de tiempo de red
(cada POST de la acción y cada pedido RSC con su URL, cuándo empezó y cuándo terminó) cuando falla. **No se explicó por qué ese guardado tardó más de 5 s**: la
próxima vez dejará la línea de tiempo y se mide con ella (`.claude/rules/e2e.md`).
**Consecuencia:** si vuelve a aparecer, hay traza, video, captura y la línea de tiempo del guardado; si el guardado resulta lento sin carga, el defecto es del guardado
(`listas.por_pagina` por RPC) y no de la navegación.

## 2026-10-18 — Parte 9j (0b): el «⋯» cuesta 3 nodos con un símbolo SVG compartido

**Contexto:** el «⋯» de la 9i costaba 6 nodos por fila o tarjeta (envoltorio, botón, `<svg>` y tres círculos) y subió el presupuesto del kanban de 9.000 a 11.800.
**Decisión:** un sprite en línea. `<SimbolosDeLista>` monta una vez en el layout `(app)` un `<svg>` oculto con `<defs><g id="…">` y el botón lleva
`<svg><use href="#…"/></svg>` sin envoltorio: el botón, el `<svg>` y el `<use>`, **3 nodos**. Con `currentColor` sigue al tema, a los colores forzados de Windows y al 200 %, y
el nombre accesible no cambia («Más acciones de …»). El presupuesto del kanban vuelve a lo medido más 5 %: 9.718 nodos → **10.250** (la prueba exige además 3 por tarjeta).
**Alternativas:** una máscara CSS (2 nodos): en colores forzados el fondo se reemplaza y el icono desaparece. `<symbol>` en vez de `<g>`: su viewport propio hizo que la
comparación de píxeles diera 117 de 255 en el celular (posiciones fraccionarias); con `<g>` dentro de `<defs>` y las copias de la prueba a múltiplos de 8 px sobre fondo plano
la diferencia es de 8 como mucho (`e2e/mas-acciones-icono.spec.ts`).
**Consecuencia:** el «⋯» no se dibuja si los símbolos no están montados (un test mira que el `use` apunte a un `id` que existe); un «⋯» fuera del layout `(app)` tendría que montarlos.

## 2026-10-18 — Parte 9j: los tipos de lead son una tabla con una clase fija, y el sistema razona por la clase

**Contexto:** el tipo de un lead era el enum `tipo_lead` ('prospecto' | 'cliente') y sus nombres estaban escritos en `entities/alta.ts` y `entities/listado.ts`. La empresa tiene que
poder configurarlos como los orígenes (crear, renombrar, ordenar, desactivar), sin que el sistema pierda lo que necesita saber de ellos: si un lead ya compró o no.
**Decisión:**

1. **`tipos_lead`** (id, clave inmutable, nombre único sin importar mayúsculas, **clase** `clase_tipo_lead` — «prospecto» o «cliente» —, activo, orden) y `leads.tipo_lead_id` con FK
   `on delete restrict`. La clase se elige al crear y no cambia. **El sistema razona por la clase, nunca por el nombre ni la clave** (la cotización final pasa al lead a la clase
   cliente; las métricas de conversión cuentan por clase: `docs/PLAN.md`, Fases 4 y 9). Los dos nombres de las clases son los únicos textos fijos.
2. **Siempre queda un tipo activo de cada clase, y lo impone la base** para quien sea que escriba: `tipo_lead_clase_vigente()` (before update or delete) toma un `pg_advisory_xact_lock` por clase
   antes de mirar si queda otro; las RPC toman además `lock table … in share row exclusive mode`. Dos personas que apagan a la vez los dos últimos terminan con un solo apagado y el mensaje
   «Es el único tipo activo de la clase …» (`scripts/carreras/tipos.mjs`, sin `sleep`). La pantalla lo dice antes: el interruptor y «Eliminar» del último de su clase salen apagados con el motivo.
3. **Un lead no guarda un tipo apagado, aunque la desactivación llegue a la vez que el alta:** `lead_tipo_vigente()` mira el tipo con `for share` (que choca con el `update` de desactivar). Un lead
   que llega sin tipo recibe `_tipo_lead_por_defecto()`: **el primer activo de la clase prospecto por orden** (lo propone también el alta); para cambiarlo basta ordenar la lista.
4. **Se escribe sólo por RPC** (`tipo_lead_crear|guardar|mover|eliminar`, con `leads.configurar`, versión y PT409); uno con leads (la papelera cuenta) no se elimina, se desactiva. El **tope de 100 vive en la base**
   (`_tipos_lead_tope()`), `tipos_lead_con_uso()` lo devuelve y el TypeScript no lo escribe.
5. **Una sola lectura para los nombres:** `leads_catalogos()` devuelve `{ origenes, tipos }` y reemplaza a la de orígenes en el listado, la ficha y la exportación; el alta y la importación los reciben en
   `lead_alta_contexto()`. Ni el listado ni el kanban suman pedidos por los nombres. El kanban no muestra el tipo.
6. **El filtro de la URL lleva la clave** (`?tipo=prospecto`): las URL, las vistas guardadas y los e2e anteriores siguen valiendo; la base filtra por `tipo_lead_id`. El CSV acepta el nombre o la clave de un tipo **activo**; uno que
   no existe o está apagado rechaza la fila y lista los activos (nunca crea uno).
7. **Cómo se fue el enum sin editar migraciones comprometidas** (aún no hubo `db push`): `schemas/` describe sólo el estado final; `20261011000050_tipo_lead_legado.sql` recrea el enum y la columna con una fecha anterior a
   todas las que los nombran, y `…20261019003000_tipo_lead_sin_enum.sql` los quita al final (junto con `leads_vista.tipo` y la versión del lead, que miraba las dos columnas).
8. **Los tipos de campo de un lead pasaron a `TipoDeCampoDeLead`/`TIPOS_DE_CAMPO_DE_LEAD`** (`refactor(shared)`) para que «tipo de lead» sea un solo concepto, como pide el glosario.

**Alternativas:** reusar la columna `tipo` como uuid y el enum como clase (sin deriva de nombres, pero los nombres mentirían y se rompería la convención `_id`); dos listas agrupadas por clase (se prefirió una sola, porque ese orden es el
del select del alta y el del filtro); el último tipo que usó la persona, o una marca «por defecto», para proponer en el alta (candidato en `docs/PLAN.md`); el tipo dentro de `mi_sesion()` (es de `equipo` y corre en cada pantalla:
un concepto de leads viviría en otro módulo); un índice compuesto `(tipo_lead_id, creado_en desc, id desc)` (ver abajo).
**Medido (`docs/RENDIMIENTO.md`):** filtrar por tipo cuesta 20 a 27 ms para la dueña, Ana y Berta, con 50.000 y con 212.000 leads; uno sin leads, 0,2 ms por `leads_tipo_lead_id_idx`; uno raro también la usa. Lo que se descarta
es la visibilidad (a Ana con el 14 %, ~19.100 filas, igual con 50.000 que con 212.000; con el raro, 7.551 con 212.000) y un índice por tipo no lo evita: no se agregó. `db:medir:volumen` con 212.000 leads **falla en dos presupuestos que no
son de tipos** y son de los 50.000: la búsqueda por nombre (234 ms contra 200) y la persona «chica» (descarta 200.040 contra 70.000); no se tocaron.
**Lo que el pedido suponía y el repo no tenía:** el kanban no lee ni muestra el tipo; el portal tampoco (el `cliente` de `web.portal_snapshot` es el nombre del lead); «200.000 leads» eran seguimientos (la siembra trae 50.000 leads: la medición con 212.000 se hizo una vez con
`-- --leads 200000`); `leads` no tenía índice sobre el tipo.
**Consecuencia:** agregar un tipo es un dato; el alta, la ficha, el filtro y el CSV no se tocan. Quien escriba una regla de negocio por tipo tiene que preguntar por `clase`. La migración legado se puede borrar el día que se haga el primer
`db push` y se aplane la historia.

## 2026-10-18 — Cierre 5a: medir antes de arreglar (la búsqueda, la persona con pocos leads, la importación y la suite)

**Contexto:** la 9j dejó `db:medir:volumen` con 212.000 leads fallando en dos presupuestos «que son de los 50.000» (búsqueda por nombre 234 ms contra 200; la persona «chica» descarta 200.040 contra 70.000), la importación de 500 filas en ~3 s con 62.000 leads contra ~1,1 s en la semilla, y un Nivel 3 de ~35 min. El pedido era medir cada uno con números y **no arreglar nada** (sin tocar `src/` ni migraciones). Números y planes en `docs/RENDIMIENTO.md` › «Cierre 5a»; pendientes con su assert en `docs/PLAN.md` (5a-1 a 5a-4).
**Lo que el pedido suponía y el repo no tenía:**

- «50.000» y «212.000» son el parámetro de la siembra: los totales son **62.000** y **212.000** leads.
- «Dos presupuestos» eran **diez aserciones de dos familias** (la búsqueda de la dueña, 2; la «chica», 8: descartes y tiempo): `escala()` cortaba en la primera. La guarda ahora las junta y las dice todas al final, con su N.
- El «~3 s con 62.000 leads» **no era de `leads` sino de `actividad`**: `medir-importacion.sql` inserta 22.000 filas de `actividad`; con `actividad` chica, 500 filas cuestan ~1,0–1,1 s con 0, 62.000 y 212.000 leads. Una consulta de `_lead_crear` cambia de plan cuando `leads` es grande y recorre `actividad` entera (3,4 ms por fila con 23.000 filas, 18,3 con 123.000; por PostgREST 500 filas: 1,2 s → 3,0 s → 10,5 s).
- **Una transacción para todo lo que escribe mide otra cosa:** la medición de la importación es de una transacción; la app corre una por lote (el diagnóstico nuevo lo hace así, y deja datos: después, `db:reset`).
- Los dos presupuestos **crecen con N** (el costo por lead es el mismo con 62.000 y 212.000 con la caché grande: búsqueda de la dueña 0,95 → 1,01 µs, la «chica» 0,30 → 0,30); con los 128 MB de `shared_buffers` locales la tabla de 207 MB deja de caber y se suma 9 a 40 %. No es calibración: es la forma de la consulta (`Seq Scan` con `ilike`; el índice del listado caminado entero para una persona con menos de una página).
  **Decisión:**

1. **Las guardas dejan de decir un número calibrado a un volumen y dicen la forma:** búsqueda `max(200, 3,2 µs × N)` ms; «chica» descartes ≤ 1,1 × N y página 1 ≤ `max(30, 0,48 µs × N)` ms. El 200 y el 30 siguen siendo los de 62.000; con 212.000 dan 683 y 102 ms contra 231 y 63 medidos (~3 veces, como el resto del archivo). Probado en las dos direcciones: verde con 62.000 y con 212.000, y con N falseado a 62.000 sobre la base de 212.000 la guarda dice las 12 aserciones. **Es el techo mientras el arreglo no llegue, no una aceptación:** el arreglo y su assert definitivo (flat en N) están en `PLAN` 5a-1 y 5a-2.
2. **No se tocó** ningún otro presupuesto, aunque cuatro están a ≥ 84 % con 212.000 (etiqueta de Ana 91/100 ms, atributo sin resultados de la dueña 90/100, campo privado de la dueña 5.363/6.000, kanban 69–104/100): pasan, crecen igual, y se arreglan con 5a-fix-1 con su fórmula por N.
3. **La importación y la suite quedan sin guarda nueva** (diagnóstico y números): `supabase/tests/medir-importacion-etapas.sql` no está en `MEDICIONES` ni asserta, para que quien arregle mida antes y después con el mismo método; la guarda va con el arreglo (`PLAN` 5a-3).
4. **La suite no se movió ni se recortó:** bajar pruebas a Vitest o `db:probar` libera ~5 %; la palanca es el celular de 65 specs (12,9 min de 19,3), una decisión de cobertura que es de la persona (`PLAN` 5a-4).
   **Alternativas:** subir el 200 y el 70.000 a lo que dan 212.000 (dejaría a los 300.000 como el siguiente fallo y diría «ok»); marcar las dos aserciones como «a vigilar» (lo que el pedido prohíbe); medir la importación con la semilla de siempre (no ve la causa: sin `leads` grande la consulta usa su índice).
   **Qué se midió y cómo:** `EXPLAIN (ANALYZE, BUFFERS)` de las consultas exactas de `medir-escala.sql` (un `escala()` desechable que no asserta) como dueña, Ana, Berta y «chica», con 62.000 y 212.000, y con `shared_buffers = 1GB` (cambio temporal con `supabase_admin`, revertido y comprobado); caminos candidatos probados en transacciones que se revierten (trigram 8,8 MB y 0,9 s, GIN de `cartera` 320 kB y 82 ms, `leads_asesores` sin índice nuevo); la importación por etapa (Node para el CSV y la validación, una transacción por lote para las funciones, `EXPLAIN ANALYZE` de 50 altas para los triggers, PostgREST con el ingreso de la dueña); la suite con una corrida de Playwright con JSON (`E2E_COMPLETO=1`, `db:reset` y `db:carreras` antes): 39,1 min, 1.009 pasan, 29 saltos, 0 fallos. No se capturó ninguna imagen.
   **Consecuencia:** la próxima tarea que toque el listado parte de 5a-fix-1; el Nivel 3 (5c) va **después** de 5a-fix-3, no antes. Quien agregue una consulta que recorre la cartera de quien mira (un filtro, una búsqueda) tiene que decir cómo crece con N y medir con 212.000, no con 62.000.

## 2026-10-18 — Cierre 5a-fix-2: importar en volumen no depende de `actividad` (la adopción del intento sólo se busca con `adoptar`)

**Contexto:** el cierre 5a midió (`docs/RENDIMIENTO.md` › «Cierre 5a», B) que importar 500 filas cuesta 1,0–1,1 s con `actividad` chica y 3,0 s con 25.000 filas y 10,5 s con 126.000: una consulta de `_lead_crear` («¿este intento ya entró por una adopción?», `actividad ⋈ leads`) se resolvía con `Index Scan Backward using actividad_pkey` y tres filtros en vez de `actividad_intento_adopcion_idx`. Objetivo: 500 filas ≤ 2 s con ~126.000 filas de `actividad` y 62.000 leads, y el tiempo por fila igual con 23.000 que con 123.000 (±20 %).
**Decisión:**

1. **A: la consulta sólo corre cuando el alta trae `adoptar`.** Migración `…20261019003100_alta_sin_adopcion_sin_buscar_intento.sql`: `create or replace` de `_lead_crear` (copia de la de `…002900`, grants intactos) con la primera consulta de adopción dentro de `if (p_lead ->> 'adoptar') = 'true'`. La de la rama del limbo (tras el candado, sólo alcanzable con `adoptar`) no se toca. Sin cambios en `schemas/`: `db:base` y `db:types` salen sin diff.
2. **Por qué se puede:** sólo la rama `v_estado = 'limbo'` de `_lead_crear` escribe `lead.adoptado_del_limbo` con un `intento`, y esa rama sólo se alcanza con `adoptar` (sin él, un teléfono en limbo devuelve `limbo` antes de escribir); las escrituras viejas de esa acción (`…000400`, `…000900`) no llevan `intento` y la consulta compara `detalle ->> 'intento' = p_id::text`; `leads_importar_lote` rechaza la clave `adoptar`. Sin `adoptar` la consulta no puede devolver filas.
3. **Por qué no B (`materialized`, `registro_id::uuid`):** se midió. El plan de la consulta depende de la estadística de `actividad`, no sólo del tamaño: con una sola persona de actor (la dueña) y adopciones presentes elige `actividad_pkey` (10 % de adopciones: 18,6 ms con 23.000 filas y 31,2 con 123.000; 25 %: 17,5 y 55,6); con 0 % de adopciones o con otros actores usa el índice parcial (0,03–0,06 ms). La forma B arregla casi todos esos casos (0,02–0,03 ms) **pero con 25 % de adopciones y 123.000 filas vuelve a `actividad_pkey` (316 ms con plan personalizado, 28,9 genérico)**: es la misma dependencia de la estimación que ya falló. A saca la consulta del 100 % de las altas normales y de la importación; no hay plan que vigilar.
4. **Lo único que cambia de conducta:** reintentar el mismo `p_id` tras una adopción **sin** `adoptar` pasaba de «adoptado, repetido» a la verificación normal del teléfono (`existe`, porque el lead ya es de quien lo pide). No es el doble envío (ese manda el mismo cuerpo con `adoptar: true` y sigue idempotente: `db:carreras` «Tomar lead dos veces a la vez»). No duplica nada; lo guarda un caso de `humo.sql`.
5. **La consulta que queda** (rama del limbo, una adopción por persona a ritmo humano; `actividad` se purga a los 14 días) conserva su costo, medido: 15–56 ms con 23.000–123.000 filas y adopciones presentes. No se reescribe: mezclaría dos arreglos y B no es estable.
6. **La medición vive en `db:medir:volumen`** (`supabase/tests/medir-importacion-volumen.sql`): una transacción por lote como la app, relleno de `actividad` con una de cada cuatro filas una adopción (si no las hay el plan es otro y la medición no ve nada: una primera versión con un relleno sin adopciones salió «verde» con el código viejo), 500 filas ≤ 2.000 ms con ≈ 124.000 filas y la **mediana de los lotes** de ≈ 124.000 entre 0,8 y 1,2 veces la de ≈ 23.000 (la suma de los lotes oscilaba 0,88–1,39 por un lote que cae en un checkpoint). Espera al autovacuum, y borra lo suyo aunque falle. `medir-importacion.sql` (la semilla, 8 s) y el diagnóstico por etapas no se tocan; el lote sigue en 50.
   **Alternativas:** B sola; B más A; un índice nuevo sobre `actividad (registro_id)` o un `COST`/`ANALYZE` por tabla (dejan el plan en manos de la estadística); quitar la consulta y confiar sólo en la clave única de `leads` (la adopción no crea fila: no hay a qué chocar).
   **Qué se midió y cómo:** `db:reset` y `db:sembrar-volumen` (62.000 leads); la medición nueva contra el código anterior (rojo) y contra el nuevo (verde), con 62.000 y con 212.000 leads (`-- --leads 200000`); `EXPLAIN (ANALYZE)` de la consulta aislada con relleno de 0, 10 y 25 % de adopciones, del actor de la dueña o de otros, 23.000 y 123.000 filas, en plan personalizado y genérico, en su forma actual y en B (números en `docs/RENDIMIENTO.md`).
   **Consecuencia:** quien agregue una consulta a `actividad` por algo que no sea su `actor_id`+`accion`+`creado_en` o su `id` tiene que decir cómo crece con las filas de `actividad` y medir con 124.000, no con la semilla.

## 2026-10-18 — Cierre 5a-fix-1a: «míos» de quien tiene «propios» se lee por su cartera (la persona con pocos leads no recorre el índice entero)

**Contexto:** el cierre 5a midió (`docs/RENDIMIENTO.md` › «Cierre 5a», A2) que una asesora con 3 leads descartaba 50.026 filas con 62.000 leads y 200.026 con 212.000 (18,5 → 62,8 ms): la policy de `leads` decide en ejecución si se ve «todos» o «propios» (`alcance_de()` y `auth.uid()` son InitPlans) y el plan genérico camina `leads_listado_idx` entero para devolver 3. Objetivo: que el costo de una lectura del listado dependa de cuántos leads ve quien mira y no de cuántos hay en la tabla, sin una segunda copia de la regla de visibilidad (`_lead_visible_para()`) y sin que nadie vea una fila de más ni de menos.

**Lo que el pedido suponía y el repo no tenía:**

- **La guarda medía consultas que la app no manda.** Para toda persona la app traduce «míos» en `en_cartera = true`, y quien tiene «propios» siempre está en «míos»; `medir-escala.sql` medía a la «chica», Ana y Berta sobre `leads_vista` **sin** esa condición, y le exigía a la «chica» `leads_listado_idx`. Se reescribió para medir lo que manda la app.
- **El cinturón de `db:probar` tiene seis clases** (1, 2, 3, L, M, X), no tres; no se agregó ninguna RPC, así que no hubo clase nueva: la vista nueva es `security_invoker` y la regla sigue en la policy de `leads`.
- **La revisión del diseño (un agente) afirmó que una vista anidada `security_invoker` dentro de una con derechos del dueño evalúa la RLS como el dueño.** No se cumple en PG 17: una versión con derechos del dueño devolvió 3 filas (las vivas) a la asesora con 500 en la papelera, igual que la `security_invoker`. Se dejó `security_invoker` igual (la policy de `leads_asesores` también aplica) y la mutación de la prueba se hizo sobre algo que sí viola la visibilidad.
- El «0,03 ms sin leads» de `RENDIMIENTO` pasa por `leads_asesores_usuario_id_idx`, no por el parcial `…usuario_vigente_idx` que nombraba el pedido; existen los dos.

**Decisión:**

1. **Una copia de la fecha en la fila de la cartera.** `leads_asesores.lead_creado_en` (de `leads.creado_en`): la llena `trg_leads_asesores_creado_en` al insertar, **siempre desde el lead** (aunque quien inserta mande otra) y con el lead `for no key update`; la sigue `trg_leads_creado_en_seguir` si el lead cambia de fecha; `trg_leads_asesores_creado_en_guarda` impide cambiarla (o el `lead_id`) a mano salvo desde otro trigger (`pg_trigger_depth() > 1`). Existen aunque nada cambie `creado_en` hoy (sólo un ayudante de e2e): la copia es correcta por construcción.
2. **Un índice por persona en el orden del listado.** `leads_asesores_listado_idx (usuario_id, lead_creado_en desc, lead_id desc) include (tipo_acceso, revocado_en) where revocado_en is null`. El `include` no es un adorno: la policy de `leads_asesores` lee esas dos columnas, y sin ellas el recorrido ordenado iba a la tabla por cada fila y el planificador, con una cartera grande, prefería `Bitmap Heap Scan` y ordenar todo el rango (Berta 20,6 → 40,3 ms; la dueña en cursor ascendente 20,7 → 79,9).
3. **`leads_cartera_vista`** (`security_invoker`): las mismas columnas y el mismo orden que `leads_vista`, unidas **por `id`** a las filas vigentes de quien mira; `id` y `creado_en` salen de la fila de la cartera y `en_cartera` y `telefono_visible` son `true` (lo son por construcción; con la expresión original el planificador estimaba que el filtro `en_cartera = true` descartaba filas y elegía ordenar). Unir por `creado_en` se descartó: la estimación de la unión colapsa a ~1 fila y el cursor no cruza de una columna a la otra. La lista de columnas sale del catálogo, de `leads_vista`: se escribe una vez, en `_leads_vista_crear()`, que ahora borra y recrea las dos.
4. **La ruta la decide el alcance.** `fuenteDelListado(condiciones)`: `leads_cartera_vista` sólo si la condición `en_cartera` trae `desdeLaCartera`, que `condicionesDeLeads` pone cuando quien mira tiene `leads.ver` «propios» (listado y exportación); quien ve «todos» sigue en `leads_vista`. **No se enruta a la dueña** porque su cartera es el 40 % de los leads y el plan por la cartera cuesta ahí: con 212.000, su campo privado sin resultados 5.318 → 5.871 ms (98 % de un techo de 6.000), su etiqueta sin resultados 370 → 611 y su búsqueda por nombre 125 → 207; la persona de «todos» con pocos leads propios (una supervisora, 78,9 ms) queda como estaba. El criterio es el alcance y no el tamaño porque el plan genérico no sabe de cuántos leads es la cartera.
5. **La guarda** (`medir-escala.sql`) mide «míos» de las personas con «propios» (Ana, Berta, la «chica», una asesora con 3 vivos y 500 en la papelera) por la vista nueva con los **mismos presupuestos que la dueña** (página 1 a 30 ms, una profunda a 150, ≤ 3.000 descartes) y sin fórmula por N; la dueña en «míos» conserva exactamente las tres filas que ya tenía. Se borran las dos fórmulas de la «chica» (`1,1 × N` descartes y `max(30, 0,48 µs × N)` ms). La búsqueda por nombre no se tocó (es de 5a-1).

**Alternativas descartadas, con su número (62.000 / 212.000; `docs/RENDIMIENTO.md`):** (B1, B2) reescribir la policy con un `OR` por alcance o con `cartera @>` y `gin`: peores para todos (la dueña, página 1: 20,9 → 133 y 142 ms con 212.000; la «chica» sin mejora, 219.093 descartes), porque un plan genérico no cambia de camino al ejecutarse; (C2) `leads_vista` como `UNION ALL` con compuertas: `Sort` sobre todo el `Append` con las columnas caras calculadas en todo (la dueña 34,8 s, Ana 1,46 s con 212.000); (C3) una relación angosta con derechos del dueño y `security_barrier`: el planificador no la aplana y la «chica» vuelve a recorrer `leads` (63.796 descartes); (C1') la misma vista sin el `include`: regresa a Ana, Berta y la dueña en las páginas por cursor; (C6) esconder `atributos_publicos` tras una función de `COST` alto para que un filtro sin resultados vaya por la cartera: la «chica» baja de 10,7 a 1,1 ms y Berta y la dueña suben 2,4 y 4,8 veces; (A) una RPC `security definer` que ramifica con el uid literal y `gin (cartera)`: el mejor plan (la «chica» 0,0 ms; un filtro sin resultados de Ana 27,6 → 3,3 ms con 212.000) pero obliga a reescribir en SQL todo el DSL de filtros y abre una clase nueva en el cinturón; queda para 5a-1, que necesita la misma función (la búsqueda por nombre).

**Límites aceptados, con su número:** la supervisora («todos», 3 propios) y un filtro sin resultados sobre una columna común (`atributos_publicos @>`, 56,2 ms para la «chica» con 212.000, presupuesto 100) siguen creciendo con N; los leads de la papelera de una persona siguen en su cartera (su fila vigente) y el índice nuevo no puede ser parcial por `eliminado_en`: una persona con 500 en la papelera descarta 530 filas en su página 1 (4,9 ms); Ana y Berta pagan ~1 ms más en la página 1 (12 → 13 ms; la causa probable es la lectura extra de `leads` que hace la policy de `leads_asesores`, no se aisló); una etiqueta o un campo privado sin resultados cuesta ~6 µs por lead de la cartera por la vista nueva (Berta, etiqueta de otra persona: 138 → 173 ms con 212.000).

**La carrera:** si la fecha de un lead cambia a la vez que otra transacción inserta una fila de su cartera, la copia quedaba con la vieja (`for share` se descartó: dos inserciones del mismo lead que suben después a `for update` se interbloquean; `for no key update` conflicta con el `update` y no se interbloquea). Dos escenarios nuevos en `db:carreras` (la fecha primero y la fila primero); con el trigger sin candado el primero falla (`iguales: false`).

**Qué se midió y cómo:** un arnés en transacciones que se revierten, como `authenticated`, con `plan_cache_mode = force_generic_plan` y `EXPLAIN (ANALYZE, BUFFERS)`, mediana de 5 corridas, siete personas (más una variante con 34), con 62.000 y 212.000 leads y `shared_buffers` 128 MB; después `db:medir:volumen` con la guarda nueva con los dos volúmenes. Las pruebas de visibilidad (`listado-cartera.sql`, la huella md5 de las filas enteras contra `leads_vista` donde `en_cartera`, por persona, dentro de los 300 cambios al azar de `derivados-leads.sql`) fallan nombrando la causa si se quita el filtro por quien mira (al menos seis bloques); quitar `revocado_en is null` o la `security_invoker` no viola la visibilidad (la policy de `leads` ya esconde esas filas) y lo vigila la guarda de rendimiento, no estas.

**Consecuencia:** migración `…20261019003200_listado_por_cartera.sql` (y `schemas/05_leads`); `fuente-del-listado.ts`; `listado-cartera.sql`, el inventario de `humo.sql` (la vista figura con su motivo) y la sonda de `numero-global.sql`; la guarda de `medir-escala.sql`; la siembra y `medir-bajas.sql` copian `lead_creado_en` a mano (con los triggers apagados). Quien agregue una lectura de leads para una persona con «propios» la apoya en `leads_cartera_vista` y dice cómo crece (con la cartera o con N); quien una `leads_vista` a la cartera lo hace por `id`, nunca por `creado_en`.

## 2026-10-18 — Cierre 5a-fix-1b: la búsqueda por nombre no depende de cuántos leads hay (candidatos por ventana, en dos pasos)

**Contexto:** el cierre 5a midió (`docs/RENDIMIENTO.md` › «Cierre 5a», A1) que la búsqueda por nombre era un `Seq Scan` de `leads` con `ilike` (207 ms la dueña con 212.000 leads, lineal) y que ningún índice trigram la sostiene bajo RLS porque `ilike` no es _leakproof_. Objetivo: ≤ 50 ms con 62.000 y con 212.000 leads para la dueña, Berta, Ana y la «chica», por la ruta que manda la app, con las mismas filas que hoy y sin que ni el tiempo, ni el conteo, ni un error revelen un lead que quien busca no ve.

**Lo que el pedido suponía y el repo no tenía:**

- **El `gin (nombre gin_trgm_ops)` ya existía** (`leads_nombre_trgm`, `…000900_indices.sql`, sin uso bajo RLS): su costo de escribir ya se pagaba. El «8,8 MB, 0,9 s» del 5a fue un segundo índice igual, creado y revertido. `pg_trgm` ya estaba habilitado en `extensions` (la migración base lo trae); no hay paso nuevo en la nube.
- **La propuesta medida («una `security definer` que saca los candidatos y les aplica `_lead_visible_para()`») no alcanzaba sola:** (1) con un término común (`Volumen`) el planificador elegía el GIN aunque recorrer el listado cuesta 1 ms, y el GIN no corta en K (40–100 ms con 62.000; con 212.000, hasta 12,8 s por el resto de la consulta); (2) para quien tiene «propios» recorrer su cartera como se pide (`lateral`) o el planificador lee `leads` entera con un `Hash Join`; (3) la página, con el `ilike` repetido, arma un `Nested Loop` de 88 ms contra 21; (4) un término sin tramo de 3 letras deja al GIN recorriendo su columna entera.
- **El `medir-bajas.sql` del Paso 0:** no cambió en `b0a29ab` sino en `90bd5db` (5 líneas: `lead_creado_en` copiado a mano porque la siembra apaga los triggers); no se aflojó ningún presupuesto ni `statement_timeout` en 5a-fix-1a ni 5a-fix-2 (los últimos aflojamientos del archivo son anteriores al cierre 5a: `86fd825` y `872eef0`).
- **La guarda medía `'%Volumen 4999% Gómez%'`**, un patrón con un `%` interior que la app no puede mandar (`patronContiene` lo escapa), sobre `leads_vista` sin `en_cartera`; ahora mide la ruta de la app.
- **El cinturón tiene seis clases** (1, 2, 3, L, M, X): las dos funciones nuevas son L. La ficha decía «las tres clases»; se corrigió.

**Decisión:**

1. **Dos pasos, como `#n`.** `leads_candidatos(p_filtros jsonb)` (`security definer`, `set search_path = ''`, clase L) devuelve `{ ids, completa, hasta }`: los primeros K = 300 que coinciden, en el orden del listado y después del cursor, de lo que `_lead_visible_para()` deja ver a quien llama (quien mira, su alcance y `_bajas_en_curso()` se calculan una vez y entran como **literales**). `leads_vista_por_ids(p_leads)` (invocador, SQL, inlineable) lee la página. K y S = 4000 viven en `_leads_candidatos_tope()` y `_leads_candidatos_recorrido()`.
2. **Dos etapas en el paso 1.** W recorre hasta S filas en el orden del listado (por `leads_asesores_listado_idx` con `lateral … limit 1` para «propios»/«míos» de quien no ve «todos»; por `leads_listado_idx` para «todos») y se queda con las que cumplen: un término común termina ahí. I (el índice) sólo si W no juntó K + 1 ni recorrió todo, con el **patrón entero**. Sin un tramo de 3 letras o dígitos ni un campo público (`_leads_candidatos_indexable()`), la etapa I es un recorrido por el listado sin tope (la dueña «todos» con la forma simple `order by … limit K + 1`, 214 ms contra 211 de antes; quien lee su cartera, con el `lateral` y en streaming).
3. **La página no repite el nombre ni el campo público** (`condicionesDeLaPagina()`): ya los cumplen los candidatos. La correspondencia con la consulta de siempre la guardan las pruebas (md5 de las filas enteras) y no la repetición. Pasadas `ventanasHasta(tamano)` sin llenar la página, vuelve a la consulta de antes.
4. **El índice** `leads_busqueda_idx` (`cartera`, `nombre gin_trgm_ops`, `atributos_publicos jsonb_path_ops`, parcial por `eliminado_en is null and cartera <> '{}'`) reemplaza a `leads_nombre_trgm`: con la cartera dentro del índice las filas de otras personas no llegan al heap (Berta lee 0 bloques buscando apellidos que sólo tienen otras personas). `fastupdate = on` con `gin_pending_list_limit = 256` kB: con `off` la baja de 200.000 tardaba 11 corridas (18 s) contra 9 (14–15 s), y 6 (10 s) sin el índice nuevo.
5. **Los hallazgos:** entran el atributo común de la dueña en «míos» y el filtro sin resultados sobre una columna común (mismo operador, mismo plan); quedan en `docs/PLAN.md` con su número, su assert y su lugar la supervisora (5a-5), el kanban (5a-6, oscila 67–111 ms con el índice de antes y con el nuevo), la etiqueta de la dueña (5a-7), los términos sin tramo de 3 letras (5a-8) y los filtros de texto y de rango (5a-9).

**Alternativas descartadas, con su número** (`docs/RENDIMIENTO.md`): candidatos sin tope (P: un término amplio junta hasta 212.000 ids; con el índice entero la «chica» lee del heap lo de otras personas); un tope y volver al camino de antes (Berta ≈ 75 ms con más de 300); la página entera en SQL (A: reescribe los filtros, el conteo y la exportación); envolver `ilike` en una función _leakproof_ (sólo un superusuario puede; `postgres` no lo es en Supabase y PGlite lo dejaría pasar); una vista con derechos del dueño y sin barrera (los operadores que elige el cliente se evaluarían sobre filas que no se ven); **n-gramas de 1 y 2 caracteres en el mismo índice** (500 altas pasan de 1,1–1,7 s a 2,8–3,7 s, 2,5 veces, y se rompe el tope de 2 s de la importación: queda como decisión de la persona en 5a-8); un `gin (cartera)` aparte (el `BitmapAnd` arma el bitmap global del trigrama, la señal de tiempo que se quiere evitar); `fastupdate = off` (la baja, +18 %).

**Límites aceptados, con su número:** (a) un término sin tramo de 3 letras o dígitos, escaso, cuesta lo que costaba (la dueña 241–255 ms «todos» y 156–161 «míos», Berta 90–94, con 212.000: 5a-8); (b) un término de 0,3 % de densidad con un prefijo común (`Volumen 123`, la dueña en «todos») llegó a 52 ms con 212.000 (el `Bitmap Index Scan` lee las listas de trigramas comunes: 21 ms); (c) mientras dura la baja de una persona, sus leads son candidatos de quien ve «todos» y se descartan en la página (transitorio); (d) son dos lecturas: un lead que alguien comparte entre las dos aparece al recargar; (e) la baja de 200.000 tarda ≈ 40–50 % más en total (9 corridas del job en vez de 6; la llamada y la corrida más larga no cambian); (f) el conteo de tachados ocultos y el de la exportación siguen por la consulta de antes; (g) una búsqueda con tachados ocultos o un favorito que deja pocos puede pedir más de una ventana (hasta `ventanasHasta`).

**Qué se midió y cómo:** 62.000 y 212.000 leads (`db:reset` y `db:sembrar-volumen`, con y sin `-- --leads 200000`); prototipos en transacciones que se revierten, como `authenticated`, plan genérico, `EXPLAIN (ANALYZE, BUFFERS)`, mediana de 5 corridas; cuatro variantes de índice (el de antes, B, C y G); el costo en escritura alternando el índice en la misma base (importar 500 filas, los jobs, la baja de 200.000, 500 altas, 10.000 updates de cartera); un A/B del kanban; la huella md5 en PGlite y en Postgres de verdad. Mutaciones: sin la regla de visibilidad, con un patrón que no escapa `%`, con `strict` (rompen un bloque cada una, con su causa). La guarda con la ruta de antes: 46 aserciones rotas con 212.000.

**Consecuencia:** migración `…20261019003300_busqueda_por_candidatos.sql` (sin tablas: `db:base` sin diff); `entities/candidatos.ts` y `infra/queries/candidatos.ts`; `busqueda-leads.sql` y `busqueda-volumen.sql`; la guarda de `medir-escala.sql`. Quien agregue un filtro nuevo de leads que use `ilike` o `@>` no puede suponer que un índice lo sostiene bajo RLS: lo agrega a los candidatos (y a `condicionesDeLaPagina`) o dice cómo crece con N. Una función que devuelve `setof leads_vista` nace dentro de `_leads_vista_crear()`. `db:medir:volumen` abre con la carga de la máquina; una falla por carga deja la línea, y se mide otra vez con la máquina quieta, sin arreglar repitiendo.

## 2026-10-18 — Cierre 5b: el `index.ts` de un módulo no exporta componentes, la ficha manda lo que dibuja y los cuatro defectos de interfaz

**Contexto:** el cierre 5 dejó cuatro temas de higiene (los barriles de módulo, la ficha y las oportunidades, la tabla de criterios y el índice de este archivo, las fechas de las entradas), los cuatro defectos de interfaz que vieron las hojas del cierre 3 (4.1 a 4.4), los disparadores del Nivel 2 y los presupuestos que quedaron cerca de su techo. Los números están en `docs/RENDIMIENTO.md` › «Cierre 5b». El plan se aprobó sin respuestas y se tomaron las doce recomendaciones; dos se cambiaron con su razón (abajo, 5 y 8).

**Decisión:**

1. **Una pantalla paga todo lo que reexporta lo que importa, así que el `index.ts` de un módulo no exporta componentes.** Los componentes de cada pantalla salen por una **cuarta entrada**, `@/modules/<x>/pantallas/<pantalla>` (un archivo por pantalla, que reexporta sólo lo que ella dibuja), que sólo importa `src/app` (`LAS_ENTRADAS_Y_LAS_PANTALLAS` en `eslint.config.mjs`; el override de `src/app/**` va antes del del shell). El `index.ts` queda con sesión, lecturas, actions, reglas y tipos. Se aplicó en `equipo`, `empresa`, `leads`, `origenes`, `vehiculos` y `tablero` (su `index.ts` es `export {}` y la bandeja vive en `pantallas/inicio.ts`). Había dos cadenas que nadie había anotado: `equipo/index.ts` reexportaba `canjearAcceso`, que importaba el barril entero de `empresa` (15,9 KB de Configuración › Empresa en toda pantalla), y `/leads` arrastraba la ficha, el importador y los editores de configuración. JS en frío con gzip: `/leads` 565,4 → 498,6 KB, `/perfil` 443,3 → 413,0, `/vehiculos` 520,0 → 467,7.
2. **La guarda recorre los imports de valor** de cada `src/modules/<x>/index.ts` (`scripts/guardas/barriles.ts`: también reexports y imports de varias líneas; no `import type`, ni `import { type A }`, ni `import()` dinámico, que carga aparte) y falla, con el camino de archivos, si llega a un módulo `'use client'`. Corre sobre **todos** los módulos reales (diecisiete), no sólo los cinco que la tenían: un barril limpio hoy se ensucia con el próximo `export` de un componente. Se probó con una regresión (un componente de equipo en su index) y tiene casos sintéticos.
3. **Los presupuestos de JS bajan a lo medido más un 5 %** (redondeado a la decena): `/leads` 570 → 530, `/perfil` 460 → 440, `/vehiculos` 530 → 500. Ninguno sube: el presupuesto es lo que la guarda defiende, no un tope que se estira.
4. **La ficha manda lo que «Datos» dibuja, y el panel de edición lee sus catálogos al abrirse.** `DatosDeLaFicha` lleva el lead, los campos activos, el origen y el tipo de **este** lead (también apagados: el que conserva uno se sigue nombrando), las etiquetas de quien mira y la cartera. El layout completo y los catálogos de lead (hasta 100 orígenes y 100 tipos) los lee `<EdicionDeLaFicha>` desde el navegador cuando se abre el panel (`leerCatalogosDeEdicion()`, `useLecturaAlMontar`): esqueleto, «No se pudo cargar el formulario.» con «Reintentar», una lectura nueva en cada apertura y un `?panel=editar-lead` en la URL que lo abre igual. Con los catálogos al tope la ficha aporta 40,1 KB al documento, no 70,1 (presupuesto 48 → 43); un test lo mide y falla con las props de antes. El costo: el primer instante del panel es un esqueleto en vez del formulario ya dibujado; el panel se abre pocas veces por visita.
5. **Las oportunidades visibles son 10 y «Ver todas» es un enlace, sin tocar la base.** El servidor lee igual (101, con `hay_mas`) pero manda sólo lo que se dibuja; `?todas=1` trae las que lee la base, hasta 100, y «atrás» vuelve a las 10. Con 105 oportunidades la sección aporta 62,3 KB (antes 374). **Lo que el plan recomendaba y se hizo distinto:** el plan decía que «Ver todas» lee en el lugar las 100 al pulsarse, por el camino de «Ver más» de los seguimientos, con sus estados («Trayendo…», sin red con «Reintentar», error). Se hizo un enlace con su URL: lo que se abre vive en la URL (`.claude/rules/ui.md`), así que «atrás» vuelve a las 10 y la recarga conserva lo que se veía, y la sección sigue dibujada por el servidor, sin un lector de navegador, un estado de carga ni un camino de error nuevos. El costo es que «Ver todas» es una navegación (la sección vuelve a leer las oportunidades y trae las 100 a la vez), no un «Ver más» incremental; la lista que crece de a poco es justo lo que pide 5a-12. **El camino más allá de 100 queda en `docs/PLAN.md`, 5a-12**, con su assert y su lugar (la RPC con `p_tamano` y cursor pide migración, `db:carreras` y el registro de páginas).
6. **Las fechas.** 35 entradas (23 de este archivo y 12 de BITACORA) llevaban una fecha posterior a la de su commit en hora de La Paz, entre la parte 7a y la 9e, y dejaban dos inversiones de orden; se corrigieron junto con las ocho referencias que las citaban. `scripts/mapa.sh --check` falla si una entrada de DECISIONES o de BITACORA lleva una fecha posterior a `TZ=America/La_Paz date +%F` o si las entradas quedan fuera de orden (`scripts/fechas-de-entradas.mjs`). **Una fecha sale siempre de ese comando.** **Las migraciones con prefijo de mañana no se renombran**: 33 llevan `20261019…`, el prefijo es su clave de orden y hay más de treinta referencias `…003300` en los docs; una guarda (`scripts/guardas/orden-de-migraciones.test.ts`) exige que una migración **nueva respecto de `HEAD`** vaya después de la última, y dice qué prefijo usar (`supabase migration new` pondría el de hoy y quedaría antes de las que ya la necesitan; `db reset` aplica por nombre). Compara con `HEAD` y no con el árbol: lo que ya está no puede fallar.
7. **El índice de este archivo lo genera `scripts/mapa.sh`** (el hook Stop ya lo corre), entre `<!-- indice:inicio -->` y `<!-- indice:fin -->` al principio: una línea por entrada, `L<n> · <fecha> · <título recortado a 100 caracteres>`; `--check` falla si quedó viejo. Con 4.300 líneas y 400 KB, «leer sólo el índice» antes no era posible.
8. **Los disparadores del Nivel 2 son seis y ningún otro** (`.claude/rules/e2e.md`): lo compartido (`src/shared`), el proxy, auth, RLS, el layout y el esquema base. Comando: `pnpm test:e2e:completo --project=escritorio`, sólo escritorio, ~20 min, **después del último cambio de código**. **Lo que el plan recomendaba y se cambió:** nada de fondo; la decisión nueva es que un cambio en la barra de filtros o en el modal (ambos `src/shared`) dispara el Nivel 2 aunque «sólo toque un componente»: lo usan todas las pantallas y lo dirigido no ve lo que rompe en otra.
9. **4.1, la barra del listado** (`FilterShell`, que usan leads y vehículos): con un contenedor de 48 rem o más las acciones siguen juntas a la derecha; por debajo el grupo es `display: contents` y cada pieza envuelve por su cuenta, a la izquierda y en el orden en que se leen, con «Ítems por página» al final. Es una consulta de contenedor y no de viewport: al 200 % el viewport no cambia pero el ancho disponible en rem se reduce a la mitad.
10. **4.2, los marcadores:** el esquema de búsqueda suma un `marcador` corto («Nombre o número», «Título, VIN o lote»; el kanban, «Título o lead»); la etiqueta completa queda en el `<label>` `sr-only`, así que los e2e que buscan por nombre accesible no cambian. **Lo que el plan recomendaba y se cambió:** el plan ponía una lupa dentro del campo del listado, «como en el kanban»; no se puso, porque resta ~44 px justo donde el campo mide ~300 px y el marcador tiene que caber (el kanban ya la tenía y tiene más ancho). El ayudante `exigirMarcadorQueCabe` mide con el lienzo el texto contra el campo, al 100 y al 200 %, en los dos proyectos; se probó en rojo antes.
11. **4.3, la vista previa de la importación:** con un contenedor de 42 rem o más la lista es una grilla y cada fila un `subgrid`: «Fila N» del ancho de su contenido (la primera columna es `max-content`: con 6 rem «Fila N» se partía y el distintivo «Con errores» pisaba el nombre), el nombre del suyo hasta 20 rem (y se parte si pasa) y el motivo con lo que sobra, alineados entre filas. Por debajo, que es el celular y el escritorio al 200 %, apila el nombre sobre el motivo. Primero se probó `md:` (viewport) y se desbordaba al 200 % en escritorio: por eso es un contenedor.
12. **4.4, el pie del modal en el celular:** la descripción se desplaza con el cuerpo (la cabecera fija queda sólo con el título y la ✕), los botones miden 44 px fijos (`min-h-[44px]`, no `min-h-11`, que es rem y valía 88 px al 200 %) y van en una fila si caben o apilados con el principal arriba (`flex-wrap-reverse`); la pregunta de descartar (`<ConfirmarDescarte>`) hace lo mismo. Medido en nuevo rol, invitar y nuevo embudo: pie 13 a 23 % de la pantalla y cuerpo 55 a 69 % del modal (antes 31 y 32 %); con la pregunta, pie 34 % y cuerpo 47 a 52 %.
13. **Lo que se vio al mirar y no era de la tarea va al PLAN con su número** (`docs/PLAN.md`): 5b-1 (el buscador de la barra superior se corta al 200 % en el celular), 5b-2 (el kanban con una tarjeta ensancha la página al 200 % en el celular; ya estaba en `5b-antes`), 5b-3 (el shell manda los catálogos del alta a toda pantalla, ≈ 26 KB con 100 + 100) y 5b-4 (la meta de «otorgar el portal ≤ 30 s» no tiene prueba). Los presupuestos cerca del techo, cada uno con su número, su assert y su lugar, sin subir ninguno: 5a-10 (el campo privado de la dueña, 5.534 de 6.000), 5a-11 (la baja de 200.000, 9 corridas y 14,4 s), 5a-12 (más de 100 oportunidades) y la etiqueta de Ana dentro de 5a-7.

**Alternativas descartadas:** servir lo grande con `diferido()` y SSR en vez de partir los barriles (el manifiesto de cliente de la página lo arma el grafo de servidor: lo que reexporta el `index.ts` se paga igual aunque nadie lo pinte); migrar sólo `equipo`, `empresa` y `leads` (`origenes` y `vehiculos` también tenían componentes en su barril, y la guarda cubre a todos); en la ficha, sólo recortar «Datos» más un `cache()` del layout (deja los catálogos al tope en el documento de cada visita: 70 KB); renombrar las migraciones con prefijo de mañana (cambia su clave de orden y 30 referencias); un índice del DECISIONES en un archivo aparte (se desactualiza sin que nada lo note: `mapa.sh --check` lo vigila dentro del mismo archivo).

**Qué se midió y cómo:** JS en frío con `e2e/presupuesto-js.spec.ts` sobre el build `.next-e2e`, antes y después de cada barril; la ficha contra `/perfil` con la semilla y con 100 orígenes y 100 tipos sembrados; las oportunidades con 105 sembradas por SQL; los defectos con cajas (`boundingBox`, `measureText`) en un solo `evaluate`, al 100 y al 200 %, escritorio y celular, antes y después, y 43 hojas de contacto de `e2e-capturas/5b-despues` abiertas una por una (`5b-antes`: 37). Un e2e de ancho de campos (invitar al 200 %) falló una vez bajo carga: el modal tiene una transición de ancho de 100 ms y el test leía las cajas del modal y del campo en dos llamadas; ahora las lee en una sola evaluación (no se reintentó: pasó 6 de 6 aislado y la causa quedó en el spec). Mutaciones: cada spec de 4.1 a 4.4 y la guarda de barriles se probaron en rojo contra el diseño anterior.

**Consecuencia:** una pantalla nueva = su archivo en `pantallas/` (`.claude/rules/modulos.md`, `docs/GLOSARIO.md` › «Pantalla (entrada)»); un `export` de un componente en un `index.ts` rompe `pnpm test` con el camino. `FilterShell` y `<Modal>` se tocan con el Nivel 2. Quien muestre una lista de filas pesadas (props del servidor a un componente de cliente) dice cuánto pesa cada una y cuántas dibuja por defecto.

## 2026-10-19 — Cierre 5a-fix-3: la suite de e2e baja de 42,0 a 31,7 min; el celular sale por demostración, no por el título

**Contexto:** el cierre 5a midió la suite con los dos proyectos (39,1 min, la mitad el celular) sin arreglarla (`docs/PLAN.md` 5a-4). La persona decidió que un spec deja de correr en celular **sólo si se demuestra, spec por spec, que el celular no le agrega nada**, que bajan de nivel las pruebas de `docs/RENDIMIENTO.md` › «C» que queden cubiertas (comprobado con una mutación) y que `vehiculos-apibara-funcion` y `capturas-quietas` corren en un solo proyecto. Los números están en `docs/RENDIMIENTO.md` › «Cierre 5a-fix-3». El plan se aprobó sin respuestas y se tomaron las siete recomendaciones, salvo la forma de la marca (abajo, 1).

**Lo que el pedido suponía y el repo no tenía:**

- **La clasificación 65 / 19 / 17** salió de leer el título de cada spec y no se sostiene: 26 specs llaman a ayudantes que preguntan por el ancho (`panelDeFiltros`, `grupoDelFiltro`, `verEtapa`, `tactil`) y **el servidor dibuja sólo las tarjetas en celular** (`anchoDeLaPeticion`: el `user-agent` móvil da 400 px). Hoy son 536 pruebas por proyecto (519 en el 5a) y los 39,1 min no se pueden comprobar (no quedó el JSON).
- **La lista de «C»** no coincidía con el repo en varias filas (el mensaje de «más de 5.000», el route handler sin prueba, el escape de la búsqueda, un tope de orígenes que no llamaba a la RPC, `medir-jobs.sql` que mide tiempos): se rehízo contra el código.
- **Las cuentas no dan 25 min:** con el escritorio en 19,6 min solos, el celular tendría que quedar en ≈ 4 y quedan 196 pruebas con una diferencia real. Se reporta el número real en vez de aflojar la prueba (5a-4b).

**Decisión:**

1. **La marca es un comentario.** `// @sin-celular-archivo: <motivo>` suelto o `// @sin-celular: <motivo>` justo encima de un `test('título', …)` del nivel superior. **Lo que el plan recomendaba y se cambió:** el plan ponía `sinCelularEn('motivo')` como argumento de `test()`; Prettier reindenta cada cuerpo (5.386 líneas de diferencia) y pasa siete specs del tope de 300 líneas del lint (los comentarios no cuentan). Un comentario no toca el código ni su formato. Por defecto todo spec nuevo corre en los dos proyectos. `playwright.config.ts` deja fuera lo marcado en `movil` (`testIgnore` por archivo y `grepInvert` por archivo y título; un `testIgnore` de proyecto reemplaza al de arriba, así que lleva también el de volumen) y `scripts/guardas/sin-celular.test.ts`, en `pnpm test`, lo lista y falla sin motivo, con motivo corto (< 40), si la marca no está sobre un `test(…)` con título fijo, si dos pruebas llevan la misma, y si el spec **pregunta por el ancho o el proyecto, llama a un ayudante que mide (también a través de otros), o lo hace un `beforeEach` o una función local del spec**.
2. **La demostración es un comparador, no una lectura.** `E2E_HUELLA` graba por prueba cada acción de un `Locator` y cada `expect` (enganchados al `Frame` del cliente de Playwright, que ve todo `Locator` con su selector) con la huella del elemento (la cadena de ancestros: etiqueta, rol, nombre, `data-slot`, `data-side`, `aria-modal`), los errores de consola y el JS que se ejecutó (`Profiler.takePreciseCoverage`, de bloques). `scripts/comparar-anchos.mjs` deja salir una prueba sólo si los pasos son los mismos sobre los mismos elementos, no hay errores distintos y **todo el JS que el celular agrega lo ejecuta otra prueba que se queda**. Reglas que se aprendieron midiendo (321 «distintas» de 527 sin ellas, 196 con): la URL de un paso cuenta sólo en un `goto` (`nuqs` la escribe un cuadro después), el elemento de una acción sólo se compara si existe en los dos lados, los números de un nombre y el nombre del proyecto no cuentan, las envolturas `div` sin rol ni nombre se descartan, y una cadena cortada se compara hasta donde llegan las dos. **Controles** que tenían que salir distintos (`listado-tarjetas-200`, `leads-embudo`, `leads-listado-filtros`, `leads-ficha-telefonos`, `listas-por-pagina`, la cámara de `vehiculos-fotos`) y salieron. Resultado: 294 IGUAL, 196 DISTINTO, 29 SALTADA, 8 en un solo proyecto.
3. **212 pruebas salen del celular** (15 archivos enteros, 164 sueltas): las 277 que el comparador dejaba salir menos 63 que la guarda frenó (una medición del ancho escondida en un ayudante, que el comparador no ve) y 2 que la validación en celular mostró dependientes (una prueba `serial` alimentaba a la siguiente). Más 6 que no abren la app. El celular pasa de 536 a **315 pruebas**; `node scripts/areas-cubiertas.mjs` comprueba con `--list` de antes y de después que cada nombre que sale sigue en el otro proyecto o bajó, y no hay ninguno sin cubrir.
4. **Seis pruebas bajan de nivel, cada una con su mutación** (la de abajo cae, se revierte, se borra el e2e): la celda con fórmula (Vitest), «la asesora no entra… ni la RPC» de orígenes y de tipos (`humo.sql` y los `*-recorrido`), las dos de las marcas (`humo.sql` y una carrera nueva, `scripts/carreras/marcas.mjs`, porque ninguna cubría los topes de 20 y de 50 con dos pedidos a la vez) y la lectura de `leads.numero` (`numero-global.sql`). **Se quedan** las que son el único lugar de un mensaje o de un estado de pantalla (la tabla de RENDIMIENTO dice cuál y por qué). Bajar de nivel libera ≈ 0,5 min.
5. **El assert de 25 min no se cumple: 31,7 min, 0 fallos.** `docs/PLAN.md` 5a-4 se cierra en lo que se decidió y **5a-4b** queda con su número, su assert y su lugar (dos pilas de Supabase y los dos proyectos a la vez); **5a-13** anota lo que el cruce de ramas encontró: «Rol a la vista» no tiene ninguna prueba.
6. **Tres carreras de las propias pruebas** salieron al medir, cada una explicada por la traza y el DOM (sin reintentos): el clic en «Tipos de cambio» 1 ms después del Esc del menú (dos botones; el original falla 1 de 10 sin carga), el nombre del resumen como subcadena de «Editar <nombre>» mientras el panel se cerraba, y el Esc 1 ms después del `fill` de la nota de «Agregar vehículo». Se espera `toBeHidden()` y `esperarDosCuadros()` (`.claude/rules/e2e.md`).

**Alternativas descartadas:** la marca dentro de `test()` (arriba); una etiqueta `@sin-celular` en el título (suma caracteres a títulos que ya llegan a 100) y una lista de títulos al principio del spec (suma líneas de código a archivos que ya están en el tope); `test.skip` por proyecto (cuenta como salto y paga el `beforeAll`); un tercer proyecto «sin navegador» para las dos que no abren la app; **leer las trazas de Playwright** (el DOM de las instantáneas se guarda con referencias a las anteriores) y **comparar el árbol accesible de toda la página** (el marco siempre difiere y no dice nada de la prueba); decidir por el título o por «qué componente toca el spec» (es lo que produjo el 65); un fixture automático sobre `page` (crearía una página para las pruebas que no la usan); aflojar el 25.

**Límites aceptados:** (a) el comparador no ve las mediciones que ocurren fuera de un paso de un `Locator` (cajas, `scrollWidth`, el 200 %): las cubre la guarda por lo que llama el spec, y una primitiva de medida nueva que no esté en su lista se le escapa; (b) una diferencia sólo de posición («Ítems por página» arriba de la lista) no cambia la huella: la miden las 14 pruebas que se quedan y la piden; (c) la cobertura es de bloques de V8, no de líneas del fuente, y una función ejecutada por una prueba que se queda cuenta como cubierta; (d) una rama del celular que ninguna prueba toca (5a-13) sigue sin tocar; (e) las cadenas `serial` se revisan corriendo `movil` con las marcas, no leyendo.

**Qué se midió y cómo:** cinco corridas completas o de `movil` (tabla en `docs/RENDIMIENTO.md`), huellas de las 527 pruebas comparables, 20 a 30 repeticiones de cada prueba que falló (con y sin el arreglo), seis mutaciones de producto y de base revertidas (`git status` limpio de `src` y `supabase` en cada commit), la carrera nueva contra la base local con el candado vaciado y restaurado. **Una corrida no es limpia si algo más corre**: el hook de Stop ejecuta `pnpm test` (75–95 s, carga 9–10) cada vez que el turno termina; la corrida «antes» lo sufrió y la final se hizo esperando a que la carga bajara de 1,5.

**Consecuencia:** un spec nuevo corre en los dos proyectos sin hacer nada; para salir del celular necesita la marca, el motivo y la demostración (`.claude/rules/e2e.md`). El Nivel 3 es ≈ 32 min; el Nivel 2, ≈ 20. Quien agregue una medición de la disposición a un ayudante la hace saltar a la guarda sola (`ayudantesQueMiden()` lee `e2e/soporte`).

## 2026-10-19 — Cierre 5b-fix: el buscador cabe por el ancho de la barra, el kanban no ensancha la página y «Nuevo lead» lee lo que necesita al abrirse

**Contexto:** la 5b dejó tres defectos del layout (`docs/PLAN.md`, 5b-1 a 5b-3). Se aprobó el plan sin respuestas y se tomaron las recomendaciones; la restricción era no tocar SQL ni migraciones.
**Decisión:**

1. **5b-1, el buscador de la barra.** Bajo 24 rem de interior de barra, un icono de 44 × 44 px (en px: `h-9` en rem era 72 px al 200 %) con `aria-label` «Buscar»; desde 24 rem, el icono y «Buscar» entero. La regla la da el `@container` del `<header>` y no la ventana: `@container` mide el interior sin el relleno, así que «24 rem» son 384 px (el test lee el relleno y mide 24 rem justos y un píxel menos). El buscador de la Fase 7 hereda la regla. En escritorio al 200 % la barra también queda en el icono (la barra mide menos de 24 rem de 32 px): es la misma regla de `ui.md`.
2. **5b-2, el kanban.** La causa se midió con el DOM antes de editar (el elemento no estaba nombrado): el pie de la tarjeta pedía 411 px a una columna de 348 y las pistas `auto` de `div.grid gap-4` › `div.grid gap-3` › `section` › `ul` crecen con el contenido mínimo; la página llegaba a 475 px en un celular de 412. Se arregló la causa con `grid-cols-[minmax(0,1fr)]` en cada grilla del camino (y en la `dl` de la tarjeta), `min-w-0` en la sección y el `<li>`, el pie con `flex-wrap` y el nombre del lead cortado con «…» (`flex` con `truncate` y el número aparte). **Prohibido y no usado:** `overflow-hidden` y `overflow-x-hidden` en la página o el tablero (esconden el defecto, no lo arreglan). Se corrió `sinScrollHorizontal()` en el listado, el inventario y las dos papeleras al 200 %: ninguna otra falló, así que no se tocó nada más.
3. **5b-3, «Nuevo lead» lee al abrirse.** `<AltaDeLead>` no recibe nada (el layout ya no llama a `leerContextoDeAlta()` ni a `leerLayoutDeLeads()`: eran dos consultas más en cada petición, y si una fallaba el botón desaparecía sin decirlo). El drawer se abre al instante con su esqueleto y lee desde el navegador **dos pedidos en paralelo** (`lead_alta_contexto` y `leads_campos`), adelantados con `pointerenter`, el foco del botón y la tecla `N` (que además abre el drawer: todas las entradas leen); con la URL `?panel=nuevo-lead` lee al llegar. Estados: cargando (esqueleto), error con «Reintentar» sin cerrar el drawer, cerrar a medias (la lectura termina sola, queda en la memoria y no abre nada ni avisa) y doble clic (una sola lectura compartida).
4. **Por qué dos pedidos y no uno con tope.** El contexto es una función y el layout es una tabla: PostgREST no los junta, y acotar `lead_alta_contexto()` o `leads_campos` es SQL. El tope que existe es el de escribir (100 orígenes y 100 tipos); los tipos de seguimiento y los campos no lo tienen (`docs/PLAN.md`, 5b-5). La alternativa de un route handler GET que junte las dos lecturas en el servidor (un pedido del navegador, dos consultas en el servidor) se descartó: vuelve a leer en el servidor lo que se quería sacar de ahí y no acota nada.
5. **La memoria dura 60 s** (`shared/lib/memoria-de-lectura.ts`; `docs/RENDIMIENTO.md` no fijaba un valor para catálogos). Comparte la lectura en camino, no guarda un fallo y `olvidar()` descarta también lo que venía en camino (una lectura que empezó antes de un cambio no se guarda). La tiran `crear`, `guardar`, `mover` y `eliminar` de orígenes y tipos **al terminar** (no antes: una lectura en medio guardaría lo viejo) y un alta rechazada porque su origen o su tipo se apagó (antes lo releía `router.refresh()`, que ya no vuelve a leer nada). Al reabrir, `AltaConDatos` relee en segundo plano si venció o se tiró y **cambia el contexto sin remontar**: lo escrito no se pierde.
6. **Si falla la tabla y no la función, se espera.** supabase-js reintenta con espera los GET que no llegaron (la lectura de `leads_campos`, ~7 s con la red caída); la función es un POST y falla al instante. La lectura se arma con los dos pedidos en el aire y se espera primero la función: sin red, el drawer dice el error en 1 s y no en 7.
7. **El foco.** Con el esqueleto el drawer abre antes de tener el formulario: el foco queda en la espera y el formulario, al llegar, lo lleva al teléfono (`useFocoAlLlegarAbierto`, sólo si no hay ya un campo con el foco); `abrirConN()` de los e2e espera ese foco antes de teclear. Con la lectura adelantada no hay espera y Base UI pone el foco como siempre.
8. **El swap tiene un costo visible, y no se arregló:** si el formulario llega con el drawer ya abierto, la espera se desmonta y el drawer de verdad entra (dos `<Drawer>` distintos, no uno que cambia de cuerpo): las hojas lo muestran como un nuevo deslizamiento. Sólo pasa si la lectura tarda más que el camino del puntero al clic. **Corregido en el cierre 5b-fix-2** (abajo): no era un segundo deslizamiento sino tres montajes sin animar, y pasaba con cualquier lectura de 150 ms o más, también con un toque.

**Alternativas:** un route handler GET; una migración con tope (prohibida acá); dejar el contexto en el servidor pero detrás de `<Suspense>` (sigue viajando en el documento); un solo `<Drawer>` con el esqueleto adentro (el estado del alta tendría que vivir fuera del `<Drawer>` sin tener todavía el contexto: reescribir `useAltaDeLead`); TanStack Query (no se usa en ningún lugar de `src`: una dependencia de uso nuevo por una memoria de 40 líneas).
**Qué se midió y cómo:** cada prueba nueva se corrió primero contra el código de antes y falló (`docs/RENDIMIENTO.md` › «Cierre 5b-fix»): el documento de `/perfil` con 100 + 100 pesaba 26.696 B más que con la semilla y ahora lo mismo (0 B); el botón medía 72 px; la página del kanban, 475 px en 412. `pnpm test:e2e:completo --project=escritorio` (Nivel 2) después del último cambio: **529 en verde, 16 saltados, 0 fallos, 20,0 min**.
**Consecuencia:** el documento de una pantalla no lleva catálogos que se leen al abrir un panel (la ficha y el alta ya lo hacen igual); una lista de catálogos nueva que se necesite en el alta se suma a `lead_alta_contexto()` con su tope. Quien cambie un origen o un tipo por otro camino que sus hooks (`use-pedidos-de-origenes.ts`, `use-pedidos-de-tipos.ts`) tiene que llamar a `olvidarDatosDelAlta()` o el alta ofrece lo viejo hasta 60 s.

## 2026-10-19 — Cierre 5b-fix-2: «Nuevo lead» es un solo drawer, montado cerrado, que cambia de cuerpo

**Contexto:** el punto 8 del 5b-fix dejó anotado que, si el formulario llega con el drawer ya abierto, entra un segundo `<Drawer>` y se ve otro deslizamiento, y que «sólo pasa si la lectura tarda más que el camino del puntero al clic». La persona sospechó que en el celular ese camino es un toque y pasa en casi todo primer toque, y pidió medirlo con la lectura retrasada 150, 400 y 1.500 ms antes de arreglar. Se aprobó el plan sin respuestas y se tomaron las tres recomendaciones; sin SQL ni migraciones.

**Lo que se midió antes de arreglar** (`e2e/leads-alta-un-drawer.spec.ts`, los dos proyectos; un observador cuenta cuántas hojas `[data-slot="sheet-content"]` de «Nuevo lead» entran al documento y cuántas corren una transición de entrada; el código viejo, con la prueba final):

| Caso (celular con un toque, escritorio con un clic sin hover previo) | Montajes | Transiciones de entrada |
| -------------------------------------------------------------------- | -------- | ----------------------- |
| lectura retrasada 150, 400 y 1.500 ms                                | 3        | 0                       |
| un 500 y «Reintentar»                                                | 3        | 0                       |
| red caída                                                            | 2        | 0                       |
| doble toque o doble clic                                             | 3        | 0                       |
| cerrar y reabrir mientras lee                                        | 4        | 1                       |

**Lo que el repo desmintió:** (1) **no había «un segundo deslizamiento».** Un `<Drawer>` de Base UI 1.9 que se monta ya abierto no pasa por `data-starting-style` (`useTransitionStatus`, `animateInitialOpen` apagado), así que **ninguna** de las hojas se deslizaba, tampoco la primera: el drawer aparecía de golpe y se volvía a montar dos veces. Sólo anima el que se abre desde cerrado (la reapertura: 1). (2) **No dependía del puntero:** con 150 ms de lectura ya eran 3, en los dos proyectos (el robot no tiene hover previo y un toque lo tiene a milisegundos del clic: no adelanta nada). (3) **Eran tres, no dos:** el esqueleto del `diferido()` (mientras llega el código), el de `AltaConDatos` (mientras lee) y `AltaCargada` dibujaban cada uno su `<Drawer>`, en otra posición del árbol.

**Decisión:**

1. **Un solo `<Drawer>`, montado siempre y cerrado** (`marco-del-alta.tsx`, que ya viaja en el shell: `Drawer` entraba por el esqueleto). Abrirlo lo desliza una vez y el esqueleto, el error con «Reintentar» y el formulario son su cuerpo. Montarlo sólo desde la primera apertura (como el `useAbiertoAlgunaVez` de antes) lo habría vuelto a montar ya abierto: sin deslizamiento nunca la primera vez.
2. **El estado del alta no puede vivir en el popup:** Base UI desmonta el contenido al cerrar y lo escrito no se pierde hasta guardar. Por eso `AltaCargada` (con `useAltaDeLead`) y la espera son hijos del **marco**, no del `<Drawer>`, y dibujan en sus dos ranuras (cuerpo y pie) con `createPortal` (`<EnElMarco donde>`). `useAjustesDelMarco()` le dice al marco la descripción del paso, que hay pie y qué cierra Esc (del seguimiento vuelve a los datos); el pie sólo existe mientras hay formulario, así el esqueleto no lleva una franja vacía.
3. **Se conserva todo lo del 5b-fix:** lectura adelantada (puntero, foco y `N`), memoria de 60 s, error con «Reintentar» sin cerrar, cerrar a medias, una sola lectura con doble clic, el foco al teléfono cuando el formulario llega con el drawer ya abierto, `useCierreConCambios` y la pregunta al salir desde un aviso. `scripts/guardas/drawers-con-salida.ts` registra el marco (con `alta-cargada.tsx` como su formulario, mecanismo propio) y quita las dos entradas viejas.
4. **Lo que se asierta y lo que no:** montajes y transiciones de entrada (`transitionrun` que no es de salida), una por apertura. Un muestreo de la caja y la opacidad cuadro a cuadro quedó como dato informativo: en el celular se le escapó una reapertura que sí animó (2 transiciones, 1 «vista moverse»).

**Antes → después:** los siete casos y los dos proyectos pasan de 3 (o 2) montajes y 0 transiciones a **1 y 1**; cerrar y reabrir, 2 y 2, con una sola lectura. La tarea de oro 1 pasa de 1,4 a 0,7 s del robot en el dirigido y 1,2 s en el Nivel 2 (4 teclas, KLM 18,3 s). `pnpm test:e2e:completo --project=escritorio` (Nivel 2) después del último cambio de código: **538 en verde, 16 saltados, 0 fallos, 20,3 min**.

**Alternativas descartadas:** seguir con dos drawers y saltar la animación del segundo (deja los remontajes: foco y scroll del cuerpo se reinician); **leer en idle tras cargar el shell** (vuelve a pagar la lectura en cada visita aunque nadie abra el drawer, que es lo que sacó el 5b-fix); levantar el estado del alta fuera del drawer sin portales (reescribir `useAltaDeLead` para un contexto que todavía no existe); exponer `keepMounted` en `shared/ui/drawer` (toca `src/shared`, disparador 1 del Nivel 2, y deja el alta montada con todo su DOM aun cerrada).

**Consecuencia:** un drawer que tiene que deslizarse la primera vez se monta cerrado: `useAbiertoAlgunaVez` sirve para el código diferido, no para el `<Drawer>` (`.claude/rules/ui.md`). Quien dibuje algo dentro de «Nuevo lead» lo hace con `<EnElMarco>`; un hijo directo del `<Drawer>` se iría con el popup al cerrar. `e2e/soporte/contar-drawer.ts` sirve para medir el montaje y la entrada de cualquier otro drawer.

## 2026-10-19 — 5a-8: el buscador pide 3 caracteres para buscar por nombre; no se pagan n-gramas

**Contexto:** un término sin ningún tramo de 3 letras o dígitos (`x`, `zq`, `a_b`, `%`) no tiene qué buscar en `leads_busqueda_idx` (trigram) y, si es escaso, la etapa de índice recorre la cartera de quien busca: con 212.000 leads, la dueña 241–255 ms, Berta 90–94 (`docs/PLAN.md`, 5a-8). La persona decidió entre pagar el costo de escritura de un índice de n-gramas de 1 y 2 caracteres, o pedir 3.

**Decisión:** la búsqueda por nombre exige **3 caracteres** (un `#n` de un dígito sigue valiendo: es el número). **No se paga el índice de n-gramas:** se probó (`_lead_ngramas(nombre)` en el mismo GIN) y 500 altas pasan de 1,1–1,7 s a 2,8–3,7 s (hasta 2,5 veces), lo que rompe el tope de 2 s de la importación (`medir-importacion-volumen.sql`), y crearlo con 62.000 leads cuesta 3,3 s.

**Alternativas:** el índice de n-gramas (descartado por lo anterior); otro formato de clave, sólo bigramas en una columna aparte (más escritura por alta y por cambio de nombre para un caso que casi nadie usa); dejar la búsqueda como está (211–255 ms con 212.000, sin crecer respecto de antes, pero sobre el presupuesto de 50 ms de la búsqueda).

**Consecuencia:** «Ñ» o «Al» dejan de encontrar por nombre y la pantalla lo dice junto al campo, en vez de devolver nada sin explicar; las búsquedas escasas de 3 caracteres o más quedan dentro de presupuesto (candidatos y ventana, 5a-fix-1b). La implementación es de la parte 5a-8 (`interpretarBusqueda` en `entities/filtros.ts`, el aviso y `medir-escala.sql`): este cierre sólo la decide y la anota en el PLAN.

## 2026-10-19 — 5a-4b: no se monta la segunda pila local de Supabase

**Contexto:** el Nivel 3 completo con los dos proyectos tarda ≈ 32 min (escritorio 19,6 y celular 12,0; el assert de 25 no se cumple: `docs/PLAN.md`, 5a-4b). Los proyectos corren uno detrás de otro con un solo worker porque comparten la base (filas únicas de la empresa, el «equipo vacío», los topes por persona). La salida local eran dos pilas de Supabase (otro `project_id` y otros puertos) y los dos proyectos a la vez, ≈ 20,5 min con la preparación.

**Decisión:** **no se monta la segunda pila local.** El Nivel 3 queda en ≈ 32 min y la salida, cuando haya remoto, son los shards de CI (cada uno con su pila Supabase, `db:reset`, `E2E_PORT`, `NEXT_DIST_DIR`, funciones edge y `--shard=i/n`; una base por shard, no `workers`). 5a-4b pasa a «Arrastrado a la Fase 4» en `docs/PLAN.md`, con su assert y su lugar sin tocar.

**Alternativas:** dos pilas locales (mantenimiento permanente de dos `config.toml` y de los puertos 546xx para ahorrar ≈ 12 min en un nivel que corre una vez por cierre de fase); `workers` > 1 sobre una base (descartado antes: filas únicas de la empresa y «equipo vacío»); subir el límite de 25 min (se descartó aflojar la prueba en el 5a-fix-3).

**Consecuencia:** el Nivel 3 sigue siendo ≈ 32 min y quien lo corre espera a que el hook de Stop no cargue la máquina. Nada del código o la suite cambia.

## 2026-10-19 — Cierre 5a-fix-4: el nombre se busca con 3 letras seguidas, «míos» por la cartera si es corta, la etiqueta por los candidatos y la policy de oportunidades por fila; 5a-9 queda abierto

**Contexto:** el cierre 5a dejó cinco lecturas del listado de leads y del kanban que crecen con N o están cerca del techo (`docs/PLAN.md` 5a-5 a 5a-9). Objetivo: que cada una cueste lo que pesa lo que se lee y no cuántos leads hay, sin subir ningún presupuesto ni cambiar lo que nadie ve. Los números, con 62.000 y 212.000 leads: `docs/RENDIMIENTO.md` › «Cierre 5a-fix-4». El plan se aprobó sin respuestas y se tomaron las cuatro recomendaciones.

**Lo que el pedido suponía y el repo no tenía:**

- **No existe `supabase/CLAUDE.md`**; las reglas de la base están en `.claude/rules/migraciones.md`.
- **5a-7: el índice por `etiqueta_id` ya existía** (el bucle de claves foráneas de `…000900_indices.sql`); no hizo falta ninguno, y el costo de escribir no cambió.
- **«3 caracteres» no alcanza para 5a-8:** `a_b`, `% %` o `a b c` tienen tres caracteres y ningún tramo de 3 letras o dígitos, y la base los resolvería caminando la cartera. La regla es el `[[:alnum:]]{3}` de `_leads_candidatos_indexable()`.
- **La guarda no medía** a la supervisora, la etiqueta de la dueña en «míos» (el bloque de `listado()` cortaba antes), ni un texto o un rango sobre un campo público; los 75,8 y 118,2 ms del PLAN salieron de un arnés aparte. Los números del PLAN se reprodujeron con diferencias de ±25 %.
- **La etiqueta de Ana de la guarda no la tenía ningún lead** (la siembra sólo etiqueta los primeros N/4 de la dueña): sus 64,3 ms eran los de una etiqueta vacía recorriendo su cartera. La guarda ahora la llena con 300 de sus leads.
- **El assert de 5a-9 no se puede cumplir sin un índice por clave** (abajo).
- La máquina de medir no estaba quieta (un juego abierto, carga 2 a 3,7): se anotó en cada corrida, se compararon siempre A y B en la misma condición y una falla por carga (dos aserciones de «Volumen 4999» de la dueña a 29 y 35 ms de 25, que A/B mostró idénticas a `…003300`: 16,0 y 9,8 contra 15,7 y 9,7) se midió otra vez aparte.

**Decisión:**

1. **5a-8: el nombre se busca con 3 letras o dígitos seguidos; un número vale con menos.** `cumpleElMinimo()` (`shared/lib/filtros/minimo.ts`, dato `minimo` del esquema de filtros: cruza al cliente) y `MINIMO_DE_BUSQUEDA` (`leads/entities/busqueda-de-leads.ts`) son la única pregunta «¿hay búsqueda efectiva?»: `interpretarBusqueda()` (nulo si no alcanza; 1 o 2 dígitos buscan sólo por número, con o sin `#`), los tachados ocultos, la constancia de la exportación y el chip la usan igual. El campo escribe `''` en la URL si lo escrito no alcanza (no la lee como «quitaron el filtro», así que no se vacía) y no manda nada al servidor (`buscar()` no escribe un «nada» sobre una URL que ya no tiene nada: eso solo costaba una vuelta); la línea «Escribe al menos 3 letras» (revisada con `design:ux-copy`: 25 caracteres, cabe al 200 % en el celular) va al final de la barra, en una fila entera, para no mover los botones. `?q=ab` por la URL no busca ni cuenta como filtro. La regla de JS (`[\p{L}\p{Nd}]{3}`; con `\p{N}` contaba `²³¹`, que la base no) la compara `busqueda-volumen.sql` con la de Postgres sobre 21 textos. No se pagan n-gramas (decidido el mismo día en «5a-8»). **El embudo y vehículos no se tocan:** tienen su propia regla (`busquedaDelEmbudo`, desde 2 caracteres; `vehiculos/entities/filtros.ts`) y no usan `interpretarBusqueda`. La función de la base no cambió: sigue resolviendo `x` caminando la cartera si algo la llama directo.
2. **5a-5: quien ve «todos» lee «míos» por su cartera si tiene como mucho 5.000 filas vigentes.** `leads_cartera_corta()` (`security definer`, sin argumentos, un sí o un no, nunca un número), pedida por `condicionesDeLaPersona()` sólo si va a leer «míos» o filtra por un privado, en paralelo con el número buscado; `leerMiosDeLaCartera()` pasa la condición `en_cartera` a `leads_cartera_vista`. **T sale de la medición:** el cruce entre las dos rutas con carteras de 3, 500, 2.000, 9.489, 27.611 y 79.994 (tabla en RENDIMIENTO): por la cartera mejora hasta unos miles, queda igual hacia 10.000 y empeora un poco desde Berta; con 5.000 nadie empeora con ninguno de los dos volúmenes. La dueña (40 %) no cambia de ruta, así que su campo privado no empeora. Es una pista de por dónde leer, no una regla de visibilidad: las dos vistas dan las mismas filas (`listado-cartera.sql` las compara, la persona de «todos» incluida).
3. **5a-7: la etiqueta entra a `leads_candidatos()`.** La clave `etiquetas` sólo acepta ids de etiquetas de quien llama (`_leads_candidatos_etiquetas()`): una ajena, una inexistente o una mal escrita da lo mismo que «ninguna», sin recorrer nada (sin esto, una `definer` que lee `leads_etiquetas` con los derechos de la base sería un oráculo de quién tiene qué etiqueta). Etapa W: un `exists` por la clave primaria; etapa I: el índice de la FK guía y `leads` se lee por su clave; una etiqueta con S o menos leads va directo al índice (con las estadísticas atrasadas la etapa W llegaba a 147 ms). El lead que llega por su número también tiene que tener la etiqueta, porque `condicionesDeLaPagina()` ya no la repite.
4. **5a-6: la policy de `oportunidades` pregunta por fila.** `_lead_vivo_en_mi_cartera(lead_id)` reemplaza a `lead_id = any((select _mis_leads_vivos())::uuid[])`, y `_mis_leads_vivos()` se borra. El planificador camina `oportunidades_tablero_idx` y corta en 51 (plan y números en RENDIMIENTO). La visibilidad no cambia (`oportunidades-policy.sql`, con mutaciones). Una cuenta en baja en curso tiene `alcance_de` nulo y no lee ninguna, ni antes ni ahora (la prueba lo dice: mi primera regla a mano se equivocaba y no la policy).
5. **5a-9 queda abierto.** Con la compuerta del plan (si alguna persona sin resultados pasa de 50 ms con 212.000 no se aplica ningún índice), la medición dice que la dueña «todos» está en 205 ms, Berta en 58–78 y la dueña «míos» en 75–138 por los candidatos solos, y que un índice por clave sólo ayuda donde el planificador lo elige. Se deja la guarda midiéndolo en cada corrida, sin asertar, y la decisión a la persona (abajo).

**Alternativas descartadas, con su número:**

- 5a-5: **siempre por la cartera** (la dueña: campo privado 5.139 → 5.510 y etiqueta que nadie tiene 368 → 587 con 212.000); **dejarlo** (81,9 ms la supervisora, 2,7 veces el techo de 30); un **umbral relativo a N** (la cartera cruza hacia el 10 % de la tabla, pero N no se puede contar sin un total exacto).
- 5a-6: **conservar el arreglo y armarlo desde las oportunidades propias** (P1: 10.000 valores en vez de 80.000; 78,6 → 58–72 ms, el plan no cambia); **guardar la lista de leads vivos de la cartera** (una columna o una tabla derivada: un trigger más y costo en cada alta, transferencia y baja, para un plan que la pregunta por fila ya consigue sin escribir nada).
- 5a-7: **resolver antes los ids como `#n`** (sólo cabe donde el resultado es de un lead; una etiqueta tiene hasta 80.000); **repetir la etiqueta en la página** (el `Nested Loop` de 88 ms de 5a-fix-1b).
- 5a-8: **3 caracteres cualesquiera** (no cumple el assert con `a_b`); **escribir `?q=` vacío y recibir el campo de vuelta** (el campo se vaciaba al pasar de `abc` a `ab`: el e2e lo detectó en el navegador, el adaptador de pruebas de nuqs sólo mostraba un parpadeo propio).
- **Llevar los ocultos y la exportación con una etiqueta a los candidatos:** no hizo falta, 20,4 ms la dueña con 212.000.

**Límites aceptados, con su número:** una etiqueta puesta sólo en los 40.000 leads más viejos de la dueña cuesta 138 ms (382 antes), porque la ventana de 4.000 no encuentra nada y va al índice con 40.000 ids; el campo privado de la dueña sigue en 5.720 ms de 6.000 con la máquina cargada (5a-10, Fase 4: su ruta no cambió); un campo de texto o un rango sobre un campo público sigue creciendo con la cartera (5a-9).

**Lo que decide la persona (5a-9):** (a) aplicar un índice por clave (btree para el rango, trigram sobre `->>` para el texto de 3 letras o más) con `CREATE INDEX` al volver filtrable y público un campo (no corre en una transacción ni sin bloquear escrituras: va por una función con permiso y un job, o por la migración de cada despliegue), guiar a la base hacia él (la etapa I no lo elige: la condición no cuenta como indexable) y asumir su costo en cada `INSERT` y `UPDATE` de `leads` y en la baja de 200.000 (la importación y las altas ×2,5 con n-gramas de por medio, medido en 5a-8); (b) pedir 3 letras también al filtro de texto de un campo y dejar el rango con su límite escrito; (c) dejarlo: la dueña con 212.000 leads paga 205 ms por un filtro de texto sin resultados.

**Qué se midió y cómo:** `db:reset` + `db:sembrar-volumen` (62.000 y `-- --leads 200000`), un arnés propio en transacciones que se revierten (como `authenticated`, plan genérico, `EXPLAIN (ANALYZE, BUFFERS)`, mediana de 5), `db:medir:volumen` entero con los dos volúmenes antes y después, A/B de la función de candidatos contra la de `…003300`, y prototipos en la base local (el índice por clave, las dos formas de la policy). Mutaciones: la función de la policy sin `revocado_en is null` y sin `l.eliminado_en is null` (la prueba cae nombrando a A). Cada prueba nueva falla contra el diseño anterior (`leads-listado-busqueda-minima.spec.ts` contra `HEAD`).

**Consecuencia:** migraciones `…20261019003400_cartera_corta.sql`, `…003500_candidatos_etiquetas.sql` y `…003600_oportunidades_por_fila.sql` (ningún índice, trigger ni columna nuevos: el costo de escribir no cambia); `entities/busqueda-de-leads.ts`, `fuente-del-listado.ts` y `candidatos.ts`; `features/listado/condiciones-de-la-persona.ts`; `shared/lib/filtros/minimo.ts` y el campo de búsqueda de `FilterShell`; `oportunidades-policy.sql` entra a `db:probar`; la guarda (`medir-escala.sql`) suma la supervisora, la etiqueta (dos pasos ≤ 100 ms), un término escaso de 3 letras y el kanban con forma y 25 ms. **Quien agregue un filtro de leads que no sea una columna o una marca de quien mira** lo lleva a los candidatos con su índice o escribe cómo crece con la cartera; **quien lea una tabla con una policy que arma un arreglo de toda la cartera** pregunta por fila.

## 2026-10-19 — Buscar un número entre los propios ajenos (5a-14), y 5a-9 a la Fase 4 sin cambios

**Contexto:** `numeroQueSeBusca()` elegía un solo número: con `leads.numero_global.ver`, el global; sin él, el propio de quien busca (9f-2). La dueña que escribía 30 no encontraba el lead de Berta con n.º propio 30 (y global 62): le aparecía «Nada coincide con los filtros» (capturas `e2e-capturas/busqueda-numero-ajeno/antes`); Berta, buscando 30, sí lo veía. Se pidió que quien tiene el permiso encuentre también los propios de cualquier creador, de los leads que ya ve. El plan se aprobó sin respuestas y se tomaron las siete recomendaciones.

**Lo que el pedido suponía y se comprobó:** la afirmación era cierta; `30` y `#30` ya se interpretaban igual (1 o 2 dígitos sólo número, 3 o más sin `#` nombre o número). Los únicos que resuelven un número son el listado, el conteo de ocultos y la exportación (por `condicionesDeLaPersona()`); el embudo busca título y nombre, vehículos título, VIN o lote, la barra superior no busca todavía y la papelera no busca: nadie más hereda el cambio. El índice `(creado_por, numero_propio)` está en `leads`, que `authenticated` no lee por esa columna: la búsqueda va por la copia, `leads_numeros_propios_creador_idx (creado_por, numero)` (no único); Postgres 17 no hace _skip scan_, así que `numero = n` solo no lo usa. Ninguna tabla de números está en una publicación de Realtime y `numero-global.sql` lo prueba.

**Decisión:**

1. **Una sola resolución, `leads_ids_del_numero(p_numero bigint, p_todos boolean) returns uuid[]`** (migración `…20261019003700`): invocador, sin índice, trigger ni columna nuevos (el costo de escribir no cambia). Con `p_todos`, el global por `leads_numeros_globales_numero_key` y, por cada persona de `perfiles` (el equipo: decenas), una bajada de `leads_numeros_propios_creador_idx`; sin `p_todos`, el propio de quien llama. Nunca más de 100 ids, sin duplicados, global antes que propios; un número que no es positivo o no cabe en la columna (`integer`) no encuentra nada y no falla. `leads/infra/queries/numeros.ts` sólo llama a la RPC; las dos consultas a las copias y `MAYOR_NUMERO_PROPIO` se fueron.
2. **El permiso lo sigue decidiendo la policy de las copias**, no el parámetro: con `p_todos = true` y sin el permiso (o con el permiso revocado a mitad de sesión, aunque la sesión cacheada aún lo diga) la base contesta lo mismo que sin él, sólo el propio de quien llama. Ningún oráculo: ni el global de un lead que se ve ni el propio de otro. Con el permiso y `leads.ver` «propios», sólo entre los leads de su cartera. La papelera, el limbo y un lead de una persona dada de baja que quedó sin dueño no salen; uno transferido a otra persona sí, con el nombre de su creador. No hay otra empresa que mirar: una por despliegue.
3. **Orden y tope:** el del listado (más reciente primero), sin excepción y con cursor; el máximo de un lead por creador más el global, 100 sólo por el largo del `id.in.(…)`. Alternativa descartada: «global primero» sólo para `#n`, que pedía otro camino de lectura (ordenar en memoria) para un caso que la explicación ya aclara.
4. **La fila dice por qué coincidió.** Si coincide un propio que no es el principal (ve el global, y el número buscado es el propio de Berta o suyo): **«Coincide: N.º 30 · Berta»** o **«Coincide: Tu n.º 30»**, en la misma fila de números bajo el nombre (`CoincidenciaDelNumero`; la regla pura es `coincidenciaDelNumero()`; el servidor interpreta el número, `DatosDelListado.numeroBuscado`). «N.º 30» no se parte y el nombre baja de línea donde haga falta. Sin el permiso nunca aparece: el propio ya es el principal. Los textos de partes del propio salen de `partesDelPropio()` (`shared/lib/numeros-de-lead`), la misma regla de `escribirNumeros()`.
5. **Enmienda a la entrada «Parte 9f-2»** (la viñeta «Buscar `#n`…»): ya no es «con el permiso, el global; sin él, el propio», sino **con el permiso, `#n` resuelve el global y también los propios de cualquier creador visible; sin él, el propio de quien busca.** Lo demás de esa entrada no cambia (el global no llega a nadie sin el permiso, ni por la búsqueda).

**Medido** (`docs/RENDIMIENTO.md` › «Buscar un número»; la máquina con carga de 3 a 7 durante las corridas completas —Steam y el navegador abiertos—, anotada en cada una): la resolución con 62.000 y con 212.000 leads, la dueña **2,3 y 2,6 ms** y Ana **1,3 y 1,6** (suelta, en una transacción: 2,4 y 1,3–1,7 con los dos volúmenes); resolución con la página (`leads_vista` por `id = any(…)`) la dueña «todos» 2,7 y 2,9, «míos» 2,7 y 3,0 y Ana 2,3 y 2,6; el plan de cada creador por `leads_numeros_propios_creador_idx` (0,9–1,0 ms, una bajada por persona; `perfiles` se lee entera: seis filas) y el del global por su índice único (0,7–0,8). La opción B, un índice sólo por `numero`, resolvía en 0,7 ms: 1,7 ms menos que A con 62.000 y con 212.000, y a cambio una entrada de btree más por cada alta, fila importada y renumeración de la importación y un `create index` que bloquea las altas: no vale 1,7 ms. Los asserts viven en `medir-escala.sql`: la resolución ≤ 5 ms, resolución con página ≤ 20 ms, la forma del plan sin `Seq Scan` de las copias ni de `leads`, y lo que encuentra la dueña (6 o 7 leads con el propio de Ana: uno por creador y, si es otro lead, el global) y Ana (sólo el suyo, también pidiendo `todos`).

**Pruebas:** `numero.test.ts` y `numeros-de-lead.test.ts`; `numero-busqueda.sql` en `db:probar` (Berta propio 30 y global distinto, vista por la dueña, por quien no tiene el permiso y con `p_todos = true`; dos creadores con el mismo propio; 0, negativos, 2.147.483.648 y 9.223.372.036.854.775.807; la papelera, el limbo y la baja; el permiso concedido y quitado; «propios» con el permiso; el tope y un lead cuyo global y propio coinciden). **Mutaciones que hacen caer la prueba:** el `lateral` sin la condición del número (la dueña recibe cientos de leads), sin la rama del global, sin los creadores ajenos, y sin distinguir `p_todos`. Un e2e nuevo, `leads-busqueda-numero-ajeno.spec.ts`, en los dos proyectos y sin marca: la dueña buscando 30 y 31, Berta buscando 30, otra asesora, y al 200 % con un nombre de 80 letras. Cae contra `HEAD`.

**Consecuencia:** migración `…20261019003700_numero_con_propios.sql` (el esquema base no cambia), `numero-global.sql` suma la función a su inventario con el motivo, `probar-schema.mjs` corre `numero-busqueda.sql`. **Fase 7:** el buscador global resuelve `#n` con `leads_ids_del_numero()`, nunca con otra consulta.

### 5a-9: a la Fase 4, sin cambios

**Decisión de la persona (2026-10-19):** 5a-9 (filtros de texto y de rango sobre un campo público, sin resultados) pasa a la Fase 4 sin cambios: conserva su número, su assert (≤ 50 ms con 62.000 y con 212.000, sin resultados), su lugar (la guarda de volumen que ya lo mide sin asertarlo, `medir-escala.sql`) y las cifras de hoy con 212.000 leads: la dueña «todos» 205 ms, Berta 58–122 ms y la dueña «míos» 75–138 ms. **Las otras dos salidas no arreglaban los casos lentos:** (a) el índice por clave (btree y trigram sobre `->>`) sólo ayuda donde el planificador lo elige —la dueña «míos» baja a 0,7 ms, pero «todos», Berta y un término de 1 carácter no cambian porque el planificador sigue caminando la cartera— y suma DDL por clave y costo en cada escritura de `leads`, en la baja de 200.000 y en la importación; (b) pedir 3 letras también al filtro de texto de un campo mejora a la «chica» (rango 52 → 0,7) y a Ana (41–55 → 21–28), no a la dueña ni a Berta, y deja el rango sin resolver.

## 2026-10-21 — La rueda de turnos de la web, por rol (`web.cola.participar`)

**Contexto:** hasta hoy entraba a la rueda quien tenía `cola_web_asesores.habilitado`, una decisión sobre la persona. Roles como admin o editor que también venden y tienen sus propios leads no deben recibir turnos de la web ni figurar en la rueda, y eso se decide por rol, en la matriz de Roles, sin tocar nada de su `leads.*`. La cola es el único reparto automático del repo (se buscó ruleta, rueda, turno, round robin, reparto y asignación automática en `supabase/`, `src/`, `e2e/` y `scripts/`): el limbo de una baja deja leads sin dueño, no los reasigna.

**Decisión:** un permiso nuevo, **`web.cola.participar`** («Recibir turnos de la web», grupo Web, sin origen ni alcance: `solicitar_asesor` no recibe un origen). **Elegible = `habilitado` y el permiso por alguno de sus roles** (la unión de siempre: sin herencia ni negación), con la cuenta activa y sin bloqueo, **evaluado al repartir**. La regla vive en un solo lugar, `public.puede_estar_en_la_rueda(uuid)` (`stable security definer`, `execute` sólo a `authenticated` porque `estado_cola_web` es de invocador), y la consultan la rueda (paso 5 de `web.solicitar_asesor`), el pegajoso (4), el turno que el visitante ya tenía abierto (3), la reasignación al vencer (`web_expirar_solicitudes`) y `estado_cola_web` (la lista de la rueda no muestra a quien no puede). `habilitado` no se toca: quitar el permiso saca a la persona al instante y devolverlo la reincorpora como estaba. El dueño tiene todos los permisos, así que sólo queda fuera por su `habilitado` (o porque alguien le quite el permiso al rol `dueno`: el guardián cuida `equipo.*`, no éste). Quien otorga el permiso a un rol lo hace por `rbac_otorgar` con la guarda de siempre (`equipo.roles.gestionar`, rol y concesión dominados, actividad): sin guarda nueva.

**Quién lo recibe en la migración (`…003800`):** el rol `dueno`, el rol `asesor` y **todo rol de una persona que hoy está habilitada**, para no sacar a nadie de la rueda en silencio (un `raise notice` nombra los roles concedidos); sacar a un admin habilitado es un clic en la matriz, no una sorpresa. En la base local no cambió nadie: había una persona (la dueña) y ninguna habilitada. En una base nueva la migración corre antes que la semilla, así que `seed.sql` trae la fila del catálogo y el `asesor` con el permiso.

**Turnos en vuelo:** el ya asignado sigue hasta su cierre («Contacté», vencimiento o intentos): `web_confirmar_contacto` no mira el permiso, también sobre una `vencida`. Lo nuevo no le llega. **Lo que sí se arregló:** si el visitante volvía a pulsar mientras tanto, el paso 3 ponía el reloj de la solicitud a cero sin mirar a quien la tenía, y con clics seguidos quien ya no podía recibirla (sin el permiso, bloqueada, en baja) la retenía para siempre; ahora el reloj **sólo se reinicia si quien la tiene puede estar en la rueda**; si no, la solicitud vence a su hora (`ttl_contacto_minutos`, 30 por defecto) y se reasigna a quien sí puede, sin pasar por la misma persona (la cadena se excluye). El visitante sigue viendo a ese asesor hasta entonces: el tope es el TTL, no un bloqueo. Hoy el vencimiento es perezoso: `web_expirar_solicitudes` corre (20 por llamada) dentro de cada `solicitar_asesor`, así que el turno vencido se reasigna con el siguiente pedido de cualquier visitante; su job de cada 5 minutos no está programado todavía (se programa con la Fase 8, `src/modules/web/CLAUDE.md`).

**No se toca:** el contacto directo por `handle` (`es_directa`) no es un turno de la rueda: lo gobierna `publico_web` (decisión sobre la persona; a un admin que no debe ni eso se le apaga `publico_web`), y `cola_web_configurar` sigue dejando habilitar a quien no tiene el permiso (la Fase 8 lo dirá en el tablero, `docs/PLAN.md` 8-1).

**Alternativas descartadas:** (a) **una bandera del rol** (`roles.recibe_turnos`): no se ve en la matriz ni en «Ver como» y es un segundo modelo de permisos; (b) **apagar `habilitado` al perder el permiso**: destruye la decisión de la persona (devolver el permiso no la reincorpora), son dos escrituras que pueden quedar a medias y una carrera con el reparto que no se puede probar de un solo lado; (c) **comprobarlo sólo al habilitar**: un permiso quitado después seguiría dando turnos hasta que alguien desmarque a cada persona; (d) **el permiso por origen o con «lo propio»**: la rueda no distingue orígenes; (e) **filtrar sólo la lista o la interfaz**: el reparto es lo que importa y vive en la base; (f) **una copia de la regla por camino** (cuatro consultas con su propio `exists`): una función nueva que reparta se olvida de una; (g) **reasignar al instante** el turno de quien pierde el permiso: no hay a quién cobrarle el turno y el TTL ya es el plazo que la empresa eligió.

**Cinturón que no existía:** «un permiso existe sólo si hay un punto de enforcement» (2026-10-11) era una regla sin prueba. Ahora `supabase/tests/permisos-enforcement.sql` (en `db:probar`) falla si una clave de `permisos` no aparece en ninguna función, policy ni vista, o si una excepción ya la tiene; con un autotest que usa una clave inventada. Hoy hay cinco excepciones, cada una con su motivo y su fase: `equipo.roles.ver`, `tablero.metricas.ver`, `datos.exportar.todo`, `notificaciones.push` y `logistica.pagos.confirmar`. Y `rueda-por-rol.sql` falla si una función que inserta una solicitud y lee la cola no llama a `puede_estar_en_la_rueda`.

**Medido** (`docs/RENDIMIENTO.md` › «La rueda por rol», `medir-rueda.sql` en `db:medir:volumen`; 500 personas, 60 roles, 15 con el permiso y 50.000 y 200.000 solicitudes, 5.000 abiertas): la elección de la rueda cuesta **15,0 y 15,5 ms** (7,1 y 7,4 sin preguntar por el rol: la regla suma ≈ 8 ms, 16 µs por persona de la cola) y no crece con las solicitudes cerradas; `solicitar_asesor` 15,5 ms por llamada; `web_expirar_solicitudes(20)` ≈ 360 ms (20 reasignaciones). Presupuestos de 40 ms y de 60 ms por llamada, y la razón con cuatro veces las solicitudes ≤ 1,5 (con 3 ms de piso); el plan cuenta las abiertas por `solicitudes_web_asesor_abiertas_idx` y nunca recorre `solicitudes_contacto_web`. Sin índice, trigger ni columna nuevos.

**Pruebas:** `rueda-por-rol.sql` (rol sin el permiso y habilitada, con el permiso y sin habilitar, dos roles —uno con y otro sin—, sin ningún rol, baja en curso, cuenta bloqueada, quitar y devolver el permiso, el turno en vuelo, el pegajoso, `estado_cola_web`, y la persona sin el permiso que crea, ve, edita y abre una oportunidad con su `leads.*`); la carrera `scripts/carreras/rueda.mjs` con tres conexiones y sin `sleep` (A reparte y retiene el candado, B espera, C revoca el permiso del primero de la fila: B no se lo da; el control sin revocar sí); `rueda-por-rol.spec.ts` en los dos proyectos (la matriz, «Ver como», Mi perfil y la llamada a `web.solicitar_asesor`). **Mutaciones que hacen caer la prueba:** `puede_estar_en_la_rueda` devolviendo `true`, sin mirar el permiso o sin mirar la cuenta; el paso 3 reiniciando siempre el reloj; el pegajoso, la rueda, `estado_cola_web` y la reasignación al vencer cada uno sin preguntar por la regla.

**Consecuencia:** migración `…20261019003800_rueda_por_rol.sql` (el esquema base cambia sólo el comentario de `cola_web_asesores`); `CLAVES_PERMISO` suma la clave; la matriz la dibuja sola desde la tabla `permisos`; Mi perfil dice «Tu rol recibe / no recibe turnos de la web». **Fase 8:** el interruptor de disponibilidad nace en esa sección, deshabilitado con ese mismo motivo si el rol no recibe turnos, y el tablero de la cola dice «habilitada, pero su rol no recibe turnos» (8-1).

## 2026-10-21 — 5a-15 no se reproduce: el hook se queda y el selector ignora un tamaño que no ofrece

**Contexto:** el PLAN daba por defecto de `usePorPaginaDelListado()` que elegir «Ítems por página» con una navegación pendiente podía no navegar (visto una vez, 2026-10-19, `vehiculos-por-pagina`, en un dirigido). Se pidió reproducirlo antes de tocar nada.
**Medido:** 480 corridas, ninguna falla. Escenario: segunda «Siguiente» y elegir el tamaño enseguida, o tras la fila de la página 3, en leads (25) y vehículos (50), escritorio y celular. Latencia en toda lectura RSC de 300 y 1.000 ms (10 corridas por caso), de 0, 50 y 120 ms (20, sólo escritorio) y CPU ×6 (CDP) eligiendo cuando llega la lectura de la página 3 (20). La línea de tiempo confirma el solapamiento (el POST sale con la lectura de la página 3 en vuelo y el GET con `por=` 36 ms después) y el resultado es siempre la primera página con el tamaño nuevo. **La traza guardada del fallo (`e2e-fallos/2026-10-19_19-18`) corrige al PLAN:** la segunda lectura RSC empezó en 2.681 ms y respondió en **6 ms**; el POST salió 48 ms después y no hubo ningún GET con `por=`: lo pendiente no era la lectura sino el dibujo de la página 3, un instante en que React no había soltado la transición. La corrida con CPU ×6 calca esa forma (POST 76 ms después de la respuesta) y pasa.
**Decisión:** no se toca el hook (el assert del PLAN se cumple con el código de hoy: guarda y **después** navega). Se vigila de dos maneras: las pruebas de siempre esperan a la primera fila de la página 3 antes de elegir (`paginaSiguiente()`: no basta `toHaveCount(10)`, la página de antes también tiene 10), y un estrés de 20 corridas por modo (`latencia`: lecturas 1 s y guardado 3 s; `cpu`: ×6, eligiendo al llegar la lectura) y por lista, sólo con `E2E_ESTRES=1` (`por-pagina-pendiente-leads.spec.ts` y `-vehiculos.spec.ts`; ≈ 7,7 min los dos proyectos; una vez al cerrar una tarea que toque `shared/ui/filtros` o la preferencia). **Mutación:** con `aplicar(tamano)` a la vez que el guardado (la carrera que cuenta el «Ojo» de `shared`) el estrés cae porque la URL ya trae `por=` mientras el guardado está en vuelo; el estado final, ojo, queda bien aun así (el que la atrapa es el orden), así que el estrés afirma las dos cosas.
**Lo que sí apareció:** con un `<option>` agregado a mano (devtools) y la navegación pendiente, el selector se quedaba mostrando «7» para siempre: la acción rechaza el 7, la página vuelve con el tamaño de antes y `usePorPaginaDelListado()` suelta lo elegido sólo cuando el valor de la página cambia. Un tamaño que el selector no ofrece ahora se ignora en `onChange` (no se guarda, no navega, el control vuelve a lo que se ve); con su Vitest y tres casos en `listas-por-pagina-pendiente.spec.ts` (el inválido, dos cambios seguidos y la red perdida a mitad).
**Alternativas:** una red de seguridad en el hook (si la navegación termina sin el tamaño elegido, aplicar otra vez una sola vez), descartada: arreglar sin causa esconde la causa cuando aparezca; subir el `expect` de las pruebas, descartado por lo mismo que en la 9j.
**Consecuencia:** un fallo futuro de esta prueba deja la línea de tiempo (`red.txt`) y es un defecto nuevo con su número, no «algo a vigilar».

## 2026-10-21 — La matriz de Roles en el celular es una lista de un rol, y el panel de filtros va al costado sólo si cabe

**Contexto:** dos medidas al 200 % del texto. (1) En 412 px las **72** filas de la matriz dejaban el control fuera de la vista sin desplazar la tarjeta (el interruptor en 465–497 px, los permisos por origen hasta 564; `min-w-52` y `min-w-36` en rem), y `sinScrollHorizontal()` no lo veía: lo que un contenedor recorta no ensancha la página. (2) En escritorio a 1.280 px el panel de filtros al costado mide 15 rem = 480 px y dejaba 176 a la lista de leads: el nombre se leía «E2E» y el número «N.º 5.». **Ya estaba así antes de 5a-14** (capturas del 2026-10-19), con o sin búsqueda, y no era la línea «Coincide».
**Decisión:** (1) por debajo de 768 px la matriz es la lista de un rol a la vez (`lista-del-rol.tsx`): cada permiso con su nombre y su explicación y, **debajo**, su control; desde 768 px, la tabla (`tabla-de-roles.tsx`); una sola vista, elegida con `useAlMenos(CORTE_DE_LA_TABLA)` (el servidor dibuja la de la petición). Un nombre de rol largo se corta con «…» y nada lo empuja: el `<select>` «Rol a la vista» ensanchaba la **página** a 935 px con un rol de 80 letras y el botón de eliminar quedaba fuera (las grillas de la lista son `minmax(0,1fr)`, como pide `ui.md`). `aLaVistaSinDesplazar()` (`e2e/soporte/recorrido.ts`) llena el hueco de `sinScrollHorizontal()`: el borde derecho dentro de la página y ningún antecesor que se desplaza lo recorta. (2) El panel va al costado si el **contenedor** del listado mide 40 rem o más (`@min-[40rem]:` en el CSS y `usePanelAlCostado()` para el botón «Filtros»: plegar el panel o abrir la hoja); antes era `lg`, un corte de pantalla en px. Medidas del contenedor: 1.024 px al 100 % = 45,5 rem (el panel sigue al costado), 1.280 px al 100 % = 61,5, 1.280 al 125 % = 45,5, 1.280 al 200 % = 21,5, 1.920 al 200 % = 41,5. Los 40 son el panel (15), el hueco (1) y 24 para la lista (el nombre hasta 16 rem, el «⋯» y el relleno). Cambia con texto de 125 % a 1.100 px o de 150 % a 1.280 px (antes panel al costado con la lista de 20 rem, ahora hoja): es lo que pedía el reflujo. Vale para leads y vehículos.
**Alternativas:** apilar nombre y control **sin** cambiar a lista (grid por fila dentro de la tabla): la tabla de un rol de dos columnas no gana nada; un corte por el ancho de pantalla más alto para el panel (`xl`): arregla el 200 % a 1.280 px y no a 1.920; achicar el panel: la lista seguiría con menos de 24 rem.
**Consecuencia:** la matriz tiene dos vistas por componente (la guarda `listas-con-patron` registra `tabla-de-roles.tsx`); el corte del panel es un número escrito en dos lugares (la constante y la clase de Tailwind, que sólo lee literales) y una prueba los ata. **Lo que midió y no se arregla aquí** (cada uno con su número en `docs/PLAN.md`): la lista del equipo, Empresa y la ficha de un origen al 200 % (5a-17 y 5a-18) la columna «Permiso» sin pegar en escritorio (5a-19) y el `<Switch>` partido al 200 % (5a-20, visto al mirar las hojas: su pista mide 32 × 18,4 px fijos y el pulgar crece con el texto).

## 2026-10-21 — 8-2: `web.solicitar_asesor` responde el vencimiento que escribió

**Contexto:** con un turno ya abierto, el paso 3 actualizaba `vence_en` y respondía `expira_en` con el `s.vence_en` leído antes: «dentro de 1 min» cuando la tabla decía 30.
**Decisión:** `update … returning * into s` (migración `…20261019003900_solicitar_asesor_expira_en.sql`, el mismo cuerpo con una línea cambiada). Es la única rama con el patrón: el contacto directo no tiene vencimiento y no lo responde, el pegajoso y la rueda insertan con `returning * into s`, y `web_expirar_solicitudes` no responde vencimientos. Prueba en `rueda-por-rol.sql`: abre un turno, acorta su reloj a 5 min, pide otra vez con el mismo token y exige `expira_en` igual al `vence_en` de la tabla (y uno solo, sin otro turno); con la función de antes responde +5 y la tabla +30.
**Consecuencia:** el sitio (`sitio-marketing`) puede mostrar `expira_en` sin desconfiar de él. El esquema base no cambia (la función vive en migraciones).

## 2026-10-21 — Dominancia sobre la persona: la regla (la implementación, a 9-1)

**Contexto:** la dominancia de hoy mira permisos —nadie otorga, edita ni asigna lo que no tiene— y no personas: quien tiene `equipo.usuarios.gestionar` puede bloquear, dar de baja o cambiar los roles de alguien con permisos que él no cubre (deuda anotada en la ficha de `equipo`).
**Decisión (la persona, 2026-10-21):** **nadie bloquea, da de baja ni cambia los roles de quien tiene permisos que él no cubre; el dueño sí, sobre todos.** «Cubrir» es lo que ya dice `rol_dominado()` para un rol: la unión de los permisos de la persona está dentro de los de quien actúa (con origen y alcance). La implementación va a **9-1** (Fase 9, `docs/PLAN.md`) con su assert, y no antes: son cuatro RPC (`equipo_bloquear`, `equipo_dar_de_baja`, `rbac_asignar_rol`, `rbac_quitar_rol`) y su interfaz, con carreras, y nada de lo que hoy cuelga de ella lo pide.
**Alternativas:** dejarlo como está (un asesor con `equipo.usuarios.gestionar` bloquea a la dueña: el guardián protege al dueño, no a las personas intermedias); una jerarquía de rangos de roles (un segundo modelo de permisos, como la bandera de la rueda).
**Consecuencia:** hasta 9-1 la ficha de `equipo` sigue diciendo que bloquear y dar de baja no exigen dominar; el guardián sigue siendo el único cinturón.

## 2026-10-21 — Vencimiento de la invitación (`otp_expiry`): 24 horas en la nube

**Contexto:** la invitación vence con el `otp_expiry` de Auth (3600 s en `config.toml`, 1 h; el máximo de la nube son 24 h). Es un ajuste del panel de Supabase, no código: no hay nada que escribir en el repo salvo decirlo.
**Decisión (la persona):** **24 h (86400 s)** en el proyecto de la nube, anotado en «Lista para la nube» de `docs/ESTADO.md`. «Generar otro enlace» sigue para lo que venza igual. `config.toml` local se queda en 1 h (sirve para que un e2e del vencimiento no espere).
**Consecuencia:** una invitada tiene un día para abrir su enlace; el enlace vigente es uno solo por persona, así que un segundo correo invalida el primero.

## 2026-10-21 — Fotos de una subasta en segundo plano: no se hace

**Contexto:** `docs/DECISIONES.md` (2026-10-14, «Las fotos de una subasta pasan por la tubería del navegador, en primer plano») ya lo decidió: el navegador baja, comprime y sube; si se cierra la pestaña lo que falta se trae después con «Traer las que faltan». Se preguntó si abrirlo.
**Decisión (la persona):** **no se hace** en segundo plano en el servidor (sin cola ni job con la service role: las RPC de fotos piden `auth.uid()` y habría que duplicar el registro, y generar los dos tamaños en el servidor es otra dependencia). **Se reabre sólo si** alguien reporta fotos perdidas —un lote cerrado a medias que «Traer las que faltan» no completa, o fotos que faltan con frecuencia—.
**Consecuencia:** sigue lo de la entrada de 2026-10-14 (≈ 3 MB de egress por vehículo, 24 fotos en 10–15 s con la pantalla abierta).

## 2026-10-21 — Rango de un campo numérico, `leads.campos.gestionar` y el campo «principal»: no antes de cotizaciones

**Contexto:** tres candidatos que el PLAN dejaba abiertos «para decidir».
**Decisión (la persona):** **ninguno antes de cotizaciones**, cada uno con su número en la fase que lo necesita: **9-2** el rango de un campo numérico (`min`/`max`, validado por la base y dicho junto al campo), **9-3** separar `leads.campos.gestionar` de `leads.configurar` (hoy un solo permiso gobierna los campos, los orígenes y los tipos de lead; la migración concede el nuevo a quien hoy tiene el viejo) y **6-1** la bandera «principal» de los campos de un origen (lo que identifica al vehículo hoy es `en_tarjeta`, que también decide la tarjeta; la cadena de logística y el panel del vehículo la necesitan). Cada uno con su assert y su lugar en `docs/PLAN.md`.
**No entran a «Configuración de leads»** (la sesión que sigue: tipos de seguimiento con pantalla, que cierra 5b-5; iconos de origen y de tipo; origen «por defecto»), que se describe en el PLAN y no se hace aquí.
**Consecuencia:** hasta entonces un campo numérico acepta cualquier valor y quien configura leads configura campos, orígenes y tipos.

## 2026-10-21 — Configuración de leads: tipos de seguimiento, iconos del catálogo y origen por defecto

**Contexto:** la sesión «Configuración de leads» (`docs/PLAN.md`): los tipos de seguimiento sólo existían en `seed.sql` (sin pantalla, sin tope, sin versión, escritos directo por PostgREST), el `icono` de `tipos_seguimiento` se guardaba con nombres de lucide y nadie lo dibujaba, `origenes_lead` y `tipos_lead` no tenían icono, y el alta proponía el último origen de la persona sin una elección de la empresa. El plan se aprobó sin respuestas y se tomaron las recomendaciones de las nueve preguntas.
**Decisión:**

- **Tipos de seguimiento = el patrón de los de lead, sin protegidos.** RPC `tipo_seguimiento_crear|guardar|mover|eliminar` y `tipos_seguimiento_con_uso()` (`{tope, tipos}`), versión (`actualizado_en`) y auditoría, escritura directa revocada (la regla de la 9f-1), lectura abierta a `authenticated`, `leads.configurar` sin permiso nuevo. Ninguno es «de sistema»: el código no razona por su clave ni su nombre (el tipo que propone el alta es el primero activo por orden), así que apagarlos todos es un estado resuelto. Un trigger `seguimiento_tipo_vigente()` con `for share` cierra la carrera «desactivar contra anotar», como `lead_origen_vigente()` con el origen.
- **Tope de 100, activos o no, de una sola fuente por catálogo** (`_tipos_seguimiento_tope()`, `_tipos_lead_tope()`, `_origenes_lead_tope()` —el último reemplaza al literal y a la constante de TS—). `lead_alta_contexto()` pide cada catálogo con `limit` de su tope y devuelve `topes`: **cierra 5b-5**. Lo impone el candado de la tabla (`share row exclusive`) y lo prueba «el 100 y el 101 a la vez» en `db:carreras`.
- **Iconos: un catálogo cerrado de 24 claves en español** (`telefono`, `celular`, `mensaje`… `otro`) en `src/shared/lib/iconos.ts`; la base guarda **la clave** y la valida con `_iconos_del_catalogo()` en cada RPC, y una guarda de `pnpm test` compara las dos listas. Nulo es «Sin icono»; una clave desconocida (escrita por SQL) se dibuja como un círculo punteado neutro y no rompe. Los trazos se copiaron una vez de lucide a `trazos.tsx` (24 en el chunk de leads, no el paquete entero). Se dibuja donde el nombre es texto; **no** en los `<select>` (una `<option>` no lleva SVG) ni en el kanban (no muestra esos nombres; +1.000 nodos en una columna de 500 por nada). El shell y el alta no importan el catálogo (guarda en `scripts/guardas/iconos-del-catalogo.test.ts`).
- **En filas del listado el icono es un símbolo compartido (`<use href>`)**: con SVG en línea el listado móvil de 100 filas llegó a 3.515 nodos (presupuesto 3.500); con el sprite, 3.124. La página monta sólo los símbolos de las claves que usa.
- **Origen por defecto = una restricción, no una convención.** `origenes_lead.por_defecto` con índice único parcial (`where por_defecto`) y `check (not por_defecto or activo)`: dos o uno apagado son imposibles también para `service_role`. Se marca por `origen_lead_guardar({por_defecto})`, que desmarca al anterior bajo el candado; es opcional; **apagarlo o eliminarlo se bloquea** (22023 con la pista `activo`/`por_defecto`; la interfaz lo dice antes) y no mueve la versión (cambia otra fila como efecto). El alta propone: el último origen que usó la persona si sigue activo → el por defecto → el primero activo (para no cambiar las teclas de la tarea de oro 1); la cadena es una función pura de `entities/contexto-de-alta.ts` y la usa también la importación.
- **El alta deja de mandar `clave` e `icono`** (es todo `<select>`) y la importación toma las claves de `leads_catalogos()`: con los tres catálogos al tope la respuesta pesa 30.530 B (la estimación sin recortar era ≈ 47 KB; el presupuesto de 40 KB no se tocó).
- **Las tres pestañas pasan a `shared/ui/lista` y pierden el `<Switch>`:** una sola vista (tabla desde 768 px, tarjetas debajo), nombre y «⋯» pegados, «Subir» y «Bajar» a la vista, y «Activar/Desactivar», «Editar», «Marcar por defecto» y «Eliminar» en el «⋯» con el motivo cuando están apagados. El estado se dice con texto. Los tres comparten `ListaDeCatalogo` (`shared/ui/lista-de-catalogo`).
- **Migración de datos vivos** (`20261019004000`): los nombres de lucide de `tipos_seguimiento.icono` pasan a claves (`message-circle` → `mensaje`, `phone` → `telefono`…); lo desconocido pasa a nulo con un `raise notice` y ninguna fila se pierde; un nombre repetido se desambigua con sufijo antes de crear el índice único; `orden` se renumera 10, 20, 30…
  **Alternativas:**

- _Nombres sin tildes_ (el pedido decía «sin tildes»): la regla de hoy distingue tildes («Reunión» y «Reunion» conviven) y cambiarla en las tres tablas sería otro índice sobre datos vivos de orígenes y tipos; no se hizo aquí. El nombre sigue siendo único sin importar mayúsculas.
- _Un nombre de lucide libre o un SVG subido por la empresa:_ el primero obliga a que el bundle lleve los 1.500 iconos (o un import dinámico por nombre) y deja claves que cambian con la versión de lucide; el segundo es un vector de XSS y de peso. Un catálogo cerrado se valida en SQL y se dibuja con lo que el chunk ya trae.
- _Dibujar el icono en los `<select>`:_ no se puede; un selector propio costaría el teclado y el celular nativos del alta.
- _Copiar el `<ul>` con `<Switch>` en la pestaña nueva:_ menos cambio, pero hereda 5a-20 (el pulgar desborda la pista al 200 %) y no cumple el patrón de lista.
- _Un tipo de seguimiento «de sistema» protegido_ (WhatsApp, Llamada…): nada razona por ellos; una bandera de más y una pantalla que explicarle a la empresa.
- _«Por defecto» como convención_ (el primero por orden, como el tipo de la 9j) _o con `advisory lock`:_ el índice parcial y el `check` lo imponen sin depender de que cada escritor tome el candado.
- _Apagar el origen por defecto pasándolo al siguiente:_ una elección que la persona no hizo; se bloquea y se dice cómo salir.
  **Consecuencia:** el alta, la ficha, el rápido, el listado y la importación dibujan el icono o lo omiten sin hueco; un tipo de seguimiento apagado sigue nombrando a los seguimientos viejos. Quedan fuera 6-1, 9-2, 9-3 y 5a-17 a 5a-20. Un hueco de prueba que no cerró esta sesión: el candado de `tipo_seguimiento_mover` no lo distingue la carrera de reordenar (`docs/PLAN.md`, 5b-7).

## 2026-10-21 — Cierre de defectos al 200 %: la lista del equipo, la matriz de Roles, el interruptor, Empresa y la barra de pestañas

**Contexto:** 5a-17 a 5a-20 (Fase 3, Cierre 5) y tres observaciones de las hojas de «Configuración de leads» (c.1, c.2 y c.3). Es Nivel 2: toca `src/shared` (el `<Switch>`, el menú, la lista y la barra de pestañas). Se midió primero, en HEAD, con un spec por pantalla (`configuracion-200`, `equipo-200`, `interruptor-200`, `menu-de-acciones-200`); un defecto que no se reproducía no se tocó.
**Decisión:**

- **La lista del equipo entra al patrón de lista, sin resumen (5a-17).** Tabla desde 768 px con el nombre y el «⋯» pegados y tarjetas por debajo, una sola vista por el ancho de la petición. `FilaDeLista` y `TarjetaDeLista` aceptan **no** tener `alAbrir`: sin él no hay cursor de mano ni clic en la fila (cada persona se gestiona desde su menú; «Persona» —un resumen— sigue siendo candidato). El «⋯» es `<MasAcciones>`, que lo nombra «Más acciones de …» como toda lista (antes, «Acciones sobre …»). La columna de la persona mide `w-64` en la tabla: el nombre y el correo se cortan con «…» y dicen su texto entero con `title`; con la tabla anterior la columna crecía con el correo y, al 200 %, el nombre se achicaba a 44 px. **Costo aceptado:** un correo de más de ~30 letras ya no se lee entero a 100 % en escritorio.
- **El menú de un «⋯» no pasa del ancho de la pantalla** (`max-w-(--available-width)` en `<DropdownMenuContent>`): 15 rem son 480 px al 200 % y el menú de una fila de leads llegaba a 485 sobre 412. Vale para todo menú, no sólo el del equipo.
- **La columna «Permiso» de la matriz va pegada a la izquierda (5a-19)** con `<CabeceraPegada lado="nombre">` (el PLAN decía «izquierda», un lado que no existe), y el título de cada módulo lleva su `sticky` para que se vea mientras se desplaza.
- **El `<Switch>` mide en rem, la pista y el pulgar (5a-20):** `w-8 h-[1.15rem]` y `w-6 h-3.5` son los mismos 32 × 18,4 y 24 × 14 px al 100 % (comparado píxel a píxel contra la copia en px) y crecen juntos al 200 %. Usa `transition`: ya no queda ninguna excepción a `sin-transition-all`.
- **Una barra de pestañas compartida, `<PestanasConDesborde>` (5a-18 y c.1).** Salió de la de Configuración › Leads (la única con `min-w-0`, pista de desborde y la abierta a la vista) y la usan Leads, Empresa y la ficha de un origen: las dos últimas medían 579 y 494 px por no llevar `min-w-0`. **c.1 se confirma sólo si el texto crece con la página abierta** (la abierta quedaba en 452, 666 y 873 sobre 412): la barra lleva la abierta a la vista al montarse, al elegir otra y cada vez que cambia de tamaño, y mueve **sólo la barra** (`scrollIntoView` movía también la página).
- **Los nombres de un tipo de cambio y de una moneda se parten, no se cortan con «…»; el valor baja a otra línea cuando no cabe.** Lo vio la hoja de contacto: con la barra arreglada, «Oficial» (91 px) quedaba en 49 y «Paralelo» (114) en 27 («O…»), con el valor sobre la insignia. Ni `sinScrollHorizontal` ni `aLaVistaSinDesplazar` lo ven (la página no se ensancha): la prueba usa `sinTextoCortado` y compara las cajas.
- **No se tocó:** el selector de iconos (**c.2 no es un defecto**: con el 200 % y el pie fijo se llega a las 25 opciones en los dos proyectos), `siguientes-pasos.tsx` y el título de la ficha del origen (eran síntomas de la barra), ni el tope de nada.
- **Abiertos con número en `docs/PLAN.md`:** **5a-21** (la lista del equipo no tiene tope: `max_rows` = 1.000 corta en silencio desde la persona 1.001; está exenta a propósito y no se cambió porque la sesión pedía no tocar topes), **5a-22** (la ficha de un lead con el origen inactivo mide 436 px sobre 412 al 200 % en el celular), **5a-23** (el listado de leads mide 435 con una búsqueda de 22 letras) y **5a-24** (el cuerpo de un modal que se desplaza no lo dice).

**Alternativas:**

- _Dejar la lista del equipo como tabla que se desplaza:_ el nombre se va con la tabla (lo mismo que 5a-19) y el «⋯» queda a la derecha de todo.
- _Arreglar el ancho del menú sólo en el del equipo:_ el defecto era del contenedor y lo tenía el menú de leads y el de vehículos.
- _Pestañas con `scrollIntoView` en un `ResizeObserver`:_ sube la página si la barra está fuera de la vista; se mueve sólo `scrollLeft`.
- _Un `min-w-0` en la página de Empresa y en la del origen:_ no hacía falta una vez arreglada la barra (se midió: pasan sin él); en Integraciones faltaba la columna `minmax(0, 1fr)` de su grilla, que sí se puso.
- _Un tope para la lista del equipo ahora:_ cambia una excepción de escala escrita; va como 5a-21 con su número.

**Consecuencia:** una pantalla de Configuración no arma sus pestañas con `<Tabs>` (usa la barra compartida); un menú, un interruptor o un nombre que la persona tiene que leer crece con el texto en vez de salirse (`.claude/rules/ui.md`). La guarda `listas-con-patron` queda con una sola excepción, `matriz-de-roles.tsx`.

## 2026-10-21 — Cierre de pendientes del 200 %: el origen inactivo, el chip, el modal y la columna «Persona»

**Contexto:** lo que dejó abierto el «Cierre de defectos al 200 %»: 5a-22, 5a-23, 5a-24, 5a-21, el correo cortado al 100 % en la columna «Persona» (el costo aceptado de 5a-17) y dos huecos de las hojas de `defectos-200`. Es Nivel 2: toca `src/shared` (el modal, `<FilterShell>`, `<TablaDeLista>`). El plan se aprobó sin respuestas y se tomaron las recomendaciones de las seis preguntas. Se midió primero en HEAD con los specs definitivos y una medición desechable (no se commiteó): cada prueba cae contra el código anterior.
**Decisión:**

- **5a-22: el nombre del origen cede y «(inactivo)» no.** La causa no era sólo la marca `shrink-0`: la grilla de la cabecera de la ficha tenía una columna `auto` que tomaba como mínimo el nombre sin cortar (con el de la semilla de las hojas, 436 sobre 412; con uno de 90 letras, **1.147 en el celular y 1.706 en escritorio**). La marca vive ahora en `<OrigenDelLead activo>` (el espacio es texto, como pidió 8d0285d) y la cabecera, «Datos» y el resumen (`?lead=`) la usan; la cabecera es `grid-cols-[minmax(0,1fr)]`. **El resumen no decía que el origen estaba apagado** y ahora lo dice (el pedido hablaba de «el mismo cuidado»; sin la marca no había qué cuidar y la ficha se contradecía con su resumen).
- **5a-23: la raíz de `<FilterShell>` es una grilla `minmax(0, 1fr)`**, no sólo el chip. El chip ya cedía (`max-w-56 truncate`), pero 14 rem son 448 px al 200 % y el texto sin cortar fijaba el mínimo de la columna `auto` (435 sobre 412; el chip, 403 px → 348). Además `max-w-full min-w-0` en el `<li>` y el botón y `title` con el texto entero. Con sólo lo del chip la página seguía en 435: la mutación (quitar la columna) lo confirma. Vale para leads y vehículos.
- **5a-24: la pista vertical se dibuja sólo si hay algo escondido.** `useDesborde()` gana un hermano, `useDesbordeVertical()`, con las medidas puras `desbordeVertical()` y `desbordeHorizontal()` (un píxel de tolerancia) y un `MutationObserver` (un aviso que entra al cuerpo agranda lo que se desplaza sin cambiar el tamaño de su caja, que el alto máximo mantiene). `<PistaVerticalDeDesborde>` usa el color del modal (`from-popover`, no el de la página) y no recibe el puntero. El cuerpo del `<Modal>` pasa a un contenedor `relative` (un nivel más): `modales-celular-200.spec.ts` lo buscaba entre los hijos directos del diálogo y cayó; ahora lo busca por lo que hace (`overflow-y: auto`), que es lo que mide.
- **La columna «Persona» crece con lo que sobra de la tabla.** `w-[clamp(16rem,36cqw,26rem)]` sobre una `<TablaDeLista className="@container">` (`cqw` es el ancho de la caja de la tabla) y, para que la tabla no se desplace al 100 %, «Roles» cede (`clamp(14rem,28cqw,22rem)`): sin ceder, 419 + 384 + 182 + 48 pasaban de los 982 px de la caja. Los pisos son en rem: al 200 % ya no sobra nada, la persona mide lo de antes (552 px, nombre ≥ 100 px, «⋯» a la vista) y «Roles» baja a 14 rem (480 px de columna en vez de 736; la tabla de 1.681 a 1.425 px). Al 100 %: «Persona» 322 → 425, el correo de 38 letras 250 de 250 (antes 212), «Roles» 430 → 331, y la tabla sigue en 982 = su caja.
- **5a-21 se parte en su propio prompt, sin tocarlo.** Cambia la firma de `LectorDeEquipo`, la página (`q` y `estado` al servidor), la búsqueda de `?persona=` y `?baja=` fuera de la página cargada, `soloYo`, la siembra (1.050 personas) y quizá SQL (las tildes). Y el tope no puede ser 1.000: `max_rows` lo corta en 1.000 y el aviso nunca sabría que hay más; se propone **100** con `<AvisoDeTope camino>`, el mecanismo del selector de vehículos. Quedó con su assert y su lugar en `docs/PLAN.md`, con lo que hay que resolver escrito.
- **Los huecos de captura.** Las capturas 17, 18 y 19 de `defectos-200` eran **la misma imagen** (mismo md5, dentro de cada proyecto): las pestañas del origen cargan por `?seccion=` y su barra queda bajo el título largo. `configuracion-200-capturas.spec.ts` lleva ahora la barra a la vista, y el spec nuevo `cierre-pendientes-capturas.spec.ts` las recorre una por una (se ven las tres barras con su pestaña elegida).
- **El interruptor «Activa» de Integraciones no está recortado:** la tarjeta es `overflow: visible`, la página no se ensancha y `aLaVistaSinDesplazar()` pasa; su borde derecho cae en x = 380 = el borde de la tarjeta (al 100 % queda a 17 px). Por la regla del plan, va al PLAN como **5a-25** con su assert y no se tocó. Y al mirar las hojas apareció **5a-26**: el marcador del buscador del equipo se corta («Buscar por nombre c») al 200 % en el celular, igual en HEAD.

**Alternativas:**

- _Un `<select>` o un valor de columna fijo mayor para «Persona» (`w-80`):_ arregla el 100 % en 1.280 px y rompe el 200 % (la columna pegada pasaría del ancho del contenedor y taparía el «⋯»), o deja la tabla desplazándose con 1.024 px.
- _Sólo `max-w-full min-w-0` en el chip (5a-23):_ la página seguía en 435 (medido); el defecto era la columna de la raíz.
- _Guardar la pista del modal en `useDesborde(ref, eje)` con un tipo de retorno que cambia según el eje:_ dos hooks con una medida común son más simples de tipar y no tocan a los cuatro que ya usan el horizontal.
- _Poner la pista como hermana del cuerpo y absoluta contra el diálogo:_ no sabe dónde empieza el pie; el contenedor `relative` alrededor del cuerpo sí.
- _Un `ResizeObserver` defensivo en el hook de producción:_ el navegador siempre lo tiene; el que no lo tiene es jsdom y `vitest.setup.ts` trae uno que no observa nada (los tests que necesitan disparar un cambio de tamaño ponen el suyo).
- _Arreglar el interruptor de paso:_ la regla del plan lo pedía sólo si estaba recortado; no lo estaba.

**Consecuencia:** un listado con `<FilterShell>` y todo texto que la persona escribe y se muestra en una barra cede con «…» antes de ensanchar la página (`.claude/rules/ui.md`); el cuerpo de un modal que desborda lo dice; una prueba que mida el cuerpo del modal no puede suponer su lugar en el árbol. Queda abierto con número: 5a-21 (su propio prompt), 5a-25 y 5a-26.

## 2026-10-22 — La lista del equipo tiene tope de 100 y busca con tildes en el servidor; el interruptor era un problema de la tarjeta

**Contexto:** `getEquipo` leía `perfiles` entera y la lista filtraba en el navegador (5a-21): `max_rows` = 1.000 la cortaba en silencio desde la persona 1.001 y el buscador no la alcanzaba (con 1.050 personas, 999 filas, 15.157 nodos y 3,5 MB de documento). El filtro del cliente ignoraba las tildes («jose» encuentra «José»), y `ilike` no. Además quedaban el marcador del buscador cortado al 200 % (5a-26) y el interruptor «Activa» de Integraciones sin margen (5a-25).

**Decisión:**

- **Tope 100, no 1.000.** Se lee 101 (`cortarAlTope()`), así el aviso sabe que hay más: «Mostrando las 100 primeras por nombre. Busca por nombre o correo, o filtra por estado.» Con `max_rows` = 1.000 la fila 1.001 nunca llegaría. Sin cursor: el equipo se ordena por nombre, y se llega a lo demás buscando o filtrando por estado. El 100 vive en `TOPE_DEL_EQUIPO` (`shared/lib/paginacion.ts`), de donde lo leen la lista, la RPC registrada en la guarda de páginas y la medición.
- **Texto y estado en el servidor.** `?q=` y `?estado=` entran por Zod (`filtroDelEquipoDesde()`): el texto se recorta y se corta en 100 caracteres, y **un estado que no existe vuelve a «En el equipo»** sin error (lo mismo que ya hacía el selector). `filtrarPersonas()` sale: su semántica pasa a SQL.
- **Las tildes siguen sin importar: `unaccent` + trigram.** La búsqueda de leads no las pliega (`ilike`), así que no sirvió de modelo. `equipo_lista(texto, estado, límite)` (`security definer`, exige `equipo.usuarios.ver` o `.gestionar`) devuelve ids; la página lee esas filas por `id` con la RLS de siempre. `_sin_tildes()` es `unaccent` + minúsculas (la ñ pasa a n, como la normalización del cliente) y alimenta un índice GIN sobre nombre y correo; el patrón de `like` toma `\`, `%` y `_` como letras, y las comillas entran como literales. `unaccent` se carga también en el Postgres embebido de `db:probar`.
- **En dos etapas, no en una consulta.** Con una sola `order by … limit 101`, un término común («maria») hacía que el planificador caminara el índice del orden y leyera 49.102 filas de 100.000. Ahora (W) se recorren, de a una, las primeras 2.000 del estado en el orden de la lista y se corta al juntar 101; si no alcanzan, (I) el trigram. Es el diseño de `leads_candidatos`, con `S` = 2.000 (raíz de 101 · N con 100.000 personas).
- **Un texto de menos de 3 letras o dígitos sin coincidencias recorre todo.** El trigram no tiene qué buscar; con 100.000 personas son 172 ms y crece con la tabla. Se acepta y se dice (`docs/RENDIMIENTO.md`): los dos casos reales, un término común y uno raro, no lo sienten.
- **`?persona=` y `?baja=` leen a su persona por id** (`leerPersona()`), esté o no en la página; también `generar-enlace`, que leía el equipo entero para buscar a una. «Por ahora el equipo eres tú» sale de una consulta aparte (`leerSoloYo()`: dos personas vigentes alcanzan), no de lo que se buscó; ya no cuenta a las dadas de baja.
- **5a-26:** el marcador pasa a «Nombre o correo». La etiqueta para lectores de pantalla sigue diciendo el texto largo.
- **5a-25: la causa no era la del PLAN.** Se medió la cadena de contenedores en lugar de dar por buena la hipótesis (la palabra «activarla.»): la columna de texto mide 186 px y cabe. El cuerpo de `<Bloque>` es una grilla de columna `auto`, y el botón «Guardar configuración» de apibara (`nowrap`, 315 px) la ensanchaba sobre sus 282 px útiles, arrastrando la fila del interruptor a x = 380, el borde de la tarjeta. Se corrige en la raíz (`grid-cols-[minmax(0,1fr)]` en `<Bloque>`, que es la receta del repo para las grillas) y `<Interruptor>` también cede (`min-w-0`, `break-words`), con su propio assert para que no sea código sin prueba.

**Alternativas:**

- _Aceptar que el buscador pierda las tildes (`ilike` por PostgREST):_ una regresión de producto («Núñez» dejaría de aparecer buscando «nunez»).
- _Una sola consulta con los valores como literales:_ elige bien para un término raro y mal para uno común (49.102 filas leídas); por eso las dos etapas.
- _Una lista con cursor y «Siguiente»:_ el equipo se ordena por nombre, no por `creado_en`, y se busca más de lo que se recorre.
- _Tope 1.000:_ `max_rows` lo corta antes de que el aviso sepa que hay más.
- _Aplicar sólo `min-w-0` al texto del interruptor (el PLAN):_ se probó y el interruptor seguía a 0 px; la pista de la grilla la fija otro hermano.
- _Arreglar también el formulario de apibara (el campo y el botón siguen tocando el borde):_ es otro defecto, con su propio assert; va a PLAN (5a-28).

**Consecuencia:** una lista con una población que crece declara su tope, lo dice con `<AvisoDeTope>` y resuelve el texto en la base con su índice; `perfiles` ya no está exenta de la guarda de escala. Un cuerpo de tarjeta no se ensancha con lo que lleva dentro. Quedan abiertos con número 5a-27 a 5a-30 (`docs/PLAN.md`).

## 2026-10-22 — Apertura de la Fase 4 — Cotizaciones

**Contexto:** antes de construir la Fase 4 se partió en pasos chicos (`docs/PLAN.md` › «Fase 4» › «Partición»: 24 pasos y 43 prompts) y
se le preguntó a la persona lo que ningún doc decía. Se leyó, además, la planilla que la hoja reemplaza (`COTIZACIONES FRANK.xlsx`,
transcrita en `docs/referencias/excel-de-cotizacion.md`).

**Decisión (la persona, 2026-10-22):**

- **D1 · Sin estado comercial nuevo.** «Vencida» = `creado_en` + `vigencia_dias` de la empresa (7 por defecto). Se ve en el listado, la
  tarjeta y el PDF; una vencida se recotiza encima (N+1). El estado comercial lo lleva la oportunidad del embudo.
- **D2 · «Desactualizada»** (una palabra distinta de «vencida»): al guardar una cotización **nueva**, la RPC detecta que la fórmula
  publicada o un tipo de cambio cambió desde que se abrió la hoja, y la pantalla ofrece «Usar la versión N+1» o «Guardar con la N».
  Editar una vieja no avisa: usa SU versión a propósito.
- **D3 · El lead es obligatorio siempre.**
  - El vehículo es obligatorio por defecto. Lo decide un ajuste único de la empresa, «Vehículo obligatorio al cotizar» (sí por defecto),
    que cambia quien tiene `cotizaciones.configurar`. Con «no», una preventa se guarda sin vehículo; una final lo exige siempre.
  - «Cargar a mano» **crea el vehículo en el inventario** (no son sólo datos dentro de la cotización). El link de subasta también lo crea.
- **D4 · La fórmula replica todo el Excel** (la hoja «COTIZACIÒN» y las tablas de «COMIS ASES» y «Amnistia»), con el nivel 2.
  - El grafo de nodos tipado sigue siendo el modelo, y `validar_formula()` el candado.
  - La hoja se ve y se maneja como el Excel: columnas de concepto, monto, tipo de cambio por fila o grupo, plazo de pago, USD y Bs, con
    subtotales por grupo y total.
  - Quien configura puede escribir una fórmula como texto con nombres (`=(remate+fees)*4%`, `SUMA` de un grupo, `HOY()`). Se compila al
    mismo grafo y la validan el mismo `validar.ts` y la misma base. Sin referencias A1 ni funciones que el grafo no tenga. _(Enmienda 2026-10-23: `HOY()` no se soporta hasta **4-4**; ver «Paso 4.07 (1 de 2)».)_
  - Una fórmula usa varios tipos de cambio a la vez, y cada fila o grupo elige el suyo.
  - Un valor puede venir sugerido (de una tabla o de un cálculo) y el asesor lo sobrescribe: queda «modificado». Así se hacen la
    nacionalización y el factor de depreciación, que el Excel tipea a mano.
  - Los impuestos son nodos. `modo_tc` es «por bucket» (por defecto) o «uno solo». _(Superado por D7, 2026-10-22: los modos los declara el diseño de la hoja.)_ La hoja y el PDF muestran las dos monedas.
- **D5 · Editar una tabla de referencia publica la N+1** de cada fórmula de su origen que la usa, con una nota automática y, encima, una
  nota opcional que escribe la persona. La fórmula congela en `params` las filas que usa, y así recalcular con SU versión se cumple
  también para las tablas.
- **D6 · El número de cotización es global y visible, sin enmascarar.** Hay una serie de comprobantes por empresa, configurable en
  Empresa («A» por defecto). Una serie por sucursal queda fuera de la Fase 4.
- **Confirmado de lo escrito:**
  - quién ve: «propios» = mías o de mis leads (el seed); al transferir un lead, sus cotizaciones las ve la cartera nueva;
  - el portal del cliente no muestra cotizaciones en la Fase 4;
  - al marcar la final, el lead pasa al primer tipo activo de la clase cliente (9j).
- **Fases de los abiertos sin asignar:** 5a-27 → 4 (paso 4b); 5a-28 → 9; 5a-29 y 5a-30 → 4 (paso 4q); 5b-7 → 4 (paso 4s). La persona
  los eligió con las letras de la propuesta anterior (4o y 4q); al reordenar la partición pasaron a 4q y 4s, que son los mismos pasos.
- **5a-9, en el paso 4c y en este orden:**
  1. el filtro de texto y el de rango de un campo público van a la ventana de candidatos de `leads_candidatos()`, también para quien ve
     «todos» y para Berta;
  2. se suman las 3 letras (`cumpleElMinimo`) al texto de un campo;
  3. si alguien sigue sobre 50 ms con 212.000, **no** se cambia el assert por un número que crece con N: se usa el «tope que se dice»
     (un recorrido acotado más el aviso «se buscó en los N más recientes», como 5a-21), con su assert en buffers, que la persona aprueba
     con la cifra medida;
  4. el índice por clave, la opción (a), queda descartado por lo que dice «5a-9: a la Fase 4, sin cambios» (arriba): sólo ayuda donde
     el planificador lo elige (la dueña «míos»), no a «todos», a Berta ni a un término de 1 carácter, y suma DDL por clave y costo en
     cada escritura de `leads`.
- **El `.xlsx` no se commitea** (`.gitignore`: `docs/referencias/*.xlsx`). Es la planilla de una empresa (su nombre, sus precios, sus
  tarifas y metadatos de su PC) dentro de un producto white-label que se despliega para otras. Es binaria: no se revisa en un diff ni
  se lee en una sesión sin un script. La transcripción tiene todo lo que el motor necesita: cada fórmula tal cual y cada valor guardado.

**Lo que el Excel dijo y estos docs no sabían** (`docs/referencias/excel-de-cotizacion.md`):

- El «TOTAL DÓLARES» es el total en Bs ÷ el paralelo: 16826,354 contra 16910 en la moto.
- Tres subtotales en Bs toman el tipo de cambio de otro grupo: `O17`, `O53` y `O70`, no sólo `O53`.
- La calculadora de póliza no alimenta la nacionalización.
- Las tablas de transporte, «COMIS ASES» e «ICE MOTOS» no las lee ninguna fórmula.
- Los factores tipeados de «Amnistia» no son los de su año en la tabla de la hoja.
- `TODAY()` sólo escribe la fecha del encabezado.

**Lo que el código de la Fase 0 trae y la fase corrige** (`docs/PLAN.md` › «Fase 4»):

- La policy de `cotizaciones`, `puede_cotizacion()`, `puede_vehiculo()` y la policy `vehiculos: leer` arman el arreglo
  `lead_id in (select mis_leads())`.
- El `grant update` de `clase` permite marcar la final sin la RPC.
- `cotizacion_marcar_final` sin el lead, sin la papelera y con los candados en el orden contrario a vincular.
- Las revisiones guardan el snapshot entero.
- `buckets` sólo admite origen y destino.

**Alternativas:**

- Fórmulas sólo como nodos, editadas con un formulario por tipo: la persona pidió escribirlas como en el Excel.
- Un motor de expresiones que evalúe el texto al cotizar: descartado desde el 2026-10-11. Acá el texto se compila al grafo y lo que se
  guarda y evalúa sigue siendo el grafo.
- Commitear el `.xlsx`: ver arriba.

**Consecuencia:**

- El paso 4e amplía la forma del grafo (`docs/COTIZADOR.md`, «Lo que cambia con la apertura de la Fase 4») y sus pruebas incluyen las
  cuatro cotizaciones del Excel con sus valores guardados.
- El paso 4f es el compilador de texto a grafo.
- La partición queda con su orden fijo: papelera propia → marcar final → comprobantes.

## 2026-10-22 — 5a-4b: la cifra pasa a 40,1

**Contexto:** `.claude/rules/e2e.md`, `docs/ESTADO.md` y `docs/PLAN.md` decían que el Nivel 3 tarda «≈ 32 min» (los 31,7 del cierre
5a-fix-3, con 845 pruebas). El cierre de la Fase 3 lo midió en **40,1 min** con 1.065 pruebas (`docs/BITACORA.md`, 2026-10-22). El Nivel
2 (el escritorio solo) ronda 24 min, y la regla decía «~20».

**Decisión:** las cifras vivas pasan a 40,1 (Nivel 3) y ≈ 24 (Nivel 2). Lo que es historia (las entradas de este archivo del 2026-10-19,
`docs/RENDIMIENTO.md` › «Cierre 5a-fix-3», la BITACORA) no se toca. La decisión de 5a-4b (no se monta la segunda pila local) y su assert
(≤ 25 min) no cambian.

**Consecuencia:**

- Con dos pilas, el Nivel 3 sería ≈ el Nivel 2, unos 24 min: en el borde del assert.
- El cierre de la Fase 4 (paso 4x) anota el tiempo de cada proyecto (el del 2026-10-22 sólo dejó el total), para que la persona decida
  con números.

## 2026-10-22 — D7 · La hoja configurable: diseño, niveles de acceso y tipos de cambio

**Contexto:** la persona pidió que la interfaz de la cotización sea configurable, hasta reproducir el cotizador que usan hoy (doce
capturas, inventariadas sin nombres en `docs/referencias/cotizador-actual.md`) y el Excel (`docs/referencias/excel-de-cotizacion.md`),
con la `XCell`, con permisos y roles, y responsive. El inventario destapó tres choques con D4 y con el modelo de la Fase 0:

- **El ⚙ del «Dólar unificado» afecta a los tres orígenes**, y una constante de la fórmula es de un solo origen.
- **Las capturas tienen tres modos de tipo de cambio**, y D4 tenía dos.
- **Esconder un valor y calcular en el navegador no se pueden tener a la vez:** lo que el servidor lee con el JWT de la persona, la
  persona lo puede pedir directo a PostgREST.

**Decisión (la persona, 2026-10-22):**

- **H1 · Los tipos de cambio son una lista de la empresa que se configura** (oficial, paralelo, unificado, aduana y los que se sumen),
  con su historial y su permiso (`empresa.tipos_cambio.gestionar`). La cotización congela los que usó.
  - Un **modo** (Aduana, Paralelo, Unificado…) lo declara el diseño de la hoja: su nombre y qué tipo de cambio llena cada bucket.
  - **Esto reemplaza el `modo_tc` «por bucket / uno solo» de D4** (anotado allí como superado).
  - El ⚙ de una celda de tipo de cambio es `tipo_cambio_guardar`, no la N+1 de la fórmula. Con las cifras de las capturas: Unificado
    = los grupos que no son de aduana al unificado, la aduana al oficial y el total en USD = Bs ÷ unificado.
- **H2 · El paso «Oficina» sale de la vista:** es otro origen (la pestaña Oficina). El paso a paso queda en la hoja (con su clase), el
  vehículo, el cliente y la vista previa.
- **H3 y H4 · Lo que no se ve nunca, salvo para quien configura, es la fórmula y cómo se cotiza:** la definición, los `params` y el
  texto de las fórmulas.
  - De cada celda o sección se configura, por rol, quién la ve, quién la edita y qué va a «avanzado».
  - **Niveles de acceso que crea la empresa**, sembrados «todos» y «costos». Cada nivel es un permiso del catálogo que aparece en la
    matriz de Roles (unión de roles, por origen). Su enforcement es el filtro genérico de visibilidad: un nivel nuevo trae su
    enforcement sin código nuevo.
  - **La fórmula viaja sólo a quien tiene `cotizaciones.configurar` del origen.** La hoja calcula en la base para todos (un solo
    camino y una sola autoridad del total) con `evaluar_formula()`, espejo de `motor.ts`. El motor TS queda para el editor de la
    fórmula, con la prueba de paridad (las cuatro cotizaciones del Excel y los $2.350 y $72.952 de las capturas).
  - **Lo que alguien no puede ver no viaja:** `cotizacion_leer`, las revisiones, `formula_para_cotizar`, el PDF, el comprobante y un
    inventario de funciones.
  - **«Un costo único en una suma se deduce restando»:** el editor del diseño lo avisa y no lo bloquea.
- **H5 · Un tono por grupo, el mismo en la hoja y en la vista previa**, de un catálogo de tonos que la empresa edita, con validación
  AA en claro y oscuro. La plantilla puede elegir otro tono del catálogo para un grupo en la vista previa y el PDF. Sin hex sueltos en
  el diseño.
- **H6 · Una fórmula por origen con un nodo de variante (`opcion`)**: Moto, Auto Gasolina, USA → Chile e Híbrido / Eléctrico son
  opciones de ese nodo.
- **Hito a mitad de fase (sí):** al cerrar el paso que deja cotizar de punta a punta con la fórmula y el diseño de la semilla (4.17 en
  la numeración nueva) corre un Nivel 2, y la BITACORA lo anota como «hito 4-A». Los editores van después.
  _(Corregido el 2026-10-22 por decisión de la persona: el hito 4-A pasa al cierre de 4.18, porque el PDF es parte de la tarea de oro 2.)_

**Alternativas:**

- Un permiso fijo por código para cada nivel: obliga a una migración cada vez que la empresa quiere otro, y la persona pidió que sea
  configurable.
- Calcular en el navegador con la fórmula entera: la fórmula viajaría a todos.
- Una segunda excepción del cliente admin para evaluar en el servidor: contradice «El cliente admin tiene una sola excepción»
  (2026-10-11).
- Un modo fijo «por bucket / uno solo»: no reproduce los tres modos de las capturas.
- Colores fijos por grupo (la paleta cerrada de las etiquetas): la persona quiere cambiarlos.
- Cuatro fórmulas por origen, una por variante: la base admite una publicada por origen, y el ⚙ dejaría de ser «para todas».

**Consecuencia:**

- **Cómo nace un permiso desde la configuración sin romper «un permiso existe sólo si tiene su enforcement»** (el paso 4.09):
  1. `cotizaciones_niveles (clave, nombre, retirado_en)`. Cada nivel, salvo «todos», **genera dos filas en `permisos`** en la misma
     transacción que lo crea: `cotizaciones.nivel.<clave>.ver` y `cotizaciones.nivel.<clave>.editar`, por origen, con su
     `aplicado_en` = «`_nodos_visibles` / `cotizacion_guardar`».
     - «Todos» no genera nada: su ver es `cotizaciones.ver` y su editar, `cotizaciones.crear` o `cotizaciones.editar`.
     - Las claves del nivel siguen la regla del repo: salen del nombre y no cambian; renombrar cambia sólo el nombre.
  2. **El enforcement es estructural:**
     - la única función que decide la visibilidad (`_nodos_visibles(formula_id)`, que usan `cotizacion_leer`, las revisiones, el PDF y
       el comprobante) y la que decide qué se puede guardar recorren `cotizaciones_niveles`, no una lista de claves en el código;
     - un `check` y un trigger exigen que todo `permisos.clave like 'cotizaciones.nivel.%'` tenga su nivel, y al revés (FK `on delete
restrict`): no puede existir un permiso de nivel sin el filtro que lo aplica, ni un nivel sin su permiso;
     - `permisos-enforcement.sql` gana un caso **genérico**, que recorre todos los niveles sembrados y uno creado en la prueba: sin el
       permiso, los nodos de ese nivel no llegan por ninguna lectura del inventario; con él, sí.
  3. **Quién crea un nivel:** quien tiene `equipo.roles.gestionar`, porque crear un nivel es crear un permiso de la matriz. Nace
     **concedido al rol `dueno`**, para todos los orígenes, en la misma transacción (la regla de siembra de `docs/ESTADO.md`). A los
     demás roles se les da por `rbac_otorgar`, con la dominancia de siempre.
  4. **El guardián de `equipo.*` no cambia:** las claves no son de `equipo.*`, y el dueño las tiene todas porque nacen concedidas.
     «Ver como» las refleja como a cualquier permiso.
  5. **Borrar un nivel en uso:**
     - **eliminar** sólo vale si ninguna versión de ninguna fórmula (borrador, publicada o archivada) lo nombra en su `visibilidad`.
       Las archivadas cuentan, porque las cotizaciones viejas se siguen leyendo con su versión;
     - con uso, la RPC responde con el motivo y cuántas celdas de cuántos orígenes lo usan, y ofrece **retirar**: el nivel deja de
       ofrecerse en el editor, sus permisos y concesiones siguen y lo que ya lo usa se sigue filtrando igual;
     - eliminar borra sus dos permisos y sus concesiones, y queda en `actividad`;
     - «Todos» y «costos» no se eliminan.
- **El recálculo en la base:** `cotizacion_evaluar()` (paso 4.06). Assert en `supabase/tests/medir-evaluar.sql` (`db:medir:volumen`):
  la fórmula del seed ≤ 10 ms en la mediana y ≤ 20 ms en el p95 (200 llamadas con el plan genérico ya armado), y una sintética de 200
  nodos con 4 tablas de 1.000 filas ≤ 50 ms en el p95; no crece entre 50.000 y 250.000 cotizaciones. La hoja espera 150 ms sin
  cambios antes de pedir, y sólo aplica la respuesta más nueva (un número de secuencia).
- **El modelo del diseño, los niveles y los tipos de cambio** están en `docs/COTIZADOR.md` («El diseño de la hoja», «Niveles de
  acceso», «Tipos de cambio y modos»).
- **La partición pasa a numerarse 4.01 a 4.28**, con 61 prompts (`docs/PLAN.md` › «Fase 4» › «Partición»). Las letras de la apertura
  equivalen a:

  | Antes      | Ahora            |
  | ---------- | ---------------- |
  | 4a         | 4.01             |
  | 4b, 4c, 4d | 4.02, 4.03, 4.04 |
  | 4e         | 4.05             |
  | 4f         | 4.07             |
  | 4g, 4h, 4i | 4.10, 4.11, 4.12 |
  | 4j, 4k, 4l | 4.13, 4.14, 4.15 |
  | 4m, 4n, 4o | 4.16, 4.17, 4.18 |
  | 4p, 4q, 4r | 4.19, 4.20, 4.21 |
  | 4s, 4t, 4u | 4.23, 4.24, 4.25 |
  | 4v, 4w, 4x | 4.26, 4.27, 4.28 |

  Son nuevos 4.06 (la evaluación en la base), 4.08 (el modelo del diseño), 4.09 (los niveles) y 4.22 (el editor del diseño).

- **Dos datos del repo al escribirlo:**
  - `vehiculos_subasta_estado_idx` existe (`supabase/schemas/06_vehiculos/01_vehiculos.sql`, y
    `…20261014000200_apibara.sql`), pero no lleva `origen_id`: 4.14 lo mide por origen y suma el índice sólo si el plan descarta de más.
  - Los colores de las etiquetas son una paleta **cerrada**: el modelo del tono editable con AA es `color_acento` de Empresa
    (`src/shared/lib/color.ts`), no el de las etiquetas.

## 2026-10-22 — Paso 4.02: el equipo busca desde 3 letras con su propio mínimo, y Roles cuenta por una RPC con el id como literal

**Contexto:** 5a-31 pedía reusar `cumpleElMinimo` y `MINIMO_DE_BUSQUEDA` sin tocar `src/shared` (si no, Nivel 2). `MINIMO_DE_BUSQUEDA`
no está en shared sino en `src/modules/leads/entities/busqueda-de-leads.ts`, y leads depende de equipo: equipo no puede importarlo sin
un ciclo. 5a-27 pedía `limit n + 1` en `infra/queries/roles.ts`, y por PostgREST eso es traer hasta 1.001 filas de `usuarios_roles`
por rol al servidor; además `usuarios_roles.rol_id` (FK) no tenía índice.

**Decisión:**

- **El equipo declara `MINIMO_DE_BUSQUEDA_DEL_EQUIPO`** en `entities/lista-equipo.ts`, con el tipo `MinimoDeBusqueda` de shared, 3 letras,
  sin números libres y el mismo texto, «Escribe al menos 3 letras» (lo fija un test). El campo es el `CampoDeBusqueda` de
  `shared/ui/filtros` sin cambiarlo. Lo eligió la persona (2026-10-22) frente a subir la constante a shared.
- **`equipo_lista()` ignora el texto sin tramo de 3** (`…004200`): devuelve la lista sin filtro, la misma que sin texto. Cubre una
  URL escrita a mano; la regla es la de `_equipo_lista_indexable()`, espejo de `cumpleElMinimo()`.
- **`roles_personas()`** (`…004300`, `security invoker`): una fila por rol con `count(*)` sobre un subselect con `limit 1001`, y el
  **id de cada rol como literal** en una consulta dinámica. Con el plan genérico de un subselect por rol el planificador estima
  personas ÷ roles y recorre la tabla para un rol de una sola persona (7.492 buffers medidos); con el literal mira las estadísticas
  de cada rol (24 buffers con un rol de 100.007). Índice nuevo `usuarios_roles_rol_idx`. La RPC cambia `database.types.ts`
  (generado): la persona decidió tratarlo como parte de la cadena db y quedarse en Nivel 1.

**Alternativas:**

- Subir `MINIMO_DE_BUSQUEDA` a `src/shared`: una sola fuente del texto, pero Nivel 2 (≈ 24 min) para una constante.
- El embed de PostgREST con límite por tabla referida (`.limit(1001, { referencedTable })`): sin función nueva ni tipos, pero baja
  hasta 1.001 filas por rol al servidor (decenas de roles: cientos de KB) para contarlas en TypeScript.
- Un `sql` con el subselect por rol y el plan genérico: más corto, pero el plan depende de cuántos valores distintos tenga `rol_id`.

## 2026-10-22 — Paso 4.03 (5a-10): un campo privado se filtra por los candidatos de la cartera, sin índice

**Contexto:** 5a-10 pedía que filtrar por un campo privado, sin resultados, costara ≤ 3.000 ms con 212.000 leads y no creciera con N (la dueña: 5.534 ms de 6.000, 1.418,6 con 62.000). No se sube ningún presupuesto y quién ve qué no cambia. Las cifras de HEAD, `EXPLAIN (ANALYZE, BUFFERS)` como la dueña, mediana de 5: **1.316,8 ms y 228.351 buffers con 62.000; 5.320,2 ms y 892.348 buffers con 212.000** (Berta 495,2 con 62.000 y 1.989,1 con 212.000; Ana 690,7 con 212.000). Los números del PLAN se reprodujeron dentro de un 7 %.

**La causa** (el plan de HEAD): la página sale de `leads_vista` por `leads_listado_idx`, que recorre todos los leads visibles (50.000 descartes con 62.000) y evalúa `atributos_lead(id) @> …` en los 20.000 de la cartera de la dueña. Esa función vuelve a leer el lead por su clave y recalcula `alcance_de()` y `_bajas_en_curso()` en cada llamada: ~11 buffers y ~66 µs por lead. No es el planificador sino dónde se evalúa la condición: un campo privado lo tiene SÓLO la cartera de quien filtra, y para esa cartera `atributos_lead()` devuelve `leads.atributos` tal cual.

**Decisión:**

1. **`leads_candidatos()` cumple el campo privado** (migración `…20261019004400_candidatos_privados.sql`, sólo `create or replace`): la clave `privados` es un Y de Os de `l.atributos @> …` (como `atributos` sobre `atributos_publicos`) y se lee **sólo de la cartera de quien llama**. Pedirla vuelve «míos» la lectura aunque el cliente no lo diga (`v_mios`): la etapa W recorre su cartera por `leads_asesores_listado_idx` y la etapa I suma `cartera @> {yo}` al índice (`leads_busqueda_idx`, el de siempre). Ningún lead ajeno se lee ni se cuenta; el valor que sólo está en leads de otros contesta lo mismo, bit a bit, que uno que no existe.
2. **Cuenta como algo que buscarle a la ventana** (`_leads_candidatos_indexable`), así que corre W (hasta S = 4.000 filas de su cartera, en el orden del listado) antes que el índice. El primer prototipo, sólo la etapa del índice, dejaba a Berta con un valor denso en **81,7 ms y 172.340 buffers con 212.000** (el planificador camina `leads_listado_idx` entero porque estima el filtro casi vacío); con W, su paso 1 cuesta 10,7 ms (31,7 los dos pasos).
3. **El lead del número (`extra`)** también tiene que estar en la cartera y cumplir el filtro, porque la página ya no lo repite (lo que se hizo con la etiqueta en 5a-7). La comprobación va en línea dentro de `leads_candidatos()`: se probó con un ayudante propio y se quitó, porque una función nueva en `public` cambia `database.types.ts`, que vive en `src/shared` (la persona pidió no tocarlo: sería Nivel 2).
4. **La app** (`entities/candidatos.ts`): `atributos_contienen` sobre `atributos` va a `privados` y la página deja de repetirlo; **sigue en la página** `en_cartera` (lo que acota las filas), las marcas y un texto o un rango sobre un campo privado (`atributo_texto`, `atributo_rango_*`).
5. **Lo asertado** (`medir-escala.sql`, `privados()`, seis personas: la dueña, Ana, Berta, la «chica», la de la papelera y la supervisora): los dos pasos ≤ 100 ms y ≤ 40.000 buffers, **los mismos con 62.000 y con 212.000** (sin fórmula por N), con cinco formas (sin resultados, un valor raro, uno común, una opción u otra, y con un nombre), y **lo que devuelve**: nada de otra cartera y, con el valor raro, exactamente los suyos vivos (la papelera y los de otras personas no cuentan).

**«No crece con N», lo que se decidió:** la persona eligió el presupuesto fijo (el mismo con los dos volúmenes) sobre indexar los privados. No es pendiente cero: con un valor raro la etapa del índice lee el heap de la cartera, **≈ 0,38 µs por lead** (la dueña 15,3 → 37,9 ms de 62.000 a 212.000, +11 % de buffers; Berta 12,2 → 20,3). Es la diferencia entre ~66 µs y ~0,38 µs por lead.

**«La cuenta sin la concesión del campo privado»:** no existe una concesión por campo; lo privado lo decide la cartera. Esa cuenta es la que ve «todos» y recibe el campo sólo de los leads que tiene en su cartera: la supervisora (3 propios) de `medir-escala.sql` y f5 de las pruebas, más la dueña.

**Alternativas descartadas:**

- **Indexar `atributos` en `leads_busqueda_idx`** (costo constante, 1 a 3 ms): cada alta, importación y la baja de 200.000 escribirían más claves en el GIN (5a-11 va justo después y quiere sacar claves de ese índice), y la siembra no tiene privados para medir ese costo. No se construyó ni se midió: la persona eligió no pagarlo.
- **Enrutar a la dueña por la cartera** (`leads_cartera_vista`): ya descartada en 5a-5, 5.871 ms.
- **Sólo la etapa del índice, sin W:** Berta, valor denso, 81,7 ms (arriba).
- **Repetir el campo privado en la página** (defensa en profundidad): no se midió; se siguió la regla de 5a-fix-1b (repetir un `@>` sobre `leads_vista_por_ids` puede dar el `Nested Loop` de 88 ms contra 21). La página sigue exigiendo `en_cartera`, así que ninguna fila puede salir de la cartera aunque los candidatos fallaran.

**Límites aceptados, con su número** (212.000 leads, la dueña):

- Un **texto o un rango** sobre un campo privado sigue en la página: **5.502 ms** el texto sin resultados (5a-34).
- Los **tachados ocultos** con un privado (`contarLeadsHasta`, 275,4 ms) y el **conteo de la exportación** (el primer pedido de 1.000, 5.275,6 ms) no pasan por los candidatos (5a-34). La exportación con un privado sigue pagando ese conteo.
- Si `leerPorCandidatos()` agota sus ventanas (un filtro de marcas que deja la página corta con más de ~1.200 coincidencias) vuelve a la consulta de siempre: es el respaldo, ya no asertado.
- El peor caso del heap: una cartera repartida por toda la tabla leería `leads` entera con el filtro (26.557 buffers, 29,5 ms con 212.000). La siembra junta físicamente las carteras; ese techo queda dicho.

**Hallazgo (no es de este paso, 5a-35):** al probar el lead del número apareció un defecto de 5a-7 (`…003500`): `v_con_etiquetas` es nulo cuando el pedido no trae `etiquetas`, y `not v_con_etiquetas or exists (…)` descarta siempre al lead de `extra`. Un número de 3 o más dígitos sin «#» no encuentra al lead cuyo nombre no lo contiene. No se arregla aquí.

**Qué se midió y cómo:** `db:reset` y `db:sembrar-volumen` (62.000 y `-- --leads 200000`); `EXPLAIN (ANALYZE, BUFFERS)` como `authenticated`, mediana de 5 (de 7); la carga de la máquina, de 2,0 a 4,1 de 8 núcleos, anotada en cada corrida (`/proc/loadavg`). Contra HEAD, el assert cae por contenido (HEAD ignora `privados`: 300 de 300 candidatos sin filtrar, 29 y 28 violaciones con 212.000 y con 62.000); los ms no caen porque la función de HEAD es rápida: el 5,3 s está en la ruta de la app por la vista, que la guarda ya no mide. Mutaciones (cada una revertida y verificada con `cmp`): evaluar el filtro con `atributos_lead(l.id)` (33 violaciones: 1.730 ms y 232.799 buffers); que un privado no fuerce la cartera (cae la prueba «sin fuga» y la de `busqueda-leads.sql`); `esDeCandidatos()` sin la rama del privado (cae `candidatos.test.ts`).

**Consecuencia:** migración `…20261019004400` (ni tabla, ni índice, ni trigger, ni policy, ni función nueva: `db:base` y `database.types.ts` sin diff); `entities/candidatos.ts` y su test; `privados-candidatos.sql` entra a `db:probar`; `busqueda-leads.sql` empuja el privado como la app; `medir-escala.sql` (`privados()`, `buffers_de()`) y `busqueda-volumen.sql` (la huella md5 de un campo privado). **Quien agregue un filtro de leads sobre un campo privado** lo lleva a `privados` de los candidatos; un texto o un rango privado dice cómo crece con la cartera (5a-34).

## 2026-10-22 — Paso 4.03, prompt 2 (5a-35): el lead del número entra a los candidatos aunque el pedido no traiga etiquetas

**Contexto:** al probar el lead del número buscado con un campo privado (5a-10) apareció que `leads_candidatos()` no lo devolvía sin etiquetas. Un número de 3 o más dígitos escrito sin «#» (482) se pide como el texto «482» más `extra`, el lead que tiene ese número (1 o 2 dígitos buscan sólo por número y no pasan por los candidatos); tiene que entrar aunque ningún nombre lo contenga.

**La causa:** en `…20261019003500` (5a-7) `v_con_etiquetas := jsonb_typeof(p_filtros -> 'etiquetas') = 'array'`. Sin la clave `etiquetas`, `jsonb_typeof(NULL)` es NULL y el booleano queda NULL; la cláusula de `extra` (`and (not v_con_etiquetas or exists (… le.etiqueta_id = any (v_etiquetas)))`) vale NULL (`NULL or false`) y el `where` descarta la fila. Fechado con las funciones de cada migración en una transacción: con `…003300` (`a34318f`, 2026-10-18 16:44) el lead entra; con `…003500` (`9ecddb2`, 2026-10-19 11:19) no. Duró tres días sin que nadie lo viera: ninguna prueba pedía el lead del número sin etiquetas (`busqueda-leads.sql` lo probaba sólo con ellas y `leads-busqueda-numero-ajeno.spec.ts` busca 30 y 31, que no pasan por los candidatos).

**Reproducido en la pantalla contra HEAD** (`e2e/leads-busqueda-numero-largo.spec.ts`, escritorio y celular): la dueña buscando 482 (el propio de Berta), 4821 (el suyo) y 5127 (el global de Carlos) ve «Nada coincide con los filtros»; Berta buscando su 482, también. Con el arreglo salen con su explicación y Carlos sigue sin encontrar lo que no ve.

**Decisión:**

1. **Migración `…20261019004500_candidatos_extra_sin_nulos.sql`** (`create or replace`, sin función nueva en `public`: `db:base` y `database.types.ts` sin diff): `v_con_etiquetas` pasa por `coalesce(…, false)` en las dos funciones donde aparece, `_leads_candidatos_sql()` y `leads_candidatos()`. En la primera todos los usos eran seguros (`if`, `case`), pero un booleano que puede ser nulo no se deja.
2. **Quién ve qué no cambia:** el lead del número entra sólo si pasa `_lead_visible_para()` (cartera, o lo que ve quien ve «todos»), y sigue exigiendo las etiquetas y los `privados` cuando vienen; la papelera, el limbo y quien está en una baja en curso no entran. Lo prueba `busqueda-leads.sql` (un bloque nuevo: sin etiquetas, quién lo ve, el cursor y las filas enteras contra la consulta de siempre) y `privados-candidatos.sql` (el bloque del lead del número, que pasa a probarse con y sin etiqueta).
3. **El costo de 5a-10 no cambia:** la cláusula de `extra` sólo corre si el pedido trae `extra`; `privados()` de `medir-escala.sql` sigue en verde (sin presupuesto tocado).

**Contra HEAD cae:** el bloque nuevo de `busqueda-leads.sql` («f4 (propios): debía entrar sólo su lead por «extra»: {"ids": []…}»), el del lead del número de `privados-candidatos.sql` y cuatro de las cinco pruebas del e2e. **Mutación** (volver a la cláusula con NULL, revertida y verificada con `cmp`): caen las dos pruebas SQL y las cuatro del e2e en los dos proyectos; la quinta, el control sin oráculo, pasa en ambos estados.

**Asignaciones que decidió la persona (2026-10-22):** **5a-32** (el e2e de la baja en curso choca con el job `equipo-bajas`) va en el paso **4.04**; **5a-33** (el conteo del rol, tapado por la columna «Permiso» al 200 % en Roles) en el **4.28**; **5a-34** (el texto y el rango privados, los tachados ocultos y el conteo de la exportación) con 5a-9 en el prompt 3 del **4.03**. La partición pasa a **28 pasos y 62 prompts** (4.03 queda en 3).

**Consecuencia:** quien agregue una cláusula sobre una variable derivada de un `jsonb_typeof(…)` o de una clave que puede faltar la escribe con `coalesce(…, false)`: `not <nulo>` y `<nulo> or false` no son lo que parecen dentro de un `where`. Un filtro nuevo que se empuja a los candidatos prueba el lead del número con y sin él.

## 2026-10-22 — Paso 4.03, prompt 3 (5a-9 y 5a-34): el texto y el rango de un campo, y los ocultos y la exportación, por los candidatos

**Contexto:** el texto y el rango de un campo, público (5a-9) o privado (5a-34), se resolvían en `leads_vista` por PostgREST. Los públicos crecían con N (la dueña «todos», 198 ms con 212.000 leads); los privados pagaban `atributos_lead()` por lead (66 µs: 5.642 ms), y con ellos los tachados ocultos (290,5 ms) y el primer pedido del conteo de la exportación (5.638,7 ms). No se sube ningún presupuesto, quién ve qué no cambia y `database.types.ts` no tiene diff (ninguna tabla, policy ni función nueva en `public`). Se midió antes de elegir, por la ruta de la app (la vista con las condiciones que arma `condicionesDeLeads()`), con `EXPLAIN (ANALYZE, BUFFERS)` como `authenticated`, mediana de 5 de 7, `/proc/loadavg` en cada corrida, con 62.000 y 212.000 leads. Las cifras de «62.000 → 51 y 33 ms» que traía el encargo eran de HEAD, no del arreglo.

**5a-37 — la premisa era falsa** (`dde6f2d`): la primera corrida de `db:medir:volumen` tras sembrar fallaba en «Volumen 4999» (26,5 y 35,1 ms contra 25) y la segunda pasaba (16,9 y 9,7). La BITACORA lo atribuyó a la lista pendiente del GIN y lo «arregló» con vacuum, pero la siembra ya hacía `vacuum analyze` de `leads` y el vacuum no cambia nada (34,2 a 35,6 ms). Con 212.000: los mismos buffers (269 contra 288) y 4,3 contra 28,8 ms en el `Bitmap Index Scan` de `leads_busqueda_idx`: el GIN que deja la siembra masiva tiene otra estructura y la primera medición la reordena (una actualización revertida de 500 leads no la cambia; una de 3.000, sí). `scripts/sembrar-volumen.mjs` termina con `vacuum (analyze)` de las 15 tablas que siembra, `reindex index public.leads_busqueda_idx` y `analyze public.leads`. Con eso, dos siembras nuevas seguidas (212.000 y 62.000) pasan `db:medir:volumen` a la primera.

**5a-38 — un defecto previo del lead del número** (`5867109`, `…20261019004600`): desde `a34318f` (2026-10-18) un campo público filtrado va a la ventana y la página ya no lo repite, pero la cláusula de `extra` (escrita a mano en `leads_candidatos()`) no lo miraba; buscar «482» con «Ciudad = Sucre» traía el lead 482 de Oruro. Estuvo tapado por 5a-35 hasta `8b56d70`. La cláusula sale ahora de `_leads_candidatos_sql('extra', …)` con las mismas condiciones de la ventana (menos la del nombre). Cae contra HEAD por contenido: `busqueda-leads.sql` y el caso F de `leads-busqueda-numero-largo` en escritorio y celular.

**Decisión:**

1. **El texto de un campo pide 3 letras o dígitos seguidos** (`ad8cf7b`, `098f2ed`): `MinimoDeBusqueda` en el `DefFiltro` de tipo texto, `MINIMO_DEL_TEXTO_DE_UN_CAMPO` sólo en los filtros `texto` de leads (sin números libres: «12» es un fragmento del dato y no el número de un lead). El campo dice «Escribe al menos 3 letras» en una línea y no pide nada al servidor; `leerFiltros()` lo hace valer también con una URL escrita a mano, y una URL o una vista guardada vieja lo dice con el aviso de filtro descartado (motivo `texto_corto`, «Entendido»). La base lo ignora igual que el nombre (`[[:alnum:]]{3}`). Vehículos y el equipo no cambian.
2. **`leads_candidatos()` cumple el texto y el rango de un campo** (`6b42b56`, `…004700`, sólo `create or replace`): las claves `comparaciones` (sobre `atributos_publicos`) y `comparaciones_privadas` (sobre `atributos`, sólo de la cartera de quien llama, y fuerzan «míos» como `privados`). Cada elemento es `{tipo:'texto', clave, texto}`, `{tipo:'rango_numero', clave, min?, max?}` o `{tipo:'rango_texto', clave, desde?, antes_de?}`; un elemento mal formado se ignora sin lanzar nada y `_leads_candidatos_indexable` cuenta sólo los válidos. **El rango de número compara jsonb con jsonb** (`(col -> clave) >= 'n'::jsonb`, como PostgREST: un texto ordena antes que cualquier número), nunca `numeric`. Si no se juntan K candidatos, la etapa del índice con «míos» y una comparación va en una valla `with … as materialized`: sin ella el planificador caminaba `leads_listado_idx` entero.
3. **El tope que se dice** (elegido por la persona con la cifra medida: «Tope de 10.000 leads»): sólo para un campo **público** y sólo para quien ve «todos» (alcance `todos`, la comparación como única condición indexable). La ventana mira S = 4.000 leads y, si no junta candidatos, sigue hasta 2,5 × S = 10.000 y responde `acotada: true`, `recorridos` y `hasta`. La pantalla dice «Se buscó en 10.000 leads, hasta el …» con «Seguir buscando» (el cursor sigue desde `hasta`) y, sin filas, «Nada coincide hasta ahora» (no es «nada coincide»). `sin_tope` lo evita: la exportación lo pide y lee lo público de la vista. «Ir a una fecha» no existe en este listado y no se implementó.
4. **Los tachados ocultos y el conteo de la exportación, por las ventanas** (`…004800`): `tachados: true` en `leads_candidatos()` (sólo los que quien llama tachó, `exists` por `leads_tachados` en W y el índice por usuario en I, indexable). `cuentaPorCandidatos()` dice cuándo hay un campo privado; `contarPorCandidatos()` cuenta por cada ventana con `leads_vista_por_ids(ids)` hasta `tope + 1` y, pasadas `ventanasHasta(tope)` ventanas, devuelve nulo y se vuelve a la vista de siempre: nunca cuesta más que antes. Un campo público sigue por la vista.
5. **Lo asertado** (`medir-escala.sql`, seis personas, los mismos presupuestos con 62.000 y 212.000, sin fórmula por N): el texto y el rango público ≤ 50 ms y 45.000 buffers; el privado ≤ 100 ms y 40.000; los ocultos y el primer pedido de la exportación ≤ 100 ms y 40.000; el conteo entero de la exportación con un valor denso, 800 ms y 400.000 buffers; y lo que devuelve (todos cumplen el filtro y, si la respuesta es completa, son todos los de la cartera). Paridad de filas enteras con la consulta de siempre en `comparaciones-candidatos.sql` y `busqueda-volumen.sql`, y un contrato TS↔SQL con PGlite (`candidatos-contrato.test.ts`: lo que arma `condicionDeCampo()` contra lo que entiende la base).

**Antes → después, la dueña con 212.000 leads (con 62.000 entre paréntesis), ms y buffers:**

| Caso                                      | Antes                  | Después                           |
| ----------------------------------------- | ---------------------- | --------------------------------- |
| 1 texto público sin resultados, «todos»   | 198,2 y 172.692 (50,6) | **13,5 y 11.365** (13,8)          |
| 2 rango de número público, «todos»        | 104,4 y 172.692 (27,1) | 8,2 y 11.365 (8,5)                |
| 1 texto público sin resultados, «míos»    | 128,7 y 172.692 (32,7) | **29,7 y 40.291** (38,0 y 43.905) |
| 3 texto privado sin resultados            | 5.642,2 y 892.611      | **84,4 y 18.793** (29,3 y 16.881) |
| 3 rango de texto privado sin resultados   | 5.464,2 y 892.611      | 35,4 y 18.793 (14,9)              |
| 4 ocultos con un texto privado (hasta 51) | 290,5 y 52.021 (71,9)  | **10,8 y 9.981** (3,8)            |
| 5 exportación, 1.er pedido, texto privado | 5.638,7 y 892.611      | **84,6 y 18.793** (29,3)          |
| 5 exportación, 1.er pedido, `@>` privado  | 5.408,9 y 727.046      | 37,0 y 18.793 (15,7)              |
| 5 exportación, conteo entero, valor denso | —                      | 201,4 y 290.290 (239,8 y 298.994) |

**Lo que no mejoró, dicho:** (a) con 62.000 la dueña «míos» con un texto público sin resultados cuesta más (32,7 → 38,0 ms): la ruta nueva tiene un costo casi fijo (≈ 40.000 buffers) y la de antes crece con N; (b) un valor **denso** pasó de 22,1 a 29,7 ms (dueña «todos»), porque la ventana lee dos pasos; sigue ≤ 50 ms; (c) los ocultos de Berta, que no tiene tachados, pasaron de 0,2 a 0,7 ms; (d) el texto privado sin resultados de la dueña (84,4 ms) está al 84 % de su presupuesto, y el conteo entero de la exportación con un valor denso son 17 ventanas (201 ms): es un conteo que se hace una vez antes de exportar.

**Alternativas descartadas:** el **índice por clave** (btree y trigram sobre `->>`; DDL por clave y costo en cada `INSERT`, en la baja de 200.000 y en la importación), ya descartado en la apertura de la fase; un tope **sin aviso** (la pantalla diría «nada coincide» de un recorrido parcial); y enrutar la exportación por los candidatos con tope (una exportación quiere todo: `sin_tope`).

**Hallazgos de este paso:** (1) la guarda usaba «lp» (2 letras) como valor denso del texto; con el mínimo de 3 la base lo ignora y los candidatos no filtraban: el denso pasa a «cbba» (o «scz» de Berta) y quien tiene 3 leads no tiene uno; `busqueda-volumen.sql` también; (2) un `insert` en la tabla temporal de violaciones estando en el rol `authenticated` falla con «permission denied»: se hace `reset role` antes; (3) `authenticated` no lee `leads` directo: la guarda lee `leads_vista`.

**Qué se midió y cómo:** `db:reset` y `db:sembrar-volumen` (62.000 y `-- --leads 200000`); arnés propio con el preámbulo de `medir-escala.sql`; carga de 1,4 a 2,1 de 8 núcleos al empezar cada corrida. **Contra HEAD caen**, por contenido: el bloque 5a-38 de `busqueda-leads.sql` y su e2e, el mínimo (`leads-filtro-texto-minimo`), el tope (`leads-filtro-campo-tope`) y los unitarios de las ramas nuevas; sin `…004800` cae la guarda (los ocultos densos de Berta: 52.193 buffers contra 40.000 y las ventanas no alcanzan). **Mutaciones** (cada una revertida y verificada con `cmp`): `cuentaPorCandidatos` siempre falso, y en `contarPorCandidatos` pasar a la página todas las condiciones (no sólo las que repite), no avanzar el cursor, no cortar al pasar `tope` y no descontar lo ya contado al pedir a la página: cada una hace caer su unitario. `e2e/leads-filtro-campo-privado.spec.ts` (Berta filtra por un trozo de su cédula; los ocultos con un texto privado) **pasa también contra HEAD**: cuida el contrato, y una mutación de la página no lo hace caer porque la ventana ya trae sólo lo tachado; lo que lo sostiene es `conteo-de-leads.test.ts` y `comparaciones-candidatos.sql`. El e2e de las capturas «antes» (contra el código anterior): caen mínimo, tope y 5a-38 en los dos proyectos.

**Consecuencia:** migraciones `…20261019004600`, `…004700` y `…004800` (sin tabla, índice, policy ni función nueva en `public`; `db:base` y `database.types.ts` sin diff); `entities/candidatos.ts` (`ComparacionDeCampo`, `cuentaPorCandidatos`, `RecorridoAcotado`), `infra/queries/conteo-de-leads.ts`, `PedidoDeListado.sinTope`, `<AvisoDelRecorrido>`; el mínimo en `src/shared/lib/filtros` y `src/shared/ui/filtros`. **Quien agregue un filtro de leads sobre el texto o el rango de un campo** lo lleva a `comparaciones` o `comparaciones_privadas` de los candidatos, con su presupuesto en `medir-escala.sql`; un texto nuevo de un campo pide 3 letras.

## 2026-10-23 — Paso 4.04: dos e2e que no dependen del azar, la medición de la baja sin el cron, y 5a-11 sin arreglo

**Contexto:** tres pendientes con número (`docs/PLAN.md` › «Partición», 4.04). Dos son pruebas que fallaban por el azar de la corrida (5a-36, 5a-32); el tercero (5a-11) es la baja de 200.000, con su assert y su lugar.

**5a-36 — el global de F, fijo y como número propio.** Opciones: (a) sólo un límite de token en la regex, (b) sólo un global fijo de 7 dígitos, (c) asertar sobre el nodo. (c) pierde lo que se quiere probar: que el global no llegue **al HTML**, también a los datos que viajan sin dibujarse. (a) sola no basta: con el global real (de 1 a 3 dígitos según la corrida) un token como `11` sale igual en el HTML de producción (`--gray11`, los nombres de los chunks); sobre una base recién reseteada el F viejo caía siempre así (globales 4 y 11). Se eligieron (a) y (b) juntas: 8.123.457, por encima de los 212.000 de la base con volumen, buscado en bruto y escrito («8.123.457») sin ser parte de otro número ni de una fecha. Las demás comparaciones del HTML de los specs ya usan un global fijo de 7 dígitos o un texto propio.

**5a-32 — un lead tomado en vez de pausar el cron.** El PLAN proponía `cron.alter_job(…, active := false)` mientras el test simula. Se descartó: `cron.job` lo comparte toda la base, y con dos workers en paralelo pausar el job de uno cambia lo que ve el otro; si el test cae entre pausar y reactivar, el job queda pausado. Elegido: la baja en curso se simula como queda de verdad entre el primer lote y el último, con un lead suyo todavía en su cartera, que otra transacción tiene tomado (`retener()`, un `psql` abierto que hace `select … for update` y revierte al soltar). El lote lo salta (`skip locked`), `_baja_terminar()` no cierra mientras quede, y el test corre el job en medio a propósito: no depende de cuándo corre. Sin dependencias nuevas (`pg` no tiene tipos en el repo).

**`medir-bajas.sql` pausa el cron mientras mide.** La guarda simula las corridas del job una tras otra; el cron de verdad corría la misma baja a la vez (1,3–1,9 s por minuto), y el número de corridas variaba de 9 a 25. Una medición no es un test en paralelo: se pausa al empezar y se reactiva al final; si se corta, la próxima medición lo pausa y lo reactiva, y `db:reset` lo recrea.

**5a-11 — ninguna opción del lugar cumple sin empeorar la búsqueda: no se aplica nada.** Medido (`docs/RENDIMIENTO.md` › «Paso 4.04 (5a-11)»): el lote de 1.000 o 2.000 y `gin_pending_list_limit` no cambian el trabajo (15,2–16,5 s, 15,6 M buffers); el GIN sin la cartera cumple (9.953,8 ms, 7 corridas; con `fillfactor` 90, 9.303,3 y 6) pero rompe 41 aserciones de la búsqueda (lo ajeno vuelve al heap: Berta «Mamani», de 33 a 3.790 buffers). La causa no es la que decía el PLAN: el GIN no recibe claves en esta baja; lo que cuesta es que `cartera` esté indexada, y así ningún update de la cartera es HOT. Queda para la persona: una salida fuera del lugar del ítem o aceptar el número con la causa corregida.

**Consecuencia:** `e2e/leads-numeros-recorrido.spec.ts` (`GLOBAL_DE_CARLOS`, `comoNumero`), `e2e/soporte/sql.ts` (`retener`), `e2e/soporte/bajas.ts` (`bajaEnCurso`), `supabase/tests/medir-bajas.sql` (pausa el cron). **Quien escriba un e2e que simule un estado que un job cierra** lo deja en un estado que el job no puede cerrar (un lock retenido), no en uno que depende de cuándo corre el job.

## 2026-10-23 — Cierre del 4.04: 5a-11 se acepta con la causa corregida, y la guarda baja sus topes

**Contexto:** el paso 4.04 dejó 5a-11 medido y parado (ninguna opción del lugar cumplía sin romper la búsqueda). La persona decidió la opción A.

**Decidido (opción A):** se acepta el número medido, **9 corridas, 15.202,8 ms, la corrida más larga 1.867 ms**; la baja de 200.000 no se arregla ahora. La causa corregida es que `cartera` está indexada (ningún update de la cartera es HOT), no que el GIN reciba claves. Rechazadas, con sus cifras (`docs/RENDIMIENTO.md` › «Paso 4.04 (5a-11)»): el lote de 1.000 y de 2.000 (20 y 11 corridas, el mismo trabajo), `gin_pending_list_limit` 4 MB (igual que la base) y el GIN sin la cartera (cumple, 9.953,8 ms y 7 corridas, pero rompe 41 aserciones de la búsqueda). La opción de fondo queda registrada como **5a-40**, sin fase, para después del hito 4-A.

**La guarda baja topes, no sube ninguno:** `medir-bajas.sql` pasa de ≤ 60 corridas y ≤ 6.000 ms por corrida a **≤ 12 corridas, ≤ 20.000 ms el job entero y ≤ 3.000 ms la corrida más larga**: lo medido más margen (9 corridas, 15,2 s, 1,9 s). Antes, una regresión de bajar el lote a 1.000 (20 corridas, 15,4 s) pasaba; ahora cae. La llamada (≤ 4.000 ms) y la vista previa (≤ 300 ms) no cambian. **Riesgo aceptado y a la vista:** un fsync lento de 12 s en un checkpoint rompe esos topes sin que haya regresión (una corrida suelta lo hizo: 13 corridas, 28,2 s, 3,8 s); la regla es anotar la corrida y su carga, sin reintentar ni aflojar el número.

**Consecuencia:** `supabase/tests/medir-bajas.sql`. **Quien toque `_baja_lote_desde()`, `equipo_bajas_continuar()` o un índice de `leads` que nombre una columna que la baja cambia** corre la guarda con 212.000 leads y, si cambian las corridas o los ms, actualiza `docs/RENDIMIENTO.md` antes de tocar el tope.

## 2026-10-23 — Paso 4.05 (1 de 4): la forma ampliada del grafo del cotizador

**Contexto:** la forma de la Fase 0 (`buckets` sólo origen/destino, `sugerido_de` sólo en `input`) no expresaba lo que piden D4, D5 y D7.
Al leer se encontraron dos cosas:

- **la regla «un nodo con bucket entra a la suma de su bucket» contaba dos veces con el seed.** En `oficina` daba precio + descuento +
  total, y en `subasta_usa`, las filas más `origen_total`. Nunca se evaluó, porque no había motor;
- `validar_formula()` vive en `supabase/migrations/20261011000600_rpc_cotizaciones.sql`, no mira `buckets`, `sugerido_de`,
  `requerido_si` ni `match`, y su `id = any(ids)` es cuadrático. Lo amplía 4.05-4 con el mismo juego.

Un agente revisó el plan en contra y la persona lo aprobó con cuatro ajustes. La forma final está en `docs/COTIZADOR.md` («Forma» y «Las
reglas»). Cada decisión se probó en el papel con las cifras de `docs/referencias/excel-de-cotizacion.md` y
`docs/referencias/cotizador-actual.md`.

**Decisión:**

- **a) Grupos:** una lista arriba, `grupos: [{id, etiqueta, plazo?, tono, bucket}]`, y el nodo dice `grupo: id`.
  - El grupo no es un nodo. Su subtotal es la suma de sus miembros; en Bs, por el tipo de cambio de su bucket.
  - La moto da 11.232, 2.580 y 3.098 (N14, N17, N20).
  - El defecto `O17` del Excel no se puede escribir.
  - **Doble conteo:** un miembro sólo lee lo que acumula otro miembro como base de un `porcentaje_de`. Fees y transferencia pasan.
- **b) N tipos de cambio:** `buckets` mapea nombres libres a nodos `tipo_cambio`; el grupo nombra su bucket; `total_en` es el tipo de
  cambio que divide el total en Bs, y con grupos es obligatorio.
  - **El modo llega al motor con la misma forma** (`{buckets, total_en}`): otro mapa, no otra cuenta.
  - Moto: 168.263,54 ÷ 10 = 16.826,354. Captura 02: 28.667,68 ÷ 12,2 = 2.349,8. Captura 09: 875.418,08 ÷ 12 = 72.951,5.
  - **Sin grupos** (el seed), el total se reparte: con bucket, total × tc; si no, un `suma` cuyos términos llevan bucket.
- **c) Sugerido:** `sobrescribible: true` en `tabla`, `tramo` y `calculo`. El valor calculado es el sugerido, y `input.sugerido_de` sigue
  valiendo.
  - `fuentes` = `default | sugerido | override | input`, y `sugerido` reemplaza a `lookup`.
  - En el papel: la nacionalización sugerida es 20.159,29 y el Excel tipea 21.792 (`override`).
- **d) El par porcentaje-monto:** un `porcentaje_de` sobrescribible y su `pct`. **Manda el monto si tiene override**; si no, el %.
  - Cuando manda el monto, `valores[pct]` = monto ÷ base (null si la base es 0), y nadie más lee ese `pct`.
  - Fees tipeado 1.300 sobre 9.500 = 13,68 %, y sigue en 1.300 si cambia el remate.
- **e) Variante:** a lo sumo un `opcion`, antes de todo `solo_en`. Una pasada: el nodo de otra variante vale 0 sin leer sus
  referencias.
  - EE. UU.–Chile da 20.157,6, sin la nacionalización.
  - El `opcion` vale su clave. Lo nombran `solo_en` y un `match` (la comisión por variante), nunca un cálculo.
- **f)** Las filas congeladas van en `params.tablas` (D5), y las constantes siguen planas; ninguna se llama `tablas`. `condicion` se
  admite en todo nodo de valor (el interruptor «habilita» de D7).

**Alternativas descartadas:**

- **a)** El grupo como nodo con `de`: mezcla presentación con valores y deja un nodo en dos grupos.
- **b)**
  - El grupo con su tipo de cambio directo y el modo que sustituye claves: no separa dos grupos al oficial.
  - Leer el seed como «cada bucket suma lo que ninguna suma del mismo bucket incluye»: cuenta dos veces a través de otro bucket.
- **c)** Sólo `input.sugerido_de` hacia un nodo oculto: dos nodos por concepto.
- **d)** Que mande siempre el %: con base 0 no se escribe un monto, y un monto fijo se mueve solo.
- **e)** Enmascarar al final: lo que dependía del nodo ya usó su valor.
- **f)** `params: {constantes, tablas}`: deja de valer el `params` del seed. La regla «tabla congelada sin uso» va con quien congela
  (4.23).

**Consecuencia:**

- `entities/` tiene `nodos.ts`, `formula.ts` y `validar.ts` (con `validar-contexto`, `validar-grupos`, `validar-variante`,
  `motivos-de-formula` y `medidor`).
- **`casos-de-formula.json` es el contrato con la base:** 48 casos, cada inválido rompe una sola regla, y 29 mutaciones lo confirman.
- **Lo pendiente:**
  - el comentario de `cotizaciones.fuentes` en `schemas/` todavía dice `lookup`: lo corrige quien toque esa tabla (4.05-4 o 4.10);
  - la base lee el JSON del lado del cliente (psql o `probar-schema.mjs`): lo decide 4.05-4.

## 2026-10-23 — Paso 4.05 (2 de 4): el motor del cotizador y sus faltantes

**Contexto:** el 4.05-1 dejó la forma del grafo y su validador, pero nada evaluaba una fórmula. El motor TS es el que el 4.06 copia en
la base con paridad bit a bit, así que cada regla de cálculo se fija acá con un caso. Al leer se encontraron dos cosas:

- **`miembro_no_es_monto` dejaba pasar una bandera, un tipo de cambio, un campo del vehículo o la variante** como miembros de un grupo:
  sin `formato`, `formatoDe()` da `usd`. El motor los habría sumado al subtotal.
- **La semilla `subasta_usa` lleva un `sugerido_de`** (`fob_tabla`), y el prompt dejaba `sugerido_de` para el prompt 3: lanzar siempre
  dejaba la semilla sin cuentas a mano.

La persona aprobó el plan con dos elecciones (`sugerido_de` sólo sin tipear; cuatro casos para el validador). La forma final está en
`docs/COTIZADOR.md` › «El motor».

**Decisión:**

- **g) Un miembro de un grupo tiene que dar un monto por su tipo** (`daMonto()`: `input`, `constante`, `tabla`, `tramo` y `calculo`),
  además de su formato. Es el mismo código de regla. Lleva cuatro casos, uno por cada tipo que no da un monto, porque con dos
  sobrevivía la mutación que deja pasar los otros dos. 4.05-4 lo copia en `validar_formula()`.
- **h) Lo que falta es un valor, no un error:**
  - un input sin tipear vale 0 (la celda vacía del Excel), y una bandera sin valor, apagada;
  - todo lo demás que falta deja el nodo en null, que se propaga, con un código estable en `faltantes` donde nace (siete códigos,
    `CODIGOS_DE_FALTANTE`);
  - una `condicion` apagada vale 0 sin leer nada, así que ahí el null no se propaga.
- **i) Los errores de llamada lanzan `ErrorDelMotor`:** un modo que no corresponde, una entrada con claves de otro tipo, una fórmula
  sin validar y un rasgo pendiente. Es la excepción a «los errores como valores» de CLAUDE.md, y su razón es que no los produce una
  persona: los modos los valida el diseño al publicar (4.08), la entrada la arma el código y el rasgo pendiente es temporal. Lo que sí
  produce una persona viaja como valor, en `faltantes`.
- **j) `sugerido_de` lanza sólo si el input llega sin tipear:** con valor tipeado, el número es lo tipeado y no depende del rasgo. Así
  la semilla `subasta_usa` se evalúa tal cual. `opcion`, `solo_en`, `sobrescribible` y `requerido_si` lanzan siempre, hasta el prompt 3.
- **k) La aritmética es la de float8, de izquierda a derecha en el orden de la lista**, con un caso que lo fija bit a bit por cada
  operación (suma(0,1; 0,2; 0,3) = 0,6000000000000001). −0 se guarda como 0 y lo no finito como null con `fuera_de_rango`: JSON y jsonb
  no guardan ninguno de los dos.
- **l) `redondear` es `round(x::float8::numeric, n)::float8` exacto:** 15 cifras con mitad al par, como el cast de Postgres, y después
  mitad lejos de cero. Se calcula con BigInt sobre el valor exacto del doble, porque `toExponential(14)` sube en un empate y glibc va al
  par (100000000,0078125 con n = 6).
- **m) Las tablas:**
  - manda la congelada aunque esté vacía (D5), y si no está, la viva;
  - gana la primera fila que coincide, con igualdad estricta, como jsonb;
  - un `tramo` incluye sus dos extremos y no tiene extremos abiertos;
  - **`depreciar` = d0 × el `tramo` de su tabla:** tiene los campos de un tramo y la depreciación del Excel son rangos;
  - si faltan varios campos de un `match`, el faltante nombra el menor, porque jsonb no guarda el orden de las claves.
- **n) Sin `total_en` y sin modo** (la forma de la Fase 0), el total en USD es la suma de los dólares: no hay nada que divida.
- **o) El juego del motor es un archivo de datos**, `casos-del-motor.json` (48 casos, hechos a mano), para que el 4.06 lo lea igual
  que `casos-de-formula.json`.

**Alternativas descartadas:**

- **h)** Que un input vacío sea null: una cotización a medio llenar no tendría total, y el Excel suma la celda vacía como 0. Lanzar ante
  cualquier dato que falta: la hoja no podría mostrar lo que sí se sabe.
- **i)** Devolver `{ok: false}` también para los errores de llamada: obliga a quien llama a manejar un caso que sólo produce un bug.
- **j)** Lanzar siempre con `sugerido_de`: la semilla no se podía probar. Implementarlo ya: le quita el rasgo al prompt 3.
- **l)** `Math.round(x · 10ⁿ) / 10ⁿ`: da 1,00 para 1,005 y −2 para −2,5. `toExponential(14)`: difiere de Postgres en los empates.
- **m)** `depreciar` como un `match` exacto por año: no tiene `match`, y obliga a una fila por año.
- **n)** USD null sin `total_en`: la tarjeta de `oficina` no tendría total.

**Consecuencia:**

- `entities/` suma `motor.ts`, con `motor-contexto`, `motor-entrada`, `motor-errores`, `motor-nodos`, `motor-calculo`, `motor-tablas`,
  `motor-totales` y `redondeo`, y el juego `casos-del-motor.json`.
- `index.ts` todavía no lo exporta: lo necesitará el editor de la fórmula.
- **Para el 4.06** (`docs/COTIZADOR.md` › «Lo que el 4.06 tiene que copiar»): sumar con un bucle en el orden de la lista, redondear con
  `round(numeric)`, la primera fila por `orden`, comparar como jsonb y guardar −0 como 0.
- **Para el prompt 3:** quitar cada rasgo pendiente con su implementación, y llenar `fuentes`. El Excel entero y «Amnistia» pasan a
  tener cifras.

## 2026-10-23 — Paso 4.05 (3 de 4): la variante, lo sobrescribible y las fuentes del motor

**Contexto:** el motor del 4.05-2 lanzaba `rasgo_pendiente` ante `opcion`, `solo_en`, `sobrescribible`, `requerido_si` y un `sugerido_de`
sin tipear, y devolvía `fuentes` vacío: el Excel entero y «Amnistia» no tenían cifras. Un agente revisó el plan en contra, corriendo
`validarFormula` sobre cada fórmula de prueba, y encontró dos huecos del validador. La persona eligió dos cosas (`override` para el input
tipeado con `sugerido_de`; el sugerido no se calcula con override). Al agregar los casos del Excel apareció un error del 4.05-2. La forma
final está en `docs/COTIZADOR.md` › «El motor».

**Decisión:**

- **p) La entrada suma `variante?` y `overrides`.**
  - Sin `variante` vale la `por_defecto`. Sin las dos («Amnistia»), una clave que la opción no tiene, o una clave con una fórmula sin
    variante: `entrada_invalida`.
  - `overrides` va por id de nodo y es obligatorio, como `inputs`.
- **q) Una pasada previa decide el estado de cada nodo:** primero la variante, después la condición, y una bandera fuera de su
  variante está apagada.
  - La misma pasada marca los grupos que se dibujan y los pct pisados.
  - Un inactivo vale 0 sin leer nada.
  - Un grupo que no se dibuja no lee su tipo de cambio, y un término del reparto fuera de la variante tampoco: EE. UU.–Chile no
    necesita el oficial.
  - `estados` va completo y en el orden de la lista.
- **r) Overrides (la persona):** override > sugerido, y **un nodo con override no calcula su sugerido**.
  - Se aplican a una constante (captura 05: «En esta cotización»), a un tipo de cambio y a lo sobrescribible.
  - El que no se aplica va a `overrides_descartados` con su motivo, en este orden: `nodo_inexistente`, `fuera_de_variante`,
    `condicion_apagada`, `no_sobrescribible`.
  - Los inexistentes van al final, ordenados por id: jsonb no guarda el orden de las claves de la entrada.
- **s) El tipo de cambio de la persona va en `overrides`,** por el id del nodo, y el de la empresa sigue en `tipos_cambio`: ↺ vuelve sin
  buscarlo. ≤ 0 es sin valor, como el de la empresa.
- **t) El par:** con override del monto, el pct está «pisado»: no se calcula ni aplica su override, y vale monto ÷ base.
  - Con la base en 0, null con `division_por_cero` en el pct.
  - Con los dos overrides manda el monto y el del pct no se descarta: releer una cotización guardada con el monto mandando trae los dos.
- **u) `sugerido_de` (la persona):** tipeado lleva `override`, porque había un sugerido y ↺ vuelve a él. Así lo decían COTIZADOR.md y el
  GLOSARIO; el prompt decía `input`.
- **v) `requerido_si` encendida y sin tipear deja el input en null** con el código nuevo `requerido_sin_valor`, y el total queda null.
  Un sugerido no lo cumple: «requerido» es que la persona lo escriba.
- **w) `fuentes` sólo de los nodos activos que aceptan un valor** (`aceptaValor()`: input, constante, tipo de cambio y lo
  sobrescribible).
- **x) Los dos huecos del validador, en commits aparte:**
  - `total_no_es_monto` (regla nueva, 29): el total no puede ser la variante, que es un texto, ni otro tipo que no dé un monto;
  - `par_mal_tipado`: el pct de un par tiene que dar un monto y aceptar un valor. Un tipo de cambio reescrito cambiaría el Bs, y una tabla
    sin `sobrescribible` ganaría una fuente.
- **y) El USD de un grupo con un miembro null es null.** Desde el 4.05-2 salía 0: `subtotal ?? 0` volvía 0 el null. Lo encontró la
  gasolina del Excel sin overrides y va en su propio `fix`.

**Alternativas descartadas:**

- **p)** Sin clave, la primera opción: una regla implícita que el 4.06 tendría que copiar, y la hoja no la necesita, porque los chips
  siempre tienen una elegida.
- **q)** Decidir el estado al pasar por cada nodo: el pct pisado se evalúa antes que su par, y para no calcularlo hay que saber antes
  si el par está activo y trae override.
- **r)**
  - Calcular el sugerido igual y devolverlo en `sugeridos`: sus faltantes ensuciarían un valor que no es null. Si la hoja quiere mostrar
    «Sugerido: X» junto al modificado, se suma con su caso.
  - Que un override que no se aplica lance: una cotización que pasa a la N+1 trae overrides de la N.
  - Unificar con `inputs` y `banderas`, que siguen lanzando ante una clave de otro tipo: son la forma de la hoja, una clave por celda de
    la versión que se evalúa, y los arma el código. Quien pase una cotización a la N+1 (4.10) los filtra.
- **s)** El override del tipo de cambio en `tipos_cambio`: el motor no sabría que es un override, y ↺ no tendría a dónde volver.
- **t)** Calcular el pct y reescribirlo al llegar al par: su faltante (una tabla sin fila) quedaría en un nodo que ya vale un número, y
  con la base en 0 anotaría dos.
- **u)** `input`: la hoja no ofrecería ↺ en ese input.
- **x)** Reusar `total_fijo` para el total que no da un monto: dice otra cosa, y el editor necesita el motivo exacto.

**Consecuencia:**

- `entities/` suma `motor-estados.ts` y `motor-sobrescribir.ts`, `aceptaValor()` en `nodos.ts` y `ordenar()` en `medidor.ts`.
  `rasgo_pendiente` y `revisarRasgos` desaparecen.
- **`casos-del-motor.json` pasa a 84 casos,** con `estados` (los inactivos), `fuentes` (enteras), `overrides_descartados` y `se_dibuja`.
  Están el Excel entero con sus cifras de celda y «Amnistia».
- **Para 4.05-4:** `validar_formula()` copia `total_no_es_monto` y el pct del par. **Para 4.06:** «Lo que el 4.06 tiene que copiar».

## 2026-10-23 — Paso 4.05 (4 de 4): `validar_formula()` en la base, espejo exacto de `validar.ts`

**Contexto:** la función de la base había quedado atrás de `validar.ts`. No miraba `buckets`, `grupos`, `total_en`, `match`, la
variante ni lo sobrescribible, sólo admitía dos buckets, no tenía códigos y era cuadrática. El 4.06 copia el motor en SQL apoyado
en este candado. Un agente revisó el plan en contra, con `tsx` sobre los Zod reales y en PGlite, y encontró cuatro problemas:

- el orden de la variante estaba invertido;
- `->>` y los NULL dejaban pasar tipos que Zod rechaza;
- un cast a float8 rechazaba `1e-400`, que Zod acepta;
- cuatro mutantes no se portaban como los de TS.

**Decisión:**

- **z) Dónde vive el cambio:** las RPC van en `migrations/`, a mano, y una migración commiteada no se edita (2026-10-15). Por eso
  la función va en una migración nueva, `…004900`. Los comentarios de `schemas/` (`lookup` → `sugerido`) van con `db:base`.
- **aa) El rechazo:** `22023`, con la regla en DETAIL y `donde` en HINT. Ninguna RPC usaba DETAIL y la app no lee `details`, así
  que es un lugar libre. PostgREST lo devuelve y `db:probar` lo lee con `get stacked diagnostics`.
- **ab) El orden de las claves es el de jsonb (la persona).** Con dos errores en el mismo `params`, `buckets` o `match`, TS (orden
  de inserción) y la base (largo en bytes y después bytes) podían nombrar otro primer rechazo. Aceptar o rechazar coincide siempre.
  El corpus se guarda en orden jsonb y `validar.ts` no cambia.
- **ac) Cada rechazo es `perform public._formula_rechazar('<regla literal>', …)`** y cada comprobación de la forma lleva `/*Fnn*/`.
  Así una mutación apaga una regla o una comprobación por texto, igual que `if (0) return fallo('x'` en TS.
  - Para que el mutante se porte como el de TS, el mapa de ids guarda la última posición (`pos.set`), los grupos se cuentan por
    id (`Map`), la variante es la última `opcion` vista y una posición nula es `undefined`.
- **ad) STABLE, no IMMUTABLE** (`…005100`, con `alter function`). Los mensajes salen de `format()` y `||`, que son STABLE, y una
  función IMMUTABLE con argumentos constantes se evalúa al planificar. `db:lint` (plpgsql_check planifica sin ejecutar) saltaba el
  rechazo de `grupos_sin_total_en`. `…004900` ya estaba commiteada.
- **ae) El corpus diferencial** son 544 mutaciones deterministas (mulberry32, semilla 20261023) de las 4 válidas, guardadas enteras
  en `supabase/tests/corpus-de-formula.json` (2,8 MB, un caso por línea, en `.prettierignore`).
  - Los mutadores van por sección del SQL, uno por cada comprobación de la forma.
  - El test exige ≥ 400 casos, cada regla primera en ≥ 5, ≥ 200 mezclas y ≥ 15 válidas.
- **af) «Sugerido: X» junto al modificado: no se hace** (es **4-1** en `docs/PLAN.md`).
  - `docs/UX.md` (tarea de oro 2) y la captura 09 muestran el modificado con anillo y ↺, sin el sugerido.
  - El `defaultValue` del binding es de constantes y tipos de cambio, que no salen del motor.
  - ↺ quita el override y la base recalcula.
  - Calcularlo costaría buscar la tabla que el override ahorra y ensuciaría los faltantes (r), sería otro canal que
    `cotizacion_evaluar` tendría que recortar por nivel, y el 4.06 tendría que copiarlo.

**Alternativas descartadas:**

- **z)** Editar `…000600` (ya commiteada), o poner la función en `schemas/` (no trackea RPC ni grants).
- **aa)** El código como prefijo del mensaje (se mostraría tal cual), o en CONSTRAINT (PostgREST no lo devuelve).
- **ab)** Que `validarFormula` reordene las claves como jsonb antes de validar: toca `validar.ts` y no alcanza, porque JS siempre pone
  primero las claves que parecen enteros.
- **ac)** Redefinir el ayudante para apagar una regla: no es lo mismo que borrar el sitio, si el chequeo de una regla tiene más de un
  sitio o cae en una pasada por conjuntos.
- **ad)** Redefinir los cuerpos en `…005100` para limpiar también los avisos cosméticos de `db:lint`: serían 800 líneas repetidas.
  Quedan 32 avisos en las funciones nuevas: variables de bucle redeclaradas (20), sin usar (8) y bigint a int (4). Son de la misma
  clase que los que ya había, y `--fail-on error` pasa.
- **ae)** Guardar sólo parches (`jsonb_set`, `#-`) sobre las bases: el archivo pesaría 100 KB, pero haría falta un aplicador en SQL y
  otro en TS que podrían no coincidir.

**Consecuencia:**

- Los 61 casos y los 544 del corpus dan la misma regla y el mismo `donde` en PGlite y en Postgres 17. La base nunca acepta lo que Zod
  rechaza.
- Queda una divergencia declarada, en la dirección segura: Zod descarta `__proto__` en un record y la base lo rechaza.
- `pnpm db:medir` mide 200 y 2.000 nodos (8,4 y 78,4 ms; 0 buffers).
- El 4.06 lee `casos-del-motor.json` y reusa el patrón: `pg_temp.paridad`, los datos que pasa el cliente en una tabla temporal y
  las mutaciones por texto.

## 2026-10-23 — Paso 4.06 (1 de 2): `evaluar_formula()` en la base, espejo exacto de `evaluar()`

**Contexto:** D7 manda que la hoja calcule en la base para todos. `cotizacion_evaluar()` (4.06-2) necesita antes una función pura que
sea `evaluar()` en SQL. Un agente revisó el plan en contra, con `tsx` sobre el motor real, PGlite y lecturas en el Postgres 17
local, y encontró:

- **un jsonb que llega de una columna comprimida se descomprime entero en cada `->`:** con 1.000 filas congeladas, 86 ms contra
  0,7, y la medición con literales no lo ve;
- **∞ × 0 es NaN,** y un `asentar` que sólo mire el infinito lo deja pasar;
- **dos puntos de `formula_sin_validar` de más:** el motor lanza también cuando el total es la variante, y hay lecturas que no hace y
  la base no puede hacer (un input tipeado no lee su `sugerido_de`);
- **el corpus de `JSON.stringify` no puede escribir** `0.10000000000000001`, `2024.0` ni `1e-400`, que son justo donde la base y JS
  podían diferir;
- **varias mutaciones quedarían vivas** si el corpus sólo mutara la entrada: el `match` de dos campos, el orden de los bytes, el pct
  pisado con un nodo entre medio, y las tablas congeladas, que son casi todas las del juego.

Las mutaciones encontraron además lo que la revisión no vio: los casos de texto del `match` no probaban el `match` (un nodo `kf`
tapaba el campo del vehículo `kf`), y la guarda de escala no mordía a quien lee `p_params` en la pasada.

**Decisión:**

- **ag) La firma son las dos columnas** (la persona): `evaluar_formula(p_def, p_params, p_entrada, p_modo default null)`, como
  `validar_formula(p_def, p_params)`. `cotizacion_evaluar()` las pasa sin armar un objeto. No revalida la fórmula.
- **ah) La base revisa la forma de la entrada y del modo** (la persona), como `esquemaEntrada` y `esquemaModoDeCambio`: el HINT es el
  primer campo que falla en el orden del Zod. La base no confía en quien llama.
- **ai) El `match` y el tramo comparan como float8** (la persona): un número con un número, un texto con un texto. Se corrige la
  frase de `COTIZADOR.md` («comparar el `match` como jsonb»): jsonb compara el decimal exacto.
- **aj) Una clave `__proto__` en un record de la entrada se rechaza** (la persona), más estricta que Zod, que la descarta. Es el
  **4-2** de `docs/PLAN.md`, que ya cubre la fórmula (en `params` la base responde `param_sin_constante`, no `forma`).
- **ak) El desborde se atrapa sólo en el borde.** Postgres lanza 22003 donde IEEE da ±∞ o ±0. Cuatro ayudantes `language sql stable`
  sin `set` ni `strict` se inlinean en la función y usan la cuenta de Postgres cuando los operandos son seguros; sólo en el borde un
  ayudante plpgsql atrapa el error y devuelve lo de IEEE. El revisor lo comprobó contra JS con 20.000 pares por cuatro operaciones en PGlite y 12.000 operaciones en Postgres 17; el corpus guarda 5.632.
- **al) Los argumentos se desarman una vez al entrar,** y una guarda de texto en `evaluar-formula.sql` exige que la pasada no nombre
  `p_def`, `p_params`, `p_entrada` ni `p_modo`. La guarda con datos (argumentos comprimidos ≤ 1,5 × los literales) muerde a releer
  `p_def` (×2,4), pero no a leer las constantes de `p_params`: las búsquedas de 1.000 filas tapan el costo. Por eso las dos.
- **am) `set extra_float_digits = 3`** en la definición: con la sesión en 0, `float8out` da 15 cifras y jsonb pierde el último bit
  (0,1 + 0,2). Hay una prueba con la sesión en 0.
- **an) El resultado mezcla objetos y arreglos a propósito.** jsonb no guarda el orden de las claves: `valores`, `estados`,
  `fuentes` y los grupos son objetos, y su orden sale de `definicion`. `faltantes` y `overrides_descartados` son arreglos porque su
  orden es contrato.
- **ao) Sólo los puntos alcanzables de `formula_sin_validar`.** Se copian los que el motor lanza (también el total que es la
  variante). No se copian cuatro que otro chequeo vuelve inalcanzables, y se quita el `leer` del reparto: `totalesDe` ya leyó el
  total, y los demás términos son los `de` del total, que su `sumar` ya leyó. Una guarda que ninguna entrada puede tocar no es una
  guarda.
- **ap) Una mutación equivalente se demuestra,** no se declara. De las 12 que sobreviven: la conmutatividad de `+` y `*`, y el
  signo del infinito y del cero se prueban con la aritmética contra JS (5.632 operaciones) y el redondeo contra `redondeo.ts` (731);
  el resto, con la forma estricta de Zod, que no admite lo que la mutación supone (un `solo_en` en un tipo de cambio, una
  `condicion` en una bandera). Cada una lleva su razón en la tabla de `docs/BITACORA.md`, y si una muriera sería una alarma.
- **aq) La sintética del motor es un archivo nuevo,** `entities/evaluacion-sintetica.ts`, y no una función de `formula-sintetica.ts`
  (que es del validador). Es la de `motor-escala.test.ts` hecha paramétrica (filas, tablas, vivas o congeladas); ese test no se toca.
- **ar) Tres commits, no cuatro.** El hook de pre-commit corre `db:probar` entero cuando hay SQL, y la prueba de la función lee el
  corpus: la función, su juego y su corpus no se pueden separar sin dejar un commit en rojo. Van juntos; después la escala, y los docs.

**Alternativas descartadas:**

- **ag)** `evaluar_formula(formula jsonb, …)` con `{definicion, params}`: cada llamada armaría el objeto.
- **ah)** Dejar la forma al prompt 2: una entrada mala daría un 22003 o un error de jsonb sin DETAIL.
- **ak)** Un bloque `begin … exception` por operación (0,39 µs contra 0,14 en Postgres 17, y 2,8 contra 0,6 en PGlite), o emular IEEE con
  `numeric`: el camino común pagaría siempre por un borde que casi nadie toca.
- **al)** Pasar los arreglos de estado a funciones ayudantes para repartir el código: un arreglo que se pasa a otra función se copia
  entero (O(n) por llamada).
- **an)** Todo objeto (pierde el orden de los faltantes) o todo arreglo (obliga a `cotizacion_evaluar()` a buscar por id).
- **ao)** Mantener el `leer` del reparto como defensa: la mutación que lo apaga sobrevive, y un chequeo inalcanzable engaña a quien lo lee.

**Consecuencia:**

- Los 84 casos y los 775 del corpus dan el mismo resultado, igual hasta el último bit, en PGlite y en Postgres 17. La aritmética de
  los ayudantes y el redondeo también.
- Las 312 mutaciones: 300 muertas y 12 equivalentes con su razón (`docs/BITACORA.md`).
- `pnpm db:medir`: 5,1 ms con 200 nodos y 43,7 con 2.000 (×8,5, 0 buffers); con 4 tablas de 1.000 filas, 28 ms vivas y 16 congeladas.
- El prompt 2 hereda: armar `entrada.tablas` con el orden de `tablas_referencia_filas` (`orden` admite repetidos: un desempate
  estable), pasar `definicion` y `params` sin copiarlos, y que las tablas vivas pesan: el 28 contra 16 ms es la revisión de la forma.

## 2026-10-23 — Paso 4.06 (2 de 2): `cotizacion_evaluar()` sobre `evaluar_formula()` y su assert de tiempo

**Contexto:** D7 manda que la hoja calcule en la base para todos. `evaluar_formula()` (4.06-1) es pura: las tablas vivas, los tipos de
cambio y el vehículo llegan en la entrada. Falta quien los arme desde la base a partir de una cotización o de un origen, sin leer las
cotizaciones, y que cueste lo que dice el plan. Al leer el esquema y el seed salió esto:

- **`tablas_referencia_filas` no tenía ningún índice,** ni `(tabla_id, orden)` ni el de su FK;
- **la fórmula del seed nombra campos del vehículo sin prefijo** (`tipo_vehiculo`, `ubicacion`: claves de `origenes_campos`, guardadas
  en `vehiculos.atributos`), y `docs/COTIZADOR.md` decía `atributos.*`;
- **`vehiculos.anio` va de 1900 a 2100** y la sintética con 1.000 filas pide el año 2999;
- **`tipos_cambio.valor` es `numeric(18,6)`:** un tipo de cambio con más de 6 decimales no se puede sembrar.

**Decisión** (las cuatro primeras, a la persona con su recomendación; rigió la recomendación en las cuatro):

- **as) Sin `execute` para `authenticated` hasta el 4.10.** Devuelve el resultado entero y todavía no hay `formulas.visibilidad` (4.08)
  ni niveles (4.09): `revoke execute … from public, anon, authenticated` en las dos funciones. Las pruebas se lo dan dentro de una
  transacción que se revierte, y `cotizacion-evaluar.sql` asserta que hoy no lo tiene ni `authenticated`, ni `anon`, ni PUBLIC.
- **at) Una función con cotización u origen,** `cotizacion_evaluar(p_entradas, p_cotizacion, p_origen, p_vehiculo, p_modo)`, con
  exactamente uno de los dos, y un ayudante `_cotizacion_armar()` que hace todas las comprobaciones y las lecturas. El ayudante existe
  para medir ARMAR y EVALUAR por separado y para que la guarda de escala apunte a él.
- **au) Los tipos de cambio de una cotización son los congelados en ella,** como su fórmula es la suya: no se completan con los vigentes
  (el que falta es un `tipo_de_cambio_sin_valor`). Con un origen, los activos de la empresa.
- **av) Un campo del vehículo es una columna o la clave de un campo del origen.** Una columna de `anio`, `marca`, `modelo`,
  `kilometraje` o `precio` o, si no, un campo activo del origen del vehículo (`atributos -> clave`). `atributos.x` no es un nombre: una
  clave de campo no lleva puntos. Se corrige `COTIZADOR.md`. Que `validar_formula()` rechace un `campo` con punto es del 4.07 (**4-3**).
- **aw) El vehículo se lee sólo si quien llama lo ve** (`puede_vehiculo`), también el de su cotización: si no, 42501. La función corre
  con los derechos de la base y no puede devolver lo que quien llama no vería; de él sólo salen los campos que la fórmula nombra. Un
  vehículo en la papelera hace fallar la evaluación de sus cotizaciones: lo resuelve el 4.10 cuando decida qué ve quien no ve el vehículo.
- **ax) «La primera fila» es la de menor `orden` y, con el `orden` repetido, la de menor `id`,** y el índice nuevo
  `tablas_referencia_filas_tabla_orden_idx (tabla_id, orden, id)` la sirve ordenada. Completo y no parcial, para que lo use también el
  `on delete cascade`.
- **ay) Un dato del vehículo que no cabe no rompe la hoja.** Un booleano, una lista, un texto de más de 200 letras y un número que no
  cabe en un doble no llegan, y la fórmula anota `campo_sin_valor`. `evaluar()` los rechazaría como entrada inválida; acá la entrada la
  arma la base y el dato lo cargó otra persona.
- **az) Que no crece con las cotizaciones se asserta en bloques de `cotizaciones`,** no en buffers totales. Con `pg_stat_get_xact_blocks_fetched`
  sobre su heap, sus índices y su TOAST: **0** por origen, y por cotización a lo sumo dos búsquedas por clave con el índice que haya
  (6 con 50.000 y 8 con 250.000: el índice pasó de 2 a 3 niveles). Los buffers totales incluyen las tablas de permisos y el autovacuum
  las encoge a mitad de una corrida: en una misma corrida, 138 y 178 buffers para la misma llamada, y 249 y 460 (con 66 de ARMAR) en
  otra. Van como dato.
- **ba) La guarda de escala sale de lo que las tablas nombradas ocupan,** no de una constante: las páginas de sus filas (por `ctid`), la
  bajada y las hojas del índice, y el costo fijo de armar medido en ese momento (el de la fórmula del seed), con un 20 % de margen. Dos
  copias de la función de verdad con un cambio, creadas en `pg_temp` desde `pg_get_functiondef`, tienen que pasarse: una lee todas las
  tablas del origen (1.033 buffers) y otra las filas de todos los orígenes con esa clave (13.006), contra un tope de 359. Si el texto de la
  función cambia y la mutación ya no aplica, la guarda falla.
- **bb) La sintética de la medición es la del corpus con `anioInicial`,** una opción de `evaluacionSintetica()` (2000 por defecto: las
  demás no cambian ni un byte). Con 1100 el último año es 2099 y el vehículo cabe en `vehiculos.anio`.
- **bc) Tres commits:** la función con su índice y su prueba de paridad (el hook corre `db:probar` entero con SQL), la medición con su
  sintética, y estos docs.

**Alternativas descartadas:**

- **as)** Dar el `execute` ya: cualquiera con `cotizaciones.crear` vería todos los nodos, también los que el 4.09 va a esconder.
- **at)** Dos funciones públicas (`cotizacion_evaluar` y `cotizacion_evaluar_origen`): dos grants y dos filas en el inventario del 4.10.
- **au)** Los vigentes: recalcular una cotización vieja cambiaría su total sin que nadie lo pida.
- **av)** Aceptar las dos formas (con y sin `atributos.`): dos nombres para lo mismo; o sólo `atributos.x`: `tipo_vehiculo` y `ubicacion`
  del seed darían siempre `campo_sin_valor` y habría que tocar `seed.sql`.
- **az)** Buffers totales idénticos con 50.000 y con 250.000: la prueba cae por el autovacuum de otra tabla.
- **ba)** Una constante de 60 buffers para «lo demás»: el costo fijo mide 129 a 195 según cuán encogidas estén las tablas de permisos.
- **Regex de un campo (`^[a-z][a-z0-9_]*$`) antes de buscar en `origenes_campos`:** la mutación que la apaga sobrevivía, porque la
  restricción de `origenes_campos.clave` ya excluye los puntos. Era código muerto: se quitó.

**Consecuencia:**

- Paridad: 82 de los 84 casos del juego y 603 de los 775 del corpus dan **exactamente** lo de `evaluar_formula()` (462 resultados y 223
  errores de llamada); los demás se saltan por un motivo contado.
- **31 mutaciones** de la función caen contra esa prueba. Dos vivas pidieron: un caso con una persona bloqueada (`assert_activo` no
  lo tapaba `puede_cotizacion`) y quitar el regex de los campos.
- Medido con 50.000 y 250.000 cotizaciones (`db:medir:volumen`): la fórmula del seed, una mediana de 2,5 ms y un p95 de 2,8 (topes 10 y
  20); la sintética de 200 nodos con 4 tablas vivas de 1.000 filas, un p95 de 36 ms (tope 50), con ARMAR 7,4 ms y EVALUAR 27,4. El p95
  con 250.000 es 1,0 veces el de 50.000. Ningún tope se subió.
- El seed sigue sin filas de `transporte_por_ruta` (lo arregla el 4.08): la medición siembra las suyas en una transacción que se revierte.

## 2026-10-23 — Paso 4.07 (1 de 2): el compilador de fórmulas como texto y el cierre de 4-2

**Contexto:** D4 (2026-10-22) promete que quien configura escribe `=(remate+fees)*4%` o `=SUMA(aduana)` y que eso se compila, al configurar, a
nodos del mismo grafo, validados por `validar.ts` y `validar_formula()`. Antes había que cerrar **4-2**: Zod descarta en silencio una clave
`__proto__` (comprobado con la versión 4.6.5: `z.record` y `.catchall` la sacan, `z.unknown()` la deja), la base la rechaza, y el compilador
arma `params` y `match` desde lo que escribe una persona. El prompt trajo la decisión de `HOY()` ya tomada por la persona.

**Decisión** (las demás, con su recomendación: rigió la recomendación en todas):

- **bd) La gramática mínima** es: números con punto decimal, `%` como sufijo de un número, `+ - * /`, paréntesis, nombres y cinco funciones que el
  grafo ya tiene: `SUMA(grupo)`, `SI(bandera; x)`, `REDONDEAR(x; n)`, `PORCENTAJE_DE(x; pct)` y `DEPRECIAR(x; tabla; sobre; columna)`.
  - **Los argumentos se separan con `;`** (como el Excel en español); la coma es un error propio (`coma`).
  - **No hay `MULTIPLICAR`, `RESTAR` ni `DIVIDIR`** (para eso están los operadores), ni los nodos que no calculan (`input`, `tabla`, `tramo`,
    `campo_vehiculo`…: son filas del editor), ni referencias A1.
  - **El menos sólo se pega a un número** (`-5`, `a - -5`): el grafo no tiene negación, y delante de un nombre o un paréntesis es
    `operador_suelto`. Para restar, `0 - nombre`.
- **be) Un nombre es el id de un nodo,** distinguiendo mayúsculas de minúsculas, y nunca su etiqueta: la etiqueta se repite y se renombra, y
  el texto guardado se rompería. Así no hay colisiones que resolver. Un grupo se nombra sólo dentro de `SUMA`. Los nombres de función no
  distinguen mayúsculas.
- **bf) Los auxiliares se llaman `<fila>__<n>` y `n` cuenta en post-orden** (hijos de izquierda a derecha y después el padre). La fila que se
  compila es la raíz y no se numera. Un nombre solo es un `suma` de uno; un número solo, una `constante`. Si el id no entra en 41, se recorta
  el prefijo; si ya existe (un nodo, un posterior o una clave de `params`), es `auxiliar_ocupado` y se señala el fragmento. La numeración es
  una pasada final y no la de la reducción, porque al aplanar `a+b+3` el `3` entra a un `suma` creado antes que él. El mismo texto y el mismo
  contexto dan siempre los mismos ids.
- **bg) Un literal es una `constante` con su entrada en `params`,** de formato `pct` si se escribió con `%` o se usó donde va un porcentaje, y
  `raw` si no. **`N%` corre el punto en el texto** (`0.1%` se lee como `0.1e-2`): dividir el doble entre 100 daría otro doble. En un `*`
  nunca nace un `porcentaje_de`: sólo sale de `PORCENTAJE_DE`.
- **bh) El aplanado es el del motor.** `a+b+c`, `a-b-c` y `a*b*c` son UN nodo, en el orden del texto, porque el motor dobla de izquierda a
  derecha. Un paréntesis, una función o un cambio de operación lo cortan (`a+(b+c)` y `(a+b)+c` son dos sumas), y `/` nunca se aplana. Es
  exacto bit a bit: un resultado intermedio que no es finito no se recupera dentro de una cadena de `+`, `-` o `*`. `PORCENTAJE_DE` pone una
  cadena `+` sin paréntesis directo en `de` (Σde × pct es lo mismo).
- **bi) `HOY()` no se soporta** (la persona). Código propio, `hoy_no_soportado`, en el tramo del nombre. Anotado como **4-4** en
  `docs/PLAN.md` y **enmienda a D4**: donde D4 nombra `HOY()`, léase «no soportado hasta 4-4». Una fórmula que depende de la fecha daría otro
  total al recalcular una cotización vieja, y el grafo no tiene un nodo de fecha.
- **bj) 4-2 se cierra en `validar.ts`, para `params` y para un `match`,** con la misma regla y el mismo `donde` que la base, que no cambia:
  un `__proto__` en un `match` es `forma` del nodo; en `params`, `param_sin_constante` si su valor es un número y `forma` si no. Un nodo roto
  antes del `match` (por Zod) va primero, como en la base. `buckets`, `tablas` y una fila quedan como divergencia declarada: el compilador no
  los arma.
- **bk) Nada recursivo sobre el texto, y topes que cuentan.** Un parser de dos pilas con una pila de marcos, y una emisión en post-orden con
  pila explícita: ni 10.000 paréntesis ni un árbol de 30.000 niveles sin paréntesis revientan la pila. Hasta 64 paréntesis anidados
  (`demasiado_profundo` en el 65.º, como el límite de anidación del Excel) y hasta 100.000 términos, contando lo que expande un `SUMA`
  (`demasiados_terminos`). Un error léxico se lee de a un token, junto al parser, para que se nombre el primero del texto.
- **bl) Un total no puede ser un `SI`.** `SI(…)` en la fila del total lo rechaza `validarFormula()` (`total_fijo`: un total no lleva
  condición). No lo prohíbe el compilador: lo juzga el validador, que ve la fila entera, y el editor (4.21) lo mostrará en la fila.
- **bm) Los casos compilados entran al juego compartido como válidos** (doce, `compilada: …`), de modo que `validar_formula()` los compara
  sola en `pnpm db:probar`. Los regenera `compilador-casos-de-formula.test.ts` (y exige que el JSON sea igual), y el corpus de
  `validar_formula()` no los usa de base: no cambia ni un byte.
- **bn) Nivel 2.** Se tocó `supabase/tests` (el conteo del juego de `validar-formula.sql`, 61 → 79, y el filtro de `corpus-de-formula.test.ts`),
  no `supabase/migrations` ni `schemas`. Los seis disparadores de `.claude/rules/e2e.md` no lo cuentan, pero el prompt lo pidió.

**Alternativas descartadas:**

- **be)** La etiqueta normalizada como nombre: se repite entre filas, se renombra, y exige decidir una colisión. Un alias por fila: más
  superficie que guardar.
- **bf)** Numerar al reducir (pre-orden o en el orden de creación): los ids cambian cuando un número se aplana en un nodo anterior.
- **bg)** `N/100` en dobles: `7/100` no es el doble más cercano a `0.07`. Una constante por cada literal repetido: el mismo texto daría un
  grafo distinto según lo que haya antes.
- **bh)** Aplanar a través de un paréntesis o de `SUMA(g)`: `a+(b+c)` y `a+b+c` dan sumas distintas en dobles, y el prompt lo pide.
- **bi)** Un nodo `fecha_cotizacion` congelado: es la salida de 4-4, pero hoy no hay una fórmula real que lo pida.
- **bk)** Un parser recursivo con un límite de profundidad bajo: cubre los paréntesis pero no una cadena `a-b+c-d…` de miles de operadores, que
  sin paréntesis arma un árbol igual de profundo.
- **bl)** Que el compilador rechace un `SI` en la raíz: duplicaría la regla `total_fijo` y se desincronizaría.

**Consecuencia:**

- **28 códigos de error,** cada uno con un caso de posición exacta en `casos-del-compilador.json` (153 casos a mano), salvo `demasiados_terminos`,
  que va con un texto de 100.002 términos.
- **Propiedades:** 2.500 expresiones al azar con semilla fija dan, compiladas y evaluadas con `evaluar()`, lo mismo bit a bit que el cálculo
  directo en JS (un resultado que no es finito es null, −0 es 0, dividir por 0 es null), y todas validan; además 0,1+0,2+0,3 y su orden contrario,
  `0*-1`, `1/(1e308*10)` y `1e-300`, y 7.500 textos al azar o con un carácter cambiado que nunca lanzan.
- **Escala:** de 2,8 a 22 visitas por unidad de tamaño; diez veces más texto son entre 9,5 y 10,0 veces más visitas (`k = 70`, contada por
  pasadas). Una búsqueda lineal por nombre y una copia de los términos en cada término caen contra esa cota.
- **Mutaciones por texto del compilador:** **159, todas caen** (tabla en `docs/BITACORA.md`). La primera pasada, de 187, dejó 34 vivas: 15 eran ramas inalcanzables que repetían un código de error (ahora cada código inalcanzable se escribe en un ayudante, `faltaUnValor()` y compañía, que usa también el camino alcanzable), 4 eran código redundante que se quitó (un `Math.max`, una guarda de id vacío, un `s.length > 0` y una rama de `numero_fuera_de_rango` tras un `%`) y 15 pidieron un caso (el tramo de una cadena, un nombre que no es el primer token de `SUMA`, el tope de términos exacto, `1E3`, exponentes enormes, ids de 41 y 42 letras, `600%` donde va un entero, tres falsas celdas A1, entre otros). En la segunda, dos dudosas (`SUMA` con los miembros al revés y `PORCENTAJE_DE` sin marcar el literal) cayeron al repetirlas solas: el hook de Stop había corrido la suite entera mientras un archivo estaba mutado.
- **Lo que no se hizo (es del prompt 2):** guardar el texto en la fórmula, `validar_formula()` y **4-3** (un `campo` con punto), el editor y la
  interfaz, exportar el compilador desde `index.ts`.

## 2026-10-24 — Paso 4.07 (2 de 2): 4-3, el texto de la fila, el literal que no cabe y la salida por index

**Contexto:** el prompt 1 dejó `compilarExpresion()` hecho y con cuatro cabos antes del editor (4.21): un `campo` con punto que valida y nunca
calcula (4-3), el texto fuente sin lugar donde vivir, un literal que se redondea a 0 y se acepta, y el compilador sin salir por `index.ts`.
La persona recomendó rechazar 4-3 y dejó el resto a la decisión del plan.

**Decisión** (rigió la recomendación de la persona en 4-3; en lo demás, la mía):

- **bo) 4-3 se rechaza, con una regla nueva: `campo_con_punto`,** la 30.ª y la última del orden, con `donde` = el id del nodo. Un `campo` es una
  columna directa del vehículo o la clave de un campo del origen (`origenes_campos.clave` no lleva puntos). Alcanza al `campo` de un
  `campo_vehiculo` y a los valores de un `match` que no son un nodo (con punto no pueden serlo: un id no lleva puntos, así que no se mira
  cuáles lo son). **El Zod sigue aceptando el patrón con puntos**: si lo rechazara saldría como `forma` y no habría mensaje propio.
  - Hizo falta una migración que **redefine `validar_formula()` entera** (`…005400`, y `…004900` no se edita): la copia tiene que decir **STABLE**,
    o deshace `…005100`. `validar-formula.sql` lo comprueba para las siete funciones.
  - Cuatro fixtures usaban un campo con punto y se corrigieron: `atributos.fees` del juego (rompía `par_mal_tipado` y la regla nueva a la vez),
    `atributos.cilindrada` de `casos-del-motor.json` (el motor valida toda fórmula), `a.b` del caso de orden de bytes (pasó a `a0`, que
    conserva la propiedad) y el vehículo de `cotizacion-evaluar.sql`, que ahora valida con la clave sin punto y guarda la del punto para seguir
    probando que `_cotizacion_armar()` no la lee.
- **bp) El texto va en la fila: `texto?` en `constante` y `calculo`,** de 1 a 2.000 caracteres (`MAXIMO_DE_TEXTO` en `nodos.ts`; `/*F70*/` y
  `…005500` en la base, que redefine `_formula_forma_nodo()` entera, STABLE). Son las dos raíces que emite el compilador; en otro tipo de nodo
  es una clave de más (`forma`). Se cuenta en caracteres, como `char_length` y como Zod 4.6.5 (comprobado: 80 emojis pasan `max(80)` y 81 no),
  así que no abre una diferencia entre TS y la base. Va dentro de `definicion`, y D7 lo cubre solo (viaja sólo con `cotizaciones.configurar`).
  **`compilarExpresion()` no lo lee ni lo escribe:** la fila que guarda el editor es `{ ...raíz compilada, texto }`. Así el compilador sigue
  aceptando 100.000 caracteres en las pruebas de escala y el tope vive en un solo sitio. El motor lo ignora.
- **bq) Un literal que se redondea a 0 es `numero_fuera_de_rango`,** también el que lo hace al correr el punto del `%` (`1e-323%`) y el que
  llevaba un exponente enorme y negativo (`1e-999999999`, que valía 0). Una mantisa de puros ceros es 0 con el exponente que sea, y se
  detecta mirando los dígitos: `Number(mantisa) === 0` también daba cierto para `0.` con 400 ceros y un 1. El tramo del error con `%` incluye
  el signo y el `%`. **Los ceros a la izquierda se aceptan** (`00` es 0, `01` es 1, `007.50` es 7,5): la gramática no tiene octales y el Excel
  hace lo mismo.
  - **Un borde que ya existía y queda documentado:** el número tal como se escribe tiene que caber solo, antes del `%`. `1e309%` no cabe aunque
    valga 1e307. Arreglarlo exige mirar adelante antes de empujar el número; nadie escribe eso.
- **br) El compilador sale por `index.ts`** con `CODIGOS_DE_COMPILACION`, `MAXIMO_DE_TEXTO` (el editor lo necesita para el tope del campo) y los
  tipos. Todo es puro y de `entities/`. Si el editor es un Client Component, saldrá también por `client.ts` en el 4.21.
- **bs) Cifras del corpus.** `APLICACIONES_POR_MUTADOR` pasa de 5 a 6, y el piso de fórmulas válidas se queda en 15 (había 14 con la regla
  nueva, y 26 con el texto). En HEAD el mínimo de 5 primeros rechazos por regla estaba justo en 5 para `pct_compartido`: cualquier mutador
  nuevo movía el azar y lo dejaba en 4. Los casos `texto: …` a mano no son bases del corpus.
- **bt) Nivel 2:** se tocaron dos migraciones (`…005400`, `…005500`) y `supabase/tests`, pero ni policies ni el esquema base. Los seis
  disparadores de `.claude/rules/e2e.md` no lo cuentan; lo pidió el prompt.
- **bu) 4-5 queda anotado para el 4.21:** el ⚙ de una constante auxiliar (`total__2` = 4%) publica la N+1 con otro valor y deja viejo el texto
  de su fila.

**Alternativas descartadas:**

- **bo)** Resolver el prefijo (`atributos.x` → el campo del origen): un caso nuevo en `_cotizacion_armar()`, en la entrada del motor y en la
  paridad, para algo que nadie pide.
- **bp)** El texto en una tabla aparte o en `formulas.textos` por id de fila: otra lectura y otra fila que mantener en sincronía; el texto
  de una fila es del grafo. Dentro del compilador: lo ataría al tope y a la gramática.
- **bq)** Aceptar `1e-400` como 0 y avisar: el caso que la persona no ve es el que cuesta (un porcentaje que no cobra).

**Consecuencia:**

- **30 reglas cruzadas;** el juego pasa de 79 a 87 casos y el corpus de 544 a 623; `casos-del-compilador.json`, de 163 a 178.
- **Mutaciones: 62** (12 de TS y 12 de SQL de `campo_con_punto`, 9 de TS y 14 de SQL del `texto`, 12 del literal y 3 de `index.ts`, más 4 de tipos
  que caen en `typecheck`): 61 caen y una es equivalente (el sufijo de `/*F70*/` sólo va al mensaje, que no es contrato). Tabla en `docs/BITACORA.md`.
- **Un test nuevo de escala:** todo `for…of` de los validadores pasa por `recorrer()`. Sin él, quitar el medidor de un bucle nuevo no lo
  vería nadie.
- **Lo que no se hizo:** el editor y la interfaz (4.21), `HOY()` (4-4), el borde de `1e309%`, ni `next upgrade`.

## 2026-10-24 — Paso 4.07 (remiendo, prompt 3): el mínimo del `texto` y su mensaje

**Contexto:** la persona contrastó `…005500` y vio que `between 2 and 2000` no tumbaba ninguna prueba. Ningún `texto` aceptado tenía
menos de 2 caracteres: `texto_valido` escribía `=<id>` y el más corto del juego era `compilada: -5`. Lo mismo `.min(2)` en `deTexto`.

**Decisión:**

- **bv) Un mutador por largo, no un largo al azar.** `texto_de_1`, `_2` y `_3` (el id recortado) son mutadores cruzados como `texto_valido`:
  cada uno se aplica solo 6 veces, así que cada largo queda en casos válidos sin depender de la semilla. Un test lo exige.
- **bw) El mensaje de `forma` con su ruta es contrato para el `texto`.** La «equivalente» del 4.07-2 (`/*F70*/` devuelve `.id`) no lo
  era: la ruta va al mensaje, y TS la da en `campo` para que el editor marque el campo. Un bloque de `validar-formula.sql` exige el mensaje
  de los cuatro rechazos de `texto` del juego.
- **bx) Equivalentes, sólo demostradas:** `length` por `char_length` (las dos son `textlen` en `pg_proc`) y `is not true` por `is false`
  en `/*F70*/` (la condición nunca es nula: `jsonb_typeof` de una clave presente no lo es, y si es `string`, `->>` tampoco).
- **by) 4-6 para el 4.21:** `compilarExpresion` no mira `MAXIMO_DE_TEXTO`; el editor corta el texto largo antes de guardar.

**Alternativas descartadas:**

- **bv)** Elegir el largo con el azar dentro de `texto_valido`: con 6 aplicaciones, un largo puede no salir, y el test pasaría a depender de
  la semilla.
- **bw)** Guardar `campo` en cada caso del juego y compararlo en la paridad: cambia el formato de los 90 casos y del corpus para un hueco
  que sólo tiene el `texto`.

**Consecuencia:** el juego pasa de 87 a 90 casos y el corpus de 623 a 641 (de 26 a 45 válidas). Mutaciones del `texto`: 19 de SQL y 13
de TS, 30 caen y 2 equivalentes demostradas. Tabla en `docs/BITACORA.md`.

## 2026-10-24 — Paso 4.08 (1 de 3): el modelo del diseño de la hoja y su validación

**Contexto:** D7 manda que la hoja se dibuje desde un diseño declarativo (`formulas.diseno`). Antes de la columna, los tonos y la compilación a
`visibilidad` (prompts 2 y 3) y de los niveles (4.09), hace falta el candado: el Zod de `entities/diseno.ts` con `validarDiseno()` y su espejo
`validar_diseno()` en la base, que rechazan lo mismo con el mismo código y el mismo `donde`. La plantilla es 4.05-4 (`validar_formula()`).
Un agente revisó el plan en contra con el código delante y la persona lo aprobó; sus hallazgos verificados (la variante sin chips, el par partido
en dos celdas, los modos sin `total_en`, el orden exacto, «todos» y la medición del TOAST) están abajo.

**Decisión:**

- **bz) El contexto entra como tres listas, no como tablas:** `validarDiseno(definicion, diseno, { niveles, retirados, tonos })` y
  `validar_diseno(def, diseno, niveles[], retirados[], tonos[])`. Así no dependen de tablas que no existen (los niveles son del 4.09, los tonos del
  prompt 2). **Los retirados van aparte** porque el ⚙ y la N+1 de una tabla (D5) republican el diseño sin cambiarlo y pasan `retirados` vacío: D7 dice
  que lo que ya usa un nivel retirado se sigue filtrando igual, y si no el ⚙ quedaría bloqueado. **«todos» siempre existe y nunca se retira.** La
  definición llega ya validada por `validarFormula()` y la función no la revalida. Un arreglo nulo es vacío.
- **ca) Sin registros:** toda colección es un arreglo con su clave adentro (`modos[].clave`, `buckets[].bucket`). Un `__proto__` sólo puede ser una
  clave desconocida de un objeto estricto (`forma`, igual en Zod 4.6.5 y en la base: lo vi en `schemas.js`), y el orden de las claves de jsonb no
  cambia ningún resultado. La divergencia declarada de `validar_formula()` no se repite. Una guarda de `pnpm test` prohíbe `z.record` en el diseño.
- **cb) «Aparecer una vez»:** dibujan el valor de un nodo una celda, el `pct` de una celda con `secundario`, un subtotal, la variante y un interruptor;
  entre todas, a lo sumo una vez. **Los atajos no dibujan el valor** (van sobre la celda de su nodo, con sus mismos niveles) y **la tarjeta repite** el
  total y sus secundarios, así que ninguno cuenta.
- **cc) El diseño no lleva `solo_en`:** lo que cambia con la variante lo dice el nodo, y `validar_formula()` ya asegura que nombre opciones que
  existen. Un `solo_en` de sección duplicaría eso y podría esconder un input que la variante activa necesita. COTIZADOR se corrige ahí.
- **cd) El interruptor actúa sobre los nodos que su bandera condiciona** (`condicionDe()`; el motor apaga sólo por `condicion`, `motor-estados.ts`):
  «habilita» los deshabilita con su motivo, «muestra» no los dibuja. «Habilita» cuenta además los inputs que la piden en `requerido_si`. Una bandera
  que sólo se lee como número no admite interruptor. La fórmula de las capturas lleva `mostrar_garantia` y `garantia.condicion = mostrar_garantia`.
- **ce) Un modo es otro `buckets`:** nombra nodos `tipo_cambio`, llena exactamente los buckets de la fórmula y **no existe en una fórmula sin `total_en`**
  (las dos del seed): con un modo el total pasaría de la suma de los dólares a Bs ÷ tc, y «un modo es otro mapa, no otra cuenta». Pasarlo al
  `ModoDeCambio` del motor es cambiar una lista por un registro (4.10 o 4.13), no traducirlo.
- **cf) El par es una sola celda:** la celda de un `porcentaje_de` sobrescribible lleva `secundario` (`par_sin_secundario`); en dos celdas, el % que se
  tipea mientras manda el monto se pisa (`motor-estados.ts`). La regla vale para todo `porcentaje_de` con secundario, no sólo los sobrescribibles
  (el IVA «14,94 % · $181»), y se llama `secundario_sin_porcentaje`.
- **cg) La hoja tiene que poder cotizar:** todo input y constante tiene su celda, **la variante tiene sus chips** (sin `por_defecto` el motor falla en
  cada cálculo y con una no se podría cambiar) y **una bandera que condiciona algo o pide un dato tiene su interruptor**. El total, lo que va `aparte` y
  la variante no se restringen a un nivel (`nivel_no_admitido`): la base siempre manda el total (D7) y la variante titula el PDF, que sólo lleva lo
  de «todos».
- **ch) El `donde` de `forma` es el id (crudo, si es un texto) de la sección donde está el primer error de Zod,** y ninguno en la cabecera, la
  tarjeta o la raíz. Zod recorre cabecera, secciones y tarjeta, con las claves desconocidas al final de cada objeto; la base lo copia. Un id `""`
  da `donde ""`, que la paridad escribe `forma@` en los dos lados.
- **ci) Lo que no se valida:** que `ayuda.tabla` y `atajos.columna` existan (viven fuera de la fórmula), qué opciones de la variante dan chip, que una
  salida `aparte` esté en la tarjeta (la base la manda igual) y un `nivel_ver` restringido con `nivel_editar` abierto (lo fija el 4.09). _(Enmendado en el 4.09-1: se rechaza, `editar_sin_ver`; ver «Paso 4.09 (1 de 2)», dk.)_
- **cj) La medición lee el diseño de una columna `storage external`:** un jsonb que llega como puntero TOAST se vuelve a leer entero en cada `->`, y
  en una columna fuera de línea y sin comprimir eso se ve en buffers (265 y 1.665), no sólo en ms. Es un sustituto: `formulas.diseno` irá comprimida,
  y ahí lo que se relee se paga en ms (la tercera medición, contra los literales: 1,0 veces). Dos copias malas en el mismo archivo tienen que caer.
- **ck) Largos en caracteres** (`char_length`; Zod 4 cuenta puntos de código): 80 emojis pasan un título y 81 no. `filas` se lee como JS
  (`z.int()`): `1.0` y `0.99999999999999999` valen 1.

**Alternativas descartadas:**

- **bz)** Pasar las tablas (`cotizaciones_niveles`, `tonos`) a `validar_diseno()`: no existen todavía y ataría este prompt a los dos siguientes.
  Una sola lista «no retirados»: el ⚙ quedaría bloqueado por un nivel retirado.
- **ca)** `modos` como registro `{clave: …}`: cada colección pasa a tener una clave que es un dato, y con ella el `__proto__` y el orden de jsonb.
- **cc)** Un `solo_en` por sección: duplica la fórmula y pide otra regla.
- **cd)** Un campo del interruptor que apunte a la garantía: la `condicion` ya la apaga, y dos fuentes de verdad dirían cosas distintas.
- **cg)** Exigir que lo `aparte` esté en la tarjeta: es una preferencia, no algo que rompa al dibujarse.

**Consecuencia:**

- **27 reglas cruzadas y la forma** (`entities/motivos-de-diseno.ts`), en `entities/validar-diseno*.ts` y en `…20261019005600_validar_diseno.sql`
  (`validar_diseno()` y cinco ayudantes `_diseno_*`, STABLE, invoker, `search_path` vacío). Sin tabla ni columna: `database.types.ts` gana las seis funciones.
- **El juego** `entities/casos-de-diseno.json` (225 casos: 33 válidos, uno por regla, los de forma y los de orden) y **el corpus**
  `supabase/tests/corpus-de-diseno.json` (784 casos, 74 válidos, 105 mutadores). `pnpm db:probar` compara regla y `donde`.
- **Mutaciones: 319** (132 de TS y 187 de SQL), con 11 equivalentes demostradas. Tabla en `docs/BITACORA.md`. Cuatro cosas salieron de las vivas de la
  primera pasada y están en el juego: los atajos con `nivel_editar`, los atajos sobre un tramo, los atajos sobre el porcentaje que muestra una celda y
  un tono que no se llama como su grupo; y la cabecera que es un texto, que en la base daba un error de jsonb en vez de `forma`.
- **Escala:** 206 y 2.018 ítems en 4,8 y 44,3 ms (razón 9,3), 0 buffers con literales; `docs/RENDIMIENTO.md`. `scripts/medir-listado.mjs` pasa su lista
  de mediciones a `scripts/mediciones.mjs` (tenía 302 líneas).
- **Para el prompt 2:** el publicar llama a `validar_formula()` y después a `validar_diseno()` con los niveles, los retirados y los tonos de sus tablas;
  **borrar un tono (o un nivel) en uso tiene que estar prohibido**, o el ⚙ cae en `tono_inexistente`; y `formulas.diseno` fija su almacenamiento.
- **Lo que no se hizo:** la columna, los tonos, la compilación a `visibilidad`, la semilla, los niveles (4.09), el editor (4.22), `next upgrade` ni empujar.

## 2026-10-24 — Paso 4.08 (2 de 3): el diseño en la fórmula, su visibilidad y el catálogo de tonos

**Contexto:** el 4.08-1 dejó el candado del diseño sin dónde guardarlo. Este prompt lo conecta: `formulas.diseno` viaja con el borrador y se publica con la
fórmula; publicar valida con `validar_diseno()` y compila `formulas.visibilidad`; nace el catálogo de tonos; y un tono o un nivel que una versión nombra no se
elimina. Un agente revisó el plan en contra con el código delante y la persona lo aprobó. Lo que cambió respecto del pedido está en cr, cs, ct y cu.

**Decisión:**

- **cl) Los niveles que existen salen de `_niveles_de_cotizacion()`,** un único punto (hoy `{costos}`, sin retirados; «todos» no figura) que llama
  `_publicar_formula()`. Las pruebas y la medición lo leen o lo reemplazan en su transacción. El 4.09 cambia sólo su cuerpo (lee `cotizaciones_niveles`).
- **cm) `formula_guardar_borrador(origen, def, params, diseno, nota?)`:** se borra la firma de cuatro parámetros (un `create or replace` con uno más es una
  sobrecarga), `p_diseno` no tiene default y nulo quiere decir «todavía no hay». Guarda la fórmula validada y sólo la **forma** del diseño. Toda copia de una
  versión lleva el diseño (el ⚙ pasa `v_pub.diseno`); revertir y la N+1 de una tabla, cuando existan, también. «Desactualizada» (D2) y D5 lo cuentan solos: un cambio
  de diseño publica la N+1. Todavía sin `p_actualizado_en_esperado` (excepción de `.claude/rules/migraciones.md`, hasta el 4.20: PLAN 4-8).
- **cn) `visibilidad` guarda claves de nivel, no permisos,** y se compila sólo al publicar (la regla, en COTIZADOR › «En la base (4.08-2)»): lo dibujado con su
  nivel efectivo, el `pct` de un par con los de su celda, el total y lo `aparte` con `ver: todos` siempre, y lo que no se dibuja sin editar. El borrador la
  tiene nula: no está validado contra su fórmula y ninguna cotización lee un borrador.
- **co) Los modos de tipo de cambio no dejan nada de este prompt:** el diseño los declara, `validar_diseno()` los valida y `cotizaciones.modo_tc` ya es una
  columna (guardará la clave del modo; el 4.10 la valida contra la cabecera de su versión). Para el prompt 3: que `tipos_cambio` tenga las claves que
  usan los nodos de las fórmulas sembradas (`unificado`, `aduana`).
- **cp) Los tonos los gobierna `cotizaciones.configurar` sin origen:** el catálogo es de la empresa y sólo cambia nombres y colores. Sin permiso nuevo no hay
  siembra ni concesión; sólo `aplicado_en` suma `tono_*`.
- **cq) El AA vive en la base** (`_color_contraste()` y `_contraste_aa()`, copia de `color.ts`): no hay interfaz ni action que lo valide antes, así que la RPC es el
  único camino y el candado es SQL. Para que no haya dos reglas, un corpus que genera TS (360 pares, 46 a menos de 0,01 del umbral) y una prueba que compara
  la razón y la decisión, y el texto del rechazo trunca la razón (4,46 dice «4,4:1»). La tinta sobre el fondo, en cada tema; el borde sólo es un `#rrggbb`.
- **cr) El tono lo nombran los grupos de la fórmula,** no el diseño (el pedido decía «un diseño de cualquier versión»). `_tono_en_uso()` mira
  `definicion.grupos[].tono` de toda versión; la plantilla (4.18, H5) se suma al mismo punto.
- **cs) Tope, eliminar y retirar.** Tope de 24 tonos en `_tonos_tope()`. Eliminar sólo si ninguna versión (borrador, publicada o archivada) lo nombra,
  por un GIN angosto sobre `jsonb_path_query_array(...)`, no sobre el JSON entero. Los tonos no se retiran (cambiar sus colores es la forma de cambiarlos, y
  retirar pediría una regla `tono_retirado` en los dos validadores). `_nivel_en_uso()` hace lo mismo con el diseño de toda versión y **enmienda D7**: allí un nivel
  está en uso si lo nombra la `visibilidad`; el borrador no la tiene, así que cuenta el diseño, que la incluye.
- **ct) Publicar exige el diseño.** Sin `visibilidad` el 4.10 tendría que inventar qué viaja (todo filtra los costos; nada deja la hoja vacía). Las dos
  publicadas del seed quedan sin diseño hasta el prompt 3, así que su ⚙ falla con ese motivo; nadie lo llama. El `check` espera a que la semilla lo cumpla.
- **cu) `formulas` sólo la lee quien la configura** (el pedido lo daba por hecho; la policy era `true`), y la auditoría deja de copiar la fórmula entera a
  `actividad`, que lee quien tiene `actividad.ver` sin filtro por origen. Sin lo segundo, cerrar lo primero era cosmético.
- **cv) Candados.** Publicar toma el borrador `for update` y los tonos de sus grupos `for key share` (no los 100 ni la lista de 24); `tono_eliminar` toma
  la tabla (`share row exclusive`, que no choca con el anterior), su fila y recién mira el uso. O se publica y el tono no se elimina, o se elimina y publicar
  da `tono_inexistente`. Dos publicar a la vez: el segundo da PT409 o «No hay borrador», y nunca reescribe la versión. `scripts/carreras/tonos.mjs` lo prueba
  en los dos órdenes.

**Alternativas descartadas:**

- **cl)** Que el cliente mande los niveles (se publicaría con uno inventado); crear `cotizaciones_niveles` (es del 4.09); derivarlos de `permisos` (no hay
  `cotizaciones.nivel.*`, y crearlos sin su filtro rompe «sin enforcement no hay permiso»); la lista a mano en publicar, en el ⚙ y en las pruebas.
- **cm)** Un parámetro con default (una sobrecarga o un borrado silencioso); validar el diseño entero al guardar (el editor no podría guardar un paso
  intermedio); sumar la versión del borrador ahora (hay que sellar con `clock_timestamp` y decidir el ⚙: se haría dos veces).
- **cn)** Compilar al guardar (un borrador inválido daría un mapa sin sentido); guardar permisos (ataría el 4.08 al 4.09); que lo ausente valga «todos» (un
  cálculo intermedio de costos viajaría a todos).
- **cp)** Un `cotizaciones.tonos.gestionar` (otro interruptor de la matriz para lo mismo); exigir la concesión de todos los orígenes (quien configura uno no
  podría dar tono a sus grupos); `empresa.ajustes.gestionar`.
- **cq)** Sólo TS, como `color_acento` (sin action, la base aceptaría cualquier tono); exigir 3:1 al borde (los de los tokens dan 1,50, 1,73 y 1,85 sobre blanco: la
  semilla no pasaría, la misma razón que el 2026-10-12).
- **cs)** Recorrer las versiones (crece con cada ⚙); un `jsonb_path_ops` sobre el diseño entero (indexa cada hoja: más de 2.000 entradas por versión grande); una
  columna derivada `tonos text[]`.
- **cv)** Bloquear todos los tonos o leer `_tonos_lista()` (corta en 24 y los de la medición son 100).

**Consecuencia:**

- **Una trampa del planificador, medida:** la sonda de uso con `order by o.nombre limit 1` y la tabla de versiones puede elegir recorrer los orígenes por nombre
  y probar cada versión; con una clave que nadie usa (la que se mide) cuesta lo que crece la tabla (139 y 519 bloques con 200 y 2.000 versiones, y cambia según el
  orden en que se cargaron). La CTE `materialized` hace que el GIN conduzca. `offset 0` también lo logra, pero `escala.sql` lo prohíbe en cualquier función.
- **Los ayudantes no son de nadie** (`revoke … from public, anon, authenticated`): una función nueva nace con EXECUTE para PUBLIC y PostgREST la expone. Una
  prueba lo comprueba por cada uno. No llevan el prefijo `_formula_` ni `_diseno_`: dos guardas cuentan las que sí.
- **`database.types.ts` gana** las funciones y la tabla. La policy de `formulas` y los grants de `tonos` hacen que esto sea un Nivel 2.
- **Lo que no se hizo:** la semilla de diseños y de tipos de cambio (prompt 3), `cotizaciones_niveles` y sus permisos (4.09), el `check` de «publicada tiene
  diseño», `next upgrade` ni empujar.

## 2026-10-24 — Paso 4.08 (3 de 3): la semilla del cotizador, el check de «publicada tiene diseño» y un origen para el Excel

**Contexto:** desde el 4.08-2 publicar exige el diseño, y las dos fórmulas del seed (`subasta_usa` y `oficina`) nacían por un `insert` sin diseño ni visibilidad: su ⚙
fallaba, `tipos_cambio` no traía `unificado` ni `aduana` (publicar no lo comprueba) y el total de `subasta_usa` era null porque `transporte_por_ruta` no tenía filas.
La persona decidió antes de empezar: la v1 de `subasta_usa` pasa a ser la fórmula de las capturas, el Excel va en un origen nuevo y el transporte es sobrescribible con
las filas del Excel. Lo que se decidió al planear (y la persona confirmó) está en cw a dc.

**Decisión:**

- **cw) El origen del Excel es `planilla_usa` («Planilla EE. UU.»), de tipo `subasta`, color `#7a5af8`, orden 2.** Compra en subasta como `subasta_usa` (remate, fees, Copart
  e IAAI): el tipo le da los campos `tipo_vehiculo` y `ubicacion` que el transporte casa y la regla `aduana`. Comparte el bloque de fases de `subasta_usa` (mismo
  negocio, mismo flujo; el bloque pasó a un bucle sobre las dos claves). Va **último en el orden** para que `subasta_usa` siga siendo el primero de su tipo: las mediciones
  y un e2e eligen «el primero de tipo subasta por orden». Sin concesiones nuevas: todas las del seed van con `origen_id` nulo (= todos los orígenes).
- **cx) Las tres fórmulas son las del juego, no reescritas.** `subasta_usa` = `formulas.capturas` de `casos-de-diseno.json`; `planilla_usa` = el caso «excel: las cuatro
  cotizaciones…» de `casos-de-formula.json`; `oficina` = la de siempre. Dos cambios, y los dos los comprueba `entities/semilla.test.ts` (no una copia sin control):
  los tonos de los grupos (compra → `verde`, logística → `amarillo`, aduana → `naranja`: los tres del catálogo; el juego sigue con `compra`, `logistica` y
  `aduana`, que sus pruebas crean) y el **GA de `subasta_usa` en 5 %** (la captura 02 dice «GA 5 % = 57,75»; el 10 % es del Excel y `planilla_usa` lo conserva).
  La fórmula anterior de `subasta_usa` (la «ip generalizada») sale del seed y se queda en el juego como «ip generalizado: la v1 del seed hasta el 4.08»: sus casos prueban
  `tramo`, `si`, `sugerido_de` y `tabla_sin_filas`, que ninguna de las otras usa.
- **cy) Niveles: «Avanzado» es del nivel `costos`** (ver y editar) en `subasta_usa` y `planilla_usa`: las tres secciones de la calculadora de póliza (CIF, impuestos y póliza).
  Es lo que la captura 07 llama «solo admin» como rol y D7 como nivel. Nada más se restringe: el total, lo `aparte` y la variante tienen que ser de «todos»
  (`nivel_no_admitido`). `oficina` no tiene niveles. `subasta_usa` trae los modos Paralelo y Unificado (los de las capturas); las otras dos, ninguno (el Excel divide por
  el paralelo en su `total_en` y `oficina` no tiene).
- **cz) Tipos de cambio (USD → BOB), de las capturas:** `oficial` **11,68** (el por defecto), `paralelo` **12,20**, `unificado` **12,20** (`docs/referencias/cotizador-actual.md`,
  «Of 11,68 · Par 12,20» y la cuenta de la captura 02) y `aduana` **11,68**. Ninguna captura ni el Excel muestran un valor para `aduana` (el grupo de aduana va al oficial):
  nace igual al oficial, sin ser el por defecto, para que un modo «Aduana» tenga de dónde leerlo; lo decidió la persona. El 6,96 y el 12,40 de antes eran de ejemplo.
  Los 9,73 y 10 del Excel no se siembran: `planilla_usa` los toma como overrides de `tc_oficial` y `tc_paralelo` para reproducir sus totales.
- **da) El transporte son las dos tablas por ruta de la fórmula del juego,** `transporte_usa_bolivia` y `transporte_usa_chile` (columnas `oficina` y `cliente`; el nodo lee
  `cliente`, `sobrescribible`), con las filas del Excel (`excel-de-cotizacion.md`, «Tablas de referencia»; ATV y motos nulas, «X»). La tabla vieja `transporte_por_ruta`
  (vacía, que casaba `ruta` con `ubicacion`) sale del seed. El nodo casa `tipo` con el campo `tipo_vehiculo` del origen: sin vehículo da null con `campo_sin_valor`; con un tipo
  que la tabla no tiene (lo que trae la subasta, «AUTOMOBILE», no las claves `autos`, `motos`…) da null con `fila_sin_coincidencia`; y en los dos casos el asesor lo tipea,
  como en el Excel, y el total deja de ser null. Con `autos` el sugerido es 3.000.
- **db) Las tablas vivas se generan de las congeladas.** Cada fórmula congela sus tablas en `params.tablas` (D5); el seed inserta `tablas_referencia` y sus filas **desde ese
  mismo JSON**, así la viva y la congelada no pueden diferir al nacer (y `semilla-cotizador.sql` lo comprueba fila por fila y en orden). Mientras estén congeladas, el motor lee
  las de `params`.
- **dc) La semilla nace por el mismo camino que publicar.** `_preparar_publicacion(def, params, diseno, ignorar_retirados)` (migración `…006000`) es el tramo de
  `_publicar_formula()` «tonos `for key share`, catálogo, niveles, `validar_formula`, `validar_diseno`, `_compilar_visibilidad`», con `diseno_faltante` adentro; publicar la llama
  y el seed también, y guarda lo que devuelve en `visibilidad`. Un diseño sembrado inválido tumba el seed con la regla y su `donde`, y la visibilidad no es una copia escrita a
  mano. Es una extracción: mismo orden de candados, mismos rechazos. Es de nadie (`revoke … from public, anon, authenticated`).
- **dd) El check está en `schemas/`,** no en una migración: `formulas_publicada_con_diseno check (estado = 'borrador' or (diseno is not null and visibilidad is not null))`.
  `db:base` no está congelado hasta el primer `db push`, y es estructura. **Cubre las archivadas:** salen de una publicada (archivar sólo cambia `estado`) y ninguna base viva
  tiene versiones sin diseño; el único camino a `publicada` con el diseño nulo era el seed, y ya no existe.
- **de) El seed se parte en archivos.** `seed.sql` pasaba de 300 líneas (la regla del proyecto) y las tres fórmulas con su diseño suman más de 1.000: viven en
  `supabase/semillas/cotizador-{subasta-usa,oficina,planilla-usa}.sql` y el `analyze` final en `estadisticas.sql`, en el orden de `[db.seed] sql_paths` de `config.toml`
  (el seed primero, las estadísticas al final). `scripts/probar-schema.mjs` lee esa misma lista, así `db:probar` y `db reset` aplican lo mismo.

**Alternativas descartadas:**

- **cw)** Un origen de tipo `manual` (no tendría `tipo_vehiculo` ni la regla `aduana`); orden 0 o 1 (rompe qué origen elige una medición); concesiones propias del origen (no hay
  ninguna por origen en el seed).
- **cx)** Reescribir las fórmulas en el seed (dos copias que divergen); cambiar los tonos del juego a `verde`/`amarillo`/`naranja` (27 contextos y los bloques de las pruebas que
  crean `compra`, `logistica` y `aduana`); sembrar el GA al 10 % (la captura 02 muestra «GA 5 % = 57,75» sobre un CIF de 1.155).
- **cz)** Dejar el oficial en 6,96 (las anclas de las capturas piden 11,68); sembrar los 9,73 y 10 del Excel como tipos de cambio nuevos (dos más sin fórmula que los nombre).
- **da)** Una sola tabla `transporte_por_ruta` con `ruta`, `tipo`, `oficina` y `cliente` (hay que rehacer el nodo, sus casos del motor y del diseño); dejar el transporte sin filas
  (el total sigue null); sembrarlo sin hacerlo sobrescribible (con un tipo que no casa, el asesor no podría cotizar).
- **dc)** Que el seed llame a `formula_publicar()` (pide a una persona activa con el permiso, y el seed no tiene personas); copiar el cuerpo de publicar en el seed (dos caminos);
  insertar la `visibilidad` a mano (nadie la validaría).
- **dd)** Una migración con `alter table … add constraint` (la base base queda atrás de `schemas/`); `not valid` (no hay filas que lo violen).

**Consecuencia:**

- **Se mueve lo que contaba el seed:** `validar.test.ts` ya no compara el seed (lo hace `semilla.test.ts`, que además corre las cifras de las capturas y del Excel contra el motor);
  los juegos suman dos fórmulas (92) y dos diseños (227), y los tres corpus se regeneraron; `humo.sql` ya no parchea el diseño de `subasta_usa` y su historial del oficial parte de 11,68;
  las pruebas SQL que insertan a mano una versión publicada o archivada (`cotizacion-evaluar`, `tonos`, `publicar-diseno`, `medir-evaluar`) llevan `diseno` y `visibilidad` vacíos (el check sólo pide que existan); `medir-evaluar.sql` mide la fórmula
  de las capturas; y el e2e que deja los tipos de cambio como el seed los trae conoce los cuatro.
- **La siembra de volumen reparte los vehículos entre tres orígenes** (`1 + g % total`): `subasta_usa` pasa de cerca de la mitad a cerca de un tercio de los 10.000. Las guardas
  siguen (la profundidad que piden es menor), pero los números absolutos de `docs/RENDIMIENTO.md` que nombran 5.000 son de antes.
- **Las cifras de las capturas y del Excel son anclas:** `semilla-cotizador.sql` evalúa con `cotizacion_evaluar()` la fórmula sembrada (captura 02: 28.667,68 Bs, $2.350; con la póliza
  calculada, 1.200,84735 de nacionalización; captura 09: 875.418,08 Bs, $72.952 y la garantía 5.925; el Excel: 16.826,354, 43.756,416, 61.710,6 y 20.157,6 con sus 9,73 y 10).
  La nacionalización calculada (1.200,84735) y la de la captura (1.201) difieren en 0,15 por el redondeo de la captura («Son 421»).
- **Mutaciones: 18, y las 18 caen** (el check, un diseño inválido, la visibilidad escrita a mano, `_preparar_publicacion` sin `validar_diseno`, cada tipo de cambio, el GA, una fila viva
  de transporte, los tonos, el `total_en` del modo, el orden y el tipo del origen, el nivel de «Avanzado», el transporte sin `sobrescribible`, un precio de Chile, un nivel en `oficina`).
- **Lo que no se hizo:** `cotizaciones_niveles` y sus permisos (4.09), ninguna interfaz, la lectura recortada por nivel (4.10), subir un tope, `next upgrade` ni empujar.

## 2026-10-24 — Paso 4.09 (1 de 2): los niveles de acceso en la base

**Contexto:** D7 manda que la empresa cree niveles de acceso y que cada uno sea un permiso de la matriz de Roles, por origen, sin romper «un permiso existe sólo si tiene su enforcement».
El 4.08 dejó `_niveles_de_cotizacion()` fijo en `{costos}`, `_nivel_en_uso()` sin quien la llame y los diseños sembrados nombrando «costos». Este prompt hace la base; la pantalla
(Configuración › Cotización › Niveles) y la matriz de Roles son del prompt 2. Un agente revisó el plan en contra con el código delante; la persona lo aprobó y eligió, de G, la guarda por
relación. Lo que cambió respecto del pedido está en do.

**Decisión:**

- **df) La tabla y la clave.** `cotizaciones_niveles (id, clave, nombre, retirado_en, creado_en, actualizado_en)`, sembrada con «todos» y «costos». La clave sale del nombre (minúsculas, sin
  tildes como `_tono_clave`, `n_` delante si empieza con un dígito, hasta 30) y no cambia; **una clave que ya existe se rechaza, no se desambigua** (un nivel retirado sigue ocupando la suya, y un
  `Costos!` no puede crear un segundo «costos» sin permisos). **Tope: 10 niveles,** contando «todos» y los retirados. Por qué ese número: a lo sumo 9 generan permisos, o sea 18 filas más en la
  matriz de Roles sobre las 72 de hoy (+25 %; el 200 % y el celular se midieron con 72, `docs/RENDIMIENTO.md` 5a-16), cada una con 1 + orígenes lugares, y 18 concesiones más en el `mi_sesion()`
  del dueño, que viaja en cada request; 24 (el de los tonos) duplicaría la matriz para algo que la empresa usa de a dos o tres. El assert crea 8 y el siguiente da 22023.
- **dg) Los permisos de un nivel.** `permisos.nivel_clave` (FK `on delete restrict` a `cotizaciones_niveles.clave`) y el check `permisos_nivel_check`: `clave like 'cotizaciones.nivel.%'` ⇔
  `nivel_clave is not null`, y exactamente `.ver` o `.editar` de ese nivel, nunca el de «todos». El otro sentido —un nivel sin sus dos permisos— lo cierra un **constraint trigger diferido** en las
  dos tablas (una sola función, `_nivel_con_permisos()`, con `exists` y no `count`). `por_origen` sí, alcance no, `orden` 700 y 701 (270 y 300 estaban ocupados; el prompt 2 ordena los empates por
  nivel). **La regla de la clave de un permiso pasa a admitir dígitos** después del primer segmento (`^[a-z]+(\.[a-z0-9_]+){1,3}$`): la clave de un nivel puede traerlos y ninguna anterior cambia.
  Se concede al rol `dueno` con origen nulo y alcance «todos» en la misma transacción (`_nivel_permisos_crear(clave, nombre, conceder)`); en un `db reset` el dueño aún no existe y la concesión la da el
  `cross join` del seed. Renombrar no vuelve a conceder (`conceder = false`): lo que alguien le haya quitado al dueño se queda quitado.
- **dh) Las RPC.** Las cuatro piden `equipo.roles.gestionar`. `nivel_crear(p_id, p_nombre)` es idempotente por el intento y no lleva versión (como `tono_crear`); las otras tres la piden con
  `_exigir_version()`. **Eliminar con uso responde 23503, `detail nivel_en_uso`, `hint retirar`** y dice cuántas celdas de cuántos orígenes (`_nivel_uso()`, que cuenta sólo la versión más nueva de
  cada origen que lo nombra y salta los atajos, que no dibujan un valor; si sólo lo nombra una sección sin ítems, cuenta secciones). **Retirar no se deshace** en este prompt (no estaba en la lista).
  `_nivel_en_uso()` no cambia: sus consultas preparadas están copiadas literal en `medir-publicar.sql`; el conteo vive aparte.
- **di) Los candados.** `nivel_crear` y `nivel_renombrar` toman el candado de la tabla (`share row exclusive`): ordena el tope, el nombre y la clave. **`nivel_retirar` y `nivel_eliminar` no lo toman:** la
  fila (`for no key update` y `for update`) ya los serializa entre sí, con renombrar y con publicar, y la mutación que quitaba el candado de tabla de esos dos no caía (se vio al mutar). Publicar toma
  `for key share` sólo los niveles que nombra el diseño, después de los tonos. **Eliminar pide además los roles que tienen el nivel concedido** (`for update`, por id, el mismo candado de
  `_rol_para_editar`) antes de borrar sus concesiones: `rbac_eliminar_rol` toma el rol y después borra sus concesiones, y eliminar un nivel borra las mismas y después toca el rol; sin pedirlos antes
  cada uno espera lo que tiene el otro (40P01). La carrera lo reproduce con un tercer actor que toma el rol y lo borra.
- **dj) `_nodos_visibles(formula_id)` nace acá.** Es el enforcement de estos permisos y el 4.10 sólo lo consume. **Un nivel sólo estrecha:** se ve un nodo de `ver: todos` con `cotizaciones.ver` y uno de
  `ver: X` con `cotizaciones.ver` **y** `cotizaciones.nivel.X.ver`; se edita lo que se ve con `cotizaciones.crear` o `cotizaciones.editar` y, si `editar` no es «todos», el `….editar` del nivel. (La primera
  idea era que cada nivel bastara por sí solo; el revisor mostró que entonces `….ver` daría los nodos del nivel a quien no ve la cotización.) El alcance y crear contra editar son de la fila y los decide
  `puede_cotizacion` (4.10). Lo que la visibilidad no nombra sólo llega a `cotizaciones.configurar`, sin editar. Es de nadie y usa los permisos reales (`mis_permisos()`). **La primera versión era
  cuadrática:** `v_vis ? id` por nodo vuelve a leer el jsonb entero cuando llega como puntero TOAST (la trampa de 4.08-1, cj). `medir-nodos-visibles.sql` la encontró (2.487 nodos: 56 ms y 10.000
  buffers por llamada, 48,8 veces los ms de 255 nodos) y ahora es una resta de conjuntos: 3,1 ms y 22 buffers por llamada.
- **dk) Ver y editar (F del pedido).** Decidido tal como lo recomendó la persona: **ver abierto + editar restringido vale** (se ve, no se edita sin el permiso) y **ver restringido + editar abierto se
  rechaza** con la regla nueva `editar_sin_ver`, en los dos validadores y sin arreglarlo en silencio al compilar. Dos lugares: la sección (justo después de sus niveles, `donde` = su id) y la celda
  (su nivel efectivo, después de `nivel_no_admitido` y antes de `nodo_repetido`, `donde` = el nodo). **Dos niveles restringidos distintos valen** (ver «costos», editar «gerencia»): `_nodos_visibles` exige
  ver para editar. Un ítem que no es una celda hereda una sección que ya pasó el chequeo, así que sólo la celda lo rompe. Se corrige la frase contradictoria de PLAN y COTIZADOR (decían las dos
  combinaciones al revés) y se enmienda ci de 4.08-1. Los tres válidos y cinco inválidos del juego que ponían sólo el nivel de ver llevan también el de editar; ninguna semilla cambia (sus tres
  secciones restringidas ya traían los dos).
- **dl) 4-9: se rechaza.** `nivel_no_admitido` mira también el `pct` `aparte` de una celda con `secundario` (`donde` = el `pct`) y la bandera con `salida` de un interruptor (`donde` = la bandera),
  después del chequeo del nodo de la celda. La compilación de `visibilidad` queda como segunda barrera (el test de publicar la llama directo). Las dos ramas «total» son inalcanzables
  (`validarFormula()` rechaza un `pct` o una bandera con `salida: total`): sus mutaciones son equivalentes demostradas. Un par cuyo `pct` va aparte pero cuya celda no lleva `secundario` no lo dibuja y vale.
- **dm) 4-11: se queda el origen de control y se suma una guarda por relación.** El pedido era demostrar que el guard sigue vigilando y, si no, revertir el re-apuntado. No vigilaba, pero el re-apuntado no era la
  causa: el tope es `1,2 × (… + costo fijo)` y el 20 % también cubre un costo fijo que se mueve unos 30 buffers entre corridas, que es lo que cuesta una tabla (≈ 38). Medido, «una tabla viva más»
  daba 330 contra 342 (y por la cuenta 340 contra 359 con la referencia de antes). La persona eligió la guarda por relación: los bloques de `tablas_referencia(_filas)` que lee ARMAR no pasan de los de la
  misma consulta sobre las cuatro tablas que nombra la fórmula, más 2 (hoy 152 contra 152), con seis versiones malas. Ningún tope se tocó. Detalle en `docs/PLAN.md`, 4-11.
- **dn) Publicar no sube.** El `for key share` de los niveles llama `_niveles_del_diseno(p_diseno)` una vez más: `medir-publicar.sql` da 17,4 y 167 ms (antes 17,5 y 172) y 1.646 y 17.740 buffers (antes 1.902 y 17.144),
  razón 10,8 (tope 12).
- **do) Lo que se hizo distinto del pedido.** (1) El tope de niveles es 10. (2) `_nodos_visibles` nace acá (el pedido dejaba elegir entre acá y el 4.10) porque es el enforcement y sin él
  el caso genérico no probaría nada. (3) En G no se revirtió: se añadió la guarda que sí muerde. (4) `retirar` y `eliminar` sin candado de tabla (di). (5) El `check` y la FK viven en `schemas/` y las funciones en
  migraciones (`db:base` no se congela hasta el primer `db push`).

**Alternativas descartadas:**

- **df)** Desambiguar la clave con un sufijo (`costos_2`): dos niveles con la misma etiqueta para la persona y un permiso `costos_2` que nadie reconoce. Un tope de 24 como los tonos.
- **dg)** Una tabla propia de permisos de nivel (el catálogo es uno y la matriz lo lee de `permisos`); generar los permisos por trigger (la RPC es el único camino y el trigger diferido sólo vigila);
  un `check` que mire `cotizaciones_niveles` (un check no consulta otra tabla).
- **dh)** Que eliminar con uso lo retire solo (cambia sin que nadie lo pida); contar todas las versiones (un ⚙ más hace crecer el número sin que haya más celdas).
- **di)** Un candado de tabla en las cuatro (espera de más); confiar en el orden de `rbac_eliminar_rol` (sólo se cruza con un tercer actor, y ahora hay una carrera que lo demuestra).
- **dj)** Un nivel que concede por sí solo (da lo restringido a quien no ve la cotización); `tiene_permiso()` por nodo (10.110 buffers contra 110 en 5 medidas); devolver también los nodos ocultos con una marca (viajan).
- **dk)** Rechazar también ver abierto + editar restringido (la persona quiere poder mostrar sin dejar editar); arreglar al compilar (el editor del diseño, 4.22, no avisaría de algo que la base arregla en silencio).
- **dm)** Revertir el re-apuntado (no cambia la causa y el guard sigue sin ver una tabla); subir o bajar un tope.

**Consecuencia:**

- **Mutaciones: 127, y 120 caen** (7 equivalentes demostradas). Tabla en `docs/BITACORA.md`, 4.09-1. Varias de las vivas de la primera pasada eran huecos de la prueba y tienen su caso (retirar dos veces, un ítem de
  atajos, el trigger sobre `permisos`, el orden nodo-contra-`pct`, el candado de los roles).
- **Escala:** `_nodos_visibles` con 255 y 2.487 nodos en 0,7 y 3,1 ms (razón 4,4) y 50 y 110 buffers en 5 medidas; `_nivel_uso` con 200 y 2.000 versiones que lo nombran en 1,6 y 12,2 ms. `docs/RENDIMIENTO.md`.
- **Carreras nuevas** (`scripts/carreras/niveles.mjs`): dos crear con la misma clave, con el mismo intento, eliminar contra publicar en los dos órdenes, contra retirar, contra renombrar, crear contra renombrar al
  mismo nombre y eliminar contra el borrado de un rol que lo tiene concedido.
- **Catálogo de TS:** `CLAVES_PERMISO` es cerrado y `concesionesDe()`, `catalogoDesde()` y `rolesDesde()` descartan sin romper una clave que no conocen; la matriz de Roles no muestra estos permisos hasta el prompt 2.
  Hasta entonces sólo el dueño los tiene y la sesión no los ve.
- **Para el 4.10:** `_nodos_visibles(formula_id)` ya existe; `visibilidad` sigue sin cubrir los subtotales por grupo ni las tablas de referencia; el alcance y crear contra editar los decide `puede_cotizacion`.
- **Lo que no se hizo:** la pantalla, la matriz de Roles, las lecturas que consumen `_nodos_visibles`, deshacer un retiro, empujar a la nube ni `next upgrade`.

## 2026-10-24 — Paso 4.09 (2 de 2): la pantalla de niveles, la matriz de Roles y deshacer un retiro

**Contexto:** el 4.09-1 dejó los niveles de acceso en la base. Faltaba lo que la persona ve: que TS conozca los permisos `cotizaciones.nivel.<clave>.ver|editar` (hoy los descartaba en cinco puntos), que la matriz de Roles los
muestre, la pantalla Configuración › Cotización › Niveles y deshacer un retiro (4-12). Un agente revisó el plan en contra con el código delante; la persona eligió, de lo único que había que decidir, que el uso de cada nivel
viaje con la lista (dr).

**Decisión:**

- **dp) Quién ve y quién cambia.** `equipo.roles.gestionar` ve las acciones; `equipo.roles.ver` ve la lista sin «Nuevo nivel», sin «⋯» y sin clic en la fila (escribir `?panel=nuevo-nivel` no abre nada y lo dice); sin ninguno,
  «No tienes permiso» y sin tarjeta en Configuración. Las RPC de escritura vuelven a exigir `gestionar`. **`equipo.roles.ver` deja de ser sólo de la interfaz:** `niveles_con_uso()` lo exige (o `gestionar`), así que tiene su punto de
  enforcement y se quita de las excepciones de `permisos-enforcement.sql` (el detector lo vio: «excepciones que ya no hacen falta»); su `aplicado_en` dice «UI; niveles_con_uso()».
- **dq) La ruta.** `/configuracion/cotizacion?seccion=niveles` con `<PestanasConDesborde>` como Leads, con una pestaña hoy (las fórmulas, las tablas y la tarjeta llegan después). La tarjeta del hub se abre con `ver` o `gestionar` de roles.
- **dr) El uso viaja con la lista.** La UI no puede saber si un nivel está en uso (las fórmulas sólo las lee `cotizaciones.configurar`), así que la base lo dice: `_nivel_motivo_de_uso(clave)` es el único punto del texto «Está en N
  celdas de M orígenes…» (lo dicen `nivel_eliminar` y la lista), y **`_niveles_lista()` lo lleva en la respuesta de cada escritura**: la pantalla nunca lo pierde al cambiar algo. «Eliminar» sale apagado con ese motivo debajo y «Retirar»
  en la línea de arriba; si una pestaña vieja intenta igual, el 23503 se dice tal cual y la lista se relee. Un retirado que sigue en uso no ofrece retirarse. **Costo medido:** el motivo preguntaba `_nivel_en_uso()` y después
  `_nivel_uso()` (358 ms con los 9 niveles en uso y 2.000 versiones cada uno); `…006600` pregunta una vez (199 ms; 21 con 200 versiones; 2,6 ms sin uso). Se probó recorrer cada origen hacia atrás por `(origen_id, version)` y se descartó:
  con 200 versiones salía 4 veces peor, porque un origen que no lo nombra obliga a recorrer todo su historial.
- **ds) Retirar se hace al tocar, con «Deshacer»; restaurar es 4-12.** Es reversible desde este prompt (`ui.md`: lo reversible hace y ofrece «Deshacer»; lo irreversible, un `<Confirmar>`): «Deshacer» llama a `nivel_restaurar` con la versión
  que devolvió el retiro, y el foco vuelve al «⋯» de la fila aunque ahora la dibuje otra sección. `nivel_restaurar(id, versión)`: `equipo.roles.gestionar`, `for no key update` sin candado de tabla (no toca el tope, el nombre ni la clave),
  `PT409`, `actividad`; **un nivel que no está retirado responde `sin_cambios` sin mirar la versión y sin escribir**, la regla de `lead_guardar` y `cambiar_telefono_lead` («lo ya hecho no choca»): un doble «Deshacer» no da conflicto. Eliminar
  sigue siendo un `<Confirmar>` por URL (`?panel=eliminar-nivel&nivel=<id>`). 4-12 va acá, no en otro paso: «Restaurar» es la otra mitad de «Retirar», que esta pantalla ofrece.
- **dt) TS conoce el patrón, no una lista.** `esClaveDeNivel()` usa **la regla del check de la tabla** (`^[a-z][a-z0-9_]{1,29}$`, menos «todos»), no la forma más estrecha de `_nivel_clave()`: una clave que la base admite nunca desaparece de la sesión.
  `esquemaClavePermiso` (`z.custom`) reemplaza a los dos `z.enum` de otorgar y revocar. La prueba corre `_nivel_clave()` de la base en PGlite sobre nombres difíciles y exige que cada clave que da pase el patrón, el check de la tabla y la
  regla de la clave de un permiso (las dos leídas de `schemas/`, no copiadas). El ensanchamiento de `ClavePermiso` y los esquemas de las actions van en el mismo commit: sin eso `use-matriz` no compila.
- **du) Un solo orden de los niveles.** La pantalla y la matriz los ordenan con `compararNombresDeNivel()` (`localeCompare('es')`), no con el `order by nombre` de la base (con la colación `C` de PGlite «Ñ» queda después de «z»). En la matriz van al final
  de «Cotizaciones» (`orden` 700 y 701 empatan entre niveles: los desempata `ordenarPermisosDeNivel()`, que sólo mueve filas de nivel entre sí), por nombre y «Ver» antes de «Editar». Un retirado sigue en la matriz con «(retirado)»: lo que se le
  dio sigue valiendo, como un origen «(inactivo)».
- **dv) La UI no razona por nombres.** Qué admite cada nivel lo dicen `se_renombra`, `se_retira` y `se_elimina` (la regla de `_nivel_protegido()`); ningún texto escribe «Costos» ni «Todos»: salen de la fila. Un nivel «fijo» es el que ninguna
  acción toca, sin mirar su clave.
- **dw) Lo que se hizo distinto del plan.** (1) No se usó `<ListaDeCatalogo>` (exige Subir y Bajar y los niveles no se ordenan a mano): la lista usa las piezas de `shared/ui/lista`. (2) `comoResultado()` se repite en `cotizaciones`: no puede importar
  de `leads` y moverlo a `shared` era otro cambio. (3) El plan escribía «`niveles_leer()`»: quedó `niveles_con_uso()`, con el uso adentro. (4) `index.ts` del módulo ahora lleva una lectura de servidor, así que `index.test.ts` mockea `server-only` y el
  cliente de Supabase. (5) Los tests de `niveles_con_uso` y del motivo viven en `niveles-con-uso.sql`, para que cada commit de la base sea verde por sí solo.

**Alternativas descartadas:**

- **dr)** «Intentar y responder»: «Eliminar» siempre activo y mostrar el motivo después del 23503 (cuesta un diálogo y un paso más para lo que la lista ya puede decir antes); un botón «Retirar» dentro del `<Confirmar>` (el botón es siempre rojo y
  lo reversible no pasa por una confirmación); recorrer cada origen hacia atrás (arriba).
- **ds)** Un `<Confirmar>` para retirar (hace dudar de lo que se deshace con un clic); deshacer sólo por SQL.
- **dt)** Una lista de claves de nivel en TS (se desactualiza con cada nivel nuevo y la prueba que la compara sería la lista misma).
- **dp)** Dejar `equipo.roles.ver` como excepción y que la lectura de uso la pida cualquier sesión (el uso de un nivel dice qué hojas llevan costos: no es de toda cuenta).

**Consecuencia:**

- **Mutaciones:** 73 y todas caen: 40 de SQL en el arnés de PGlite y 33 de TS. Tres de las de SQL se repitieron contra la función real con `db:carreras` (sin `for no key update`, sin `_exigir_version` y la versión antes del «sin cambios»):
  la primera sólo la ve la carrera. Una de TS (ordenar por la clave y no por el nombre) sobrevivía hasta que se agregó un caso con las dos al revés. Detalle: `docs/BITACORA.md`, 4.09-2.
- **Escala:** la matriz no tiene paginación (es la excepción registrada): con el tope de niveles suma 18 filas a las 72 y cabe al 200 % en 412 y 1.280 px. `niveles_con_uso()`: 2,6 ms, 21 ms y 199 ms (arriba); `docs/RENDIMIENTO.md`.
- **Carreras nuevas** (`scripts/carreras/niveles.mjs`): restaurar contra retirar y contra eliminar en los dos órdenes, y dos restaurar a la vez.
- **Para el 4.10:** nada cambia: `_nodos_visibles(formula_id)` sigue de nadie y el alcance y crear contra editar los decide `puede_cotizacion`. **Para el 4.22:** `editar_sin_ver` rechaza una sección con sólo `nivel_ver` restringido, y el editor pone ver y
  editar juntos (anotado en `docs/PLAN.md`).
- **Lo que no se hizo:** subir el tope, una pantalla de tonos, el editor del diseño (4.22), las lecturas recortadas por nivel (4.10), `next upgrade` ni empujar.

## 2026-10-25 — Paso 4.10 (1 de 3): lo que no se ve no viaja (la lectura)

**Contexto:** D7 manda que lo que una persona no puede ver no viaje. Hasta acá `authenticated` leía directo el snapshot de una cotización (`valores`, `fuentes`, `totales`, `tipos_cambio`, con los nodos de «costos») y el
`diff` de sus revisiones; la policy de lectura y `puede_cotizacion()` armaban el arreglo de toda la cartera (`lead_id in (select mis_leads())`); `cotizacion_evaluar()` devolvía todo y por eso nadie la ejecutaba; y las
tablas de referencia tenían policy `true` (la columna «oficina» del transporte, el costo de la empresa, la leía cualquier sesión). Este prompt cierra la **lectura**; escribir (`cotizacion_crear` y `cotizacion_guardar`)
es de los prompts 2 y 3. Un agente revisó el plan en contra con el código delante (9 errores que habrían roto `db:probar`, `db:medir:volumen` o `pnpm test`, y 13 menores); la persona eligió cuatro cosas (dx, dz, ea y ee).

**Decisión:**

- **dx) El patrón de `leads` para las columnas.** Un `revoke select (columna)` no hace nada mientras exista el `select` de tabla que da `_rls()`: se quita el de la tabla y se da `select` de las columnas que sí se leen
  (`…006800`, la lista sale del catálogo, no de un texto). Una columna nueva nace sin grant y `cotizaciones-visibilidad.sql` compara la lista exacta. Se esconde también **`tipos_cambio`** (no estaba en el pedido): un nodo
  `tipo_cambio` puede ir en una sección restringida y su valor congelado estaba ahí. `total_base`, `modo_tc` y el resto de la fila siguen legibles. Antes de quitarlo se hizo el inventario de lo que lee esas columnas:
  nada de `src/`, ni de los e2e, los scripts, las funciones edge o las vistas; sólo triggers y funciones `definer`.
- **dy) La auditoría no copia el snapshot.** `auditar()` guardaba la fila entera de `cotizaciones` en `actividad.antes|despues`. La API no lee esas columnas, pero la pantalla de Actividad (Fase 9) sí las va a leer, y
  copiarlas dos veces por edición es plata tirada (ya pasó con las fórmulas). `cotizacion_auditar()` quita las cuatro columnas y la migración limpia las filas viejas (el `update` se probó a mano sobre filas con el formato viejo).
- **dz) La policy inline, con la misma regla; y qué se asserta.** La persona eligió dejarla escrita sobre sus columnas (una función STABLE no ve la fila recién insertada y leería cada fila otra vez por su clave).
  Los orígenes con «todos» y con «propios» se calculan una vez por sentencia (`origenes_con_alcance()`, como `vehiculos: leer`) y lo propio es `creado_por` o `en_cartera(lead_id)` por fila. `en_cartera(lead)` ≡
  `lead in (select mis_leads())`, así que la visibilidad no cambia, y una prueba compara por 9 personas y 13 cotizaciones la policy, `puede_cotizacion()` y la regla escrita aparte, en ver y en editar (con un lead
  transferido y uno revocado). **La guarda asserta la dueña y «Mías»** (0,4 y 0,7 ms, 92 y 241 buffers con 50.000 y con 250.000); la policy de antes llamaba a `alcance_de()` 101 y 202 veces por página. **«Todas las que
  veo» de quien ve «propios» recorre el índice global** (Ana ≈ 1,6 s y ≈ 42.000 buffers, la «chica» ≈ 2,0 s y ≈ 58.000 con 250.000): se mide sin assert y pasa al 4.16 como **4-14**.
- **ea) El recorte y sus reglas.**
  - El total y los nodos de salida `aparte` viajan siempre, aunque la visibilidad los restrinja (D7); lo que la visibilidad no nombra sólo llega a quien configura el origen, sin saltarse un nivel.
  - **Un subtotal de grupo viaja si quien lee ve todos sus nodos** (elección de la persona): si no, el subtotal más lo que ve delataría el que no ve. Su **Bs** además sólo si ningún tipo de cambio de la fórmula está
    restringido por un nivel que quien lee no tiene: Bs ÷ USD es esa tarifa. Los totales `bs`, `usd` y `suma_usd` viajan siempre. Cualquier otra clave de `totales` (la forma de la Fase 0) no viaja: falla cerrada.
  - Un tipo de cambio que el diseño no dibuja no figura en `visibilidad`; es la tarifa de la empresa (la tabla `tipos_cambio` la lee toda sesión) y no se sobrescribe: **no cuenta como oculto**. Así `planilla_usa` y
    `oficina` dan su Bs por grupo a cualquiera que las vea. Sólo cuenta como oculto el que la visibilidad nombra y quien lee no ve.
  - Una falta viaja si su `donde` (un nodo visible, la palabra `total` o un grupo que viaja) y su `ref`, si es un nodo, se ven; las demás sólo ponen `hay_faltantes_ocultos: true`, que se omite cuando es falso: a quien
    lo ve todo le llega exactamente lo que dio el motor (la prueba de paridad de 84 y 603 casos no cambia).
  - Un override descartado viaja si es de un nodo visible o de un id que la fórmula no tiene.
- **eb) `cotizacion_evaluar` no es un oráculo.** Una clave de `inputs` o de `banderas` que no se ve da el MISMO error que una que no existe (texto, `donde` y orden del motor: la forma, la fórmula inválida, los inputs, las
  banderas); un override de un nodo oculto se quita antes del motor y vuelve como `nodo_inexistente`, después de recortar y entre los inexistentes, ordenados por id en bytes. Se probó con un caso donde el override
  oculto cambiaría el total (con la fórmula sembrada ningún override oculto altera lo visible, y la mutación que no lo quitaba sobrevivía). **Quien no configura el origen sólo elige uno de los `cabecera.modos` del
  diseño de esa versión**: un modo libre podría dividir el total por un tipo de cambio oculto. Y la comprobación del tipo de cambio congelado pasa de `jsonb_typeof(..) = 'number' and (..)::numeric > 0` a un `case`:
  el orden de un AND no está garantizado. **No estaba anotado en BITACORA ni en PLAN** (se buscó); el caso nuevo pasa contra HEAD porque hoy Postgres lo evalúa en ese orden, y sólo la mutación que lo invierte lo muerde.
- **ec) El recorte con contexto.** La primera versión (`…007100`) comparaba con `= any (arreglo)` dentro de bucles: cuadrática en los nodos (con 2.000, segundos) y, en la sintética de 200 nodos, `cotizacion_evaluar` pasaba de
  36 a 52 ms de p95 (tope 50, que no se sube). El perfil por etapa mostró dos causas: el recorte (2,8 ms) y **revisar con `_motor_forma_entrada` las 4.000 filas de tablas que arma la base (11,5 ms)**, que el motor repite.
  `…007200` arma un contexto de conjuntos jsonb una vez por llamada (`_cotizacion_contexto`) y revisa la forma sólo de lo que tipea la persona: 40 ms de p95 (39,9 y 40,1 en la corrida final) y 3,9 ms la fórmula del seed.
- **ed) Las revisiones.** `cotizacion_revisiones` recorta cada columna del `diff`; si lo que cambió es sólo lo oculto la columna no figura (que figure delataría que algo cambió) y la revisión viaja con `diff: {}`: se sabe
  quién y cuándo, no qué. Una página a la vez por el cursor `id`, con `_acotar_pagina`. **No entra a `RPC_PAGINADAS`**: esa guarda exige quién la llame desde `src/` y la pantalla es del 4.15.
- **ee) `formula_para_cotizar`** sólo con `cotizaciones.configurar` del origen, y el permiso se pide **antes** de mirar si el origen existe o tiene fórmula (el mismo 42501 con cualquier uuid).
- **ef) Las tablas de referencia por lo visible** (elegido por la persona, en este prompt): la policy de lectura pide `cotizaciones.configurar`, y `cotizacion_tabla` da la tabla sólo si un nodo que se ve la lee, con sólo las
  columnas de esos nodos (`match` y `columna`; `desde` y `hasta` en un tramo; la de unos atajos que se ven). Una `ayuda` sola no da nada. La copia congelada de la versión manda; hasta 1.000 filas. Quien configura
  algún origen lee las compartidas (la usa cualquiera).
- **eg) El inventario de funciones.** Un detector sobre `pg_proc` (texto sin comentarios, tipo de retorno y cierre por llamadores) más un registro con clase y motivo; una nueva sin registrar rompe la prueba, y su
  autoprueba crea funciones de usar y tirar para las formas de devolver lo oculto (y de no devolverlo). Cada función que recorta lleva su sonda, y el caso genérico la corre por cada nivel, con «Ver como»,
  con el permiso en otro origen, con sólo editar y con el de otro nivel. El primer detector arrastraba media base por `registrar_actividad`: se acotó a funciones cuyo retorno puede cargar contenido.
- **eh) 4-13 y 4-14.** `_nivel_en_uso()` no tenía ningún llamador y se quitó (4-13); «todas las que veo» queda abierto (4-14).
- **ei) Lo que se hizo distinto del plan.** (1) `tipos_cambio` también se esconde. (2) El recorte se rehízo con contexto (ec). (3) Los asserts de la medición son 10 ms y 300 buffers por página (el plan decía 20 y 1.500),
  porque lo medido es 0,4 a 0,7 ms y 92 a 241 buffers; `cotizacion_leer` ≤ 10 ms y `cotizacion_revisiones` ≤ 12 ms. (4) Las tablas se leen por columnas visibles en este prompt, no en el 3. (5) Las notas de
  carga se leen una vez por corrida (`\set` de psql).

**Alternativas descartadas:**

- **dx)** Un `revoke select (columna)` (no hace nada). Dejar `tipos_cambio` legible. **dz)** La policy llamando a `puede_cotizacion(id)` (relee cada fila y un `insert … returning` deja de andar). Construir ya la ruta por la
  cartera para «todas las que veo» (adelanta medio 4.16, sin sus filtros). **ea)** Un subtotal que viaja si el diseño dibuja un ítem `subtotal` de ese grupo (hay que inventar una forma nueva del diseño en los dos
  validadores). **eb)** Rechazar un nodo oculto con un error propio (es un oráculo); aceptar cualquier modo. **ef)** La tabla entera a quien ve una celda que la usa (la asesora vería «oficina»); dejarlo para el prompt 3.

**Consecuencia:**

- **Mutaciones:** 191, caen 188. Las 3 que no caen son equivalentes y están dichas: `leer` sin `eliminado_en` (la policy restrictiva ya filtra), `leer` sin `assert_activo` (`puede_cotizacion` ya cierra la cuenta bloqueada) y `cotizacion_evaluar` sin el `revoke` de PUBLIC (nace sin PUBLIC). Lo que en PGlite no se distingue (sin privilegios por defecto) se verificó en la base real: los ayudantes no los ejecuta nadie y las RPC sólo `authenticated`. Tabla en `docs/BITACORA.md`, 4.10-1.
- **Para el prompt 2** (`cotizacion_crear`): el `grant update (valores, fuentes, tipos_cambio, totales, clase…)` de `cotizaciones` sigue dejando a `authenticated` pisar nodos ocultos directo: hay que revocarlo (y con él el
  `insert` de tabla entera) antes de que «guardar conserva lo oculto» pueda valer. **Para el prompt 3** (`cotizacion_guardar`): guardar sin mandar la clave de un nodo oculto la conserva (`valores` y `fuentes` de ese nodo
  iguales antes y después, leídos como postgres) y `cotizacion_evaluar` por cotización tiene que completar lo oculto con lo guardado. **Para el 4.13:** el diseño recortado que dibuja la hoja es una lectura propia que entra
  al inventario. **Para el 4.15:** registrar `cotizacion_revisiones` en `RPC_PAGINADAS`. **Para el 4.16:** 4-14. `puede_vehiculo()` y `vehiculos: leer` siguen con `mis_leads` (4.11).
- **Lo que no se hizo:** escribir (`cotizacion_crear` y `cotizacion_guardar`), una pantalla, `next upgrade` ni empujar.

## 2026-10-25 — Paso 4.10 (2 de 3): escribir por RPC, cerrar la escritura directa y `cotizacion_crear`

**Contexto:** el 4.10-1 cerró la lectura; quedaba la escritura. `authenticated` todavía tenía el `insert` de tabla entera de `cotizaciones` y un `update` por columna (`valores`, `fuentes`, `tipos_cambio`, `totales`, `total_base`, `modo_tc`,
`notas`, `clase`…), con las policies «crear» y «editar»: cualquiera con el permiso pisaba un nodo oculto o pasaba una preventa a final sin la RPC. Este prompt cierra eso y crea la única puerta de alta. Un agente revisó el plan en contra con el código delante
(27 puntos, todos incorporados) y la persona eligió tres cosas (fa, fd y fk). Antes, el pre-paso 4-15 (la pantalla de niveles al 200 %).

**Decisión:**

- **fa) Nadie escribe `cotizaciones` ni sus revisiones directo** (`…007900`): se revoca todo `insert`, `update`, `delete`, `truncate`, `references` y `trigger`, por tabla y por columna, a `authenticated`, `anon` y PUBLIC, y se van las dos policies de escritura. **Corrige un
  dato del pedido:** un `revoke … on table` **sí** quita los grants de columna (la documentación de `REVOKE`: «when revoking privileges on a table, the corresponding column privileges are automatically revoked on each column»; lo que no hace nada es lo
  contrario, `revoke select (columna)` con el `select` de tabla vigente, que es lo que arregló el 4.10-1). El `revoke` por columna se dejó explícito igual y las dos mutaciones que lo quitan sobreviven, como equivalentes demostradas: lo que lo comprueba es
  `has_column_privilege` de cada rol sobre cada columna (en PGlite y, sin los privilegios por omisión de Supabase, en la base real). Escriben, por RPC `definer`: `cotizacion_crear`, `cotizacion_marcar_final`, `cotizacion_moderar`, las papeleras, el cron y los triggers
  (docs/COTIZADOR.md › «Quién escribe una cotización y cómo»). `humo.sql` y `cv_edita` migraron: la policy de editar ya no existe y la prueba compara la lectura, y `puede_cotizacion(…, 'cotizaciones.editar')` contra la regla escrita aparte.
- **fb) El permiso va en el origen de la cotización**, no «en el origen del lead» (un lead no tiene origen de vehículo: sólo su canal): `cotizaciones.crear` de `p_origen`, que es el de la fórmula y el del vehículo, como la policy de insert que se fue; el lead se pide visible con
  `puede_lead(lead, 'leads.ver')` y no de la cartera (D3: quien cotiza ve el lead). En `auditoria-leads.sql` entra como clase `X` con su motivo, como `crear_lead`.
- **fc) El intento.** Un candado consultivo por id (`pg_advisory_xact_lock`; patrón nuevo: antes no se usaban) ordena dos llamadas con el mismo id, también «cargando a mano»: la segunda espera y devuelve la misma cotización. Sólo se devuelve una cotización **mía, de este origen y viva**; un id
  ajeno, de otro origen o de la papelera no se consulta antes (sería una sonda barata de ids): choca con la clave en el `insert` y responde el 42501 de `cotizacion_leer()` con un id que no existe.
- **fd) Candados** (elegido por la persona): la fórmula con **`for share`**, no `for key share` como pedía el prompt: publicar archiva la vigente con un `update` de `estado` (columna no clave), que no choca con `for key share`, y el trigger `cotizacion_validar` exige al insertar que la
  versión siga publicada: con `key share`, un alta cruzada con una publicación daba 23514. Con `for share`, publicar espera a las altas y el orden es determinista (si publicaron antes, se vuelve a leer la nueva). El lead y el vehículo, con `for key share` (frena transferir y la
  papelera, que toman `for update`, y no frena editarlos), **comprobando antes de bloquear y otra vez después**: así nadie bloquea un lead que no ve. Orden: intento, lead, vehículo, fórmula. Las mutaciones de cada candado caen contra la base real.
- **fe) 42501 para el vehículo** que quien llama no ve, que no existe o está en la papelera, con el texto de `cotizacion_evaluar()` («No tienes acceso a este vehículo.»): otro error en crear haría de las dos un oráculo, es la convención de la base para «no existe o no lo ves» y `P0002` no se usa.
- **ff) Lo que se guarda.** `valores` y `fuentes` enteros (lo que quien llama no ve, y lo que no mandó, con el valor de la fórmula); `tipos_cambio` = las tarifas de la empresa que usó (las claves activas que nombra un nodo, lo mismo que recalcula); un override de un nodo `tipo_cambio` queda en
  `valores` con fuente `override`. **`total_base` es el total en la moneda base** de la empresa (`usd` con `USD`, `bs` con `BOB`; otra, 22023): `margen_vehiculo` lo compara con `gastos.monto_base`. Un override que el motor descarta en un nodo visible (fuera de la variante, apagado, no
  sobrescribible) **se rechaza** con su motivo (lo guardado es lo mandado); uno de un nodo oculto o inexistente da el mismo `nodo_inexistente`. Un total sin valor da `total_sin_valor` sin nombrar lo oculto, y uno que no cabe en `numeric(18,2)`, `fuera_de_rango`.
- **fg) Una final creada directo** (elegido por la persona) exige `cotizaciones.final.gestionar`, el vehículo y el índice de «una final por vehículo» (23505 con su pista), y **no** hace lo de marcarla (vincular el vehículo al lead, mandar las preventas a la papelera, pasar el lead a cliente): **4-17**, para el 4.25.
- **fh) 4-18, cerrado acá:** `cotizacion_evaluar()` no miraba la `variante` contra lo visible y el motor responde ««x» no es una opción de la variante «<id>»» con el id del nodo (y con una clave válida manejaba un nodo que no se ve). Arreglarlo sólo en crear dejaba las dos RPC respondiendo distinto a lo mismo,
  así que lo tipeado se revisa en **un solo ayudante** (`_cotizacion_tipeado`, `…007700`): con la opción oculta, elegir una variante da exactamente el error de una fórmula sin variante, y no elegir ninguna (sin `por_defecto`) da `variante_sin_eleccion`, que no nombra el nodo. Fuera de eso,
  `cotizacion_evaluar()` responde igual (los casos de la paridad de 84 y 603 siguen en verde; su p95 no cambia).
- **fi) El ajuste «Vehículo obligatorio al cotizar»** no existía en la base: columna `ajustes_empresa.vehiculo_obligatorio_al_cotizar` (sí por defecto, en `schemas/` y en una migración para una base viva), sin pantalla hasta el 4.20.
- **fj) Los avisos y la tabla de niveles (4-15).** Con la barra lateral a la vista (desde 768 px) los avisos salen **abajo a la izquierda, sobre la barra, con su ancho** (216 px al 100 %, 432 al 200 %), decidido por el CSS (`--ancho-del-aviso`, `body:has([data-barra-lateral])`) para que no haya un parpadeo
  de hidratación; abajo a la derecha, con 712 px al 200 %, cubrían la última fila de una lista. **Cambia una decisión del cierre 4** (el aviso de 22,25 rem, para que al 200 % no quedara «una columna angosta»): `avisos-con-descripcion.spec.ts` pasa a medir «llena su carril y se lee» y el aviso de escritorio
  es más angosto (los textos largos ocupan hasta 7 líneas al 100 %). La tabla de niveles queda en «Nombre» y el «⋯», con «Estado · Uso» bajo el nombre (5a-16: apilar, no sumar otro `min-w`): con columnas aparte, la del «⋯» pegada a la derecha tapaba «Estado» y «Uso» al 200 % sin que ninguna celda desbordara.
- **fk) Lo que se hizo distinto del plan.** (1) Las migraciones: `…007600` el ajuste, `…007700` el ayudante y la respuesta, `…007800` crear, `…007900` cerrar. (2) El ayudante y 4-18 viajan en el commit de crear (separar sus pruebas de las de crear partía los mismos bloques). (3) Las pruebas de los errores
  indistinguibles quedaron en `cotizaciones-visibilidad.sql` (lo pedido) y la conducta de crear en `cotizacion-crear.sql` (nuevo: el otro archivo pasa de 1.400 líneas). (4) Dos carreras que el plan no tenía —quien no ve el lead no espera su candado, y crear mientras se le revoca el acceso—, porque dos mutaciones
  funcionalmente equivalentes en una sola conexión (la comprobación antes de bloquear y la de después) sólo se distinguen con locks. (5) Las pruebas se escribieron antes con `r ->> 'error' <> '42501'`, que vale nulo (y no falla) cuando no hay error: las mutaciones lo mostraron en nueve pruebas y todas pasaron a `is distinct from`.

**Alternativas descartadas:**

- **fd)** `for key share` en la fórmula, como pedía el prompt (no frena a publicar); aflojar el trigger `cotizacion_validar` para aceptar una versión archivada (adelanta D2); no comprobar antes de bloquear (cualquiera retendría un lead que no ve). **fc)** Mirar el id ajeno antes del `insert` (una sonda de ids).
  **fe)** Un error propio para «vehículo que no ves» (un oráculo). **fj)** Acortar sólo el aviso de la pantalla de niveles; reservar un carril en la página (no sirve si la página no se desplaza); los avisos al centro (siguen tapando).
- **fa)** Dejar el `update` de las columnas que no son del snapshot (`notas`, `titulo`, `modo_tc`…): `cotizacion_guardar` (prompt 3) es la única edición, y una columna que se escribe directo es una que la RPC no ve (el modo y el total salen del mismo cálculo).

**Consecuencia:**

- **Mutaciones:** 61 (56 en PGlite y 5 de candados contra la base real); **caen 55** y **6 son equivalentes**, demostradas: las dos de las columnas (arriba), `cerrar` sin las revisiones y sin `delete` (nunca tuvieron esos privilegios), `crear` sin `assert_activo` (`assert_permiso` lo llama) y `_cotizacion_tipeado` sin la forma del
  modo (`evaluar_formula` la repite). La tabla, en `docs/BITACORA.md`, 4.10-2.
- **Para el prompt 3** (`cotizacion_guardar`): guardar sin mandar la clave de un nodo oculto la conserva (assert: `valores` y `fuentes` de ese nodo iguales antes y después, leídos como postgres), y `cotizacion_evaluar` con `p_cotizacion` completa lo oculto con lo guardado; la edición es la única que
  escribe `valores`; D2. **4-16** (el detector del inventario deja fuera lo que devuelve numeric, boolean, un entero o una fecha aunque lea una columna oculta), **4-17** (la final directa) y **4-19** (el «·» solo al comienzo de una línea) quedan en `docs/PLAN.md`.
- **Lo que no se hizo:** `cotizacion_guardar` ni D2, una pantalla de cotizar, el campo del ajuste en Configuración (4.20), `next upgrade` ni empujar.

## 2026-10-25 — Paso 4.10 (3 de 3): `cotizacion_guardar`, D2 en el alta, el detector y los candados

**Contexto:** el 4.10-1 cerró la lectura de lo oculto y el 4.10-2 la escritura directa y el alta. Faltaba la única edición, `cotizacion_guardar`: calcula en la base con SU versión de la fórmula y **conserva lo que quien guarda no ve** (D7). Además, D2 («desactualizada»), 4-16 (el detector del inventario) y dejar escrito 4-21.
Un agente revisó el plan en contra con el código delante (8 bloqueantes, 13 a corregir y 6 menores, todos incorporados: el orden de candados, la versión de la cotización, `intento` y `huella` sin lectura, banderas como booleanos, la variante oculta sin `por_defecto`, D2 por id, una final pide `final.gestionar`, `marcar_final` toma su cotización, y pruebas y mediciones que se rompían). La persona eligió **una** cosa: dónde vive D2 (ga). Antes, el pre-paso: dos comentarios decían que un `revoke … on table` no quita los grants de columna; sí los quita (`REVOKE` lo documenta), y el bucle por columna se quedó como defensa.

**Decisión:**

- **ga) D2 vive en `cotizacion_crear`, completo** (elegido por la persona entre cuatro). El texto de D2 (apertura de la Fase 4) dice «al guardar una cotización **nueva** … Editar una vieja no avisa: usa SU versión a propósito»: el alta es `cotizacion_crear`, y `cotizacion_guardar` edita una que ya existe, así que por el texto no avisa. **Es ambiguo en dos cosas, y se dice acá:** (1) «guardar una nueva» no dice si es el alta o el primer guardado de una nunca editada (se eligió el alta); (2) «Guardar con la N» sobre una nueva choca con el trigger `cotizacion_validar` («debe nacer de la fórmula PUBLICADA»), que ahora deja nacer de una archivada del origen (nunca de un borrador).
  - `cotizacion_crear(…, p_formula_abierta, p_abierta_en, …, p_con_la_abierta)`: la versión se compara **por id** (`publicado_en` es la hora de inicio de la transacción que publicó, y las fórmulas de las pruebas no lo tienen) y los tipos de cambio que la fórmula nombra, por **`tipos_cambio_historial`** a la hora de la apertura (índice nuevo `(tipo_cambio_id, cambiado_en desc, id desc)`), en una sola sentencia con los de hoy y **sin ningún candado** sobre `tipos_cambio` (`tipo_cambio_guardar` toma dos filas al cambiar el por defecto: un candado más podía interbloquear).
  - Desactualizada y sin «con la abierta»: PT409, `detail desactualizada`, `hint formula|tipo_cambio`, sin guardar y sin decir **cuál** tarifa (podría ser de un nodo oculto). «Guardar con la N» crea con esa versión y las tarifas de entonces, y sólo si la hoja se abrió hace menos de 24 h y la versión dejó de ser la publicada hace menos de 24 h. El intento repetido vuelve antes que D2.
  - Límites dichos: una tarifa desactivada no se usa (su nodo queda sin valor, como antes) y el historial sella con la hora de inicio de su transacción.
- **gb) El orden de candados no es el del pedido.** El pedido decía «cotización, lead, vehículo, fórmula». En este código **los padres se toman antes que sus cotizaciones**: la papelera de vehículos (también por lotes, en orden de id) toma el vehículo `for update` y después sus cotizaciones; purgar un lead lo toma `for update` y su `on delete set null` actualiza las cotizaciones. Tomar la cotización y después un padre interbloquea con ellas.
  **Guardar toma el vehículo actual y el nuevo (sólo si el vehículo cambia), `for key share`, en orden de id, y después la cotización `for no key update`; ni el lead ni la fórmula.** El lead: guardar no crea una referencia a él (una transferencia en medio equivale a «guardó y después se transfirió»). La fórmula: usa SU versión, que no cambia (`formulas` es append-only), así que publicar no espera a guardar ni al revés. Quien no puede editar o no ve el vehículo nuevo no toma ningún candado.
  Una carrera con una sola llamada no interbleca nunca (cada lado es una sentencia): la prueba **emula el lote de la papelera paso a paso** (el primer vehículo `for update`, sus cotizaciones, y recién entonces el segundo) con A a mitad de camino cuando B llega, y las mutaciones «sólo el vehículo nuevo» y «en orden descendente» caen por 40P01.
  Un reintento por «le cambiaron el vehículo mientras esperaba» se quitó: cualquier cambio de la fila mueve su versión (ge), así que quien la tenía en pantalla recibe el PT409 de la versión (la mutación que lo quitaba era indistinguible).
- **gc) Una final pide `cotizaciones.final.gestionar`.** La policy de editar que se fue en `…007900` sólo dejaba editar una preventa con `cotizaciones.editar`, y una final con `final.gestionar` (el seed: «Marcar la final de un vehículo y editarla»); `cotizacion_validar` nunca miró permisos, sólo exige el vehículo. Se aplica lo mismo, con el 42501 de «no existe» (no uno propio: sería un oráculo), y **su vehículo no cambia** (marcarla ya vinculó ese vehículo al lead y mandó sus preventas a la papelera). El permiso se mira antes de tomar nada y otra vez con la fila tomada (`marcar_final` puede cambiarle la clase mientras espera).
  **`cotizacion_marcar_final` toma primero su cotización** (la relee y toma las preventas de su vehículo): desde que guardar puede cambiarle el vehículo a una, con la copia sin candado vinculaba el lead al vehículo viejo y mandaba a la papelera una preventa recién movida. Es el arreglo mínimo: 4-17 y el orden vehículo → lead siguen en el 4.25.
- **gd) El intento vive en la revisión, con una huella.** `cotizaciones_revisiones.intento` (índice único por cotización e intento) y `huella` (el `md5` de lo que mandó: la versión esperada, las entradas, el modo, el título, las notas y el vehículo). Repetirlo, de la misma persona y con los mismos datos: `repetido: true`, sin PT409 (la versión ya la movió ese guardado). **El mismo intento con otros datos, u otra persona: 22023 `intento_reusado`**, nunca lo viejo en silencio. Dos a la vez: la fila los ordena (no hace falta un candado consultivo). **Ninguna de las dos columnas se lee**: `…006800` dio `select` de «todas menos el diff» leyendo el catálogo y las columnas nuevas entraron; la huella resume lo que tipeó quien guardó y se podría adivinar por fuerza bruta. Si nada cambió, **no se escribe** (ni la versión ni una revisión; un update idéntico tampoco movería nada, pero se evita el update).
- **ge) La versión de una cotización es de un trigger propio** (`cotizacion_version()`): el genérico (`now()`) la movía con un favorito o un reporte de cualquiera que la lee (PT409 a quien editaba, y `_conflicto_de_edicion` habría nombrado a quien marcó el favorito) y no se movía dos veces en la misma transacción (PGlite no podría probar el PT409). Ahora: `greatest(clock_timestamp(), anterior + 1 µs)`, y un cambio sólo de contadores no la mueve ni queda en actividad.
- **gf) Qué se conserva y qué se recalcula.** Lo que quien llama no edita se **reconstruye de `valores` y `fuentes`** (`_cotizacion_entradas_de`, pura; tabla en `docs/COTIZADOR.md`) y se completa antes del motor (`_cotizacion_conservar`). Lo oculto se conserva byte a byte; lo oculto que se **deriva** de lo visible (un sugerido, un cálculo, el pct de un par cuyo monto manda) se recalcula: es el **límite aceptado de D7**, junto con dos más que se dicen: el snapshot no guarda lo tipeado en un nodo inactivo (vale 0 y no tiene fuente), y un input tipeado en 0 y uno sin tipear se guardan igual (con un `requerido_si` encendido, el que queda en nulo se conserva en nulo).
  Un valor para un nodo que se ve y no se edita, **distinto de lo guardado**, es 42501 `nodo_no_editable` (igual no es un cambio; la prueba es la entrada reconstruida). Las banderas se reconstruyen como booleanos (la entrada los pide así y el motor lee `= 'true'`: un 1 se leería apagado). La variante no tiene «sin tipear»: sin mandarla, la guardada, y una opción oculta sin `por_defecto` ya no da `variante_sin_eleccion` (lo guardado trae la variante). `_cotizacion_conservar` no juzga las claves que no son nodos (un override así vuelve del motor como `nodo_inexistente`; las sintéticas de escala los traen).
  **Prueba de la reconstrucción:** `evaluar(reconstruir(evaluar(E))) = evaluar(E)` en `valores`, `estados`, `fuentes`, `totales` y `faltantes`, en los casos con resultado del juego y del corpus del motor (≈ 419 de 774; el resto son errores de llamada).
  `cotizacion_evaluar(p_cotizacion := …)` hace exactamente lo mismo, así que para la misma entrada **evaluar y guardar dan el mismo total y los mismos valores visibles** (la prueba por nivel de `cotizaciones-visibilidad.sql`). **Cambia una decisión del 4.06:** `_cotizacion_armar` acepta `p_vehiculo` **con** una cotización (otro vehículo para ese cálculo, para ver antes de guardar lo que daría cambiarlo; en una final, `llamada_invalida`), y devuelve lo guardado (así `cotizacion_evaluar` no nombra `public.cotizaciones` y no entra al cinturón de la auditoría de leads).
- **gg) La revisión guarda el diff por nodo.** De `valores` y `fuentes`, sólo los nodos que cambiaron (`{de: {nodo}, a: {nodo}}`), incluidos los ocultos que cambian por derivación; `totales` y `tipos_cambio`, enteros. `cotizacion_revisiones` recorta cada columna al leer y lee las dos formas: **un guardado que sólo cambia lo oculto se lee, para quien no lo ve, con el `diff` vacío** (quién y cuándo, no qué; decisión ed del 4.10-1), probado de extremo a extremo. Reescribió tres asserts de `cotizaciones-visibilidad.sql` que esperaban dos snapshots enteros.
- **gh) Las columnas que entran** (el inventario que se pidió; tabla en `docs/COTIZADOR.md`). Entran `titulo`, `notas`, `modo_tc`, `vehiculo_id` (poner o cambiar, no quitar; una final no lo cambia) y lo calculado. **No entran:** `tipos_cambio` (se congelan; recalcular es cotizar encima, 4.15), `clase` (`marcar_final`), `lead_id` (cambiarlo cambia quién la ve), `plantilla_id` y `moneda_mostrar` (nadie las lee: las pedirán la tarjeta, 4.18, y «Ver total Bs», 4.13). Guardar recibe el estado entero de lo que se edita, sin valores por omisión: nulo es un valor.
- **gi) 4-16, el detector.** Sólo `void`, `uuid` y `trigger` quedan fuera de «puede cargar contenido»; el texto también mira `intento` y `huella`; y el cierre por llamadores es **iterativo** (una regex con todos los nombres por vuelta, no una por par): el archivo corre en 7,9 s, antes 16,8. Ninguna función real nueva apareció. `cotizacion_guardar` se registra con su clase y su sonda (`{version}` se refresca en cada llamada: cada guardado la mueve) y el caso genérico por nivel la corre; las personas del caso ganan `cotizaciones.editar`.
- **gj) 4-21** queda en `docs/PLAN.md` con número, assert y lugar (4.13: el primer paso que conecta la pantalla a `cotizacion_crear`; ninguna fila de PLAN la llamaba). **`cotizacion_crear` con el mismo intento y otros datos sigue devolviendo la vieja con `repetido: true`** (no hay revisión de un alta donde guardar una huella; no es un error de la base), así que la pantalla compara lo devuelto con lo mandado. **Para guardar se decidió lo contrario:** el mismo intento con otros datos **es un error** (`intento_reusado`), porque la revisión ya existe y la huella no cuesta una columna más en `cotizaciones`.
- **gk) Lo que se hizo distinto del plan aprobado.** (1) Sin reintento por vehículo en guardar (gb). (2) La respuesta de «una final sin gestionarla» es el 42501 de «no existe» y no un mensaje propio (un oráculo). (3) `medir-evaluar.sql`: la sintética lleva su snapshot de 200 nodos y una visibilidad que deja editar (con `'{}'` nadie edita nada y `nodo_no_editable` la rompe), y la búsqueda por clave del conteo de bloques lee el snapshot **y fuerza el TOAST** (cayó una vez con 9 bloques contra 8). (4) La sintética de la medición de guardar usa **la entrada de `medir-evaluar`** sin los overrides inválidos: con una entrada sin overrides el motor calcula el sugerido de las 4 tablas y cuesta 62 ms, que no es lo que se quiere medir. (5) `_cotizacion_conservar` se rehízo: reescribía la entrada tres veces con `jsonb_set` y copiaba cada vez las 4.000 filas de tablas (5,7 ms con 200 nodos; 1,5 ahora). (6) Dos personas nuevas en las carreras (`sinVehiculos`, `soloEdita`) y `carreras_cotiza` gana `cotizaciones.editar`. (7) Un doceavo commit de pruebas (los sobrevivientes de las mutaciones). (8) **Tres veces** un `if` de plpgsql con un `case … then` adentro (termina en el primer `then`): la condición va a una variable antes (anotado en `.claude/rules/migraciones.md`).

**Alternativas descartadas:**

- **ga)** D2 sólo detectando (lo de «Guardar con la N» para el 4.13), posponerlo al 4.13, o en guardar con «nueva = nunca editada» (se aparta del texto: «editar una vieja no avisa»). Comparar la versión por fecha (`publicado_en` es la hora de inicio de la transacción y las fórmulas de las pruebas no la traen), o tomar un candado sobre `tipos_cambio` (posible interbloqueo con `tipo_cambio_guardar`).
- **gb)** El orden del pedido (interbloquea con la papelera de vehículos y con purgar un lead); tomar sólo el vehículo nuevo (el lote lo toma en el otro orden: 40P01); tomar el lead o la fórmula (esperar a quien transfiere o publica sin ganar nada); un reintento por vehículo cambiado (la versión lo dice).
- **gd)** Un candado consultivo por intento, como crear (la fila ya ordena); una huella sin la versión esperada; leer la huella (adivinable); devolver lo viejo ante el mismo intento con otros datos (silencio). **ge)** Dejar el trigger genérico (un favorito ajeno rompe la edición). **gf)** Guardar lo tipeado además del snapshot (otra columna oculta); reconstruir también lo derivado (no se puede: cambia con lo visible).

**Consecuencia:**

- **Mutaciones:** 172 (PGlite y base real, contadas una vez cada una), **caen 164** y **8 son equivalentes**, todas demostradas: sin el `+1 µs` de la versión (`clock_timestamp()` avanza siempre dentro de una sesión); crear con el vehículo existente sin comprobarlo (`_cotizacion_armar` lo repite; las caídas de ese código son las dos de la base real, sin el `for key share` y sin la primera comprobación); la segunda comprobación del vehículo (`key share` sólo espera a un `for update`, y tras él la fila ya no se ve); «pisado» sin exigir sobrescribible (una fuente `override` ya lo implica); «lo mandado no pisa» (las claves de lo mandado y de lo guardado son disjuntas o iguales); «siempre escribe» (un `update` idéntico no mueve versión, revisión ni actividad); la rama «variante guardada no se quita» (código muerto: se quitó); y el reintento por vehículo (la versión lo cubre: se quitó). Los permisos y el candado de la cotización de `guardar` no se distinguen en una sola conexión y caen en la base real (cuentan como caídas, con sus mutaciones de allá). La tabla, en `docs/BITACORA.md`, 4.10-3.
- **Para el 4.11:** `puede_vehiculo()` y `vehiculos: leer` siguen con `mis_leads`. **Para el 4.13:** la lectura que abre la hoja da `p_formula_abierta` y `p_abierta_en`; `p_intento` de guardar es un uuid por cada guardado (generarlo una vez por clic y reusarlo sólo al reintentar); 4-21. **Para el 4.15:** `cotizacion_revisiones` ya lee el diff por nodo (registrarla en `RPC_PAGINADAS`); cotizar encima es crear con la fórmula publicada. **Para el 4.25:** 4-17 (la final directa); `marcar_final` ya toma su cotización pero vincula antes de tomar el vehículo.
- **Lo que no se hizo:** una pantalla de cotizar ni de guardar, subir un tope, el Nivel 3, `next upgrade` ni empujar.

## 2026-10-25 — CI-1: GitHub Actions por niveles, el e2e en cuatro bloques y lo que queda fuera de CI

**Contexto:** `.github/workflows/ci.yml` (del 2026-10-11) corría en GitHub desde el 2026-10-23 (tres corridas por push a `main`, en
verde; `calidad` 13,7 a 17,7 min, `base-de-datos` 2 min), aunque `docs/ESTADO.md` decía «Sin remoto, `.github/` no corrió». Su e2e sólo
corría en `pull_request` y la persona empuja a `main`: nunca corrió. Además: sin funciones edge, sin `db:reset` ni `E2E_COMPLETO`, sin
bloques; dos acciones de terceros sin SHA (`pnpm/action-setup@v4`, `supabase/setup-cli@v1` con `version: latest`), splinter bajado de
`main` en cada corrida, sin `permissions`, sin `timeout-minutes`, sin `concurrency`. El repo es privado: runners de 2 vCPU y unos 2.000
min/mes en el plan gratuito (lo confirma la persona en su cuenta).

**Decisión:**

- **Cinco jobs.** `nivel-1` siempre (lint, typecheck, test, `esquema-base.mjs --check` y `mapa.sh --check`): algunas guardas de
  `pnpm test` leen `docs/`, así que un cambio sólo de documentación también lo corre. `cambios` decide con `git diff --name-only` si
  corren los pesados (`scripts/ci-cambios.sh`, probado en `scripts/ci-cambios.test.ts` con repos de git reales; pide `fetch-depth: 0`:
  con un clon superficial el commit de antes no está y todo cae a «pesado»; ante la duda, corre todo). `base` (`supabase start`,
  `db:reset`, `db:types` sin diff, `db:probar`, `db:lint` y splinter desde `scripts/splinter.sql`, la copia del repo: 0 de nivel ERROR en
  la base local). `e2e-build` y `e2e` en cuatro bloques (`--shard=N/4`), cada uno en su runner con su pila, `db:reset`, `functions serve`
  (la guardia de `e2e/global-setup.ts` lo pide: sin él no hay contenedor de edge runtime) y `E2E_COMPLETO=1`, llamando a Playwright
  directo: `test:e2e:completo` corre las carreras y `test:e2e` recompilaría.
- **Sin acciones de terceros.** pnpm con `npm install -g` de la versión de `packageManager`; la CLI de Supabase es la devDependency
  (`pnpm exec supabase`, 2.120.0 por `pnpm-lock.yaml`: la misma que usan los scripts en local; la de brew es 2.109.1 y ningún script la
  llama). Las de GitHub, fijadas por SHA y verificadas el 2026-10-25 con `git ls-remote` (todas en Node 24; la más nueva, de hace 17
  días): `actions/checkout` v7.0.1, `setup-node` v7.1.0, `cache` v6.1.0, `upload-artifact` v7.0.2, `download-artifact` v8.0.2. Lo
  repetido (Node, pnpm, la caché del store e `install`) va en una acción compuesta local, `.github/acciones/preparar`. Una acción de
  terceros sólo entra con una línea `# accion-de-terceros: <dueño/repo> — <motivo>` en el YAML; hoy la lista está vacía.
- **La app se compila una vez** (`e2e-build`, artefacto de un día). Medido: el build en el runner tarda 49 s (corrida 40143922979;
  «Compiled successfully in 21.0s») y `.next-e2e` sin `cache/` pesa ≈ 58 MB. Una vez: un job de ≈ 2 min que corre en paralelo con
  `nivel-1`, que los bloques esperan igual (cero minutos de reloj), y cuatro descargas de segundos. En cada bloque: cuatro builds de
  ≈ 1 min facturados y sumados al reloj de cada bloque. Ahorra ≈ 2 min facturados por corrida y los cuatro bloques prueban el mismo
  binario. Lo que lo hace posible: la clave publicable de la pila local es la fija de la CLI (comprobada igual a la de `supabase status`
  en local): va en el YAML (`CLAVE_PUBLICA_LOCAL`), el build la inlinea y **cada bloque comprueba que su pila da la misma** y, si no, falla
  diciéndolo. La clave de servidor sale de `supabase status` en el bloque, se enmascara y no se escribe en el YAML.
- **Escritorio por defecto** (lo que hoy es el Nivel 2) y `proyectos: ambos` por `workflow_dispatch` para el Nivel 3.
- **Sin reintentos.** `retries: 0` se queda; un bloque que falla sube `playwright-report/`, `e2e-fallos/`, `test-results/` y el log de
  las funciones (14 días). `fail-fast: false`: un bloque rojo no cancela los otros tres.
- **Fuera de CI**, con su número en `docs/PLAN.md`: `db:medir` (9-4) y `db:medir:volumen` (9-5) miden tiempo y un runner compartido los
  vuelve inestables; `db:carreras` (9-6) entra a `base` tras 5 corridas seguidas en verde por `workflow_dispatch`.
- **La guarda** `scripts/guardas/workflows.test.ts` (en `pnpm test`) exige todo lo anterior: tope de minutos por job, `permissions:
contents: read`, acciones por SHA y de `actions/` (o con su excepción, con motivo y usada), nada de `latest`, nada de lo que queda fuera
  de CI, el e2e con `--shard=` y `E2E_COMPLETO=1`, sólo `--project=escritorio` (o ninguno, con `ambos`), el input `proyectos`, el job del
  diff con `fetch-depth: 0` y Playwright con `retries: 0`. Contra el `ci.yml` anterior cae con 23 problemas; cada regla lleva su mutación
  como caso permanente. `ci-cambios.sh`: 9 mutaciones, caen 8; la que queda (`package.json` sin `$`) sólo distingue un
  `package.json.algo` en la raíz.
- **El disparo lo deja así el YAML y lo decide la persona:** push a `main` → `nivel-1` y `cambios` y, si cambia código, `base`; el e2e
  en `pull_request` y a mano. Cambiarlo es una línea de `scripts/ci-cambios.sh` (`salir`).

**Minutos, una estimación a contrastar con la primera corrida real (no es una medida).** Lo medido en el runner (corrida 40143922979):
lint 74 s, typecheck 22 s, `pnpm test` 456 s, `db:probar` 188 s, build 49 s, `supabase start` con las imágenes y `db:lint` ≈ 2 min. Lo
medido en local (CI-1): cada bloque de escritorio, 5,7 a 6,5 min de pruebas. El factor del runner para el e2e se supone de 1,5 a 2,5:
Vitest tardó 5,6 veces más (pide 8 hilos y hay 2), `db:probar` 0,8 veces (un hilo), y el e2e con 1 worker usa ≈ 1,4 hilos en local.

| Job                                    | Cuenta                                                                                  | min         |
| -------------------------------------- | --------------------------------------------------------------------------------------- | ----------- |
| `nivel-1`                              | preparar ≈ 0,5 + lint + typecheck + test (medidos)                                      | ≈ 10        |
| `cambios`                              | checkout entero y el script (se factura el minuto entero)                               | 1           |
| `base`                                 | preparar + start ≈ 1,5 + reset ≈ 0,5 + types + probar (medido) + lint                   | ≈ 7         |
| `e2e-build`                            | preparar + build (medido) + subir                                                       | ≈ 2         |
| un bloque, escritorio                  | preparar + chromium con dependencias ≈ 1,5 + start con edge ≈ 2 + reset + 6 × 1,5 a 2,5 | 13 a 19     |
| los 4 bloques, escritorio              |                                                                                         | 52 a 76     |
| los 4 bloques, ambos proyectos         | ≈ 38 min de pruebas en local / 4 × 1,5 a 2,5 + 4 de preparación cada uno                | 72 a 112    |
| **un push sólo de docs**               | `nivel-1` + `cambios`                                                                   | **≈ 11**    |
| **un push con código**                 | + `base`                                                                                | **≈ 18**    |
| **un PR o un e2e a mano (escritorio)** | + `e2e-build` + 4 bloques                                                               | **70 a 96** |

Por mes, con ≈ 45 pushes (1,5 por día, el ritmo del 23 al 25 de octubre) y casi todos con código:

| Propuesta                                                                | Cuenta              | min/mes | Contra 2.000 |
| ------------------------------------------------------------------------ | ------------------- | ------- | ------------ |
| (a) e2e en cada push con código                                          | 45 × ≈ 84           | ≈ 3.800 | se pasa      |
| (b) **hoy:** push sin e2e; e2e a mano cuando hoy se corre un Nivel 2 o 3 | 45 × 18 + ≈ 10 × 84 | ≈ 1.650 | cabe         |
| (c) e2e nocturno si `main` cambió                                        | 45 × 18 + ≈ 25 × 84 | ≈ 2.900 | se pasa      |
| (d) e2e en push sólo con los seis disparadores del Nivel 2               | 45 × 18 + ≈ 15 × 84 | ≈ 2.070 | en el límite |

Con (b) caben unos 14 e2e de escritorio por mes. Un Nivel 3 por CI (ambos) cuesta como 1,2 de escritorio.

**El aviso de seguridad de Next no para el build en CI** (investigado en `node_modules/next/dist/lib/upgrade/nudge.js` y
`build/index.js`, Next 16.4.0): para sólo cuando detecta un agente (`@vercel/detect-agent`: Claude Code exporta `CLAUDECODE` y
`AI_AGENT`) y la consulta al registro de npm encuentra un advisory; en CI no hay agente y `next build` sale de la comprobación antes de
consultar. Por eso CI no lleva reintentos para eso. `experimental: { agentUpgrade: false }` (documentado en
`node_modules/next/dist/docs/…/agentUpgrade.md`) lo apagaría también en local, pero esconde la señal de seguridad: no se aplica. Lo que
dice el aviso (tres advisories para 16.4.0, dos críticos) y la decisión de actualizar, en `docs/BITACORA.md`, «CI-1».

**Alternativas:** `pnpm/action-setup` y `supabase/setup-cli` fijadas por SHA (dos dependencias de terceros para lo que hacen
`npm install -g` y la devDependency; además `setup-cli` traería otra versión que la local). Compilar en cada bloque (≈ 2 min más por
corrida y cuatro binarios distintos). El e2e en cada push (propuesta a: se pasa del plan). Las carreras en `base` desde ya (dos
conexiones reales en 2 vCPU que nadie vio todavía: un rojo no diría si es la función o el runner). Un filtro por rutas con una acción
de terceros (`dorny/paths-filter`): `git diff` alcanza.

**Consecuencia:** un push corre lo barato siempre y la base sólo si cambia código; el e2e completo existe en CI y se paga cuando se
pide. Toca al primer push: medir los minutos reales y reemplazar esta tabla por la medida (y, si el factor del runner sale peor que 2,5,
revisar si conviene más de 4 bloques). Cambiar la CLI de Supabase puede cambiar la clave publicable local: el bloque lo dice y se
actualiza `CLAVE_PUBLICA_LOCAL`.

**CI-1b (2026-10-25), antes del primer push.** Tres arreglos, con la guarda que los exige:

- **Un dispatch tiene su propio grupo y no se cancela.** Con un grupo único y `cancel-in-progress: true`, un push a `main` cortaba un e2e
  manual de 70 a 96 min, y lanzar el e2e justo después de empujar cancelaba el `base` del push. Ahora el grupo de un dispatch es
  `ci-manual-<ref>-<run_id>` y `cancel-in-progress` vale `github.event_name != 'workflow_dispatch'`: push y PR siguen cancelando a su
  corrida anterior. **Con `run_id` y no sólo `<ref>`** (lo decidió la persona): GitHub deja una sola corrida en espera por grupo y
  cancela a la que esperaba cuando llega otra, aun con `cancel-in-progress: false`. Con `ci-manual-<ref>`, unas carreras lanzadas durante
  un e2e manual esperarían hasta que terminara, y un tercer dispatch las cancelaría. El costo es que dos dispatch pueden correr a la vez
  (se paga lo que se lanza).
- **El job `carreras` (9-6) existe** y corre sólo con `workflow_dispatch` y el input `carreras` (boolean, por defecto false): `supabase
start` sin edge runtime, `db:reset`, `db:carreras`, 20 min de tope, sin reintentos. El input `e2e` (por defecto true) apaga
  `e2e-build` y los bloques en un dispatch, para correr sólo las carreras (`nivel-1`, `cambios` y `base` corren igual). La guarda admite
  `db:carreras` sólo dentro del job llamado `carreras` y sólo con `if: github.event_name == 'workflow_dispatch' && inputs.carreras`.
  En cualquier otro job, o con otro `if`, sigue prohibido. `carreras.mjs` sigue prohibido en todos.
- **La espera de funciones edge prueba las tres** que pide `e2e/soporte/guardia.ts` (`apibara`, `storage-gc`, `avatares-miniaturas`).
  Antes sólo probaba apibara: un bloque podía arrancar con otra caída y la guardia lo tumbaba con la corrida ya pagada. La guarda lee
  `FUNCIONES` de la guardia y exige que la línea `funciones="…"` del YAML nombre cada una y que el bucle la recorra.

## 2026-10-25 — CI-2: un spec prepara su estado, las esperas son de un estado, y los minutos medidos

**Contexto:** la primera corrida real del e2e en GitHub (dispatch 40222651048, escritorio) dejó los bloques 1 y 4 en rojo y dio, por primera vez, los
tiempos reales (`docs/BITACORA.md`, «CI-2»). Los dos rojos eran del propio e2e, no del producto: un spec que dependía de lo que dejaba otro, y una
medición hecha antes de que la pantalla quedara quieta.

**Decisión:**

- **Un spec prepara todo el estado que usa y no depende de lo que dejó otro.** Los bloques de CI (`--shard=i/4`, cada uno con su `db:reset`) cambian el
  orden y el conjunto de lo que corrió antes: lo que pasa en local por un residuo de otro spec cae en CI. `vehiculos-apibara-funcion.spec.ts` pasaba porque
  `empresa.spec.ts:194` deja una clave en Vault (y `restaurarEmpresa()` sólo restaura la columna). La regla va en `.claude/rules/e2e.md`; se prueba corriendo
  el spec solo tras `pnpm db:reset`.
- **La clave de relleno la deja el spec, por la vía de la app y sin tocar una real.** `asegurarClaveDeRelleno(persona)` (`e2e/soporte/apibara-clave.ts`):
  si Vault ya tiene `integracion:apibara`, no la toca ni la lee (sólo pregunta si existe; la huella es el `md5` del texto **cifrado**); si no, guarda
  `e2e-sin-clave-real` y la borra por su id (`afterAll`, también si una prueba cae), y el `afterAll` comprueba que la clave quede como estaba. **Se guarda con la sesión
  de la dueña y no con la service key** (lo pedido): `integracion_guardar_secreto` exige `assert_permiso('empresa.ajustes.gestionar')` y la service key no tiene
  `auth.uid()`; la sesión de una persona con ese permiso es, además, lo que hace la app. Borrar de Vault se hace por SQL (`soporte/sql.ts`, como `postgres`:
  no hay RPC que la borre). La regla tiene su spec (`apibara-clave-de-relleno.spec.ts`) y sus cuatro mutaciones.
- **Una medición espera un estado, nunca un tiempo.** Con el aviso de guardado ya visible, el pie del panel sigue en «Guardando…» con los botones `disabled`
  (`pointer-events: none`): `elementFromPoint` los atraviesa y el e2e creía que algo los tapaba. `avisoNoTapaElPie()` espera al pie quieto (`pieQuieto()`),
  `recibeElClic()` mide con la caja igual en dos cuadros seguidos (tope de 2 s) y `quieto()` espera dos cuadros antes de leer las animaciones
  (`e2e/soporte/esperas.ts`). Ni `waitForTimeout` ni reintentos (`retries: 0` se queda). La prueba permanente es una página armada en el spec
  (`recorrido-esperas.spec.ts`), que cae contra el ayudante de antes; el retraso por CDP (`Emulation.setCPUThrottlingRate` de 14 a 20) es la reproducción
  y no se queda en el repo: una prueba con la CPU 20 veces más lenta tarda 17 s por caso y depende del reloj del lugar donde corre.
- **El aviso de guardado que sale antes que el pie se anota (PLAN 9-7), no se arregla aquí** (`src/` está fuera de este paso, y es de gravedad baja: 40 ms en una
  PC rápida).
- **Los minutos medidos reemplazan a los estimados de «CI-1».** Un push con código cuesta **22** (era ≈ 18; `nivel-1` 13, `base` 8, `cambios` 1), un push sólo de
  docs 11 a 15 (≈ 11), un e2e a mano de escritorio **90** (70 a 96; 94 con `carreras`), un bloque 14 a 20 (promedio 16; 13 a 19) y el factor del runner **1,6**
  por spec, no 1,5 a 2,5 con ruido: cayó en la parte baja. Con eso, (b) —**hoy**, el e2e a mano— cuesta ≈ **1.890** al mes y deja **≈ 11 e2e de escritorio**
  con los 2.000 del plan gratuito; (d) —el e2e en push con los seis disparadores— pasa a **2.340 y se pasa** (antes, en el límite) y (a) y (c) se pasan más. La
  tabla completa y su cuenta, en BITACORA «CI-2». Nada cambia en el YAML por esto.

**La propuesta, sin aplicar: que los bloques no dependan de `nivel-1`.** Hoy `e2e` lleva `needs: [cambios, nivel-1, e2e-build]` (`ci.yml:152`): los bloques
esperaron **11 min 7 s** de reloj a que `nivel-1` terminara (13 min), sin facturar un minuto. Dos formas:

| Forma                                                                                               | Reloj de un e2e | Minutos facturables                                                                                        |
| --------------------------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------- |
| `needs: [cambios, e2e-build]`                                                                       | **−11 min**     | igual si todo pasa; si `nivel-1` cae, los 4 bloques corren igual: **+64** (el costo de un e2e sin nivel 1) |
| `nivel-1` en dos jobs: lint y typecheck (≈ 2:30), y `pnpm test` (≈ 10); el `needs` sólo del primero | −8 min          | **+1 a +2 por corrida** (otro `preparar` de ≈ 0:25 y otro redondeo hacia arriba)                           |

El costo esperado de la primera es 64 min × la tasa de `nivel-1` en rojo × los e2e al mes. Con 6 corridas y **0** `nivel-1` en rojo (una cayó en `base`) no hay
tasa: a 10 % y 10 e2e al mes son ≈ 64 min (3 % del plan); a 25 %, ≈ 160 (8 %). **Recomendación:** la segunda forma, porque lint y typecheck son lo que cae más seguido
y lo que se ve en 2:30, y deja el costo conocido (+1 a +2) en vez de una apuesta; si la persona prefiere cero cambios en el YAML, el reloj sigue siendo 11 min más y
los minutos, los mismos. **Cualquiera de las dos toca la guarda** `scripts/guardas/workflows.test.ts` (que exige lo del `ci.yml`), así que es un cambio con su
mutación; la decide la persona.

**Alternativas:** guardar la clave de relleno con la service key (no puede: la RPC pide `auth.uid()`; habría que escribir `vault.create_secret` por SQL, que no es lo
que hace la app); dejar la clave de relleno en `prepararSubasta()` (la usan tres specs y sólo uno la necesita); que `empresa.spec.ts` devuelva Vault a como estaba (es
9-8, más grande: tiene que apartar una clave real sin leerla); un `retries` o un `waitForTimeout` para el pie (un e2e que falla no se reintenta, y esperar un tiempo
sólo corre la ventana); correr la copia con CPU limitada en CI (17 s por caso y un reloj que no es el de la máquina).

**Consecuencia:** cualquier spec que use estado ajeno se prueba solo tras `pnpm db:reset`; una espera nueva es de un estado y viene con su página armada; el
estimado mensual de CI-1 queda reemplazado por el medido; la propuesta de los `needs` espera a la persona. Falta que `empresa.spec.ts` deje Vault limpio (9-8).

## 2026-10-25 — CI-3: lo que acomoda la hidratación se mide con una espera propia, no cambiando `aLaVistaSinDesplazar`

**Contexto:** el dispatch 40241115895 (escritorio, `carreras: true`) dejó un rojo de 175 en el bloque 1: `configuracion-200.spec.ts:177`, la pestaña
«seguimientos» de Configuración › Leads «pasa el ancho de la página» (1490 > 1280). `PestanasConDesborde` trae la pestaña abierta a la vista en un
`useEffect`; `aria-selected` ya viene en el HTML del servidor, así que `toBeVisible()` pasa antes de que la barra se desplace, y la prueba medía una vez.
La traza de CI lo muestra (la barra en 0 a los 158.866 ms, la medición a los 158.934, la barra desplazada a los 159.021) y en local cae desde 2×
(`docs/BITACORA.md`, «CI-3»). No es un defecto del producto: la pestaña siempre llega a la vista, 70 ms después de verse en una PC rápida.

**Decisión:**

- **Un ayudante nuevo, `aLaVistaAlAcomodarse(lugar, que)`** (`e2e/soporte/recorrido.ts`), que reintenta `aLaVistaSinDesplazar` hasta que se cumple
  (`toPass`, tope de 10 s): espera el estado «quedó a la vista», no un tiempo. Lo usan las tres mediciones de la pestaña abierta de
  `configuracion-200.spec.ts` (el bucle `PANTALLAS`, «antes de cargar» y «al ampliar», que ya tenía su `toPass` de 3 s suelto).
- **No se cambia `aLaVistaSinDesplazar`** (la opción b). Tenía 27 llamadas en 9 specs (hoy 24: tres pasan al ayudante nuevo) (`configuracion-200`, `equipo-200`, `equipo`, `roles-niveles`,
  `leads-ficha-origen-inactivo-200`, `configuracion-leads-seguimientos`, `configuracion-cotizacion-niveles`, `menu-de-acciones-200`,
  `barra-de-filtros-200`) y la auditoría no encontró otra que dependa de un efecto: casi todas miden filas, menús ya quietos (`quieto()`) o la cabecera.
  Ninguna depende de medir de inmediato, pero ponerles la espera a todas haría que cada fallo verdadero tarde el tope en decirse y escondería
  durante 10 s un estado intermedio que alguna sí quiere ver.
- **Vive en `recorrido.ts` y no en `esperas.ts`:** `recorrido.ts` importa de `esperas.ts`, y la espera necesita la medición; al revés sería un
  círculo. La guarda `sin-celular` la reconoce como «ayudante que mide» por transitividad, sin cambios.
- **La prueba permanente** es una página armada en `recorrido-esperas.spec.ts` (una barra de 220 px que se desplaza 600 ms después de cargar): la medición
  de antes cae, la nueva pasa, y quitar el `toPass` hace caer la segunda (escritorio y celular).
- **La auditoría encontró una más que caía** (`configuracion-200.spec.ts:129`, el bucle `PANTALLAS`: 7 pantallas con la pestaña abierta que no es la
  primera; 2 a 10 caídas por corrida a 14× y 20×) y se arregló con el mismo ayudante. Las que no cayeron van juntas a `docs/PLAN.md`, **9-9**.

**Alternativas:** la espera dentro de `aLaVistaSinDesplazar` (descartada arriba); esperar la pista de la izquierda (`data-visible`), como CI-2 en la
barra de la ficha (sólo existe si la abierta no es la primera: no sirve para el bucle); que el producto desplace la barra antes de pintar (en el servidor
no se sabe el ancho, y el efecto ya es lo que corresponde; no es un defecto); un `waitForTimeout` (esperar un tiempo sólo corre la ventana).

**Consecuencia:** tras un `goto`, lo que una barra con desborde acomoda se mide con `aLaVistaAlAcomodarse()` (la cláusula va en la regla de CI-2 de
`.claude/rules/e2e.md`); lo demás sigue midiendo una vez. Quedan sin reproducir y anotadas las de 9-9.

## 2026-10-26 — Niveles de e2e en la Fase 4: los pasos de pura pantalla van con Nivel 1 y el completo cada 3

**Contexto:** la persona lo decidió el 2026-10-25, al pedir el paso 4.11. La Partición de la Fase 4 (`docs/PLAN.md`) tiene 28 pasos, y la mitad son de pura
pantalla (el `XCell`, la hoja, los paneles, el listado, la tarjeta, los editores). Con el Nivel 2 en cada uno, el completo de escritorio (≈ 27 min) correría en
casi todos, también donde no hay nada que una pantalla le pueda romper a otra.

**Decisión:**

- Los pasos de pura pantalla (**4.12–4.14 y 4.16–4.23**) van con el **Nivel 1**: lint, tipos, `pnpm test` y los e2e dirigidos en escritorio y en celular.
  Si tocan uno de los seis disparadores del Nivel 2 (por ejemplo `src/shared` o el `_shell`), corren el Nivel 2 por eso, como siempre.
- Además, el **completo de escritorio** corre en el **tercer paso de pantalla seguido sin completo** y en el **hito 4-A** (al cerrar 4.18).
- Los pasos de **datos y seguridad (4.11, 4.15, 4.24–4.27)** van con todo: el Nivel 1 y el Nivel 2.
- **La cuenta sale de BITACORA:** un paso de pantalla que no corre el completo escribe `e2e completo: no (4.xx, pantalla, n de 3)`; cualquier
  `e2e completo: sí` la vuelve a 0. Se cuenta desde el último `sí` (el del 4.11).

**Alternativas:** el Nivel 2 en cada paso (caro, sin más señal en los de pantalla); sólo el Nivel 1 hasta el hito (12 pasos sin ver lo que uno le rompe a
otra pantalla).

**Consecuencia:** la cláusula va en los niveles de `.claude/rules/e2e.md`. La columna «Nivel» de la Partición sigue diciendo el nivel por disparadores; el
completo cada 3 se lleva con el marcador, no en la tabla.

## 2026-10-26 — Paso 4.11: `puede_vehiculo()` y `vehiculos: leer` por fila, con la misma visibilidad

**Contexto:** la policy `vehiculos: leer` (`…20261013000100`) ya calculaba los orígenes una vez por sentencia, pero lo «propio» seguía preguntando
`lead_id in (select mis_leads())`; `puede_vehiculo()` (`…20261011000200`) además nombraba `alcance_de` dos veces. Es lo que el 4.10-1 hizo con `cotizaciones`
(`docs/PLAN.md`, «Lo que el código de la Fase 0 trae…»). Un agente revisó el plan en contra con el código delante (7 bloqueantes, 6 de diseño y 5 menores,
todos incorporados).

**Decisión:**

- **gl) El inventario (solo lectura, antes de editar).** En lo que gobierna vehículos, sus fotos, sus notas y la papelera, `mis_leads()` aparecía sólo en la
  policy y en `puede_vehiculo()`, las dos de este paso. Heredan la policy por RLS las fotos y su versión, `lead_vehiculos`, `vehiculos_para_lead`, la ficha, los
  seguimientos y recordatorios del lead y el tablero; pasan por `puede_vehiculo()` interesados, vínculos, conservados, `puede_unidad` (notas, historial,
  documentos, transportes, gastos), declaraciones, pagos, storage, vitrina, apibara, limpieza y las RPC de cotizaciones; la papelera se lee por funciones
  `definer` que no miran la cartera. `vehiculos: editar` ya no existía (`…000200_vehiculos_escritura.sql`). **No quedó nada para una entrada de PLAN.**
- **gm) La misma regla, demostrada contra la definición vieja.** `supabase/tests/vehiculos-visibilidad.sql` (al final de `db:probar`) copia la policy y la función
  de antes y compara, por persona, la policy nueva, la vieja, `puede_vehiculo()` nueva y la vieja (ver, editar y eliminar) y lo esperado: la dueña, «todos» en un
  origen, «propios» con cartera (dueña, compartida y un lead en la papelera), el dueño de los leads ajenos, sin `vehiculos.ver`, sin sesión y `anon`, sobre 23
  vehículos (creado por mí, de mi cartera, compartido, ajeno, sin lead, lead en la papelera, en limbo; en A, en B, en un origen inactivo y en la papelera). Después
  P transfiere un lead y queda como compartida (lo sigue viendo) y le quitan el acceso (lo pierde). **Va en su propio archivo, como el gemelo
  (`cotizaciones-visibilidad.sql`)**, aunque `migraciones.md` pide una prueba en `humo.sql`: el humo ya cubre la policy (`humo.sql:1338` y `:1955`) y la matriz necesita
  sus `pg_temp` (la copia vieja) lejos de los archivos de antes.
- **gn) `lead_id is not null and en_cartera(lead_id)`.** `en_cartera()` es `security definer` (no se inlinea) y casi todo vehículo no tiene lead. Con el molde tal cual,
  la «chica» (3 propios entre 125.000) pagaba una llamada por fila: **927 ms y 123.331 llamadas** con 250.000 vehículos, contra **32,7 ms** con la guarda (la vieja,
  34,3). Es equivalente (`en_cartera(null)` es falso); como la matriz no lo ve, lo fijan el texto de la policy y el assert «la chica no llama a `en_cartera`».
- **go) `alcance_de` una sola vez, como el argumento de un `case`.** El `cross join lateral (select alcance_de(…))` del gemelo lo aplana Postgres y vuelve a evaluar
  `alcance_de` en cada comparación (2 llamadas para quien ve «propios»). Un `offset 0` lo impedía, pero la guarda de `escala.sql` lo lee como paginación: no se tocó la
  guarda, se cambió la forma. **`puede_cotizacion()` tiene lo mismo** (contado: 2 llamadas): queda como **4-24**, sin arreglar.
- **gp) Beto, el caso que pidió la guarda.** El SubPlan con hash de `mis_leads()` se arma la primera vez que se evalúa, y el `or` corta antes: con la dueña («todos») y con
  quien ve «propios» sobre lo que creó, la policy vieja nunca llama a `mis_leads` y cuesta lo mismo (0,4 y 0,7 ms). La medición suma a Beto («propios», 50.000 leads en
  su cartera) sobre vehículos de su cartera: la vieja, **37,5 ms y 802 buffers** (1 llamada a `mis_leads`), la nueva **1,7 ms y 648**. Su tope de buffers es 1.000 y no
  300: cada fila de su cartera paga un sondeo de `leads_asesores_usuario_vigente_idx`. Y `puede_vehiculo()` de Beto: **34,5 → 0,5 ms**, con 1 `alcance_de` y 1 `en_cartera`.
- **gq) La medición** (`supabase/tests/medir-vehiculos-lectura.sql`, en `db:medir:volumen`): la consulta del inventario sin la portada embebida ni `limpieza_el` (las mide
  `medir-escala.sql`), el cursor con la forma de la app, las personas creadas con los triggers encendidos (sin ellos no hay perfil) y sólo los vehículos y la cartera con
  `replica`. La chica, sin assert de tiempo: **4-23**. Va antes de `medir-cotizaciones-lectura.sql`: `medir-bajas.sql` cae por los checkpoints de lo que escriben las de
  antes (5a-42: 26,4 s con esta medición antes y 27,8 s con ella después, 15,6 s sola, siempre 40 lotes), y `checkpoint` no se puede (`postgres` no tiene `pg_checkpoint`).
- **gr) 4-22, cerrado.** Ninguna prueba de `supabase/tests/` arma un dato con `random()`: números fijos, una secuencia del archivo donde un ayudante corre dos veces en un
  bloque (`cc_preparar()`), una secuencia en `medir-escala.sql`, una base fija en `medir-importacion-volumen.sql` y una base que corre con lo que dejó la corrida anterior
  en `medir-importacion-etapas.sql`. La guarda, `scripts/guardas/telefonos-en-pruebas.test.ts`.
- **gs) Lo que se hizo distinto del plan aprobado.** (1) El `case` en vez del `offset 0` (go). (2) Secuencias en `cotizacion-crear.sql` y `cotizacion-guardar.sql` en vez
  de números fijos (el fijo chocaba consigo mismo). (3) La medición de vehículos no va justo antes de `medir-bajas.sql` (gq). (4) El comentario de cabecera de
  `medir-cotizacion-guardar.sql` no citaba cifras: remitía a una tabla que no existe; se corrigió eso y las cifras de los topes, con las de hoy.

**Alternativas descartadas:** la policy llamando a `puede_vehiculo(id)` (relee cada fila y un `insert … returning` deja de andar); el molde sin `lead_id is not null`
(gn); el `offset 0` con una excepción en la guarda de `escala.sql`; armar ya la ruta de lo propio para la chica (adelanta 4-14 sin sus filtros: 4-23).

**Consecuencia:** quien ve «propios» paga, por página, un sondeo por cada fila de otra persona con lead; nunca el arreglo de su cartera. 4-23 y 4-24 quedan en PLAN.

## 2026-10-26 — Paso 4.12 (1 de 2): el núcleo de la `XCell`

**Contexto:** `XCell` es la celda de la hoja de cotizar (`docs/COTIZADOR.md` › «Binding con la XCell»; `docs/UX.md` › «Cotizar», 3). Este prompt la dibuja y la maneja sola, en
`src/shared/ui/xcell/`, sin pantalla (la hoja es el 4.13) y sin tocar `src/modules/cotizaciones`; la ayuda (`onHelp`) y el ⚙ (`settingsSlot`) son del prompt 2. Se hizo un plan; **la persona
contestó una pregunta** (el par: «Los dos lados») **y lo aprobó con siete ajustes** (la precisión al abrir, el primer carácter, el foco al montar, los blancos, el Modo Live, la caja de la entrada y el orden de Tab), todos incorporados.

**Decisión:**

- **gt) `overridden` entra al binding.** `value`, `defaultValue` y `suggested` no distinguen «modificado» de «input» en un sobrescribible (con un override el motor no calcula el sugerido, 4-1, y
  `defaultValue` sólo existe para constantes y tipos de cambio). La celda recibe `fuentes[id] === 'override'`. Los estados se suman (`data-estado`): modificado gana sobre sugerido; deshabilitado se suma.
  ↺ dice a dónde vuelve («valor por defecto» o «sugerido») y nunca la cifra.
- **gu) El par, por los dos lados** (la persona). El principal y el secundario son dos paradas de `Tab` de una celda; cada uno emite `onCommit(suId, valor)` y ↺ emite `onReset(id)`. La celda no calcula: la hoja
  traduce (editar el % quita el override del monto; ↺ quita los dos).
- **gv) Sin emisión falsa.** El texto con que se abre lleva la precisión completa (`formatearParaEditar`: 15 cifras significativas, sin agrupar, con el decimal del locale), no los decimales con que se muestra.
  «Cambió» es: el texto es otro **y** el número, a 15 cifras, es otro que `value` a 15 cifras. Abrir y salir con Tab con 1234,567, con 14,94 % o con 0,1 + 0,2 no emite, y un sugerido no se vuelve override por pasar por la celda.
- **gw) El número tipeado, con el parser que ya hay.** `aNumero` (exportado, sin cambiarlo) con un `trim` antes (`aNumero('  ')` da 0) y `Number.isFinite` (cae «Infinity», «1e999», «1,2,3»). Vacío emite `null`. Un porcentaje se tipea en puntos y se
  emite como fracción. **Heredado y sin arreglar: «1e3», «0x10» y «1.234» = 1,234** (**4-25**, a decidir en 4.13).
- **gx) El rango, lo obligatorio y lo entero los valida la base**, no la celda (`cotizacion_evaluar`, `_cotizacion_tipeado`); su mensaje vuelve por `error`. La celda sólo sabe si lo escrito es un número finito.
- **gy) Una parada de `Tab` por valor; las acciones, con las flechas.** La ranura de acciones va antes del valor en el DOM (es la cabecera y así se lee); si sus botones fueran paradas de `Tab`, cada celda con ↺ (y con ayuda y ⚙ en el prompt 2)
  sumaría paradas antes de su valor y «Tab avanza» dejaría de ser de celda en celda. Van con `tabIndex -1` y se alcanzan con `→` desde el valor (valor → secundario → ayuda → ⚙ → ↺), `←` vuelve y `Esc` en una acción vuelve al valor. Las flechas
  son de la celda, y en la entrada abierta mueven el cursor. **El prompt 2 suma la ayuda y el ⚙ a esa ranura y a ese recorrido, sin decidir nada nuevo.**
- **gz) Tres cosas que jsdom no ve y el e2e sí** (cada una se probó con una mutación del código): (1) tipear abre la edición con ese carácter y el `keydown` se frena, o el navegador lo inserta otra vez («55»); (2) Enter frena su `keydown`, o su
  `keypress` cae en el botón que ocupa su lugar y reabre la edición; (3) Tab confirma sin frenar y la entrada se va cuando pierde el foco: desmontarla antes deja al navegador sin lugar de partida y Tab no avanza. El foco vuelve al botón por un ref que sólo
  se marca al cerrar una edición: 300 celdas montadas dejan el foco en `body`.
- **ha) El tono por clave, sin un color escrito en el componente.** La celda pone `data-tono` y lee `--tono-fondo|borde|tinta`; `<EstiloDeTonos>` (sin `'use client'`, como `<EstiloDeMarca>`) escribe una regla por tono, en claro y bajo `.dark`, desde las filas de `tonos`
  (AA validado en la base). `cssDeTonos()` valida con Zod (la clave de `_tono_clave()` y `#rrggbb`) y descarta el tono entero si algo falla; el selector no lleva comillas. Una clave desconocida cae a los tokens neutros.
- **hb) Modo Live: la entrada es `type="password"`.** El plan proponía `-webkit-text-security`; se midió con CDP (`Accessibility.getFullAXTree`, no `ariaSnapshot()`, que lee `input.value` desde el DOM aunque el campo sea de contraseña): con sólo el CSS el valor
  seguía en el árbol de accesibilidad (`1234,567`); con `type="password"` sale enmascarado, y sin Live queda a la vista del lector. La entrada abierta (una sola por hoja) lee `useLive()`. Firefox no se prueba (los proyectos son Chromium).
- **hc) El banco del e2e, sin una ruta en `src/app`.** `e2e/soporte/banco.ts` compila `banco-de-xcell.tsx` con el esbuild que trae `tsx` (resuelto desde él; sin dependencia nueva) y lo sirve con `page.route` en `/__banco/xcell`, vestido con las hojas de estilo de `/ingreso`.
  La celda se prueba hidratada, con un teclado de verdad. El HTML no pasa por el servidor, así que no hay nada que viaje en el build de producción. Tailwind detecta las fuentes del repositorio: no hizo falta un `@source`.
- **hd) El foco, en `--color-primario-ink`.** El contorno salió con `--color-primario` (#3b5bdb) y sobre el fondo oscuro da 2,8:1 (WCAG 1.4.11 pide 3:1); se vio al mirar las capturas. Ahora es el `-ink` y el e2e mide ≥ 3:1 contra el fondo de la celda en los dos temas.
  Los controles de una celda se separan 8 px (el contorno ocupa 4): el del `%` tocaba al monto cuando el par se apila.
- **he) Los topes de nodos, medidos.** Por celda: normal 8, par 9, sugerido 10, modificado 11, deshabilitado 11, con error 11, par modificado con error 15 (el peor). Iconos por sprite (2 nodos cada uno; lucide serían 4 o 5). 300 celdas de la mezcla del banco: 2.688 (tope 2.800).
- **hf) Nivel 2: no se corrió.** Nadie importa la carpeta nueva. De lo que ya existía en `src/shared`, lo único que cambia es una función nueva (`formatearParaEditar`) y un `export` sin cambio de conducta (`aNumero`); `globals.css` quedó igual. El disparador (1) de `e2e.md` lo pediría por tocar `src/shared`;
  se decidió que lo corre el prompt 2, que cierra la fila.
- **hg) Lo que se hizo distinto del plan aprobado.** (1) Live: `type="password"` en vez de `-webkit-text-security` (hb), y `globals.css` sin cambios. (2) Los topes de nodos: 15 y 2.800, no 18 y 5.400 (he). (3) El foco y la separación (hd). (4) Partir `xcell.tsx` en `use-edicion.ts`, `lado-de-xcell.tsx`,
  `boton-del-valor.tsx`, `cabecera-de-xcell.tsx` y `nota-de-xcell.tsx`, y las pruebas en cuatro archivos, por las reglas de complejidad y de líneas.

**Alternativas descartadas:** los botones de acción como paradas de `Tab`; desmontar la entrada al hacer Tab; `-webkit-text-security` a secas; una ruta de pruebas en `src/app`; `@playwright/experimental-ct-react` (dependencia nueva); el `<Input>` de shadcn para la edición (trae `dark:bg-input/30` y
`aria-invalid:border-destructive`); un parser nuevo.

**Consecuencia:** el prompt 2 (la ayuda y el ⚙) y el 4.13 (la hoja: traduce el par, recalcula con `cotizacion_evaluar` y devuelve `error`) parten de este contrato. **4-25** queda en PLAN.

## 2026-10-26 — Paso 4.12 (2 de 2): la ayuda y el ⚙ de la `XCell`, y el cierre de la fila

**Contexto:** el prompt 1 dejó la ranura de acciones y el recorrido con flechas (valor → secundario → ayuda → ⚙ → ↺) y dijo que el 2 «suma la ayuda y el ⚙ sin decidir nada nuevo» (gy). Este prompt los suma, anuncia las flechas, mitiga los
gestores de contraseñas en Modo Live, saca el ayudante de pruebas del aspecto de producto, vuelve a medir los nodos y corre el Nivel 2 que cierra la fila. Sigue sin pantalla y sin tocar `src/modules/cotizaciones` ni la base. Se hizo un plan y **la persona lo aprobó
sin cambios**.

**Decisión:**

- **hh) La forma: bandera y callback aparte, los mismos callbacks para todas las celdas.** `hasHelp` / `onHelp(id)` y `hasSettings` / `onSettings(id)`; cada botón se dibuja con la bandera **y** el callback (`accionesDe()` en `estado.ts`, pura y con test): una bandera sin
  callback sería un botón muerto. Se descartó un solo callback opcional por celda: la hoja tendría que armar un ternario por celda y, con él, una función nueva por render que dibuja las 300 celdas (el memo). Emiten el id **de la celda** (no el del secundario) y **no mueven el foco**:
  devolverlo al cerrar lo que se abrió es de la hoja (4.13), porque la celda no sabe qué se abrió. **La celda no decide permisos**: la hoja calcula las banderas.
- **hi) La ayuda no es sólo de una tabla.** El binding decía «`onHelp` si el nodo viene de una tabla»; el diseño (`docs/COTIZADOR.md` › `celda`) trae `ayuda?` = una `tabla` **o** un `texto` (1 a 300). `hasHelp` es «la celda del diseño trae `ayuda`»; lo que abre lo decide la hoja.
  El binding en COTIZADOR queda corregido (y `settingsSlot` ya no existe: el ⚙ es `hasSettings` / `onSettings`).
- **hj) Deshabilitada y Modo Live.** Deshabilitada: la ayuda y el ⚙ **siguen** (la ayuda informa; el ⚙ cambia el default global, versión N+1: ninguno escribe en esta cotización) y ↺ se va (ése sí escribe). Si no corresponde (un tipo de cambio sin permiso), la hoja no manda `hasSettings`.
  Modo Live: siguen (Live esconde cifras, no acciones, y ↺ también sigue); los botones no dicen ninguna cifra y la cabecera no lee `useLive()`, así que encender Live no la dibuja de nuevo.
- **hk) Nombres con el glosario y la etiqueta de la celda.** «Ayuda de {label}» (GLOSARIO › «Celda (de la hoja)»: «su ayuda») y «Cambiar el valor por defecto de {label}» (GLOSARIO › «Constante»: «valor por defecto versionado que el ⚙ cambia»; la misma palabra que ↺, «Volver al valor por defecto»).
  Iconos por el sprite (`xcell-ayuda`, `xcell-ajustes`, los trazos de `circle-help` y `settings` de lucide, sin dependencia); un test dice que cada id existe y tiene trazo.
- **hl) El atajo se anuncia con una descripción, no sólo con `aria-keyshortcuts`.** Ya había `aria-keyshortcuts="ArrowRight"`, pero (a) salía con `hayPar || hayRestablecer`: un par sin acciones lo anunciaba sin tenerlas, y sólo en el lado principal; y (b) NVDA y JAWS no lo leen. Ahora, **con acciones y en los dos lados**, el valor lleva
  el atributo **y** `aria-describedby` a «Más acciones con la flecha derecha.», después de la nota (el motivo del candado o el error). El texto vive **una vez por hoja** en `<SimbolosDeXCell/>` (`hidden`: una descripción referida por `aria-describedby` se calcula aunque el nodo esté oculto; medido con CDP):
  0 nodos por celda. Lo prueba el e2e de teclado con la descripción que entrega `Accessibility.getPartialAXTree` (con acciones, en el principal y el secundario; sin acciones, vacía; con candado y acciones, las dos cosas).
- **hm) Live y gestores de contraseñas: marcas, y una prueba que no se puede hacer aquí.** La entrada `type="password"` (hb) puede hacer que Chrome ofrezca «Guardar contraseña» cuando desaparece con texto. Con Live: `autoComplete="off"`, `data-1p-ignore`, `data-lpignore="true"`, `data-bwignore` y `data-form-type="other"`
  (1Password, LastPass, Bitwarden, Dashlane). Chrome ignora `autocomplete="off"` en un campo de contraseña y no tiene marca propia: **el riesgo queda**. **No se puede probar aquí:** el Chromium de Playwright no trae gestor; los tests afirman que las marcas están y no que Chrome no ofrezca guardar. Se descartó
  `autocomplete="one-time-code"` (el teclado del celular ofrecería los códigos de los SMS). Se mira a mano, con un Chrome con sesión y Live encendido, cuando exista la hoja (4.13).
- **hn) El ayudante de pruebas, como `*.soporte.*`.** `celda-de-prueba.tsx` importaba vitest y testing-library desde el árbol del producto. El repo ya tiene el patrón: `src/modules/vehiculos/infra/funcion-apibara.soporte.ts` (también importa vitest). Pasa a `xcell.soporte.tsx` y `scripts/mapa.sh` deja de listar `*.soporte.*` en
  `src/shared` (el MAPA dice «sin los tests»).
- **ho) Los nodos, medidos, y los topes a lo medido.** Normal 8, par 9, sugerido 10, modificado 11, deshabilitado 11; **la ayuda o el ⚙ suman 3 cada uno** (11; los dos, 14; modificado con los dos, 17); el peor, par modificado con error, ayuda y ⚙: **21** (era 15). 300 celdas de la mezcla del banco: **3.000**
  (tope 3.100; eran 2.688 y 2.800); la mezcla de `xcell-hoja.test.tsx`: 3.368 (tope 3.500). Un nodo de más por celda son 300: lo ven los dos topes.
- **hp) Lo que el recorrido mostró y cambió la cabecera.** Con las tres acciones a 0 px una de otra, la geometría cayó (el contorno del foco ocupa 4 px): `gap-2`, los mismos 8 px que entre los valores. Y en el celular al 200 % la celda más cargada (etiqueta larga y tres acciones de 44 px) dejaba la etiqueta en
  una columna angosta que quebraba «despachan/te» y «nacionaliz/ación»: no se cortaba, pero no se leía. La cabecera pasa a `flex-wrap`, la etiqueta pide 6 rem y las acciones bajan a su fila, a la derecha, cuando no caben. Las capturas, en claro y oscuro, 100 y 200 %, 412 y 1.280 px, lo muestran.
- **hq) `accionesDe()` sale de `XCellBase`.** Con las tres acciones la función pasó de las reglas de complejidad (17 > 12) y de líneas: qué acciones hay y qué dice ↺ es una regla pura y va a `estado.ts`, con su test.
- **hr) Nivel 2: corrido, en verde, y cierra la fila.** `pnpm test:e2e:completo --project=escritorio` (con `functions serve`), después del último cambio de código: **712 en verde, 16 saltados, 0 fallos, 27,2 min de pruebas** (de las 09:53:22 a las 10:21:23, hora de La Paz; incluye `leads-exportar`, que no cayó).
  El primer intento (09:48:59) se detuvo a los 52 s en `next build` con el aviso de seguridad de Next (`SecurityFatalError`), después de las carreras de la base (168 en verde); se repitió el mismo comando una vez, como se pidió, y compiló. No se corrió `next upgrade`: decide la persona. De las seis corridas de los e2e
  dirigidos de la xcell (los dos proyectos), tres se detuvieron igual en `next build` y se repitieron una vez; la segunda corrió con 12 fallos (tres causas, en los dos proyectos: hp, hs y el tope de ho) y la cuarta y la sexta pasaron, **34 en verde**.
- **hs) Lo que se hizo distinto del plan aprobado.** (1) La cabecera con `flex-wrap` y el `gap-2` (hp): salieron de mirar las capturas. (2) `accionesDe()` en `estado.ts` (hq). (3) Los topes de nodos 3.100 y 3.500 (el plan los dejaba «a lo medido»). (4) `data-1p-ignore` y `data-bwignore` con `"true"`: React escribe un `true`
  booleano en un atributo `data-*` como el texto «true», no vacío.

**Alternativas descartadas:** un solo callback opcional por celda; la ayuda sólo para tablas; esconder el ⚙ y la ayuda en una celda deshabilitada o en Modo Live; `aria-keyshortcuts` a secas; una descripción por celda (un nodo más en cada una); `autocomplete="one-time-code"`; un `.test.tsx` para el ayudante
(un archivo de test que otros importan se confunde con uno que corre).

**Consecuencia:** la fila 4.12 de PLAN queda hecha. El 4.13 (la hoja) calcula `hasHelp` y `hasSettings` con el diseño y los permisos, pasa **los mismos** callbacks a todas las celdas, devuelve el foco al cerrar lo que se abrió, y decide el borde del par sin modificar (visto en 4.12-1) y **4-25** (el parser de números).

## 2026-10-26 — CI-4: una prueba que lee un texto que depende de un POST lento espera el POST, con un tope propio

**Contexto:** el dispatch 40320539963 cayó en `e2e/leads-exportar.spec.ts:263` (la prueba «más de 5.000 leads»). Leía el texto del diálogo con los 5 s de fábrica de `expect` sobre
un `POST /leads/exportar` que cuenta hasta 5.001 leads, y la base tardó más de 5,4 s en contestar: el diálogo seguía en «Descargando…». La traza, la comparación con el bloque 2 de
CI-1 y las hipótesis descartadas están en `docs/BITACORA.md`, «CI-4». La prueba pasaba en local y en CI-1; por qué se atrasó la base no se pudo probar (`docs/PLAN.md` **4-26**).

**Decisión:**

- Una prueba cuyo texto depende de un pedido que puede tardar **espera el pedido**: `page.waitForResponse` armado antes del clic, **con un tope propio** (30 s), comprueba su
  estado y su cuerpo y recién entonces lee el texto. Deja en el log (`console.warn`, como los otros specs) lo que tardaron la siembra y la respuesta, para que un tiempo malo se
  vea aunque la prueba pase.
- El tope es de ese pedido: no se toca el `expect.timeout` de `playwright.config.ts` (5 s) ni el `test.setTimeout` de la prueba (180 s).
- Las demás esperas con el mismo patrón se **listan y no se arreglan de paso**: `docs/PLAN.md` **9-10**, en la Fase 9 junto a 9-9 (decidido por la persona).
- La causa de fondo, la base lenta tras una ráfaga de altas, es **4-26** y se mide **antes del 4.15** (decidido por la persona); que un rojo del e2e deje los logs de la base en el
  artefacto es **9-11**, para el próximo cambio del workflow y no en este commit.

**Alternativas:**

- Subir `expect.timeout` a 15 o 30 s para todo el e2e: esconde un servidor lento en cada prueba y alarga cada rojo verdadero. Con 10 s esta prueba habría pasado «lenta pero
  verde» y nadie se habría enterado de que la base tardó 5,4 s.
- Subir el `test.setTimeout`: no cambia los 5 s de un `expect`.
- Reintentar la prueba: `retries: 0` es a propósito (un test flaky es un bug, no un número que subir), y el segundo intento habría pasado sin decir nada.
- Bajar la prueba a `db:probar` (`docs/RENDIMIENTO.md` la nombra como la más lenta de la suite): el mensaje «Hay más de 5.000 leads…» sólo lo afirma esta prueba, y bajarla pide su
  mutación primero. No era la causa del rojo.

**Consecuencia:** un servidor colgado falla a los 30 s con `page.waitForResponse: Timeout 30000ms exceeded`, en lugar de un texto que no aparece a los 5 s; uno lento pero que
contesta pasa, y su tiempo queda en el log. Probado con una copia que demora el POST: 6 s, la prueba de antes cae y la nueva pasa; 35 s, la nueva cae a los 30 s. No hubo dispatch:
el del hito 4.18 confirma el arreglo en CI.

## 2026-10-26 — Paso 4.13 (1 de 4): la lectura que abre la hoja y el modo por clave

**Contexto:** el 4.13 dibuja la hoja de cotizar desde el diseño publicado (D7). Antes de la pantalla hacía falta **una sola lectura** que la hoja haga al abrir: el diseño recortado al nivel de quien mira (lo que no ve no llega: ni su id, ni su etiqueta, ni su valor, ni su tono, ni su ayuda;
lo que ve y no edita llega con su motivo), lo que necesita para dibujarse sin otra consulta, la versión de la fórmula y la hora de la base para D2 (`p_formula_abierta`, `p_abierta_en`) y el estado «sin publicar». Ni `cotizacion_leer`, ni `formula_para_cotizar` ni `cotizacion_evaluar` daban eso
(la tabla de «qué se reusa» está en `docs/COTIZADOR.md` › «La lectura que abre la hoja (4.13-1)»). Se hizo un plan; **un agente lo revisó en contra con el código delante** (2 bloqueantes, 7 a corregir y 9 menores, todos incorporados) y **la persona eligió dos cosas** (hy y hz).

**Decisión:**

- **ht) La partición en cuatro prompts**, con la propuesta de la persona y tres cambios con su razón. (1) La lectura **y el modo por clave en `cotizacion_evaluar`** (hy) van juntos: son contrato de la base y los cubren la misma cadena db y el mismo inventario; así el 2 queda de pura pantalla. (2) El **total del resumen entra en el 2, sin fijar**: si no, el
  recálculo no se ve ni se prueba; el 4 lo fija. (3) **4-25 va en el 3** (guardar): toca `src/shared`, es Nivel 2 y en el 2, el prompt más grande, sumaría ≈ 25 min. La **ayuda** pasa al 4 (es otra cosa que se abre, con su URL y el foco que vuelve a la celda); el ⚙ sigue sin callback hasta el 4.20. Sin Nivel 2 en este prompt
  (ningún disparador: ni policy, ni `schemas/`, ni `src/shared`; `database.types.ts` es de la cadena db, como en el 4.02): `e2e completo: no (4.13-1, pantalla, 1 de 3)`.
- **hu) Una lectura, `cotizacion_hoja(origen)`, y un ayudante de nadie, `_cotizacion_hoja(fórmula, origen)`.** El permiso (`cotizaciones.crear` del origen) va **antes** de mirar si el origen existe (el mismo 42501 con cualquier uuid; un origen que no existe, para quien cotiza en todos, 22023). Reusa `_nodos_visibles()` y
  `_cotizacion_contexto()`: **un ítem viaja si su nodo está en `ok`**, la regla del recorte de `leer` y `evaluar`. El 4.15 abrirá con SU versión llamando al ayudante. No lee cotizaciones ni el snapshot.
- **hv) Qué viaja y qué nunca.** Nunca viajan `de`, `texto`, `match`, `sobre`, `sugerido_de`, `descripcion` ni los grupos (id y etiqueta): pueden nombrar un nodo oculto. Una sección sólo viaja si le queda un ítem (si no, tampoco su título). Los **modos viajan con su clave y su nombre**: sus `buckets` nombran tipos de cambio y la matriz
  de `cotizaciones-visibilidad.sql` ya esconde uno en «costos». `condicion` y `requerido_si` de una celda viajan **sólo si su bandera se ve**; los `tonos`, sólo los que usa lo que viaja. Los nodos de más que `_nodos_visibles()` da a quien configura nunca son un ítem (todo nodo que un ítem nombra está en la visibilidad).
- **hw) El candado y su motivo.** `editable` = `editar` y que el nodo acepte un valor (la regla del `v_acepta` de `evaluar_formula()`; no había un espejo de `aceptaValor()` en SQL) **en una celda**; en la variante y el interruptor, sólo `editar` (una opción y una bandera no «aceptan valor» y se editan: el plan lo había escrito mal y la revisión
  lo vio). **Lo que no se edita lleva motivo y lo que se edita no** (`se_calcula`, `del_vehiculo`, `nivel` con el **nombre** del nivel, `no_se_edita`): se asegura en la base, en la prueba y en el Zod. El **secundario de un par tiene su propio candado**: en `transferencia`, el monto se calcula y su porcentaje se edita. El ⚙ (`ajustes`) no depende de
  `editable`. La columna «tipo de cambio de la empresa sin permiso de editarlo» de `docs/COTIZADOR.md` era un candado que la base no aplica: se corrigió (el permiso de los tipos de cambio es del ⚙).
- **hx) La ayuda y los atajos.** La ayuda de una tabla viaja con la regla **exacta** de `cotizacion_tabla()`: quien configura el origen, o algún nodo de `_nodos_visibles()` (no de `ok`) que la lee; y si la tabla existe (la congelada, aunque esté vacía, o la viva del origen o la compartida). El plan decía «algún nodo visible la lee» y dejaba fuera a quien configura:
  la paridad por persona lo cazó. Los chips salen de la misma fuente, con `limit`; la etiqueta es **texto** (el año de `depreciacion` es un número) y el valor, un número o nulo (el transporte tiene filas nulas).
- **hy) `cotizacion_evaluar(…, p_modo_tc)`** (elegido por la persona entre este prompt y el 2). Un texto en `p_modo` **no** servía: `_motor_forma_modo` lo rechaza antes de buscar nada y el corpus del motor fija ese caso (el 768). Es un parámetro nuevo con el mismo nombre que en crear y guardar, convertido con `_cotizacion_modo()` antes de revisar lo tipeado;
  la clave y el objeto a la vez, `llamada_invalida`. Se borra la firma de cinco argumentos (si no, toda llamada con cinco es ambigua) y se actualizan las firmas de tres pruebas y de las carreras.
- **hz) La hora es `now()`.** El reloj con que sellan publicar y `tipos_cambio_historial`, y siempre anterior al `clock_timestamp()` con que `cotizacion_crear` rechaza una hora futura. Al leer D2 apareció **4-27**: el tope de 24 h de «Guardar con la N» sólo corre si la versión cambió, y con la vigente el cliente puede congelar las tarifas de cualquier hora pasada
  (`p_abierta_en` lo manda él); además, un cambio de tarifa que empezó antes de abrir y confirmó después cuenta como visto. **La persona eligió** dejarlo anotado con su assert y arreglarlo en el 4.13-3, el primer prompt que conecta la pantalla a `cotizacion_crear`.
- **ia) La matriz por nivel vive en `cotizacion-hoja.sql`, no en `cotizaciones-visibilidad.sql`.** La fórmula de prueba (lo oculto en toda forma) se publica por el camino de verdad (`_preparar_publicacion()`) y hace falta antes del bloque; ese archivo ya tiene 1.700 líneas. El inventario la registra como `recorta` con esa matriz como `cubierta_por`. Las nueve personas
  comparan la **lista exacta de ítems** y las claves y hojas de la respuesta, no texto (los uuids y las horas dan falsos positivos), y la paridad de la ayuda por persona contra `cotizacion_tabla()`.
- **ib) Escala y su tope.** Un caso por apertura, sin lista ni cursor: **16 KB** para la hoja de las capturas como dueña (medido: 10,3 KB; la asesora, 6,0 KB), 10 ms (3,9), 0 bloques de `cotizaciones`, de `cotizaciones_revisiones` y de sus índices (por relación, no buffers totales) y los atajos de una tabla viva con `limit` (3 bloques contra 91 sin él). Una sola función por nodo
  (`_hoja_estado()` con la regla de `aceptaValor()` adentro) bajó la sintética de 2.487 nodos de 284 a 157 ms. La razón entre 255 y 2.487 nodos es 13,7 (tope 15; una cuadrática daría ≈ 95). `docs/RENDIMIENTO.md`.
- **ic) Del lado de la app, sólo el tipo y la lectura.** `entities/hoja-esquema.ts` (el Zod, no estricto: lo que el tipo no nombra se cae; «se edita ⇔ no hay motivo») y `entities/hoja.ts` (camelCase, `hojaDesde()`), `LectorDeHoja`, `infra/queries/hoja.ts` (**una** llamada) y `composicion.ts`. La clave del tono se lee con `esquemaId` (la regex de `tonos.ts` es más angosta que la
  columna). `Tono` entra con `import type` desde `@/shared/ui/xcell` (un import de valor lo frena `barriles.test.ts`).
- **id) Lo que se hizo distinto del plan aprobado.** (1) Una sola función `_hoja_estado()` y no dos (ib). (2) La matriz en `cotizacion-hoja.sql` (ia). (3) Tope de la razón 15 y no 12. (4) La medición se registra en `scripts/mediciones.mjs` (el plan decía `medir-listado.mjs`). (5) La fórmula de prueba suma una cuarta fila congelada y un dato del vehículo dibujado como celda: sin
  la primera, quitar el tope de `filas` sobrevivía; sin la segunda, `del_vehiculo` no se ejercía. (6) Los chips, la ayuda y el recorte de tonos salen de mapas en memoria armados una vez (un `jsonb` leído de la tabla se relee entero en cada operador).

**Alternativas descartadas:**

- **hu)** Reusar `formula_para_cotizar` (entera, y sólo para quien configura) o `cotizacion_leer` (lee una cotización y no trae el diseño). **hv)** Mandar los `buckets` de cada modo (delatan el tipo de cambio de un nivel). **hw)** Aplicar el espejo de `aceptaValor()` también a la variante y al interruptor (los bloqueaba siempre).
  **hy)** Aceptar un texto en `p_modo` (rompe el caso 768 del corpus); dejar el modo por clave para el 2 (mezcla una migración con la pantalla más grande). **hz)** Arreglar 4-27 ya (cambia `cotizacion_crear` en un prompt de lectura). **ia)** Meter la matriz en `cotizaciones-visibilidad.sql` (la fórmula de prueba se arma después).

**Consecuencia:**

- **Mutaciones: 33.** 30 de SQL contra el Postgres 17 local (una por regla del recorte, del candado, de la ayuda, de los atajos, del permiso, de «sin publicar», de la hora y de `p_modo_tc`), una de TS (sin la coherencia «se edita ⇔ sin motivo»), una de la infra (sin validar el origen) y la del registro (sacar `cotizacion_hoja` del inventario rompe `cotizaciones-visibilidad.sql`:
  «sin registrar»). **Caen las 33**; dos pruebas se reforzaron porque una mutación sobrevivía (la cuarta fila congelada y el dato del vehículo). Dos no se mutaron porque serían equivalentes por construcción: las secciones vacías (una sección se arma sólo de ítems que sobreviven) y los secundarios de la tarjeta sin `ok` (los `aparte` siempre están en `ok`). La tabla, en `docs/BITACORA.md`.
- **Para el 4.13-2:** la pantalla lee con `leerHojaParaCotizar(origen)` (un Server Component), dibuja con `<EstiloDeTonos tonos>` y `<SimbolosDeXCell/>`, recalcula con `cotizacion_evaluar(…, p_modo_tc)` y no guarda. **Para el 4.13-3:** `formula.id` y `abiertaEn` son `p_formula_abierta` y `p_abierta_en`; **4-21**, **4-27** y **4-25**. **Para el 4.15:** `_cotizacion_hoja(formula, origen)` con SU versión.
- **Lo que no se hizo:** la pantalla, el Nivel 2 ni el Nivel 3, **4-27** (anotado), `next upgrade` ni empujar.

## 2026-10-26 — Paso 4.13 (2 de 4): la hoja dibujada y el recálculo, sin guardar

**Contexto:** el 4.13-1 dejó la lectura que abre la hoja (`cotizacion_hoja()`) y `cotizacion_evaluar(…, p_modo_tc)`. Este prompt es la primera pantalla de cotizar: `/cotizaciones/nuevo?origen=&lead=&vehiculo=` con las pestañas de origen, las secciones del diseño con sus `XCell`, la variante, los interruptores, los atajos y los subtotales, el recálculo en la
base y el total del resumen, sin guardar (4.13-3), sin «Avanzado» ni ayuda ni modos (4.13-4), sin paneles de lead y vehículo (4.14) ni navegación (4.16). Se hizo un plan; **un agente lo revisó en contra con el código delante** (5 bloqueantes, 11 a corregir y una decena de menores, todos incorporados salvo lo que eligió la persona) y la persona eligió cuatro
cosas (`ih` e `ii`).

**Decisión:**

- **ie) Una celda cuya bandera esconde el nivel: lo que se dibuja sale de `estados`, nunca de la lectura.** La lectura le quita a la celda `condicion` y `requerido_si` si su bandera no se ve; `solo_en` nunca falta (la variante es de nivel «todos»). Quien no ve la bandera no puede mandarla (`entrada_invalida`, igual que una que no existe), así que el recálculo le
  devuelve `estados[celda] = condicion_apagada` y valor 0, siempre. La hoja la dibuja **deshabilitada con «Está apagada en esta hoja.»**, sin nombrar nada: no sabe si el interruptor oculto era `habilita` o `muestra`, y esconder una celda por una ausencia sería deducir algo que la lectura no dice. Con la bandera a la vista, «Se habilita con «<interruptor>».»; una
  celda de una bandera `muestra` que se ve y está apagada no se dibuja. Probado con una fórmula de prueba publicada por SQL (`e2e/cotizar-hoja-niveles.spec.ts`): quien ve «todos» la ve apagada y sin interruptor (y su recálculo dice `condicion_apagada` sin nombrar `oculta_b`); quien ve «costos» ve el interruptor, lo enciende y la celda se habilita.
- **if) El recálculo vive en el navegador, con su cliente de Supabase** (`infra/recalculo.client.ts` tras `composicion.client.ts`, como `vehiculos_para_lead`), según `datos.md` («fetch desde el browser en `infra/*.client.ts`»). Una server action suma un salto (navegador → Next → PostgREST), vuelve a leer la sesión y `mis_permisos()` en cada pausa y Next encola las actions de toda
  la página; una ruta propia es lo mismo sin `next-safe-action`. La base ya exige `cotizaciones.crear` del origen y recorta lo oculto. **Pedidos por apertura:** dos en el servidor y en paralelo (`cotizacion_hoja` y el primer `cotizacion_evaluar`, así la hoja llega dibujada con sus valores), ninguno del navegador; una tercera sólo si la base rechaza el vehículo
  de la URL (se calcula sin él y se dice). Después, **uno por pausa**: la cola de `useRecalculo()` (150 ms desde la última confirmación; con uno en vuelo no sale otro, queda pendiente y sale uno solo, con lo más nuevo; el éxito **o el error** de un pedido sólo se aplica si nadie confirmó nada después). Sin `useEffect` que dispare un pedido: se programa desde el
  manejador del evento; el efecto sólo marca «vivo» y limpia, y al esconderse la pantalla (`<Activity>`) o desmontarse no manda nada y deja «No se pudo recalcular».
- **ig) El tope de nodos del DOM: se propuso 650 y se fijó 460.** 32 celdas × 15 (lo que pesa la `XCell` sin ayuda ni ⚙) + ≈ 170 de estructura daban 650; se midió con la fórmula más grande del juego (`subasta_usa`) como quien ve todos los niveles: **31 celdas, 411 nodos al abrir y 430 con la hoja usada**. El tope es lo medido más un 5 %. Lo vigila
  `e2e/cotizar-hoja-200.spec.ts` en los dos proyectos; con la ayuda y el ⚙ (3 nodos más por cada uno) se vuelve a medir en el 4.13-4. El diseño no tiene tope de tamaño: **4-30**.
- **ih) El par con el monto calculado se bloquea entero (elegido por la persona).** La `XCell` tiene un solo candado para los dos lados y en Transferencia, Garantía, Seguro, GA, IVA e ICE el monto se calcula y el porcentaje se edita. Se dibuja deshabilitado con el motivo del monto; el candado por lado (tocar `src/shared`, Nivel 2) entra con el 4.13-3, que ya lo toca por
  **4-25**. Si el monto se edita pero el porcentaje no (un nivel), también se bloquea entero: un lado que parece editable y no lo es sería un control que miente.
- **ii) «Avanzado» va en la hoja, en su orden** (elegido por la persona): las secciones `avanzado` se dibujan como las demás y el 4.13-4 las pasa al modal con URL; así la semilla ejercita los atajos, los subtotales y lo de «costos». **`?lead=` y `?vehiculo=` sólo se llevan** (se validan con `z.guid()`; sin lecturas de más). **El enlace de «Falta publicar la
  fórmula» va a Configuración › Cotización** (elegido; el revisor había propuesto la pantalla del origen, que abre con `cotizaciones.configurar`): hoy esa pantalla pide `equipo.roles.ver`, y se anota en la fila del 4.20.
- **ij) La base no rechaza el rango ni lo obligatorio, y no devuelve `defaults`.** Un número fuera de rango y un obligatorio vacío vuelven en `faltantes` (`fuera_de_rango`, `requerido_sin_valor` con la bandera en `ref`) con el valor en null; `cotizacion_evaluar` no los levanta como excepción. La hoja los traduce a `error` con un texto propio por código
  (`textoDelFaltante`, un `switch` exhaustivo). La ficha de la `XCell` y `docs/COTIZADOR.md` decían otra cosa: COTIZADOR se corrigió; la ficha (`src/shared`) se corrige en el 4.13-3. `defaultValue` es `null` sólo en una constante o un tipo de cambio («Volver al valor por defecto»); lo demás vuelve «al sugerido».
- **ik) Los textos son propios, nunca el mensaje de la base**, que puede nombrar un nodo que quien mira no ve (`_motor_sin_leer`). El error que un pedido devuelve se reduce a su código (`pideRecargar()`: una regla rota, la sesión o un permiso piden «Recargar»; lo demás, «Reintentar»). **Una celda bloqueada dice su motivo y no «falta un dato»**: la `XCell` muestra el error
  antes que el candado y una celda del vehículo sin vehículo perdía su «Viene del vehículo.» (lo vio la prueba de componente).
- **il) Lo tipeado manda sobre lo calculado mientras la respuesta no lo alcanza.** La `XCell` pinta `value` en cuanto confirma; sin esto, durante los 150 ms y el viaje —y para siempre si el recálculo falla— la celda volvía al número viejo y «la hoja conserva lo tipeado» era mentira. `overridden` sale de lo tipeado (no de la fuente de una respuesta vieja).
- **im) Todo lo que se busca por un id es un `Map` o un `Set`** (la respuesta, las entradas, el índice de la hoja): un id como «constructor» es legal y un objeto lo encuentra en su prototipo. Los `Map` cruzan de Server a Client Component.
- **in) El porcentaje de un par puede ser un `input`** y la lectura no dice el tipo del nodo (`secundario` no lleva `tipo_nodo`): editarlo va a `inputs` si su fuente en la última respuesta es `input` y a `overrides` si no (un override sobre un input lo descarta el motor). Es una heurística sobre un caso legal y no sembrado: **4-31** pide `tipo_nodo` en la lectura.
- **io) Lo que se hizo distinto del plan.** (1) Tope 460 y no 650 (ig). (2) Una celda bloqueada dice su motivo y no el error (ik). (3) Si el rol puede cotizar pero no tiene `cotizaciones.ver`, `cotizacion_hoja()` vuelve con `secciones: []` (cada nodo pide `ver`): la pantalla dice «No puedes ver esta hoja» en vez de una hoja vacía con un total (**4-32**). (4) Un origen desactivado no se cotiza (no
  tiene pestaña). (5) La prueba de seguridad compara **claves y hojas** (los ids de un nodo oculto llegan como claves de `valores`, `estados` y `fuentes`, no como hojas) y lee el payload RSC del **cuerpo del documento** y de las respuestas `rsc: 1` (Next vacía `self.__next_f` al hidratar). (6) El botón de «Falta publicar» pasó a primario: el outline no se veía.
  (7) Las capturas llevan el resumen a la vista antes de tomarse: queda al final de la hoja hasta el 4.13-4 y la primera captura no lo mostraba.

**Alternativas descartadas:**

- **if)** Una server action (un salto más, la sesión releída, la cola de Next) o una ruta propia. **if)** Que el recálculo espere a que se pare de tipear por tecla: la `XCell` ya emite sólo al confirmar. **ie)** Esconder la celda cuando no llega su bandera (deduce algo que la lectura no dice) o decir «la bandera X está apagada» (nombraría lo oculto).
- **ih)** Tocar la `XCell` ahora para un candado por lado (sube a Nivel 2 y cuenta 0 en la cuenta de pasos de pantalla); un monto «desbloqueado» que ignora lo que se tipea (un control que miente). **ij)** Mostrar el mensaje de la base en la celda (puede nombrar un nodo oculto). **ig)** Subir el tope a 650 «por si acaso»: un tope que no muerde no guarda nada.
- **ii)** Esconder las secciones «avanzado» hasta el 4.13-4 (la prueba por nivel sólo mordería con la fórmula de prueba).

**Consecuencia:**

- **Mutaciones: 10.** Nueve en el código contra Vitest (dos pedidos en vuelo, aplicar la respuesta vieja, el debounce en 0, el porcentaje que no quita el override del monto, esconder la celda cuya bandera no llegó, el motivo que nombra la bandera, lo tipeado que no se ve, el error antes que el candado, la bandera que viaja de más) y una en el e2e (el detector sin las claves). **Caen
  las diez**; una sobrevivía (esconder la celda sin interruptor: mi fixture no tenía una celda con su condición a la vista y sin interruptor) y se agregó ese caso.
- **Para el 4.13-3:** guardar con `cotizacion_crear` (el intento por guardado, D2, **4-21**, **4-27**, **4-25**); el candado por lado en la `XCell` y la corrección de su ficha; `useRecalculo().estado` es lo que dice si hay un total al día (`al_dia`); lo no guardado y su borrador (**4-29**), la versión con que se calcula (**4-28**) y el tipo del porcentaje (**4-31**). **Para el 4.13-4:** el resumen fijo (hoy queda al
  final de la hoja: quien tipea arriba no ve «No se pudo recalcular» hasta que baja), la ayuda con su URL y el foco, los modos (`p_modo_tc`), «Avanzado» en su modal, el presupuesto de JS de la ruta (418,5 KB hoy) y el tope de nodos con la ayuda y el ⚙. **Para el 4.20:** el enlace de «Falta publicar».
- **Lo que no se hizo:** guardar, «Avanzado» en su modal, la ayuda, los modos, el resumen fijo, el Nivel 2 ni el 3 (`e2e completo: no (4.13-2, pantalla, 2 de 3)`), `next upgrade`, ningún push ni dispatch, y el prompt 3.

## 2026-10-26 — Paso 4.13 (3a de 5): la hoja abierta que firma la base, y cotizar pide ver

**Contexto:** el 4.13-3 se partió en 3a (la base) y 3b (la pantalla de guardar). Antes de que la pantalla llame a `cotizacion_crear`, la base cerraba cuatro huecos: **4-27** (con la versión vigente, «Guardar con la N» congelaba las tarifas de la hora que mandara el cliente: `p_abierta_en` era libre y el tope de 24 h sólo corría si la versión había cambiado), **4-28** (el recálculo usaba la publicada de cada llamada y no la que abrió la hoja), **4-31** (el porcentaje de un par no decía su tipo) y **4-32** (`crear` sin `ver` abría una hoja vacía). Y decir qué pasa con **4-21**. Un agente revisó el plan con el código delante (2 bloqueantes, 10 a corregir, 10 menores, todos incorporados salvo los dos que contradecían el prompt) y la persona aprobó el plan sin preguntas aparte.

**Decisión:**

- **jb) La hoja abierta la firma la base (4-27).** `cotizacion_hoja()` devuelve `abierta = <fórmula>.<µs>.<HMAC-SHA256>`; el HMAC cubre `auth.uid()`, el origen, la fórmula y los µs, con una clave de 32 bytes en **Vault** (`cotizacion:abierta`, la crea la migración; el patrón de `integracion_secreto`). `cotizacion_crear(…, p_abierta, …)` y `cotizacion_evaluar(…, p_abierta)` la reciben y de ahí sacan la versión y la hora; **el cliente ya no manda ninguna hora**. Se eligió **firmar** y no guardar la apertura: no escribe (`cotizacion_hoja` sigue STABLE y de sólo lectura), no crece con las vistas (una tabla con una fila por apertura, cada `router.refresh()`, pedía índice, tope y job de purga), no toca `schemas/` ni policies (**sin Nivel 2**) y cuesta ≈ 0,3 ms por llamada. El precio: rotar la clave invalida las hojas abiertas («ábrela de nuevo»).
- **jc) Cómo se lee.** La regex va primero (minúsculas, uuid 8-4-4-4-12, a lo sumo 16 dígitos) y la firma después; nada se convierte antes de verificar (si no, 19 dígitos daban 22003 y un uuid a medias, 22P02). Nula: 22023 `hint abierta`. Rota, de otra persona o de otro origen: 22023 `abierta_invalida`, el mismo texto siempre. En `cotizacion_crear` va **después del intento**: un reintento con la hoja vieja o con la clave rotada vuelve lo guardado (`repetido: true`).
- **jd) El tope de 24 h corre siempre** que se guarda «con la abierta», cambie o no la versión. Y «con la abierta» **sólo cambia algo si hubo una desactualización**: con la hora firmada y dentro de las 24 h, sin desactualización la abierta _es_ la vigente (misma versión y, en cada tarifa activa, `entonces = valor`), así que la bandera no cambia lo guardado; una prueba lo fija (no se escribió una rama muerta). Sale «la hora es del futuro» (la pone la base). `_cotizacion_abierta` pasa a STABLE y sin `for share` (un candado no cabe en una función no volátil): el candado de la fórmula abierta lo toma `cotizacion_crear` cuando cambió la versión; su «reemplazada hace más de un día» sólo se mira si la abierta está archivada (la publicada no tiene «siguiente»: hoy daría `abierta_vencida`). Usa `statement_timestamp()` y no `clock_timestamp()` (`db:lint` avisaba de lo volátil dentro de lo STABLE; contra un tope de un día no se nota).
- **je) El recálculo calcula con la hoja abierta (4-28), versión Y tarifas.** Se eligió pasar la abierta y no comparar el `formula.id` de la respuesta: así el total que se ve es siempre el de la hoja que se dibujó, y D2 sólo avisa de lo que la pantalla no mostró (con la comparación, tras publicarse la N+1 ningún total sería de la N, y el aviso de una tarifa saldría por algo que ya se veía). Se fija también la hora de las tarifas (`_cotizacion_armar(…, versión, hora, true)`); si no, la pantalla mostraría la tarifa nueva, «Guardar» daría `tipo_cambio` y «Guardar con la N» guardaría una que no se vio. Orden: `p_abierta` con una cotización, `llamada_invalida`; `crear` y `ver`; la abierta; si su versión ya no es la publicada, `_cotizacion_abierta()` (si ya no se podría guardar con ella, `abierta_vencida` → `regla` → «Recargar»); y recién entonces ARMAR. Se pasa la abierta y no un uuid suelto: ata el cálculo a lo que la base entregó a esta persona en este origen. **Se borra la firma de seis argumentos** (la sobrecarga ambigua del 4.13-1). **El primer cálculo del servidor deja de ir en paralelo con la hoja** (necesita la abierta): un viaje más al abrir, que se ahorra cuando no hay hoja que calcular.
- **jf) `secundario.tipo_nodo` (4-31).** `_cotizacion_hoja` lo suma (el del nodo `pct`, que ya está en `ok`) y la hoja decide `inputs` u `overrides` con él; sale `fuentes` de `ContextoDeCambio` y `fuentesActuales` del hook.
- **jg) Cotizar pide `crear` Y `ver` del origen, en las RPC y no en la matriz (4-32).** La matriz de Roles no lo puede imponer: los permisos de una persona son la **unión de sus roles** (`schemas/02_equipo/01_equipo.sql`), así que `crear` puede venir de un rol y `ver` de otro; una regla por rol rechazaría combinaciones válidas y no vería las inválidas, y `rbac_revocar` tendría que impedir quitar `ver`. Se mira donde se usa, como «marcar exige ver el lead» (2026-10-15): `cotizacion_hoja`, `cotizacion_evaluar` por origen y `cotizacion_crear`, `crear` primero (su 42501 sigue nombrando `cotizaciones.crear`) y `ver` después, antes de mirar el origen (con un origen que no existe, el mismo 42501). `assert_permiso` no mira el alcance: «propios» alcanza. Las pestañas piden los dos. La descripción de `cotizaciones.crear` y el `aplicado_en` de `cotizaciones.ver` lo dicen. Queda **4-34**: `cotizacion_guardar` con `editar` y sin `ver`.
- **jh) 4-21: lo resuelve la pantalla y `cotizacion_crear` no cambia.** El intento repetido ya devuelve **lo guardado** (`_cotizacion_respuesta`: la fila y su snapshot recortado), así que la pantalla lo muestra y avisa con `repetido: true`. El protocolo del 3b: un intento por `Ctrl/Cmd+S`, **reusado sólo para reintentar el mismo pedido** (el cliente guarda junto al intento el pedido que lo usó; con la respuesta perdida, el próximo guardado reenvía ese pedido y no lo nuevo). Una huella en la base pediría una columna oculta en `cotizaciones` o una revisión del alta (`schemas/`, Nivel 2) y no cubre nada que el protocolo no cubra. El e2e de su assert es del 3b.
- **ji) Lo que la firma no cierra.** El «También» de 4-27 (un `tipo_cambio_guardar` que empezó antes de abrir y confirmó después cuenta como visto: la ventana dura lo que una transacción) pasa a **4-33**, para el 4.20, con la salida sugerida (una huella con clave de las tarifas vistas, dentro de `abierta`: el formato opaco la admite sin cambiar firmas). Y un límite aceptado: quien deja varias hojas abiertas puede elegir, dentro de 24 h, entre horas que de verdad abrió.
- **jj) El doble de pgcrypto de `db:probar`.** PGlite 0.5.8 trae el pgcrypto de verdad (el comentario del preámbulo decía que no): se carga en un esquema propio (en `extensions` chocaría con los dobles de `crypt` y `gen_salt`) y `extensions.hmac` va sobre él, con los vectores 2 y 6 del RFC 4231 en la prueba. Un doble de HMAC escrito a mano habría sido más débil que el real y habría hecho pasar firmas que no valen.
- **jk) Cómo prueban las pruebas.** La hoja abierta se firma **por persona y en cada llamada**: en `cotizacion-crear.sql` un marcador que `cc_corre` firma como postgres con la identidad de quien llama; en `cotizaciones-visibilidad.sql` y `humo.sql`, `public.cotizacion_hoja(origen) ->> 'abierta'` dentro de la misma sentencia. Firmarla una vez para todos dejaba la sonda de crear comparando `abierta_invalida` con `abierta_invalida`: pasaba sin probar nada. En las mediciones y las carreras se firma antes, como cada persona (la firma no se llama como `authenticated`).
- **jl) Lo que se hizo distinto del plan aprobado.** (1) `_cotizacion_abierta` usa `statement_timestamp()` (el lint). (2) Una prueba de más en `permisos-enforcement.sql`: el origen que no existe. (3) Tres pruebas de Vitest que las mutaciones pidieron (un porcentaje `input`, el primer cálculo del servidor, la abierta en el pedido de la hoja). (4) El ancho de la fila 4.13 de `docs/PLAN.md` se mantiene igual al de antes: prettier realinea toda la tabla si cambia. (5) La mutación «castear antes de verificar» no se hizo: con la regex a 16 dígitos el cast no puede fallar (equivalente por construcción).

**Alternativas descartadas:**

- **jb)** Guardar la apertura en una tabla (escribe en cada vista, crece, pide purga y Nivel 2); firmar sólo la hora (un token de otra persona o de otro origen valdría); aceptar la hora del cliente con un tope (4-27 tal cual). **jd)** Dejar el candado dentro de `_cotizacion_abierta` (un `for share` no se admite en STABLE, y entonces `cotizacion_evaluar` no la puede llamar). **je)** Comparar el `formula.id` de la respuesta (el total que se ve nunca sería el de la hoja dibujada tras publicar la N+1); pasar el uuid de la versión (cualquier archivada del origen, sin atar a la persona). **jg)** Imponerlo en la matriz de Roles (la unión de roles lo hace imposible de asegurar) o en `rbac_otorgar`. **jh)** Una huella del alta en una columna nueva de `cotizaciones`. **jj)** Un HMAC de juguete en el preámbulo.

**Consecuencia:**

- **Mutaciones: 31** (21 de SQL en PGlite sobre copias de la migración y 10 de TS en Vitest). **Caen 30; 1 equivalente demostrada** (leer la abierta sin mirar que haya persona: `firmar` no firma sin persona). Dos de TS sobrevivían y pidieron pruebas nuevas. La tabla, en `docs/BITACORA.md`, 4.13-3a.
- **Cifras:** la hoja de las capturas 10.610 bytes y 4,3 ms (tope 16 KB y 10 ms); `cotizacion_evaluar` 3,5 ms sin la abierta y 3,8 con ella (tope de lo que suma, 3 ms); `cotizacion_crear` 6,0 a 6,5 ms y 356 buffers con 250.000. `docs/RENDIMIENTO.md`.
- **Para el 4.13-3b:** guardar con `cotizacion_crear(id, origen, lead, entradas, abierta, …)` y la **misma** abierta que el recálculo (tras un `router.refresh()` con la misma versión, la `key` de la pantalla no cambia: hay que reabrirla); `abierta_vencida` pide «Recargar»; el intento de **4-21**; **4-25**, **4-29**, el candado por lado del par y la ficha de la `XCell`. **Para el 4.20:** **4-33**, y el ⚙ de una tarifa reabre la hoja. **Para el 4.15:** **4-34**.
- **Lo que no se hizo:** la pantalla de guardar, el Nivel 2 (`e2e completo: no (4.13-3a, datos; el completo lo corre el 4.13-3b)`) ni el 3, `next upgrade`, ningún push ni dispatch, y el 3b.

## 2026-10-26 — Paso A0: el piloto avanza PLAN un paso por sesión, con un bucle que no es un modelo

**Contexto:** cada paso de la Partición lo arrancaba la persona con un prompt largo, y una sesión larga arrastra contexto y gasta tokens en cada turno. Diseño de la persona (2026-10-26): nada de sesión larga ni `/goal`; ruteo barato, el paso con su modelo, y sólo se le pregunta a la persona en las compuertas, al celular. Se construyó en el worktree `../importadora-piloto` (rama `piloto-a0`, 11 commits) mientras el 4.13-3a corría en el principal; no tocó `main` ni los docs de estado hasta esta integración. Todo en `docs/PILOTO.md`.

**Decisión:**

- **a) Un bucle en bash, sin modelo** (`scripts/piloto/bucle.sh`), y **una sesión nueva de `claude -p` por paso**. El ruteo es Sonnet (esfuerzo bajo, sólo `Read`/`Grep`/`Glob`); el paso lo hace el modelo que dice el ruteo (docs → sonnet/medium; pantalla → sonnet/high; `src/shared`, un disparador del Nivel 2, datos o seguridad, carreras o cierre → opus/high); el planificador y el auditor son siempre Opus y leen en un contexto aparte.
- **b) El modelo nunca publica.** El bucle comprueba que cada commit de `ultimo.json` existe en `HEAD de arranque..HEAD`, pide la compuerta «guardas» si el rango toca las guardas, corre `verificar.sh` por su cuenta y recién entonces `publicar.sh` (`git push origin main`; nunca un PR). Con `PILOTO=1` el hook le niega a una sesión todo `git push`: el hook no ve al bucle porque el bucle no es una sesión.
- **c) Lo que autoriza queda fuera del alcance de las sesiones que trabajan.** `<carpeta común de git>/piloto/` (`compuerta.md`, `decision.md`, `aprobado-<paso>`, `bin/`) sólo lo escribe bash; `guardar-autorizaciones.sh` impide a una sesión de paso o de ruteo escribir ahí o nombrarlo en un comando.
- **d) El bucle no ejecuta código que un paso pudo cambiar.** `arrancar.sh` copia `scripts/piloto/` (sin pruebas) a `<común>/piloto/bin/` con un `bin.sha256`, y el bucle llama sólo a esa copia, comprobándola en cada vuelta. La copia protege la lógica del bucle, no lo que `verificar.sh` ejecuta (`pnpm lint|typecheck|test`, `package.json` y los hooks son del árbol): eso lo cubre la compuerta «guardas».
- **e) Las compuertas llegan al celular** por una sesión corta en `tmux` con Remote Control (`/piloto-decidir`, sonnet, esfuerzo bajo, sólo `Read` y `AskUserQuestion`). **Esa sesión no escribe nada**: escribir en `.git/` preguntaría por permiso en el celular y ninguna regla allow lo aprueba, así que la respuesta la anota un hook `PostToolUse` de `AskUserQuestion` (`anotar-decision.sh`, bash) en `decision.md` con el id, la opción y «me respondió: «…»». El bucle sólo la acepta si su id es el de la compuerta vigente, es posterior a `compuerta.md` y ningún paso vivía cuando apareció. Nada sigue sin respuesta: toda parada es una compuerta.
- **f) Un candado de la base común a todos los worktrees** (`scripts/candado.sh`, `flock -n`; ocupado falla con 75 y dice quién lo tiene) lo toman `db:reset`, `db:types`, `db:diff`, `db:medir`, `db:carreras`, `db:lint`, `db:sembrar-volumen`, `db:medir:volumen`, `test:e2e` y `test:e2e:completo`; no `db:base` ni `db:probar` (PGlite en memoria).
- **g) La sola lectura del auditor y del planificador no depende de la confianza de la carpeta.** El ensayo mostró que el frontmatter de un agente no se aplica con la carpeta sin confiar (el auditor corrió `touch .piloto/sonda` y el archivo se creó); `por-agente.sh`, un hook de `settings.json` cuya entrada trae `agent_type`, manda el Bash por `solo-lectura.sh` y el Write/Edit por `escribir-solo-en-piloto.sh`. Los hooks del frontmatter quedan como segunda vuelta.
- **h) El hook Stop decide por el estado del árbol** (aprobado por la persona tras ver la tabla de tiempos): sale sin verificar en las sesiones que no editan (`ruteo|decidir|control|en-seco`), con trabajo en segundo plano o con la huella de la última verificación verde; con el árbol sucio corre lo barato (17–27 s); con el árbol limpio, la suite completa una vez (≈ 160 s).
- **i) La regla de los e2e dirigidos en `movil` queda escrita en `.claude/rules/e2e.md`** (› «Interfaz»): sólo si lo tocado es interfaz. `scripts/piloto/nivel.mjs` la aplica y la cita, y `nivel.test.ts` falla si la lista de la regla y la del código se separan. Hasta hoy `e2e.md` decía «en `escritorio` y en `movil`» y la regla conservadora sólo existía en el código.
- **j) La compuerta que lee la sesión de decidir se copia a `.piloto/` en `decidir.sh abrir`**, no en el escritor de la compuerta, y `cerrar` la borra. La primera prueba en vivo de `--prueba` mostró por qué: la sesión leyó `.piloto/compuerta.md`, que sólo copiaba `escribir_compuerta` del bucle, y contestó «No hay una compuerta abierta.» sin preguntar nada. Un solo lugar vale para cualquier escritor.
- **k) `paso_vivo` lista las líneas con `pgrep -af` y descarta las de otro `pgrep`.** `pgrep -f` sólo se excluye a sí mismo: con dos bucles de prueba a la vez, cada uno veía el `pgrep` del otro (lleva el patrón en su línea) y rechazaba una decisión buena. Fallaba 1 de cada 8 corridas de `pnpm test`, también sin ese cambio (medido contra el commit anterior).

**Alternativas:** una sesión larga con `/goal` (arrastra contexto y paga cada turno); que el modelo publique (un «listo» falso llegaría a `main` sin que nadie lo verificara); confiar en el frontmatter de los agentes para la sola lectura (no corre sin la carpeta confiada); que la sesión de decidir escriba la decisión (pregunta por permiso en el celular); abrir PR en vez de empujar a `main` (descartado por la persona: nunca un PR); `agentUpgrade: false` para el aviso de Next (esconde la señal de seguridad; ver CI-1).

**Consecuencia:**

- **Costos medidos** (ensayo en seco, `--en-seco` sobre el 4.13-3b): ruteo real 15 s y **0,142 USD**; paso en seco (opus/high) 20,3 min y **7,03 USD**; la sonda repetida con `por-agente.sh`, **0,115 USD**. Los topes por defecto (2 y 50 USD) se calibran con el primer paso real.
- **Pruebas:** 104 mutaciones de las guardas y del bucle, cada una con la prueba que debe caer; la lista, las rojas y las medidas, en `docs/BITACORA.md`, «Paso A0».
- **Falta, y es de la persona:** aceptar la confianza de la carpeta (sin eso `claude -p` ignora las `permissions.allow`) y el primer `arrancar.sh` real. `decidir.sh --prueba` ya se repitió en verde.
- **Abiertos que salieron:** **4-35** (Node), **4-36** (`medir-publicar.sql`) y **4-37** (`SecurityFatalError`), en `docs/PLAN.md`.

## 2026-10-26 — E1: el piloto se queda en la PC; la nube queda como verificador futuro

**Contexto:** se probó la verificación del repo en una VM en la nube (E1). Medido: **4 vCPU y 15 GiB**; el **Nivel 1 más la base desde cero tarda ≈ 9 min**. Lo que salió: (1) `dockerd` no arranca solo; (2) la VM trae **Node 22** y CI usa **Node 24** (los corpus `corpus-de-contraste` y `corpus-del-motor` fallan con 22.22: **4-35**); (3) el e2e no corrió por el hook de la secret key; (4) ECR limita las descargas.

**Decisión:** **el piloto se queda en la PC.** La nube queda como verificador futuro, con un setup que arranque `dockerd`, ponga Node 24, haga `pnpm install` y `supabase start`, y escriba el `.env.local` desde `supabase status`. **Lo escribe el setup, no el modelo.**

**Alternativas:** correr el bucle en la nube ya (el e2e no corrió, `dockerd` no arranca solo y las descargas están limitadas, así que cada vuelta dependería de algo que no se controla); dejar que el modelo arme el `.env.local` (pasa la secret key por la sesión: el hook que la protege lo impidió, y no se esquiva).

**Consecuencia:** no se construye nada de la nube todavía. Cuando se haga, el setup de arriba es el contrato; **4-35** (Node) y **4-37** (`SecurityFatalError`, visto también allí) están en `docs/PLAN.md`, en el paso de Next 16.4.1.

## 2026-10-26 — DEP-1: Next 16.4.3 y Node 24 (cierra 4-35 y 4-37)

**Contexto:** `next` y `eslint-config-next` estaban en `16.4.0`, con tres advisories (el RCE de `use cache`, el SVG de Image Optimization y Server Actions; ver «CI-1»). El aviso de seguridad de Next detenía el primer `next build` en frío bajo un agente con `SecurityFatalError` (**4-37**: un falso rojo en el Nivel 2 y en `verificar.sh`). Aparte, `engines.node` prometía `>=22.13.0` y los corpus de contraste y del motor sólo pasan con Node 24, el de CI (**4-35**). Es un paso manual: el piloto no sube dependencias y sus guardas lo bloquean.

**Decisión:** (1) **Next 16.4.3**, el último 16.4.x estable según `npm view next dist-tags` del 2026-10-26 (publicada el 2026-10-23; la 16.4.1 corrige los tres advisories, la 16.4.2 y la 16.4.3 son parches de esa línea). `next` y `eslint-config-next` exactas, sin `^`, como estaban; `pnpm install` sin nombrar paquetes (el diff del lockfile es sólo la familia de Next: `@next/*`, `next-safe-action` y `nuqs` por su peer). `sharp` resuelve a **0.35.5**, que es lo que pide Next. (2) **Node 24:** `engines.node` `>=24`, `.nvmrc` con `24` y el mismo valor en `scripts/configurar-package.mjs`, que reescribe `engines`. `@types/node` sigue en `^20`: no se tocó.

**Alternativas:** quedarse en 16.4.1 (la mínima que cierra los advisories): la 16.4.3 es la misma línea con dos parches más y nada pide detenerse antes. `experimental.agentUpgrade: false` (apaga el aviso en vez de quitar su causa y esconde la señal de la próxima vulnerabilidad: sigue descartado). El reintento en `verificar.sh` ante `SecurityFatalError`: ya no hace falta. Correr `next upgrade` o un codemod: los veta el hook y lo decide una persona. Bajar el código para que corra en Node 22: el repo no lo necesita, CI y la PC ya están en 24.

**Consecuencia:** el primer `next build` en frío de una sesión de agente ya no se detiene: HEAD (16.4.0) dio `SecurityFatalError` con código 1 y 16.4.3 pasó a la primera dos veces con el directorio de compilación borrado (`docs/BITACORA.md`, «DEP-1»). El e2e completo de los dos proyectos pasó sin saltados nuevos. Lo que sale en el lockfile cambia sólo la familia de Next.

## 2026-10-27 — Paso 4.13 (3b de 6): guardar la hoja

**Contexto:** el 4.13-3b junto la pantalla de guardar con lo de `src/shared` (el candado por lado del par en la `XCell`, su ficha y el parser de **4-25**), que pide Nivel 2 y una decisión de producto. El plan (tres versiones: la primera bloqueada por el auditor) dejó P0–P9 para la persona, que aprobó todas las recomendaciones el 2026-10-27.

**Decisión:**

- **jm) Partir (P0).** El 3b es la pantalla (Nivel 1); el **3c** lleva el candado por lado, la ficha de la `XCell` y 4-25 con P7 (con el locale de la empresa, el punto vale sólo como miles en grupos de 3; un punto en otro lugar es un aviso; un solo lector para los cuatro). La fila 4.13 pasa a 6 prompts y el total a 67.
- **jn) Guardar es una Server Action** (`crear-cotizacion.ts`), no el cliente del navegador. Se valida la entrada, se repite `puedeCotizarEn()` (crear Y ver del origen: comodidad, la base lo exige) y **siempre responde `ok(ResultadoDeCrear)` cuando corre**, también con su propio rechazo. `{ ok: false }` sale sólo de `enviarAccion()`: `sinRed`, `validacion` o el `serverError`. Validación y `serverError` se distinguen sólo por `error.codigo`. El recálculo sigue por el navegador (if del 4.13-2). **Sin `revalidatePath`:** ninguna pantalla lista cotizaciones todavía, y revalidar la hoja la volvería a dibujar con otra abierta.
- **jo) «Respuesta perdida», sin ambigüedad (4-21).** El pedido se anota como pendiente en la pestaña (`sessionStorage`) antes de salir.
  - Se **conserva** con `sinRed`, con un `serverError` (`no_autenticado` no corrió; `inesperado` pudo lanzar después de la RPC) y con una respuesta sin SQLSTATE o que no pasa el Zod.
  - **Todo error con SQLSTATE lo suelta**, porque la transacción de la RPC se deshizo entera.
  - Con un pendiente vivo, «Guardar» reenvía **ese** pedido con su intento, sin las guardas de la hoja ni la espera de P8: ya se armó y ya se pudo guardar.
  - Reenviado, `cotizacion_crear` mira el intento antes que la abierta, así que guarda, devuelve el repetido o contesta con un código. El tope de 24 h sólo corre con D2 o `p_con_la_abierta`.
  - El pendiente lleva la abierta (un HMAC atado a la persona y al origen).
- **jp) Lo que se ve tras guardar (P1, P3).** Una tarjeta «Cotización n.º N guardada» con el total de **la respuesta** (`<Monto>`) y «Cotizar otra». Con `repetido`, o tras reenviar un pendiente aunque no sea repetido, la tarjeta dice que lo tipeado después no se guardó. «Cotizar otra» **no pide la página**: con la abierta en la `key`, el `refresh` traía otra y volvía a montar la hoja mientras la persona ya tipeaba. Ver y editar lo guardado es del 4.15.
- **jq) Los textos son propios** (`textoDelRechazo`, un `Record` exhaustivo, y `textoDelFallo`), y cada uno con su salida: `d2`, `recargar`, `reintentar`, `ingresar` o ninguna. Un botón que no arregla nada no se ofrece. «Reintentar» sólo va con lo transitorio (`XX000`, `57014`, `40P01`, `55P03`, `PGRST000`–`003`). Los seis orígenes del 42501 sin detalle dicen lo mismo, sin confirmar qué existe. `variante_sin_eleccion` (variante oculta y sin `por_defecto`) pide avisar a quien configura.
- **jr) La misma hoja abierta en el recálculo y en el guardado.** `useHoja` la fija al montarse, y la `key` de la hoja la lleva (con `vuelta`): «Recargar», «Usar la versión nueva» y cualquier `refresh` la vuelven a montar con la nueva, y el borrador repone lo tipeado. El marco (`PantallaDeCotizar`, con la `key` de la URL) guarda lo que tiene que sobrevivir. Mientras guarda **congela las props de la hoja**: una action que renueva la cookie vuelve a dibujar la página. Y la hoja queda `inert`, porque lo guardado la reemplaza.
- **js) Una celda abierta al guardar.** `Ctrl/Cmd+S` le despacha un `Enter` dentro de `flushSync` y mira si la entrada sigue en el DOM: abierta («abc», `aria-invalid`), no se guarda; sin cambios, se guarda (no se mira `onCommit`). «Guardar» y «Reintentar» frenan el `mousedown`: si no, el clic afuera descartaría «abc» en silencio. La `XCell` no se toca.
- **jt) P8: guardar mientras recalcula espera al total al día.** `useRecalculo.alQuedarAlDia()` llama desde la resolución del último pedido. Su limpieza (al esconder o desmontar) llama con `se_fue`, así nada queda en «Guardando…». El pedido sale con las entradas que ese recálculo calculó. **P9:** con el total nulo, o con un override que el recálculo descartó, «Guardar» se apaga con su motivo, porque la base lo rechaza siempre.
- **ju) D2 en línea (P2)**, con «Usar la versión nueva» / «Guardar con la versión N» y, para un tipo de cambio, «Usar el de hoy» / «Guardar con el de la hoja», sin decir cuál cambió. «Guardar con la N» manda **el pedido que recibió el aviso**, con otro intento y `p_con_la_abierta`. El aviso se va con la próxima confirmación y cuando la hoja se vuelve a montar.
- **jv) El borrador (4-29, P4)** va sobre `useBorradorDeEstado`, sin tocarlo. Guarda sólo las cinco claves de lo tipeado, en pares, filtradas contra la hoja de ahora. Reponer saca **un** recálculo desde el efecto: es la excepción escrita a «sin efecto que dispare un pedido» (if). «Descartar» vuelve a montar la hoja vacía con `vuelta`, y el recálculo en vuelo muere con ella. Con `StrictMode`, en desarrollo, la limpieza doble cancela ese recálculo; queda escrito y no se arregla.
- **jw) La persona en la clave de la pestaña** (borrador y pendiente: `DeLaPestana`). El plan lo dejaba como deuda (4-38), pero `cotizar-hoja-niveles.spec.ts` entra con dos cuentas en la misma pestaña, y la segunda veía lo tipeado por la primera. Costaba una prop (`sesion.usuarioId`), así que 4-38 no se abrió. Los borradores de leads siguen sin la persona.
- **jx) P5 y P6.** Sin `?lead=`, «Guardar» se apaga con «Para guardar, abre la hoja desde un lead.»: hasta el 4.14 se llega por URL. «Guardar» va visible además del atajo, porque el celular no tiene `Ctrl/Cmd+S` (`ui.md`).

**Alternativas descartadas:** **jo)** soltar con `inesperado` (si la RPC entró y la action lanzó después, se duplicaba) o conservar con todo error (un código desconocido dejaba el pendiente pegado). **jr)** Una `key` sin la abierta (el recálculo seguía con la vieja tras un `refresh`). **jt)** Apagar «Guardar» mientras recalcula (con una celda abierta, `Ctrl/Cmd+S` nunca guardaba). **ju)** Un modal `<Confirmar>` (pide URL y tapa la hoja). **jp)** Volver a `?returnTo=` (nadie enlaza la hoja hasta el 4.14). **jw)** Dejar la deuda para el 4.28.

**Consecuencia:**

- Cuatro commits de código: `7d547a4`, `f32a7ed`, `ff0b560` (D2, que además lleva la persona en la clave y «Cotizar otra» sin `refresh`, encontrados por sus e2e) y `14b6011` (la hoja `inert` mientras guarda y «Reintentar» por la puerta de «Guardar», pedidos por la auditoría).
- **Mutaciones: 52** en Vitest; caen todas salvo cuatro sin mutación posible o equivalentes (BITACORA). 65 e2e dirigidos (escritorio y móvil). `e2e completo: no (4.13-3b, pantalla, 1 de 3)`.
- **Cifras:** 413 nodos al abrir y 432 usada (tope 460); 423,8 KB de JS en la ruta (antes 418,5).
- **Para el 4.13-3c:** el candado por lado, la ficha de la `XCell` y 4-25 con P7. Va con Nivel 2 y el completo de escritorio.

## 2026-10-27 — FIX-PILOTO-1: los e2e dirigidos del bucle no exigen las funciones edge

**Contexto:** el 4.13-3b quedó «listo» con 65 e2e dirigidos en verde, corridos con `E2E_SIN_FUNCIONES=1`. `verificar.sh` los repitió sin esa variable y sin `npx supabase functions serve` (el bucle no las levanta): la guardia de `e2e/global-setup.ts` (`e2e/soporte/guardia.ts`) exige `apibara`, `storage-gc` y `avatares-miniaturas` para **cualquier** spec, y abortó antes de la primera prueba. Ninguno de los seis specs llama a una función; con la variable, los mismos 65 pasan en `9f1cd35`.

**Decisión:** `verificar.sh` corre los e2e dirigidos con `E2E_SIN_FUNCIONES=1`, **siempre**: también con las funciones servidas, el bucle salta la guardia. La guardia es una comodidad (falla en segundos y dice qué correr); lo que hace rojo a un spec que necesita una función es el propio spec, que falla solo sin ella: `e2e/vehiculos-apibara-funcion.spec.ts:71` lanza «la función no respondió», `e2e/soporte/papelera.ts:74` lanza con el status de `storage-gc` y `e2e/perfil-avatar.spec.ts:161` espera 200 de `avatares-miniaturas`. **Una excepción:** `e2e/vehiculos-apibara.spec.ts:283` se salta si no hubo alta por enlace (`creado === null`); sólo no da un verde falso porque el archivo es `serial` y la prueba anterior, la del alta, cae primero.

**Alternativas:** levantar `functions serve` desde el bucle (procesos hijos y un contenedor que cerrar; es de la calibración del piloto). Decidir por los imports de cada spec: los seis llegan a `soporte/papelera.ts`, que llama a `storage-gc` sin que lo usen, así que diría «pide funciones» y seguiría en rojo. Que `ultimo.json` diga cómo corrió el paso: el bucle no le cree al modelo.

**Consecuencia:** un dirigido que llama a una función da rojo en el bucle, con el error del spec, hasta que el bucle las levante. El Nivel 2 no cambia: `pnpm test:e2e:completo` las exige (`scripts/e2e-completo.mjs` no lee la variable), así que un paso de Nivel 2 (el 4.13-3c) pide `npx supabase functions serve` en otra terminal antes de arrancar el piloto (`docs/PILOTO.md` › «Requisitos»). Se prueba en `scripts/piloto/verificar.test.ts`: el `pnpm` falso anota el entorno con que se llama a `test:e2e`.

## 2026-10-27 — CAL-1: la calibración del piloto con el 4.13-3b

**Contexto:** el primer paso real (4.13-3b, sesión `3373da21`) costó **43,55 USD** (Opus, todo: el ruteo eligió `opus/high` y la retoma lo heredó), más ≈ 0,18 de ruteo y ≈ 2,4 estimados de las dos sesiones de decidir. Reparto exacto por los transcripts de los subagentes (cuadra al centavo con `total_cost_usd`): planificador 11,02 en dos corridas y tres versiones del plan; auditor 8,74 en tres corridas (plan, plan, informe: 39 hallazgos, uno que bloquea, ninguno refutado; tres defectos que habrían llegado a `main`); ejecutor y orquestación 23,80, de los cuales 14,62 son caché leída de un contexto que creció de 83 K a 557 K tokens en 192 turnos. Plan: 50,6 min; ejecución: 93,5 min. `--max-budget-usd 50` valía **por invocación** y un tope agotado se trataba como fallo del proceso (otro intento con otros 50): el peor caso de un paso con una compuerta era 200 USD. Las dos sesiones de decidir cargaban 677 KB de esquemas MCP a mitad de sesión (≈ 260 K tokens, ≈ 1,2 USD cada una).

**Decisión (la persona, 2026-10-27):**

- **Topes:** `PILOTO_TOPE_USD_PASO` = **60 USD por paso entero** (plan, retomas, reintentos). El bucle lleva lo gastado en `en-curso.json` (`usd`, el `total_cost_usd` acumulado de la sesión) y pasa a cada llamada lo que queda; con menos de `PILOTO_TOPE_USD_MIN` (5) no lanza. Un `subtype: error_max_budget_usd` no se reintenta: es una parada con «seguir con 50 % más» **una sola vez** (después, sólo `parado` y `reintentar`). `PILOTO_TOPE_USD_RUTEO` = **0,5** (medido: 0,06–0,12). Toda compuerta del paso dice cuánto lleva.
- **Decidir y control sin MCP ni Chrome:** `--disallowedTools 'mcp__*'` (lo que saca los esquemas del contexto: `--tools` no toca las MCP), `--no-chrome`, `ENABLE_CLAUDEAI_MCP_SERVERS=false` y, en decidir, `disableClaudeAiConnectors`.
- **Consumo:** `usd_por_modelo` (la resta de `modelUsage[].costUSD` por sesión), `duracion_s` con el reloj del bucle (el `duration_ms` del JSON es el del último turno: dio 192 s por 50,6 min) y el transcript de decidir contado una vez por `message.id` (contaba +9 %). El USD de decidir queda vacío.

- **La compuerta de producto, una pregunta por decisión:** `compuerta.preguntas` (de 1 a 12, de 2 a 4 opciones cada una, `id` ≤ 12 caracteres); la sesión de decidir las hace en tandas de hasta 4 en la misma sesión (lo caro es abrirla, no cada tanda) y el hook escribe `decision.md` sólo con todas. «parar» en cualquiera para el bucle. Las demás compuertas siguen con una pregunta.

- **Las funciones edge, antes del paso:** `hechos.sh` las mira (`funciones`) y un ruteo de Nivel 2 o con el completo sin todas es una parada determinista antes de lanzar el paso; el paso pide una compuerta `afuera` si su plan sube de nivel. El bucle no las levanta: `functions serve` es un proceso largo con contenedores que habría que cerrar en tres caminos (`PARAR`, `parar.sh --ya`, un reinicio), el runtime es uno por stack y lo comparten los worktrees, y carga el entorno de las funciones, que el bucle no toca; para la persona es un comando por sesión de trabajo.
- **La causa de un e2e rojo nombra la prueba:** la cabecera que Playwright imprime antes del `Error:` y ese error, hasta 300 caracteres.

**Alternativas:** levantar las funciones desde el bucle (arriba); una sesión de decidir por tanda (paga la apertura cada vez); que el modelo de decidir junte las respuestas (no escribe nada, por diseño); topes por llamada más altos (no acotan las retomas); un tope distinto por tipo de paso (sin datos de otro tipo todavía); un archivo de precios para el USD de decidir y un desglose por subagente (la persona los dejó fuera por ahora).

**Observación, sin implementar:** el ejecutor del 3b quedó en Opus porque la retoma hereda el modelo: lo dice `.claude/skills/piloto-ruteo/SKILL.md` («`continuar` → el de antes») y lo fuerza `scripts/piloto/bucle.sh` (toma `modelo` y `effort` de `en-curso.json` al retomar). Pasó aunque el P0 partió el paso y lo que quedó es una pantalla (sonnet/high). La diferencia estimada es ≈ 11 USD de los 22,90 del ejecutor; se mide con el 3c y con el siguiente paso de pantalla. Si se cambia, son los dos lugares; al cambiar de modelo en una retoma la caché no se reusa (es de cada modelo).

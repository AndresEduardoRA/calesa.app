# Paso 6.13 — El campo «principal» de un origen (6-1)

Fecha: 2026-11-11 (`TZ=America/La_Paz date +%F`). Sin compuertas: las dudas del PLAN, con su recomendada.

- **D1** Marcar otro principal **desmarca** el anterior en la misma llamada; el índice único parcial `origenes_campos_principal_unico`
  sigue siendo el candado.
- **D2** En logística la identidad **acompaña** al título («<principal> · <título>»); en la fila, la tarjeta y el resumen **reemplaza** al
  título como nombre y el título pasa a la línea secundaria (sólo con principal con valor). Se hace en el 6.13-2.
- **D3** Lo hace el carril c en su PR (lo del núcleo se agrega o edita en el PR del carril); la migración empieza por `origenes_campos`,
  dominio del carril c. Sin `espera`.
- **D4** `origen_campo_guardar` **sigue devolviendo `timestamptz`**: cambiar el retorno exige `drop` y rompe `humo.sql` y la infra. El PLAN
  pedía que devolviera el desmarcado; la pantalla avisa antes de guardar cuál deja de ser principal, con el layout cargado. Salvedad: si otra
  persona cambió el principal entre la carga y el guardado, el aviso nombra el que estaba en pantalla y no salta PT409 (sólo se compara la
  versión del campo que se guarda); el desmarcado igual queda bien en la base y se ve al revalidar. `origen_campo_crear` sí lo devuelve
  (`desmarcado` en su `jsonb`).
- **D5** Un campo `moneda` **no puede ser principal** (`check` y mensaje de la RPC): la identidad es texto y todo monto va por `<Monto>`.
- **D6** Ningún origen queda con principal al migrar: sin relleno. Nada cambia en pantalla hasta que alguien marca uno.
- **D7** (6.13-2) «Principal» vive sólo en el panel del campo y la fila lleva la insignia: el aviso se ve siempre antes de guardar.
- **D8** `origen_campo_guardar` toma **siempre** el origen `for no key update` antes que el campo (auditoría del plan): dos marcas
  concurrentes del mismo origen, un cambio de grupo que renumera el origen, `origen_campo_mover` y `origen_campo_crear` van en fila en el
  mismo orden (origen → campo), sin `40P01`. `no key update` no frena el `key share` de las FK que apuntan al origen. Lo prueba K1.
- **D9** (6.13-2) El e2e usa un campo propio «Lote interno»: «Lote» es la columna común `vehiculos.lote`, reservada.
- **D10** (6.13-2) `CampoDeVehiculo.principal` es opcional en `vehiculos`.
- **D11** (6.13-2) El panel de logística arma la identidad en la composición del núcleo con `leerCampoPrincipal()` de `origenes` e
  `identidadDeVehiculo` de `vehiculos` (dependencia nueva `logistica → origenes`, sin ciclo). **Para el carril a, 6.03:** la tarjeta de la
  cadena (`features/cadena`, todavía vacía) pide la identidad con estas mismas funciones.
- **D12** El principal puede ser además «En tarjeta»: `en_tarjeta` vuelve a decir sólo qué se ve en la tarjeta.
- **El desmarcar es un ayudante** (`_origen_campos_desmarcar_principal(origen, salvo)`, sin `security definer` y sin EXECUTE para nadie;
  lo llaman las dos RPC como su dueño). Aun así `origen_campo_guardar` queda en 119 líneas de función (ya medía ≈ 94, sobre el tope de 80):
  del tipo del abierto **4-64**; partirla mueve una `security definer` con sus pruebas. `scripts/carreras.mjs` (373 → 375 líneas, ya sobre
  300; 4-64) suma un import y una llamada: las carreras nuevas viven en `supabase/tests/areas/origenes/carreras.mjs`.
- **K2** (observación menor de la auditoría): la traducción del `23505` del índice a `PT409` sí tiene prueba que puede caer: una sesión
  `postgres` marca un principal sin confirmar y `guardar` espera en el índice y sale `PT409` con el mensaje humano.

## 6.13-2 (2026-11-11)

- **D13** La identidad recibe **el campo principal, no la lista**: `identidadDeVehiculo(vehiculo, principal, formato)`, con
  `campoPrincipalDe(campos)` aparte. Logística sólo tiene un `CampoPrincipal` de `origenes` (clave, etiqueta, tipo, opciones), no un
  `CampoDeVehiculo`: con la firma por lista no compilaba sin inventar campos. Cambia la firma, no la conducta.
- **D14** El panel del campo, con la bandera encendida, dice **antes de guardar** los dos rechazos de la base (monto, desactivado) con los
  mismos textos, y si desmarca a otro principal. Es ayuda, no bloquea: decide la RPC.
- **D15** El e2e también abre `/logistica/vehiculo/<id>`: es la única prueba de la identidad en el panel de la unidad.
- **D16** `configuracionDeOrigen` recibe el principal actual opcional (ausente = ninguno): el test del formulario de campo no cambia.
- **D17** La página `/vehiculos/[id]`, el PDF, la web, la hoja de cotizar y `leerTitulosDeVehiculos()` siguen con el título: la fila de
  PLAN nombra la lista, el resumen y logística. La misma función sirve después.
- **D18** (cambia lo del plan) La composición cruzada de logística no puede vivir en `areas/nucleo/composicion.ts`: el lint
  (`boundaries`) no deja que una entrada importe otro módulo. Va a `features/nucleo/unidad-con-identidad.ts` (como
  `vehiculos/features/alta/fuentes.ts`), que lee también `getAjustes()` de `empresa`: el principal de número o fecha sale con el formato
  regional de la empresa, sin deuda. Si el principal no se puede leer, queda el título.

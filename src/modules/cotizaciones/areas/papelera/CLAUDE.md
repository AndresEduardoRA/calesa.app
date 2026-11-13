# cotizaciones › papelera

El área `papelera` de `cotizaciones`: la papelera propia de cotizaciones, por lote. Ficha del módulo: `../../CLAUDE.md` › «Áreas».

## Qué es

Lo que se envía a la papelera de cotizaciones es un lote (`lotes_papelera`, `tipo = 'cotizaciones'`, de 1 a 200) que se restaura o se purga. La base lo
decide todo (`cotizaciones_papelera_enviar|listar|lote|restaurar|purgar`): quién ve qué lote (los suyos o, con `cotizaciones.papelera.purgar`, todos),
quién restaura y qué queda pendiente. Acá se lee y se dibuja.

## Entradas

- `index.ts` (servidor): `leerPapeleraDeCotizaciones({ cursor, tamano })`, una página de lotes por cursor `(creado_en, id)`: pide `tamano + 1` y de cada
  lote las primeras `PRIMEROS_DEL_LOTE` (`infra/papelera/listar.ts`, índice `lotes_papelera_tipo_idx`); una forma rota es un error, nunca una papelera
  vacía. `puedeAbrirLaPapeleraDeCotizaciones(permisos)` (quien puede enviar —`cotizaciones.editar`, `.moderar` o `.final.gestionar`— o vaciar
  —`cotizaciones.papelera.purgar`—) y `puedePurgarLaPapeleraDeCotizaciones(permisos)`. Quien no la abre ve «sin permiso», sin consulta.
- `composicion.client.ts` (navegador; sólo su feature, ningún barril): `leerLoteDePapeleraDeCotizaciones(loteId)`, el lote entero para «Mostrar los N»;
  `no_encontrado` si ya no está.
- `composicion.ts` (servidor): `repositorioDePapeleraDeCotizaciones.enviar|restaurar|purgar` (`infra/papelera/escribir.ts`), que usan las actions de
  `features/papelera/actions/`: `enviar-a-papelera.ts` (sin `cotizaciones.editar`, `.moderar` ni `.final.gestionar` en algún origen,
  `puedeEnviarCotizacionesALaPapelera`, responde `sin_permiso` **sin llamar** a la base; cuál puede, lo decide la base por cotización),
  `restaurar-de-papelera.ts` (la base decide quién restaura) y `purgar-de-papelera.ts` (sin `cotizaciones.papelera.purgar`, `sin_permiso` **sin llamar** a
  la base, que la vuelve a pedir antes de mirar el lote). Las dos últimas, con `esquemaSobreUnLote` y `revalidatePath('/cotizaciones', 'layout')` sólo si
  la base dijo que sí.
- `client.ts` vacío: el área no suma JS a quien importa `@/modules/cotizaciones/client`.

## La pantalla

`/cotizaciones/papelera` (`<Suspense>` y `await connection()` como `/cotizaciones`): `pantallas/papelera.ts` da `<PapeleraDeCotizaciones>` (lotes de a
`LOTES_POR_PAGINA` con `<Paginacion>`, cada uno con sus primeras y «Mostrar los N»). «Restaurar» (una, o «Restaurar el lote» si quedan más de una) se hace
sin preguntar y dice el resultado entero (`resumenDeRestauracion`: lo pendiente con su motivo, hasta tres y «Y N más.»); lo ven quien envió el lote y quien
puede vaciar la papelera (`puedeRestaurarElLote`). Bajo el título, siempre: las que se fueron con su vehículo no están aquí, con el enlace a la papelera de
vehículos que compone `src/app` sólo para quien puede abrirla.

Purgar, sólo con `cotizaciones.papelera.purgar`: «Purgar» en cada cotización (tras «Restaurar») y «Purgar el lote» si quedan más de una
(`<AccionesDePapelera>`). Abren `<ConfirmarPurga>`, montado una vez, en `?panel=purgar&lote=<id>[&cotizacion=<id>]` (`entities/papelera/url.ts`,
`usePurgaPorUrl`). Al llegar por la URL se revisa una vez (`motivoParaNoPurgar`): sin la clave, un lote que no está en la página o una cotización de otro
lote avisan y limpian la URL. El diálogo nombra lo que se borra (`textosDeLaPurga`: una por su título; un lote de N, hasta cinco títulos y «y K más», y
pide tipear «purgar N»); lo que la base rechaza se dice dentro (un conflicto apaga el botón y ofrece «Recargar») y el resultado va en el aviso
(`resumenDePurga`: lo bloqueado, como una final con comprobante, con su motivo).

En la guardada (`/cotizaciones/[id]`): `pantallas/papelera-cotizacion.ts` llena `Acciones` con «Enviar a la papelera» (`<EnviarLaGuardadaALaPapelera>`,
Server Component que decide quién lo ve y dibuja `<BotonEnviarALaPapelera>` con el id y la versión; `outline`, tras «Revisiones»). Lo ve quien puede
guardarla o, en una preventa, quien modera (`puedeEnviarLaCotizacion`, espejo de `_cotizacion_a_papelera()`). Se hace sin preguntar
(`hooks/envio-a-papelera.ts`: llama a las actions sin `useAction`, porque el JS en frío de la guardada está al tope): lleva a `/cotizaciones` con ««T» se
envió a la papelera.» y «Deshacer» 10 s, que restaura ese lote con la versión que devolvió el envío; si la base la rechaza (PT409 con «Recargar»; sin
permiso), avisa y se queda. No mira lo tipeado sin guardar. `Debajo` queda vacío.

## Lo que no se rompe

- Enviar manda la versión de la página **tal cual** (`cotizacion.actualizadoEn`, el texto de la base): nunca pasa por `Date` ni se relee antes de mandar.
- El lote trae sólo número, título (o «Cotización #n»), clase, origen y fecha: nada que la RLS le esconda a quien tiene la clave y no ve la cotización. Sin
  total, cliente ni vehículo.
- La pantalla no pide más que una página (`tamano + 1`) y «Mostrar los N» un lote (≤ 200): su documento no crece con el tamaño del lote
  (`e2e/cotizaciones-papelera.spec.ts`).
- Purgar mira la clave dos veces en la app (la action y la revisión de la URL, porque quien no purga ve sus propios lotes) y la base la vuelve a pedir. El
  `<Confirmar>` es uno por pantalla y todo `<Confirmar>` nuevo del área va a `scripts/guardas/confirmar-con-url-papelera.ts`.
- Las RPC con tamaño están en `scripts/guardas/paginas-en-la-base-papelera.ts` (`p_tope` con `LOTES_POR_PAGINA + 1`, `p_primeros` con
  `PRIMEROS_DEL_LOTE`).

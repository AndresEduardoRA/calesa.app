## 2026-11-11 — Paso 7.12-2: el buscador, lo del navegador y la medición (parte 2 de 2 del 7.12)

Siguen la numeración del 7.12-1 (`docs/pasos/7.12-1/decisiones.md`, D1–D11).

- **D12 · Las lecturas viven en `buscador/infra` y salen por `buscador/client.ts`**, no en `leads`, `vehiculos` y `cotizaciones`: llaman a las RPC
  `buscador_*` (dominio y carril b) y D1 ya las hizo RPC del buscador. 7.10 (`chat`) importa `@/modules/buscador/client` y suma `chat --> buscador` a
  `docs/ARQUITECTURA.md`, sin ciclo. Reversible: se mueven a sus módulos sin tocar la base.
- **D13 · El mínimo se decide con `interpretarBusqueda()` de `@/modules/leads/client`, y la llama la feature que compone** (la paleta del 7.13, el selector
  `#` del 7.10). `entities` e `infra` no pueden importar otro módulo (`eslint.config.mjs`, auditoría del plan): `ranking.ts` recibe la interpretación ya
  hecha con su propio tipo estructural (`Interpretacion`), y `buscar*.client.ts` reciben el texto ya validado. La base repite el mínimo y manda.
- **D14 · Cancelar no tiene un valor propio:** la lectura no lanza; con la señal ya cancelada no pide nada, y quien canceló descarta la respuesta mirando su
  `signal`. Así no se ensancha `Resultado` (de `src/shared`, del A, y disparador del Nivel 2).
- **D15 · Los últimos abiertos son una lista mezclada por recencia**, sin grupos: se leen 16 y se muestran 8, para que una oculta o purgada no deje la lista corta.
- **D16 · Registrar la visita no entra aquí:** es una escritura y va por Server Action en el 7.13 (`<RegistrarVisita>`).
- **D17 · La hidratación no muestra marcador:** lo que no se ve desaparece, como en `leerNombresDeLeads`; si falla una de las tres lecturas, falla la lectura entera.
- **D18 · `medir-buscador.sql` mide sólo `buscador_cotizaciones`** (D9: el único definer con `ilike` sobre una tabla que crece). El número se mide como `#n`
  (`soloNumero`), Ana con 100 propias fijas (no crecen con N) y las 10 «Zafiro único» de la dueña entre las más viejas; antes de medir se vacía la lista
  pendiente del GIN (`gin_clean_pending_list`), que en la nube vacía el autovacuum. La guarda (sin el GIN) muerde si recorre la tabla o si el heap crece.
- **D19 · `MEDIR_SOLO` en el runner:** corre una medición sin las otras veinte de `db:medir:volumen`; va en el mismo commit que la medición (sin él no se corre sola).
- **D20 · Sin test de `resultados.ts` aparte ni de `infra/`:** pruebas sólo en lo clave; `filasDesde` lo cubre `ranking.test.ts` y el camino feliz, el e2e del 7.13.
- **D21 · `POR_SECCION` vive en `buscador/entities/ranking.ts`**, no en `src/shared/lib/paginacion.ts`: es el tope de una sección del buscador, no una página de
  lista (precedente: `MAXIMO_DE_PAGINA_DE_VEHICULOS`), y `shared` es del A y dispara el Nivel 2.
- **D22 · La contingencia de la medición entró: la ruta de las propias sólo corre donde se tiene «propios» sin «todos»** (`20261111200531_buscador_cotizaciones_rutas.sql`).
  Con el plan genérico, un título raro de la dueña recorría todas sus propias por `cotizaciones_creador_idx` (2.235 → 11.147 bloques, 46 → 229 ms): la ruta corría
  también en los orígenes con «todos». Se probó además pasar las dos consultas de candidatas a `execute … using` (`medir-buscador-2.txt`): planificada con el
  texto, la del título va por un Seq Scan con `limit 1000` para un título común (≈ 600 bloques si las coincidencias se reparten; la tabla entera si quedan al
  final), y la medición lo marcó como recorrido. Se quedan estáticas: el genérico va por el GIN. Queda como límite declarado en RENDIMIENTO lo que hace el plan a
  medida en las 5 primeras llamadas de una sesión. La visibilidad no cambia: menos candidatas, y la misma policy repetida (B4 de `buscador.sql` sigue en verde y
  suma el caso mixto: «todos» en un origen y «propios» en otro, atrapado por la mutación `v_solo_propios := v_t`). Lo que se pierde: quien ve «todos» en un
  origen, con más de 1.000 coincidencias de un título, ya no tiene sus propias primero (la ruta del título toma 1.000 cualesquiera); llega por `#número` o
  afinando el texto. Es un buscador con tope, no una lista. Se desvía de C14 del plan, que proponía `execute … using`: lo medido lo descartó.
- **Compuerta `datos` (contingencia de C14):** cambiar `buscador_cotizaciones`, un `security definer`, sin cambiar su firma, lo que devuelve ni la policy repetida.
  Con `PILOTO_AUTO=todo` se aprueba sola con la primera opción («seguir con la migración»); el informe se audita.

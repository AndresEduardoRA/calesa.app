## 2026-11-12 · Decisiones del paso 8.04-2 (la lectura del tablero de la cola web y su pantalla de sólo lectura)

- **D13** · **«Ver más» se lee en el navegador**, como «Tareas sin fecha» de la agenda: `infra/cola/solicitudes.client.ts` llama `cola_web_solicitudes` con
  la sesión de quien mira (la RPC es de definidor y vuelve a exigir `web.cola.gestionar`) y sale por `areas/cola/client.ts`. La primera página la lee el
  servidor, para el conteo y para que la pantalla llegue dibujada. Ninguna Server Action para leer.
- **D14** · **El orden de la rueda usa el `cupo` de cada fila** (la base ya lo da como `coalesce(max_abiertas, max_abiertas_default)`): `ordenDeLaRueda(filas)`
  no recibe `cupoPorDefecto` (lo nombraba el plan de la 8.04-1). Una sola fuente del cupo.
- **D15** · **La rueda muestra a todas las que están en ella**: primero, numeradas en el orden de la ruleta (`<ol>`), las que hoy recibirían un turno nuevo
  (disponibles y con WhatsApp); al final, por nombre, las que no, con «Hoy no recibe turnos nuevos: …» (le falta el WhatsApp gana sobre no disponible). Sin
  etiqueta «le toca»: el turno abierto y el pegajoso de la base pueden adelantarse; el número es el orden de la ruleta, no una promesa.
- **D16** · **`fuente` y `ruta` se dibujan como texto tal cual**: no hay catálogo de fuentes ni en la base ni en `src`. Ponerles nombre es del 8.05
  (`<TarjetaTurno>`); si allí nace una etiqueta, va en el núcleo para que `cola` la pueda usar (un área no importa otra).
- **D17** · **La política se lee en el área `cola`** (`infra/cola/politica.ts` sobre `ajustes_web`, una fila), no en `sitio`: un área no importa otra. El
  tablero usa `colaActiva` y `whatsappRespaldo` (los avisos de arriba); la 8.04-3 reusa el lector para el formulario (trae las cinco claves y `actualizadoEn`).
- **D18** · **«Actualizar» y volver a la pestaña = `router.refresh()`** desde `actualizar-tablero.tsx`, una copia corta de `RefrescarAlVolver` de `leads`: no
  se mueve a `src/shared` (subiría la parte a Nivel 2) ni se importa de otro módulo. La lista de «Sin asignar» lleva `key` = la firma de la primera página,
  así «Actualizar» descarta lo traído con «Ver más».
- **D19** · **Al tope de lo cargado (500), el aviso sin camino a lo antiguo**: no hay filtro ni fecha para las `sin_asignar` (fuera de la fila del PLAN), y a
  quien quedó ahí ya se lo mandó al respaldo. Reversible: un filtro por fecha es otra RPC.
- **D20** · **El tablero con `hay_mas`** (más de 100 habilitadas, `TOPE_DEL_EQUIPO`) avisa «Mostrando las primeras 100 habilitadas, por nombre.» y agrupa lo
  leído. Los números de cada fila (vencidas, abiertas de su cupo) son columnas o conteos acotados por el cupo, no totales de una tabla que crece.
- **D21** · **Cada parte del tablero con su error**: si una de las tres lecturas falla, esa parte muestra su error con «Reintentar» (`router.refresh()`) y las
  otras se dibujan igual; no se tira la pantalla entera a `error.tsx`.

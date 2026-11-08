## 2026-11-08 — Paso 4.19-3b: la pestaña «Tarjeta» y el editor que guarda

- **Hecho:** la segunda parte del 4.19-3. **Puros** (`entities/plantilla/`, cada uno con su test): `contextoParaElNavegador()` (del contexto de `validarPlantilla()` sólo los nodos
  con lugar o de tipo de cambio, con su etiqueta, grupo y salida; los grupos; del diseño los modos y los secundarios; y el `{ver}` de la visibilidad; nunca el cuerpo de un nodo),
  `plantillaParaEditar()` y `alinearConLaFormula()` (el borrador, o la copia de la publicada, o la omisión; un grupo que la fórmula ya no tiene se quita, uno nuevo se suma al final),
  `avisosDeTonos()`, los cambios (`conEtiqueta`, `conTotal`, `conNota`…), `filasDelEditor()` y `filtrarFilas()`, `origenesDeLaTarjeta()` y `propsDelEditor()` (lo único que la sección
  calcula, probado porque un Server Component async no se monta en Vitest). **Editor** (`features/plantilla/`): `useEditorDeLaPlantilla` (estado, forma y `completa` al tipear, borrador en
  la pestaña por versión), `useGuardarLaPlantilla` (un envío a la vez, PT409 que se va al llegar la versión, sin conexión), `useMotivosDelEditor`, y los bloques «Grupos», «Total»,
  «Filas» (con «Buscar fila») y «Pie y columnas»; cada campo dice «n de <tope>» con `caracteres()` y ninguno lleva `maxLength` (4-74 aplicado). **Pestaña:** `?seccion=tarjeta&origen=`
  con `cotizaciones.configurar`, después de «Fórmula»; el selector de origen, el vacío sin fórmula con su enlace y el editor por `diferido()`.
- **Lo que midió E7** (`e2e/configuracion-cotizacion-tarjeta-volumen.spec.ts`, escritorio, con 500 miembros): **147.484 B** del primer HTML y **4.754 nodos** del DOM con «Filas»
  abierto (topes 154.900 y 5.000, +5 %). El primer HTML con la «mini» no lleva el cuerpo de un nodo («Probabilidad de compra en subasta»). Con 600 miembros el aviso de tope aparece y
  «Buscar fila» halla la fila 600. El plan suponía un HTML mucho menor: lo que pesa es `contexto` + `inicial` en el payload de la pestaña (≈ 100 B por nodo con lugar y por fila).
- **Verificación** (`.piloto/salidas/4.19-3b/`): `rojo-head-puro.txt`, `rojo-head-editor.txt` (los módulos no existen) y `rojo-head-e2e.txt` (sin la pestaña el build no compila: `pestanas.test.ts`
  nombra «tarjeta»); `verde.txt` (los tres specs, 22 de 22 en escritorio y móvil); `dirigidos.txt` y `dir2.txt` (los diez specs de Configuración › Cotización y `configuracion-200`, en los dos
  proyectos, sin caídas); vitest de `src/modules/cotizaciones`, `src/app` y `scripts/guardas`: 254 archivos, 3.611 pruebas. **Sondas** (pantalla pura, sin mutaciones formales): S1 (el
  contexto entero), S4 (no quitar el grupo ajeno), S2 (la esperada por `Date`), S3 (el conflicto que se va al pulsar), S7 (`maxLength`) y S8 («Guardar» apagado por `completa`) caen en su
  prueba; S3 sólo en `use-guardar-la-plantilla.test.tsx` (el hueco entre «Recargar» y la versión nueva no se reproduce con certeza en e2e).
  e2e completo: no (4.19-3b, pantalla, 2 de 3)
- **No hecho / desvíos:** `docs/RENDIMIENTO.md` lleva la fila de la pestaña con lo medido. No hay presupuesto de JS para `/configuracion/cotizacion` (el editor va por `diferido()`);
  4-73 no se toca. `docs/UX.md` se escribió en el commit de la pestaña porque `mapa.sh --check` pide que exista el título que cita el spec.
- **Abiertos:** nuevo **4-101** (el editor no mueve el orden de los grupos ni agrega o quita grupos a mano; lo decide la persona con la vista previa del 4.19-4). Sigue el **4.19-3c**
  (publicar con nota y descartar); la cuenta de e2e pasa a 2 de 3.
- **Commits:** `5cb4f238` feat(cotizaciones): preparar la plantilla de la tarjeta para editarla · `b49e52f7` feat(cotizaciones): editar y guardar la plantilla de la tarjeta · `55fed1b1`
  feat(cotizaciones): pestaña de la tarjeta en configuración › cotización · y el de docs.

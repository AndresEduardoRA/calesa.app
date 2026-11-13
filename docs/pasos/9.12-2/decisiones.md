# 9.12-2 · Auditoría AA, parte 2 de 5: leads, vehículos y cotizaciones (2026-11-13)

- **D1 · 4-61 y 4-62 van a la 9.12-3:** lo que recuerda la ficha tras recargar vive en `src/shared/ui/vuelta-del-foco.ts`; tocarlo es Nivel 2 y es la
  parte de `shared/ui`. Así esta parte queda en Nivel 1 y entra en seis commits.
- **D2 · El R7 de `/leads` y los enlaces de `/vehiculos/«id»` van a la 9.12-5, y la casilla de `/vehiculos` a la 9.12-3:** R7 es una regla de informe sin
  assert en la fila; la casilla es el `Checkbox` de `src/shared/ui`.
- **D3 · `useTrasElEnvio` va uno por módulo (`leads` y `vehiculos`), no en `src/shared/lib`:** compartirlo subía la parte a Nivel 2 por 40 líneas. Son
  el mismo contrato con la misma prueba; la 9.12-3, que ya es Nivel 2, puede unirlos. Se revierte borrando uno.
- **D4 · 4-50: el resumen nace plegado al 200 % y el tope de alto sigue en el 40 %:** el plan buscaba un 30 %, pero plegado mide 33,6 % en escritorio, y en
  el celular el pie solo (Guardar, Vista previa, Live) ya pasa del 30 %: el resumen sigue llegando al 40 % con scroll adentro. Esconder «Guardar»
  quedaba descartado, así que el assert es el que PLAN admite («no pasa de un alto que se decida, **o** nace plegado»): nace plegado, el alto se
  informa y el tope de 40 % no cambia. Para ganar alto, el botón mide 44 px fijos, como Live, y no lleva ícono: la hoja más grande está en 493 de 500
  nodos. Los 107 px bajo el borde con la página arriba de todo siguen sólo informados.
- **D5 · El `h1` de los listados es `sr-only`, como el de `/leads`:** la barra de filtros ya ocupa la cabecera y el título de la pestaña nombra la página;
  un título visible cambiaba el diseño de dos pantallas sin que nadie lo pidiera. Se revierte quitando la clase.
- **D6 · El resumen nace plegado según la fuente raíz (≥ 24 px) y no según el ancho:** lo cambia el texto al 200 %, del navegador o de la prueba; a
  100 % en un celular angosto el resumen ya cabe. No va a la URL porque es un estado de presentación, no una vista.
- **D7 · Lo encolado tras guardar sale también al desmontarse** (el plan decía que no corría): el panel de un vehículo y el de etapas del embudo se
  vuelven a montar con la versión nueva que trae el refresco, antes de que `isPending` vuelva a falso, y el aviso se perdía (`leads-embudo` y
  `vehiculos-alta` cayeron así). Sólo se encola tras un guardado que entró, así que avisarlo al desmontarse dice la verdad. Por la misma razón, en el
  alta de vehículo cerrar el panel (`alCrear`) va en la cola junto con «… creado»: si cerrara antes, desmontaría el aviso.

## Auditoría AA (9.12)

Lo que esta parte cierra o reasigna de la tabla de la 9.12-1:

| Regla | Dónde                                                   | Antes     | Ahora                                                     |
| ----- | ------------------------------------------------------- | --------- | --------------------------------------------------------- |
| R3    | `/cotizaciones`, `/vehiculos`                           | 9.12-2    | cerrado: `h1` `sr-only`; R3 es dura desde esta parte      |
| R3    | las siete rutas de logística, repuestos y actividad     | 9.12-5    | siguen en la 9.12-5, ahora como `CONOCIDOS` de regla dura |
| R7    | botones sin `data-slot` de `/leads` (3)                 | 9.12-2    | 9.12-5 (D2)                                               |
| R7    | la casilla de `/vehiculos` (`span[data-slot=checkbox]`) | —         | 9.12-3 (D2)                                               |
| —     | `/cotizaciones/[id]`                                    | pendiente | barrida: sin hallazgos duros                              |

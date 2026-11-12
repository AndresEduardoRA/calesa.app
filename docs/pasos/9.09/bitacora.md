## 9.09 · higiene del e2e y del CI, partes 1 y 3 (2026-11-12)

Parte 1 (9-8): `empresa.spec.ts` deja Vault como estaba. `e2e/soporte/apibara-clave.ts` suma `vigilarVaultDeApibara()` (huella al
empezar, quitar lo que dejó la prueba y comprobar la huella al final); sin clave previa borra la que escribió la prueba, con una real el
caso que escribe se salta. `e2e/apibara-clave-intacta.spec.ts` prueba esa regla con y sin clave.

Parte 3 (9-11): `scripts/ci/volcar-base.sh` deja el log de la base y sus estadísticas en `e2e-fallos/` y el job `e2e` lo corre con
`if: failure()`; `scripts/guardas/workflows-fallo.ts` lo exige (4 mutaciones en `workflows-fallo.test.ts`). 9-4 y 9-5 se cierran como
decididos; 9-6 queda abierto con la persona. Quedan 9.09-2 (9-9 y 9-10) y 9.09-3 (4-41).

- e2e completo: no (9.09, Nivel 1: lo corre el CI del PR; dirigidos empresa, apibara-clave-intacta y vehiculos-apibara-funcion en escritorio)

## 9.09-2 · esperas del e2e, 9-9 y 9-10 (2026-11-12)

Ayudante nuevo en `e2e/soporte/esperas.ts`: `conRespuesta(page, coincide, accion, espera)` arma la espera antes de la acción, anota lo que
tardó si fue 1 s o más y, si vence su tope (30 s o el que se le dé), dice qué pedido faltó; `demorarPedido()` retrasa un pedido y deja pasar
la respuesta real; `esRpc`, `esRuta` y `esAccionDelServidor` son sus predicados. 9-9: los specs de medición y de capturas esperan un estado
(`esperarHidratado`, `aLaVistaAlAcomodarse`, `quieto`, el contenido diferido de cada sección) y no un tiempo. 9-10: las esperas de 5 s sobre un
pedido pasan a esperar su respuesta, con un caso «con el pedido demorado 6 s» por archivo.

- **9-9, 5 de 5 con la CPU a 20×** (parche temporal en el fixture `page`, sin versionar; D3). Pasan 5 de 5: la barra, el chip, la ficha, el
  resumen, `menu-de-acciones-200`, la ficha de seis secciones y las tres capturas. «B · con el drawer abierto» (`leads-recorrido`) pasa su sitio
  y cae 5 de 5 después, en un ingreso (`entrar`, línea 263) que no es del paso; no se estabiliza.
- **9-10, un caso por archivo en verde** a 1×: `leads-rapido-volumen`, `leads-papelera`, `leads-escala-demorado`, `leads-alta-contexto` y
  `leads-exportar`. **`escala-recorrido` no se corrió**: sólo corre con volumen sembrado y la base del carril no lo tiene (escrito y tipado).
- e2e completo: no (9.09-2, Nivel 1: lo corre el CI del PR; dirigidos recorrido-esperas, leads-rapido-volumen, leads-papelera, leads-escala, leads-escala-demorado, leads-alta-contexto, leads-exportar, leads-recorrido, leads-recorrido-modales, barra-de-filtros-200, leads-ficha-origen-inactivo-200, menu-de-acciones-200, configuracion-200-capturas, cierre-pendientes-capturas, leads-recorrido-cierre-2 en escritorio)

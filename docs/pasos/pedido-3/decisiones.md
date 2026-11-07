# pedido-3 (pedido del carril b, 4.21)

- `plan.yaml` › `4.21` pasa a `riesgo: rojo` y suma a `modulos` la base, sus pruebas, los tipos, la carpeta de Configuración › Cotización y las dos guardas, como pidió el carril b.
- Dos cambios más que el pedido no nombraba y que `scripts/coordinador/plan.mjs` exige (`coordinador.node.test.ts` cayó sin ellos):
  - un paso rojo va con opus, modo plan y revisor: el ruteo del 4.21 pasa de `sonnet / auto / ninguno` a `opus / plan→auto / claude-sesion-nueva`, como el 4.20-4a;
  - el 4.21 y el 4.20-4b (carril A) tocan `src/app/(app)/configuracion/cotizacion/`: el 4.21 pasa a depender del 4.20-4b, que es lo que el 4.21-3a ya verificaba.
- Si la persona prefiere que el 4.21 siga con sonnet, hay que decidir otra forma de mantenerlo rojo: el chequeo del plan no lo deja.

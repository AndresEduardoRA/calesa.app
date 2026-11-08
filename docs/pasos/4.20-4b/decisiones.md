## Paso 4.20-4b (2026-11-08)

- **Sólo lo clave:** del plan del B (`docs/pasos/4.20-4/plan-del-a.md`) no se escribieron el e2e del conflicto (E3: lo prueba la T3 de `supabase/tests/empresa-ajustes-de-cotizacion.sql`), el de la hoja sin vehículo (E4: sin código nuevo, la hoja ya lee el ajuste al abrir) ni el test de componente: la regla «Pruebas: sólo lo clave» de la persona (2026-11-08) es posterior. Quedan un e2e del camino feliz y uno de quien configura un solo origen.
- **Nombres:** el componente es `FormularioDeAjustesDeCotizacion` (`AjustesDeCotizacion` ya es el tipo); el aviso, «Ajustes de cotización guardados», como «Ajustes de la empresa guardados». El motivo sin permiso va en un `<Aviso>` arriba del bloque, como en Empresa.
- **Ajustes al final:** la pestaña va después de «Fórmula»: quien configura un solo origen sigue entrando por «Fórmula» y quien tiene todo, por «Niveles de acceso».

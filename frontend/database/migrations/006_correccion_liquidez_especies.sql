-- ================================================
-- Migración 006: Corrección Conceptual de Liquidez y Especies
-- ================================================
-- Fecha: 2025-10-14
-- Descripción: Separa correctamente movimientos de liquidez REALES
--              de operaciones de especies (transformaciones internas)
-- 
-- PROBLEMA: El sistema actual crea registros automáticos en 
--           asignacion_liquidez cuando se compran/venden especies,
--           lo cual es conceptualmente incorrecto.
--
-- SOLUCIÓN: Eliminar registros automáticos y recalcular liquidez
--           basándose solo en asignaciones manuales ± compras/ventas
-- ================================================

-- ================================================
-- PASO 1: BACKUP DE DATOS
-- ================================================
DO $$
BEGIN
  RAISE NOTICE '=== PASO 1: Creando backup de asignacion_liquidez ===';
END $$;

-- Crear tabla de backup si no existe
CREATE TABLE IF NOT EXISTS asignacion_liquidez_backup (
  LIKE asignacion_liquidez INCLUDING ALL
);

-- Insertar todos los datos actuales
INSERT INTO asignacion_liquidez_backup 
SELECT * FROM asignacion_liquidez
ON CONFLICT DO NOTHING;

-- Verificar backup
DO $$
DECLARE
  v_count_original INTEGER;
  v_count_backup INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count_original FROM asignacion_liquidez;
  SELECT COUNT(*) INTO v_count_backup FROM asignacion_liquidez_backup;
  
  RAISE NOTICE '✓ Backup creado: % registros originales, % en backup', 
    v_count_original, v_count_backup;
  
  IF v_count_backup = 0 THEN
    RAISE EXCEPTION 'ERROR: Backup vacío. No se puede continuar.';
  END IF;
END $$;

-- ================================================
-- PASO 2: ANÁLISIS PRE-MIGRACIÓN
-- ================================================
DO $$
BEGIN
  RAISE NOTICE '=== PASO 2: Analizando datos a eliminar ===';
END $$;

-- Contar registros por origen
DO $$
DECLARE
  v_manual INTEGER;
  v_compra_auto INTEGER;
  v_venta_auto INTEGER;
  v_null_origen INTEGER;
BEGIN
  -- Contar manuales
  SELECT COUNT(*) INTO v_manual
  FROM asignacion_liquidez
  WHERE origen = 'manual';
  
  -- Contar compras automáticas
  SELECT COUNT(*) INTO v_compra_auto
  FROM asignacion_liquidez
  WHERE origen = 'compra_automatica';
  
  -- Contar ventas automáticas
  SELECT COUNT(*) INTO v_venta_auto
  FROM asignacion_liquidez
  WHERE origen = 'venta_automatica';
  
  -- Contar sin origen (NULL)
  SELECT COUNT(*) INTO v_null_origen
  FROM asignacion_liquidez
  WHERE origen IS NULL;
  
  RAISE NOTICE '  - Manuales: %', v_manual;
  RAISE NOTICE '  - Compras automáticas: % (se eliminarán)', v_compra_auto;
  RAISE NOTICE '  - Ventas automáticas: % (se eliminarán)', v_venta_auto;
  RAISE NOTICE '  - Sin origen (NULL): % (se mantendrán como manuales)', v_null_origen;
  RAISE NOTICE '  - TOTAL A ELIMINAR: %', v_compra_auto + v_venta_auto;
END $$;

-- ================================================
-- PASO 3: ELIMINAR REGISTROS AUTOMÁTICOS
-- ================================================
DO $$
DECLARE
  v_deleted INTEGER;
BEGIN
  RAISE NOTICE '=== PASO 3: Eliminando registros automáticos ===';
  
  -- Eliminar registros con origen automático
  DELETE FROM asignacion_liquidez 
  WHERE origen IN ('compra_automatica', 'venta_automatica');
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  RAISE NOTICE '✓ Eliminados % registros automáticos', v_deleted;
  
  IF v_deleted = 0 THEN
    RAISE NOTICE '⚠ No había registros automáticos para eliminar';
  END IF;
END $$;

-- Actualizar registros con origen NULL a 'manual'
UPDATE asignacion_liquidez 
SET origen = 'manual'
WHERE origen IS NULL;

-- ================================================
-- PASO 4: CREAR FUNCIÓN PARA CALCULAR LIQUIDEZ DE FONDO
-- ================================================
DO $$
BEGIN
  RAISE NOTICE '=== PASO 4: Creando función calcular_liquidez_fondo() ===';
END $$;

-- Eliminar función anterior si existe (con cualquier tipo de parámetro)
DROP FUNCTION IF EXISTS calcular_liquidez_fondo(INTEGER);
DROP FUNCTION IF EXISTS calcular_liquidez_fondo(BIGINT);

CREATE OR REPLACE FUNCTION calcular_liquidez_fondo(p_fondo_id BIGINT)
RETURNS NUMERIC AS $$
DECLARE
  v_asignaciones NUMERIC;
  v_compras NUMERIC;
  v_ventas NUMERIC;
  v_resultado NUMERIC;
BEGIN
  -- 1. Sumar asignaciones manuales netas (asignaciones - desasignaciones)
  SELECT COALESCE(
    SUM(CASE 
      WHEN tipo_operacion = 'asignacion' THEN monto_usd 
      WHEN tipo_operacion = 'desasignacion' THEN -monto_usd 
      ELSE 0
    END), 0
  ) INTO v_asignaciones
  FROM asignacion_liquidez
  WHERE fondo_id = p_fondo_id 
    AND origen = 'manual';
  
  -- 2. Sumar valor de compras (especies compradas)
  SELECT COALESCE(SUM(nominal * COALESCE(precio_usd, 0)), 0) 
  INTO v_compras
  FROM movimiento
  WHERE fondo_id = p_fondo_id 
    AND tipo_mov = 'compra';
  
  -- 3. Sumar valor de ventas (especies vendidas)
  SELECT COALESCE(SUM(nominal * COALESCE(precio_usd, 0)), 0) 
  INTO v_ventas
  FROM movimiento
  WHERE fondo_id = p_fondo_id 
    AND tipo_mov = 'venta';
  
  -- 4. Calcular liquidez disponible
  -- liquidez = asignaciones manuales - compras + ventas
  v_resultado := v_asignaciones - v_compras + v_ventas;
  
  RETURN v_resultado;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calcular_liquidez_fondo(BIGINT) IS 
  'Calcula la liquidez disponible de un fondo: asignaciones_manuales - compras + ventas';

-- ================================================
-- PASO 5: ACTUALIZAR VISTA v_estado_fondo
-- ================================================
DO $$
BEGIN
  RAISE NOTICE '=== PASO 5: Actualizando vista v_estado_fondo ===';
END $$;

-- Eliminar vista existente si existe
DROP VIEW IF EXISTS v_estado_fondo CASCADE;

-- Crear vista corregida
CREATE OR REPLACE VIEW v_estado_fondo AS
SELECT 
  f.id_fondo,
  f.cliente_id,
  
  -- Liquidez asignada al fondo (solo asignaciones manuales netas)
  COALESCE(
    (SELECT SUM(CASE 
      WHEN tipo_operacion = 'asignacion' THEN monto_usd 
      WHEN tipo_operacion = 'desasignacion' THEN -monto_usd 
    END)
    FROM asignacion_liquidez 
    WHERE fondo_id = f.id_fondo 
      AND origen = 'manual'
    ), 0
  ) as liquidez_asignada,
  
  -- Dinero invertido en compras de especies
  COALESCE(
    (SELECT SUM(nominal * COALESCE(precio_usd, 0)) 
     FROM movimiento 
     WHERE fondo_id = f.id_fondo 
       AND tipo_mov = 'compra'
    ), 0
  ) as dinero_invertido,
  
  -- Dinero recuperado por ventas de especies
  COALESCE(
    (SELECT SUM(nominal * COALESCE(precio_usd, 0)) 
     FROM movimiento 
     WHERE fondo_id = f.id_fondo 
       AND tipo_mov = 'venta'
    ), 0
  ) as dinero_recuperado,
  
  -- Liquidez disponible del fondo (usa función)
  calcular_liquidez_fondo(f.id_fondo) as liquidez_disponible,
  
  -- Saldo disponible (alias para compatibilidad con código existente)
  calcular_liquidez_fondo(f.id_fondo) as saldo_disponible
  
FROM fondo f;

COMMENT ON VIEW v_estado_fondo IS 
  'Estado financiero de fondos. Liquidez calculada correctamente: asignaciones manuales - compras + ventas. 
   NO incluye registros automáticos de compras/ventas que eran conceptualmente incorrectos.';

-- ================================================
-- PASO 6: VERIFICACIÓN DE INTEGRIDAD
-- ================================================
DO $$
BEGIN
  RAISE NOTICE '=== PASO 6: Verificando integridad de datos ===';
END $$;

-- Verificar que no queden registros automáticos
DO $$
DECLARE
  v_automaticos INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_automaticos
  FROM asignacion_liquidez
  WHERE origen IN ('compra_automatica', 'venta_automatica');
  
  IF v_automaticos > 0 THEN
    RAISE EXCEPTION 'ERROR: Todavía existen % registros automáticos', v_automaticos;
  ELSE
    RAISE NOTICE '✓ No hay registros automáticos (correcto)';
  END IF;
END $$;

-- Verificar que la función funciona
DO $$
DECLARE
  v_test_liquidez NUMERIC;
  v_test_fondo_id INTEGER;
BEGIN
  -- Tomar primer fondo como test
  SELECT id_fondo INTO v_test_fondo_id FROM fondo LIMIT 1;
  
  IF v_test_fondo_id IS NOT NULL THEN
    SELECT calcular_liquidez_fondo(v_test_fondo_id) INTO v_test_liquidez;
    RAISE NOTICE '✓ Función calcular_liquidez_fondo() funciona. Test fondo %: $% USD', 
      v_test_fondo_id, v_test_liquidez;
  END IF;
END $$;

-- Verificar que la vista funciona
DO $$
DECLARE
  v_count_vista INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count_vista FROM v_estado_fondo;
  RAISE NOTICE '✓ Vista v_estado_fondo funciona. % fondos', v_count_vista;
END $$;

-- ================================================
-- PASO 7: REPORTE DE MIGRACIÓN
-- ================================================
DO $$
BEGIN
  RAISE NOTICE '=== PASO 7: Reporte final de migración ===';
END $$;

-- Mostrar estado de fondos después de migración
DO $$
DECLARE
  rec RECORD;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Estado de fondos después de migración (primeros 5):';
  RAISE NOTICE '--------------------------------------------------------';
  
  FOR rec IN (
    SELECT 
      f.id_fondo,
      COALESCE(tc.descripcion, 'Sin nombre') as tipo_cartera,
      ef.liquidez_asignada,
      ef.dinero_invertido,
      ef.dinero_recuperado,
      ef.liquidez_disponible,
      COALESCE(
        (SELECT SUM(cantidad_actual * COALESCE(precio_actual, 0)) 
         FROM v_tenencias_valoradas 
         WHERE fondo_id = f.id_fondo
        ), 0
      ) as valor_especies,
      (ef.liquidez_disponible + 
       COALESCE(
         (SELECT SUM(cantidad_actual * COALESCE(precio_actual, 0)) 
          FROM v_tenencias_valoradas 
          WHERE fondo_id = f.id_fondo
         ), 0
       )
      ) as patrimonio_total
    FROM fondo f
    LEFT JOIN tipo_cartera tc ON f.tipo_cartera_id = tc.id_tipo_cartera
    LEFT JOIN v_estado_fondo ef ON f.id_fondo = ef.id_fondo
    ORDER BY f.id_fondo
    LIMIT 5
  ) LOOP
    v_count := v_count + 1;
    RAISE NOTICE 'Fondo % - %:', rec.id_fondo, rec.tipo_cartera;
    RAISE NOTICE '  Liquidez asignada: $%', rec.liquidez_asignada;
    RAISE NOTICE '  Dinero invertido: $%', rec.dinero_invertido;
    RAISE NOTICE '  Dinero recuperado: $%', rec.dinero_recuperado;
    RAISE NOTICE '  Liquidez disponible: $%', rec.liquidez_disponible;
    RAISE NOTICE '  Valor especies: $%', rec.valor_especies;
    RAISE NOTICE '  PATRIMONIO TOTAL: $%', rec.patrimonio_total;
    RAISE NOTICE '';
  END LOOP;
  
  IF v_count = 0 THEN
    RAISE NOTICE '  No hay fondos en el sistema';
  END IF;
END $$;

-- Mostrar resumen de asignaciones
SELECT 
  'Resumen de asignacion_liquidez después de migración' as titulo,
  COUNT(*) as total_registros,
  COUNT(*) FILTER (WHERE origen = 'manual') as manuales,
  COUNT(*) FILTER (WHERE origen IS NULL) as sin_origen,
  COUNT(*) FILTER (WHERE origen IN ('compra_automatica', 'venta_automatica')) as automaticos
FROM asignacion_liquidez;

-- ================================================
-- PASO 8: INSTRUCCIONES FINALES
-- ================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  MIGRACIÓN COMPLETADA EXITOSAMENTE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'RESUMEN:';
  RAISE NOTICE '  ✓ Backup creado en asignacion_liquidez_backup';
  RAISE NOTICE '  ✓ Registros automáticos eliminados';
  RAISE NOTICE '  ✓ Función calcular_liquidez_fondo() creada';
  RAISE NOTICE '  ✓ Vista v_estado_fondo actualizada';
  RAISE NOTICE '  ✓ Integridad verificada';
  RAISE NOTICE '';
  RAISE NOTICE 'PRÓXIMOS PASOS:';
  RAISE NOTICE '  1. Verificar los reportes arriba';
  RAISE NOTICE '  2. Modificar backend (/api/movimiento/route.js)';
  RAISE NOTICE '  3. Actualizar frontend (modales)';
  RAISE NOTICE '  4. Ejecutar testing integral';
  RAISE NOTICE '';
  RAISE NOTICE 'ROLLBACK (si necesario):';
  RAISE NOTICE '  DELETE FROM asignacion_liquidez;';
  RAISE NOTICE '  INSERT INTO asignacion_liquidez SELECT * FROM asignacion_liquidez_backup;';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- ================================================
-- FIN DE MIGRACIÓN 006
-- ================================================

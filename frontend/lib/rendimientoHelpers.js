/**
 * Helpers para cálculo de rendimientos de fondos
 */

/**
 * Calcula el valor actual de las especies de un fondo
 * @param {Object} supabase - Cliente de Supabase
 * @param {number} fondoId - ID del fondo
 * @returns {Promise<number>} Valor total en USD
 */
export async function calcularValorEspecies(supabase, fondoId) {
  // 1. Obtener todos los movimientos del fondo
  const { data: movimientos, error: movError } = await supabase
    .from('movimiento')
    .select('tipo_especie_id, tipo_mov, nominal')
    .eq('fondo_id', fondoId);

  if (movError) throw movError;

  // 2. Calcular posición neta por especie
  const posiciones = {};
  for (const mov of movimientos || []) {
    const especieId = mov.tipo_especie_id;
    if (!posiciones[especieId]) {
      posiciones[especieId] = 0;
    }
    
    if (mov.tipo_mov === 'compra') {
      posiciones[especieId] += mov.nominal;
    } else if (mov.tipo_mov === 'venta') {
      posiciones[especieId] -= mov.nominal;
    }
  }

  // 3. Obtener precios actuales
  const especiesConPosicion = Object.keys(posiciones).filter(id => posiciones[id] > 0);
  
  if (especiesConPosicion.length === 0) {
    return 0;
  }

  const { data: precios, error: precioError } = await supabase
    .from('precio_especie')
    .select('tipo_especie_id, precio, fecha')
    .in('tipo_especie_id', especiesConPosicion)
    .order('fecha', { ascending: false });

  if (precioError) throw precioError;

  // 4. Obtener el precio más reciente por especie
  const preciosActuales = {};
  for (const precio of precios || []) {
    if (!preciosActuales[precio.tipo_especie_id]) {
      preciosActuales[precio.tipo_especie_id] = precio.precio;
    }
  }

  // 5. Calcular valor total
  let valorTotal = 0;
  for (const especieId of especiesConPosicion) {
    const nominal = posiciones[especieId];
    const precioActual = preciosActuales[especieId] || 0;
    valorTotal += nominal * precioActual;
  }

  return valorTotal;
}

/**
 * Calcula la liquidez disponible de un fondo
 * @param {Object} supabase - Cliente de Supabase
 * @param {number} fondoId - ID del fondo
 * @returns {Promise<number>} Liquidez en USD
 */
export async function calcularLiquidezFondo(supabase, fondoId) {
  const { data: asignaciones, error } = await supabase
    .from('asignacion_liquidez')
    .select('tipo_operacion, monto_usd')
    .eq('fondo_id', fondoId);

  if (error) throw error;

  let liquidez = 0;
  for (const asig of asignaciones || []) {
    if (asig.tipo_operacion === 'asignacion') {
      liquidez += parseFloat(asig.monto_usd);
    } else if (asig.tipo_operacion === 'desasignacion') {
      liquidez -= parseFloat(asig.monto_usd);
    }
  }

  return liquidez;
}

/**
 * Obtiene los flujos netos de un fondo en un período
 * @param {Object} supabase - Cliente de Supabase
 * @param {number} fondoId - ID del fondo
 * @param {Date} fechaInicio - Fecha de inicio del período
 * @param {Date} fechaFin - Fecha de fin del período
 * @returns {Promise<{depositos: number, extracciones: number, neto: number}>}
 */
export async function obtenerFlujosPeriodo(supabase, fondoId, fechaInicio, fechaFin) {
  const { data: asignaciones, error } = await supabase
    .from('asignacion_liquidez')
    .select('tipo_operacion, monto_usd, origen, fecha')
    .eq('fondo_id', fondoId)
    .gte('fecha', fechaInicio.toISOString())
    .lte('fecha', fechaFin.toISOString());

  if (error) throw error;

  let depositos = 0;
  let extracciones = 0;

  for (const asig of asignaciones || []) {
    // Solo contar flujos manuales para TWR
    if (asig.origen === 'manual') {
      const monto = parseFloat(asig.monto_usd);
      
      if (asig.tipo_operacion === 'asignacion') {
        depositos += monto;
      } else if (asig.tipo_operacion === 'desasignacion') {
        extracciones += monto;
      }
    }
  }

  return {
    depositos,
    extracciones,
    neto: depositos - extracciones
  };
}

/**
 * Calcula el rendimiento TWR de un período
 * @param {number} valorInicial - Valor al inicio del período
 * @param {number} valorFinal - Valor al final del período
 * @param {number} flujoNeto - Depósitos - Extracciones del período
 * @returns {number} Rendimiento como decimal (ej: 0.05 = 5%)
 */
export function calcularTWRPeriodo(valorInicial, valorFinal, flujoNeto) {
  if (valorInicial === 0) return 0;
  
  // TWR = (Valor_Final - Valor_Inicial - Flujos_Netos) / Valor_Inicial
  const ganancia = valorFinal - valorInicial - flujoNeto;
  return ganancia / valorInicial;
}

/**
 * Calcula el rendimiento TWR acumulado
 * @param {Array<number>} rendimientosPeriodos - Array de rendimientos de cada período
 * @returns {number} Rendimiento acumulado como decimal
 */
export function calcularTWRAcumulado(rendimientosPeriodos) {
  let acumulado = 1;
  
  for (const r of rendimientosPeriodos) {
    acumulado *= (1 + r);
  }
  
  return acumulado - 1;
}

/**
 * Genera el snapshot mensual de un fondo
 * @param {Object} supabase - Cliente de Supabase
 * @param {number} fondoId - ID del fondo
 * @param {Date} fecha - Fecha del snapshot (último día del mes)
 * @returns {Promise<Object>} Snapshot creado
 */
export async function generarSnapshotMensual(supabase, fondoId, fecha) {
  // Obtener snapshot anterior (mes previo)
  const fechaAnterior = new Date(fecha);
  fechaAnterior.setMonth(fechaAnterior.getMonth() - 1);
  
  const { data: snapshotAnterior } = await supabase
    .from('fondo_snapshot')
    .select('*')
    .eq('fondo_id', fondoId)
    .lte('fecha', fechaAnterior.toISOString().split('T')[0])
    .order('fecha', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Calcular valores actuales
  const valorEspecies = await calcularValorEspecies(supabase, fondoId);
  const liquidezAsignada = await calcularLiquidezFondo(supabase, fondoId);
  const valorTotal = valorEspecies + liquidezAsignada;

  // Obtener flujos del período
  const primerDiaMes = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  const flujos = await obtenerFlujosPeriodo(supabase, fondoId, primerDiaMes, fecha);

  // Calcular rendimiento del período
  const valorInicial = snapshotAnterior?.valor_total || 0;
  const rendimientoPeriodo = calcularTWRPeriodo(valorInicial, valorTotal, flujos.neto);

  // Calcular rendimiento acumulado
  let rendimientoAcumulado = rendimientoPeriodo;
  if (snapshotAnterior?.rendimiento_acumulado) {
    rendimientoAcumulado = (1 + snapshotAnterior.rendimiento_acumulado) * (1 + rendimientoPeriodo) - 1;
  }

  // Insertar snapshot
  const { data: snapshot, error } = await supabase
    .from('fondo_snapshot')
    .insert({
      fondo_id: fondoId,
      fecha: fecha.toISOString().split('T')[0],
      valor_especies: valorEspecies,
      liquidez_asignada: liquidezAsignada,
      depositos_periodo: flujos.depositos,
      extracciones_periodo: flujos.extracciones,
      rendimiento_periodo: rendimientoPeriodo,
      rendimiento_acumulado: rendimientoAcumulado
    })
    .select()
    .single();

  if (error) throw error;

  return snapshot;
}

/**
 * Obtiene el rendimiento actual de un fondo (desde última valoración)
 * @param {Object} supabase - Cliente de Supabase
 * @param {number} fondoId - ID del fondo
 * @returns {Promise<Object>} Info de rendimiento
 */
export async function obtenerRendimientoActual(supabase, fondoId) {
  // Obtener último snapshot
  const { data: ultimoSnapshot } = await supabase
    .from('fondo_snapshot')
    .select('*')
    .eq('fondo_id', fondoId)
    .order('fecha', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Calcular valor actual
  const valorEspecies = await calcularValorEspecies(supabase, fondoId);
  const liquidezAsignada = await calcularLiquidezFondo(supabase, fondoId);
  const valorTotal = valorEspecies + liquidezAsignada;

  if (!ultimoSnapshot) {
    return {
      valorTotal,
      valorEspecies,
      liquidezAsignada,
      rendimientoPeriodo: 0,
      rendimientoAcumulado: 0,
      sinHistorial: true
    };
  }

  // Calcular flujos desde último snapshot
  const fechaSnapshot = new Date(ultimoSnapshot.fecha);
  const hoy = new Date();
  const flujos = await obtenerFlujosPeriodo(supabase, fondoId, fechaSnapshot, hoy);

  // Calcular rendimiento desde último snapshot
  const rendimientoPeriodo = calcularTWRPeriodo(ultimoSnapshot.valor_total, valorTotal, flujos.neto);
  const rendimientoAcumulado = (1 + (ultimoSnapshot.rendimiento_acumulado || 0)) * (1 + rendimientoPeriodo) - 1;

  return {
    valorTotal,
    valorEspecies,
    liquidezAsignada,
    rendimientoPeriodo,
    rendimientoAcumulado,
    ultimoSnapshot: ultimoSnapshot.fecha,
    flujosDesdSnapshot: flujos
  };
}

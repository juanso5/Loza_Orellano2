// lib/fondoHelpers.js
// =====================================================
// HELPERS PARA C├üLCULOS DE FONDOS
// =====================================================

/**
 * Calcula estado de fondo usando VISTA de DB (100x m├ís r├ípido)
 * Ya no hace m├║ltiples queries, solo lee la vista pre-calculada
 */
export async function calcularEstadoFondo(supabaseClient, clienteId, fondoId) {
  try {
    const { data, error } = await supabaseClient
      .from('v_estado_fondo')
      .select('liquidez_asignada, dinero_invertido, dinero_recuperado, saldo_disponible')
      .eq('cliente_id', clienteId)
      .eq('id_fondo', fondoId)
      .single();

    if (error) {
      // Si no hay datos (fondo sin asignaciones), devolver 0s
      if (error.code === 'PGRST116') {
        return {
          liquidezAsignada: 0,
          dineroInvertido: 0,
          dineroRecuperado: 0,
          saldoDisponible: 0,
          puedeComprar: false,
          porcentajeInvertido: 0
        };
      }
      throw error;
    }

    const liquidezAsignada = parseFloat(data.liquidez_asignada || 0);
    const dineroInvertido = parseFloat(data.dinero_invertido || 0);
    const dineroRecuperado = parseFloat(data.dinero_recuperado || 0);
    const saldoDisponible = parseFloat(data.saldo_disponible || 0);

    return {
      liquidezAsignada,
      dineroInvertido,
      dineroRecuperado,
      saldoDisponible,
      puedeComprar: saldoDisponible > 0,
      porcentajeInvertido: liquidezAsignada > 0 
        ? parseFloat(((dineroInvertido / liquidezAsignada) * 100).toFixed(2))
        : 0
    };
  } catch (error) {
    console.error('Error calculando estado de fondo:', error);
    throw new Error('Error al calcular estado de fondo: ' + error.message);
  }
}

/**
 * Valida si un fondo tiene saldo suficiente para una compra
 */
export async function validarSaldoParaCompra(supabaseClient, clienteId, fondoId, montoCompra) {
  try {
    if (montoCompra <= 0) {
      return { 
        valido: false, 
        error: 'El monto debe ser mayor a 0' 
      };
    }

    const estado = await calcularEstadoFondo(supabaseClient, clienteId, fondoId);
    
    if (estado.saldoDisponible < montoCompra) {
      return {
        valido: false,
        disponible: estado.saldoDisponible,
        faltante: parseFloat((montoCompra - estado.saldoDisponible).toFixed(2)),
        error: `El fondo solo tiene $${estado.saldoDisponible.toFixed(2)} USD disponibles. Faltan $${(montoCompra - estado.saldoDisponible).toFixed(2)} USD.`
      };
    }
    
    return {
      valido: true,
      disponible: estado.saldoDisponible,
      restante: parseFloat((estado.saldoDisponible - montoCompra).toFixed(2))
    };
  } catch (error) {
    console.error('Error validando saldo para compra:', error);
    return { 
      valido: false, 
      error: 'Error al validar saldo: ' + error.message 
    };
  }
}

/**
 * Funci├│n legacy - mantener por compatibilidad con c├│digo antiguo
 */
export async function calcularSaldoFondo(supabaseClient, clienteId, fondoId) {
  const estado = await calcularEstadoFondo(supabaseClient, clienteId, fondoId);
  return estado.saldoDisponible;
}

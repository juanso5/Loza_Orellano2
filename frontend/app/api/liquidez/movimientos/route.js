import { NextResponse } from 'next/server';
import { getSSRClient } from '../../../../lib/supabaseServer';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fondoId = searchParams.get('fondo_id');

    if (!fondoId) {
      return NextResponse.json(
        { success: false, error: 'Se requiere fondo_id' },
        { status: 400 }
      );
    }

    const supabase = await getSSRClient();

    // Obtener asignaciones/desasignaciones del fondo
    const { data: asignaciones, error } = await supabase
      .from('asignacion_liquidez')
      .select(`
        id_asignacion,
        cliente_id,
        fondo_id,
        fecha,
        tipo_operacion,
        monto_usd,
        comentario
      `)
      .eq('fondo_id', fondoId)
      .order('fecha', { ascending: false });

    if (error) {
      console.error('Error obteniendo asignaciones:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Mapear asignaciones a formato similar a movimientos
    const movimientos = (asignaciones || []).map(a => ({
      id: a.id_asignacion,
      fecha: a.fecha,
      tipo_mov: a.tipo_operacion === 'asignacion' ? 'deposito' : 'extraccion',
      tipo_operacion: a.tipo_operacion,
      monto_usd: a.monto_usd,
      comentario: a.comentario
    }));

    return NextResponse.json({
      success: true,
      data: movimientos
    });

  } catch (error) {
    console.error('Error en /api/liquidez/movimientos:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

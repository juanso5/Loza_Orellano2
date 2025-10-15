import { NextResponse } from 'next/server';
import { getSSRClient } from '../../../lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET - Obtener el tipo de cambio actual
export async function GET() {
  try {
    const supabase = await getSSRClient();
    
    const { data, error } = await supabase
      .from('tipo_cambio_actual')
      .select('*')
      .order('fecha_actualizacion', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error obteniendo tipo de cambio actual:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data ? {
        valor: parseFloat(data.valor),
        fecha_actualizacion: data.fecha_actualizacion,
        comentario: data.comentario
      } : null
    });
  } catch (error) {
    console.error('Error en GET /api/tipo-cambio-actual:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Actualizar el tipo de cambio actual
export async function POST(request) {
  try {
    const supabase = await getSSRClient();
    const body = await request.json();
    const { valor, comentario } = body;

    if (!valor || parseFloat(valor) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valor inválido' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('tipo_cambio_actual')
      .insert({
        valor: parseFloat(valor),
        comentario: comentario || 'Actualización desde movimiento',
        fecha_actualizacion: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error actualizando tipo de cambio:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        valor: parseFloat(data.valor),
        fecha_actualizacion: data.fecha_actualizacion
      }
    });
  } catch (error) {
    console.error('Error en POST /api/tipo-cambio-actual:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

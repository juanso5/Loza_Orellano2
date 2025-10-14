"use client";

import { useState } from 'react';
import DetalleModal from './estrategias/DetalleModal';

export default function FondoCardDetallado({ portfolio, totalClient, formatNumber, fmtDate, weighted }) {
  const [detalleOpen, setDetalleOpen] = useState(false);
  
  // Cálculos básicos
  const totalNom = portfolio.funds.reduce((s, f) => s + (f.nominal || 0), 0);
  const totalReturn = weighted(portfolio.funds, 'totalReturn');
  const liquidezTotal = portfolio.liquidez?.saldoDisponible || 0;
  const patrimonio = totalNom + liquidezTotal;
  
  // Metadata y configuración
  const metadata = portfolio.meta?.metadata;
  const categoria = portfolio.meta?.tipo_cartera?.categoria;
  const color = portfolio.meta?.tipo_cartera?.color || '#8b5cf6';
  const icono = portfolio.meta?.tipo_cartera?.icono || 'fas fa-chart-line';
  const nombre = portfolio.name;
  
  // Datos para el modal
  const fondoData = {
    id_fondo: portfolio.id,
    tipo_cartera: portfolio.meta?.tipo_cartera || null,
    metadata: metadata || null,
    fecha_alta: portfolio.meta?.fecha_alta,
    rend_esperado: portfolio.meta?.rend_esperado,
    valor_total_fondo: patrimonio,
    rendimiento_real: totalReturn * 100,
    liquidez_asignada: portfolio.liquidez?.liquidezAsignada || 0,
    saldo_disponible: liquidezTotal,
  };
  
  // Estilos base de la card
  const cardBaseStyle = {
    border: `2px solid ${color}`,
    borderRadius: '12px',
    padding: '20px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  };
  
  const handleCardHover = (e, isHovering) => {
    if (isHovering) {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
    } else {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
    }
  };

  // JUBILACIÓN
  if (categoria === 'jubilacion') {
    const fechaAlta = new Date(portfolio.meta?.fecha_alta);
    const fechaEstimada = new Date(fechaAlta);
    if (metadata?.anos) {
      fechaEstimada.setFullYear(fechaEstimada.getFullYear() + parseInt(metadata.anos));
    }
    
    return (
      <>
        <div 
          onClick={() => setDetalleOpen(true)}
          style={cardBaseStyle}
          onMouseEnter={(e) => handleCardHover(e, true)}
          onMouseLeave={(e) => handleCardHover(e, false)}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: `${color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              color: color
            }}>
              <i className={icono}></i>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: '#1f2937' }}>
                {nombre}
              </h3>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '2px' }}>
                🎯 Objetivo: {metadata?.anos} años
              </div>
            </div>
          </div>

          {/* Fecha Estimada */}
          {fechaEstimada && (
            <div style={{ 
              padding: '12px', 
              backgroundColor: `${color}10`, 
              borderRadius: '8px', 
              marginBottom: '12px',
              border: `1px solid ${color}30`
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px' }}>
                📅 Fecha Estimada
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '600', color: color }}>
                {fechaEstimada.toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
                Creado: {fmtDate(portfolio.meta?.fecha_alta)}
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px' }}>
                Patrimonio (USD)
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1f2937' }}>
                ${formatNumber(patrimonio)}
              </div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px' }}>
                Rend. Esperado
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#3b82f6' }}>
                {metadata?.rend_esperado ? `${metadata.rend_esperado}%` : '-'}
              </div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px' }}>
                Rend. Real Anual
              </div>
              <div style={{ 
                fontSize: '1.1rem', 
                fontWeight: '600',
                color: totalReturn >= 0 ? '#10b981' : '#ef4444'
              }}>
                {(totalReturn * 100).toFixed(2)}%
              </div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px' }}>
                Índice Calculado
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#8b5cf6' }}>
                {/* TODO: Pedir a Fran */}
                -
              </div>
            </div>
          </div>

          {/* Comentario */}
          {metadata?.comentario && (
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#fef3c7', 
              borderRadius: '8px',
              fontSize: '0.85rem',
              color: '#92400e',
              border: '1px solid #fcd34d'
            }}>
              💬 {metadata.comentario}
            </div>
          )}
        </div>
        
        <DetalleModal
          fondo={fondoData}
          isOpen={detalleOpen}
          onClose={() => setDetalleOpen(false)}
        />
      </>
    );
  }

  // VIAJES
  if (categoria === 'viajes') {
    const montoObjetivo = metadata?.monto_objetivo || 0;
    const progreso = montoObjetivo > 0 ? (patrimonio / montoObjetivo) * 100 : 0;
    const monedaSimbolo = metadata?.moneda === 'USD' ? '$' : 'AR$';
    
    return (
      <>
        <div 
          onClick={() => setDetalleOpen(true)}
          style={cardBaseStyle}
          onMouseEnter={(e) => handleCardHover(e, true)}
          onMouseLeave={(e) => handleCardHover(e, false)}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: `${color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              color: color
            }}>
              <i className={icono}></i>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: '#1f2937' }}>
                {nombre}
              </h3>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '2px' }}>
                ✈️ {metadata?.moneda || 'USD'}
              </div>
            </div>
          </div>

          {/* Objetivo */}
          <div style={{ 
            padding: '16px', 
            backgroundColor: `${color}10`, 
            borderRadius: '8px', 
            marginBottom: '12px',
            border: `1px solid ${color}30`,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px' }}>
              🎯 Objetivo
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '700', color: color }}>
              {monedaSimbolo}{Number(montoObjetivo).toLocaleString('es-AR')}
            </div>
          </div>

          {/* Patrimonio y Rendimiento */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px' }}>
                Patrimonio
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1f2937' }}>
                {monedaSimbolo}{formatNumber(patrimonio)}
              </div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px' }}>
                Rend. Real
              </div>
              <div style={{ 
                fontSize: '1.1rem', 
                fontWeight: '600',
                color: totalReturn >= 0 ? '#10b981' : '#ef4444'
              }}>
                {(totalReturn * 100).toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Barra de Progreso */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: '#6b7280',
              marginBottom: '6px'
            }}>
              <span>Progreso</span>
              <span style={{ fontWeight: '600' }}>
                {monedaSimbolo}{formatNumber(patrimonio)} / {monedaSimbolo}{Number(montoObjetivo).toLocaleString('es-AR')}
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '24px',
              backgroundColor: '#e5e7eb',
              borderRadius: '12px',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <div style={{
                width: `${Math.min(100, progreso)}%`,
                height: '100%',
                backgroundColor: color,
                transition: 'width 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                {progreso.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Comentario y Fecha */}
          <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
            {metadata?.comentario && (
              <div style={{ marginBottom: '4px' }}>💬 {metadata.comentario}</div>
            )}
            <div>📅 Creado: {fmtDate(portfolio.meta?.fecha_alta)}</div>
          </div>
        </div>
        
        <DetalleModal
          fondo={fondoData}
          isOpen={detalleOpen}
          onClose={() => setDetalleOpen(false)}
        />
      </>
    );
  }

  // LARGO PLAZO
  if (categoria === 'largo_plazo') {
    return (
      <>
        <div 
          onClick={() => setDetalleOpen(true)}
          style={cardBaseStyle}
          onMouseEnter={(e) => handleCardHover(e, true)}
          onMouseLeave={(e) => handleCardHover(e, false)}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: `${color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              color: color
            }}>
              <i className={icono}></i>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: '#1f2937' }}>
                {nombre}
              </h3>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '2px' }}>
                📈 USD
              </div>
            </div>
          </div>

          {/* Rendimiento Real - Destacado */}
          <div style={{ 
            padding: '24px', 
            backgroundColor: `${color}10`, 
            borderRadius: '12px', 
            marginBottom: '16px',
            border: `2px solid ${color}`,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '8px' }}>
              📊 Rendimiento Real
            </div>
            <div style={{ 
              fontSize: '2.5rem', 
              fontWeight: '700',
              color: totalReturn >= 0 ? '#10b981' : '#ef4444'
            }}>
              {(totalReturn * 100).toFixed(2)}%
            </div>
          </div>

          {/* Comentario y Fecha */}
          {metadata?.comentario && (
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#f9fafb', 
              borderRadius: '8px',
              fontSize: '0.85rem',
              color: '#4b5563',
              marginBottom: '12px'
            }}>
              💬 {metadata.comentario}
            </div>
          )}
          
          <div style={{ fontSize: '0.8rem', color: '#6b7280', textAlign: 'center' }}>
            📅 Creado: {fmtDate(portfolio.meta?.fecha_alta)}
          </div>
        </div>
        
        <DetalleModal
          fondo={fondoData}
          isOpen={detalleOpen}
          onClose={() => setDetalleOpen(false)}
        />
      </>
    );
  }

  // OBJETIVO
  if (categoria === 'objetivo') {
    const hoy = new Date();
    const objetivo = new Date(metadata?.fecha_objetivo);
    const diff = objetivo - hoy;
    const diasRestantes = Math.ceil(diff / (1000 * 60 * 60 * 24));
    const montoObjetivo = metadata?.monto_objetivo || 0;
    const monedaSimbolo = metadata?.moneda === 'USD' ? '$' : 'AR$';
    
    return (
      <>
        <div 
          onClick={() => setDetalleOpen(true)}
          style={cardBaseStyle}
          onMouseEnter={(e) => handleCardHover(e, true)}
          onMouseLeave={(e) => handleCardHover(e, false)}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: `${color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              color: color
            }}>
              <i className={icono}></i>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: '#1f2937' }}>
                {nombre}
              </h3>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '2px' }}>
                🎯 {metadata?.moneda || 'USD'}
              </div>
            </div>
          </div>

          {/* Fecha Objetivo */}
          <div style={{ 
            padding: '14px', 
            backgroundColor: `${color}10`, 
            borderRadius: '8px', 
            marginBottom: '12px',
            border: `1px solid ${color}30`
          }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px' }}>
              📅 Fecha Objetivo
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: '600', color: color }}>
              {fmtDate(metadata?.fecha_objetivo)}
            </div>
            {diasRestantes !== null && (
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>
                {diasRestantes > 0 ? `⏳ ${diasRestantes} días restantes` : '✅ Objetivo cumplido'}
              </div>
            )}
          </div>

          {/* Monto Objetivo y Rendimiento */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#f9fafb', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px' }}>
                Objetivo
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#1f2937' }}>
                {monedaSimbolo}{Number(montoObjetivo).toLocaleString('es-AR')}
              </div>
            </div>
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#f9fafb', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px' }}>
                Rend. Real
              </div>
              <div style={{ 
                fontSize: '1.2rem', 
                fontWeight: '600',
                color: totalReturn >= 0 ? '#10b981' : '#ef4444'
              }}>
                {(totalReturn * 100).toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Comentario */}
          {metadata?.comentario && (
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#fef3c7', 
              borderRadius: '8px',
              fontSize: '0.85rem',
              color: '#92400e',
              border: '1px solid #fcd34d'
            }}>
              💬 {metadata.comentario}
            </div>
          )}
        </div>
        
        <DetalleModal
          fondo={fondoData}
          isOpen={detalleOpen}
          onClose={() => setDetalleOpen(false)}
        />
      </>
    );
  }

  // FALLBACK - Sin estrategia definida
  return (
    <div 
      onClick={() => setDetalleOpen(true)}
      style={cardBaseStyle}
      onMouseEnter={(e) => handleCardHover(e, true)}
      onMouseLeave={(e) => handleCardHover(e, false)}
    >
      {/* Contenido genérico */}
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <i className={icono} style={{ fontSize: '3rem', color: color, marginBottom: '12px' }}></i>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: '600' }}>{nombre}</h3>
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Estrategia no configurada</p>
      </div>
      
      <DetalleModal
        fondo={fondoData}
        isOpen={detalleOpen}
        onClose={() => setDetalleOpen(false)}
      />
    </div>
  );
}

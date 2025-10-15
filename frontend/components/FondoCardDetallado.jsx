"use client";

import { useState } from 'react';
import DetalleModal from './estrategias/DetalleModal';

export default function FondoCardDetallado({ portfolio, totalClient, formatNumber, fmtDate, weighted, onDelete, onOpenDetail }) {
  const [detalleOpen, setDetalleOpen] = useState(false);
  
  // Cálculos básicos
  const totalNom = portfolio.funds.reduce((s, f) => s + (f.nominal || 0), 0);
  const totalReturn = weighted(portfolio.funds, 'totalReturn');
  const liquidezTotal = portfolio.liquidez?.saldoDisponible || 0;
  const patrimonio = totalNom + liquidezTotal;
  
  // Metadata y configuración
  const metadata = portfolio.meta?.metadata;
  const categoriaRaw = portfolio.meta?.tipo_cartera?.categoria;
  const categoria = categoriaRaw ? categoriaRaw.toLowerCase() : null;
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
    border: `1px solid ${color}50`,
    borderRadius: '12px',
    padding: '24px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    wordWrap: 'break-word'
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

  // Estilo para truncar comentarios largos
  const comentarioStyle = {
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    wordBreak: 'break-word'
  };

  // JUBILACIÓN
  if (categoria === 'jubilacion') {
    const fechaAlta = portfolio.meta?.fecha_alta ? new Date(portfolio.meta.fecha_alta) : new Date();
    const fechaEstimada = new Date(fechaAlta);
    const anos = metadata?.anos || metadata?.plazo_anos || 0;
    if (anos) {
      fechaEstimada.setFullYear(fechaEstimada.getFullYear() + parseInt(anos));
    }
    const fechaEstimadaValida = !isNaN(fechaEstimada.getTime());
    
    return (
      <>
        <div 
          onClick={() => onOpenDetail && onOpenDetail(portfolio.id)}
          style={cardBaseStyle}
          onMouseEnter={(e) => handleCardHover(e, true)}
          onMouseLeave={(e) => handleCardHover(e, false)}
        >
          {/* Header con ícono mejorado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              backgroundColor: `${color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              color: color,
              border: `2px solid ${color}30`
            }}>
              <i className={icono}></i>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#111827', letterSpacing: '-0.01em' }}>
                {nombre}
              </h3>
              <div style={{ 
                fontSize: '0.8125rem', 
                color: '#6b7280', 
                marginTop: '3px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <i className="fas fa-calendar-check" style={{ fontSize: '0.75rem', color: color }} />
                Objetivo: {anos} años
              </div>
            </div>
          </div>

          {/* Fecha Estimada - Destacada */}
          {fechaEstimada && (
            <div style={{ 
              padding: '18px 20px', 
              background: `linear-gradient(135deg, ${color}12 0%, ${color}25 100%)`,
              borderRadius: '12px', 
              marginBottom: '18px',
              border: `1px solid ${color}50`,
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
            }}>
              <div style={{ 
                fontSize: '0.75rem', 
                color: '#6b7280', 
                marginBottom: '8px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Fecha Objetivo
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: '700', color: color }}>
                {fechaEstimadaValida 
                  ? fechaEstimada.toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })
                  : 'Por definir'
                }
              </div>
            </div>
          )}

          {/* Patrimonio HERO - Principal */}
          <div style={{ 
            padding: '24px 20px', 
            backgroundColor: '#dcfce7', 
            borderRadius: '12px',
            border: '1px solid #86efac',
            textAlign: 'center',
            marginBottom: '18px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
          }}>
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#15803d', 
              marginBottom: '10px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Patrimonio Actual
            </div>
            <div style={{ 
              fontSize: '2.5rem', 
              fontWeight: '800', 
              color: '#166534',
              lineHeight: '1',
              marginBottom: '6px'
            }}>
              ${formatNumber(patrimonio)}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#16a34a', fontWeight: '600' }}>USD</div>
          </div>

          {/* Stats Grid - 3 items */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '18px' }}>
            <div style={{ 
              padding: '14px 16px', 
              backgroundColor: '#dbeafe', 
              borderRadius: '10px',
              border: '1px solid #93c5fd',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: '0.6875rem', 
                color: '#1e40af', 
                marginBottom: '6px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.03em'
              }}>
                Rend. Esperado
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e3a8a' }}>
                {metadata?.rend_esperado ? `${metadata.rend_esperado}%` : 'N/A'}
              </div>
            </div>

            <div style={{ 
              padding: '14px 16px', 
              backgroundColor: totalReturn >= 0 ? '#dcfce7' : '#fee2e2', 
              borderRadius: '10px',
              border: totalReturn >= 0 ? '1px solid #86efac' : '1px solid #fca5a5',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: '0.6875rem', 
                color: totalReturn >= 0 ? '#15803d' : '#991b1b', 
                marginBottom: '6px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.03em'
              }}>
                Rend. Real
              </div>
              <div style={{ 
                fontSize: '1.125rem', 
                fontWeight: '700',
                color: totalReturn >= 0 ? '#166534' : '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}>
                {totalReturn >= 0 ? '↑' : '↓'}
                {(totalReturn * 100).toFixed(2)}%
              </div>
            </div>

            <div style={{ 
              padding: '14px 16px', 
              backgroundColor: '#fef3c7', 
              borderRadius: '10px',
              border: '1px solid #fde68a',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: '0.6875rem', 
                color: '#92400e', 
                marginBottom: '6px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.03em'
              }}>
                Índice Calc.
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#78350f' }}>
                {metadata?.indice_calculado ? metadata.indice_calculado.toFixed(2) : 'N/A'}
              </div>
            </div>
          </div>

          {/* Comentario */}
          {metadata?.comentario && (
            <div style={{ 
              padding: '14px 16px', 
              backgroundColor: '#fef3c7', 
              borderRadius: '10px',
              fontSize: '0.8125rem',
              color: '#78350f',
              border: '1px solid #fde68a',
              lineHeight: '1.5'
            }}>
              <span style={{ ...comentarioStyle }} title={metadata.comentario}>
                {metadata.comentario}
              </span>
            </div>
          )}
        </div>
        
        <DetalleModal
          fondo={fondoData}
          isOpen={detalleOpen}
          onClose={() => setDetalleOpen(false)}
          onDelete={onDelete}
        />
      </>
    );
  }

  // VIAJES
  if (categoria === 'viajes') {
    const montoObjetivo = metadata?.monto_objetivo || 0;
    const progreso = montoObjetivo > 0 ? (patrimonio / montoObjetivo) * 100 : 0;
    const monedaSimbolo = metadata?.moneda === 'USD' ? '$' : 'AR$';
    const destino = metadata?.destino || metadata?.nombre || 'Viaje';
    
    // Color dinámico de la barra según progreso
    const getProgressColor = () => {
      if (progreso >= 100) return '#22c55e';
      if (progreso >= 75) return '#84cc16';
      if (progreso >= 50) return '#f59e0b';
      if (progreso >= 25) return '#f97316';
      return '#3b82f6';
    };
    
    return (
      <>
        <div 
          onClick={() => onOpenDetail && onOpenDetail(portfolio.id)}
          style={cardBaseStyle}
          onMouseEnter={(e) => handleCardHover(e, true)}
          onMouseLeave={(e) => handleCardHover(e, false)}
        >
          {/* Header mejorado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              backgroundColor: `${color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              color: color,
              border: `2px solid ${color}30`
            }}>
              <i className={icono}></i>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#111827', letterSpacing: '-0.01em' }}>
                {nombre}
              </h3>
              <div style={{ 
                fontSize: '0.8125rem', 
                color: '#6b7280', 
                marginTop: '3px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <i className="fas fa-map-marker-alt" style={{ fontSize: '0.75rem', color: color }} />
                {destino}
              </div>
            </div>
          </div>

          {/* Progreso HERO - Principal */}
          <div style={{ 
            padding: '20px', 
            background: `linear-gradient(135deg, ${color}15 0%, ${color}30 100%)`,
            borderRadius: '12px',
            border: `1px solid ${color}60`,
            marginBottom: '18px',
            textAlign: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
          }}>
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#6b7280', 
              marginBottom: '10px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Progreso del Objetivo
            </div>
            <div style={{ 
              fontSize: '3rem', 
              fontWeight: '800',
              color: getProgressColor(),
              lineHeight: '1',
              marginBottom: '12px'
            }}>
              {progreso.toFixed(1)}%
            </div>

            {/* Barra de Progreso */}
            <div style={{
              width: '100%',
              height: '12px',
              backgroundColor: '#e5e7eb',
              borderRadius: '6px',
              overflow: 'hidden',
              position: 'relative',
              border: '1px solid #d1d5db',
              marginBottom: '10px'
            }}>
              <div style={{
                width: `${Math.min(100, progreso)}%`,
                height: '100%',
                background: getProgressColor(),
                transition: 'width 0.4s ease',
                borderRadius: '6px'
              }} />
            </div>

            {progreso >= 100 && (
              <div style={{ 
                display: 'inline-block',
                padding: '6px 12px', 
                backgroundColor: '#dcfce7',
                borderRadius: '8px',
                border: '1px solid #86efac',
                fontSize: '0.8125rem',
                color: '#166534',
                fontWeight: '600'
              }}>
                ✓ ¡Objetivo alcanzado!
              </div>
            )}
          </div>

          {/* Grid: Objetivo y Patrimonio */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#fef3c7',
              borderRadius: '10px',
              border: '1px solid #fde68a',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: '0.6875rem', 
                color: '#92400e', 
                marginBottom: '6px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.03em'
              }}>
                Objetivo
              </div>
              <div style={{ 
                fontSize: '1.25rem', 
                fontWeight: '700', 
                color: '#78350f',
                wordBreak: 'break-all'
              }}>
                {monedaSimbolo}{Number(montoObjetivo).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
              </div>
            </div>

            <div style={{ 
              padding: '16px', 
              backgroundColor: '#dcfce7',
              borderRadius: '10px',
              border: '1px solid #86efac',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: '0.6875rem', 
                color: '#15803d', 
                marginBottom: '6px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.03em'
              }}>
                Patrimonio
              </div>
              <div style={{ 
                fontSize: '1.125rem', 
                fontWeight: '700', 
                color: '#166534',
                wordBreak: 'break-all'
              }}>
                {monedaSimbolo}{formatNumber(patrimonio)}
              </div>
              <div style={{ 
                fontSize: '0.75rem', 
                fontWeight: '600',
                marginTop: '4px',
                color: totalReturn >= 0 ? '#15803d' : '#dc2626'
              }}>
                {totalReturn >= 0 ? '↑' : '↓'} {(totalReturn * 100).toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Comentario */}
          {metadata?.comentario && (
            <div style={{ 
              padding: '14px 16px',
              backgroundColor: '#fef3c7',
              borderRadius: '10px',
              fontSize: '0.8125rem',
              color: '#78350f',
              border: '1px solid #fde68a',
              lineHeight: '1.5'
            }}>
              <span style={{ ...comentarioStyle }} title={metadata.comentario}>
                {metadata.comentario}
              </span>
            </div>
          )}
        </div>
        
        <DetalleModal
          fondo={fondoData}
          isOpen={detalleOpen}
          onClose={() => setDetalleOpen(false)}
          onDelete={onDelete}
        />
      </>
    );
  }

  // LARGO PLAZO
  if (categoria === 'largo_plazo') {
    return (
      <>
        <div 
          onClick={() => onOpenDetail && onOpenDetail(portfolio.id)}
          style={cardBaseStyle}
          onMouseEnter={(e) => handleCardHover(e, true)}
          onMouseLeave={(e) => handleCardHover(e, false)}
        >
          {/* Header mejorado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              backgroundColor: `${color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              color: color,
              border: `2px solid ${color}30`
            }}>
              <i className={icono}></i>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#111827', letterSpacing: '-0.01em' }}>
                {nombre}
              </h3>
              <div style={{ 
                fontSize: '0.8125rem', 
                color: '#6b7280', 
                marginTop: '3px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <i className="fas fa-seedling" style={{ fontSize: '0.75rem', color: color }} />
                Inversión estratégica
              </div>
            </div>
          </div>

          {/* HERO METRIC - Rendimiento Real */}
          <div style={{ 
            textAlign: 'center',
            marginBottom: '18px'
          }}>
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#6b7280', 
              marginBottom: '10px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Rendimiento Real
            </div>
            <div style={{ 
              fontSize: '3rem', 
              fontWeight: '800',
              color: totalReturn >= 0 ? '#10b981' : '#dc2626',
              lineHeight: '1'
            }}>
              {totalReturn >= 0 ? '↑' : '↓'} {(totalReturn * 100).toFixed(2)}%
            </div>
            {totalReturn >= 100 && (
              <div style={{ 
                marginTop: '10px', 
                padding: '6px 12px', 
                backgroundColor: '#dcfce7',
                borderRadius: '6px',
                border: '1px solid #86efac',
                display: 'inline-block',
                fontSize: '0.75rem',
                color: '#166534',
                fontWeight: '600'
              }}>
                ¡Excelente rendimiento!
              </div>
            )}
          </div>

          {/* Grid - 2 items */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#dbeafe',
              borderRadius: '10px',
              border: '1px solid #3b82f680',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: '0.6875rem', 
                color: '#1e40af', 
                marginBottom: '8px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.03em'
              }}>
                Patrimonio
              </div>
              <div style={{ 
                fontSize: '1.25rem', 
                fontWeight: '700', 
                color: '#1e3a8a',
                wordBreak: 'break-all'
              }}>
                ${formatNumber(patrimonio)}
              </div>
            </div>

            <div style={{ 
              padding: '16px', 
              backgroundColor: '#dcfce7',
              borderRadius: '10px',
              border: '1px solid #10b98180',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: '0.6875rem', 
                color: '#15803d', 
                marginBottom: '8px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.03em'
              }}>
                Moneda
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#166534' }}>
                USD
              </div>
            </div>
          </div>

          {/* Comentario */}
          {metadata?.comentario && (
            <div style={{ 
              padding: '14px 16px',
              backgroundColor: '#fef3c7',
              borderRadius: '10px',
              fontSize: '0.8125rem',
              color: '#78350f',
              border: '1px solid #fde68a',
              lineHeight: '1.5'
            }}>
              <span style={{ ...comentarioStyle }} title={metadata.comentario}>
                {metadata.comentario}
              </span>
            </div>
          )}
        </div>
        
        <DetalleModal
          fondo={fondoData}
          isOpen={detalleOpen}
          onClose={() => setDetalleOpen(false)}
          onDelete={onDelete}
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
          onClick={() => onOpenDetail && onOpenDetail(portfolio.id)}
          style={cardBaseStyle}
          onMouseEnter={(e) => handleCardHover(e, true)}
          onMouseLeave={(e) => handleCardHover(e, false)}
        >
          {/* Header mejorado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              color: '#ffffff',
              border: `2px solid ${color}`,
              boxShadow: `0 4px 12px ${color}40`
            }}>
              <i className={icono}></i>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#111827', letterSpacing: '-0.01em' }}>
                {nombre}
              </h3>
              <div style={{ 
                fontSize: '0.8125rem', 
                color: '#6b7280', 
                marginTop: '3px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <i className="fas fa-bullseye" style={{ fontSize: '0.75rem', color: color }} />
                {metadata?.moneda || 'USD'}
              </div>
            </div>
          </div>

          {/* HERO METRIC - Días Restantes */}
          <div style={{ 
            textAlign: 'center',
            marginBottom: '14px'
          }}>
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#6b7280', 
              marginBottom: '10px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {diasRestantes > 0 ? 'Días Restantes' : 'Estado'}
            </div>
            <div style={{ 
              fontSize: '3rem', 
              fontWeight: '800',
              color: diasRestantes > 0 ? color : '#10b981',
              lineHeight: '1'
            }}>
              {diasRestantes > 0 ? diasRestantes : '✓'}
            </div>
            {diasRestantes <= 0 && (
              <div style={{ 
                marginTop: '10px', 
                padding: '6px 12px', 
                backgroundColor: '#dcfce7',
                borderRadius: '6px',
                border: '1px solid #86efac',
                display: 'inline-block',
                fontSize: '0.75rem',
                color: '#166534',
                fontWeight: '600'
              }}>
                ¡Objetivo cumplido!
              </div>
            )}
          </div>

          {/* Fecha Objetivo Box */}
          <div style={{ 
            padding: '16px 18px', 
            background: `linear-gradient(135deg, ${color}12 0%, ${color}25 100%)`,
            borderRadius: '10px', 
            marginBottom: '14px',
            border: `1px solid ${color}50`,
            textAlign: 'center'
          }}>
            <div style={{ 
              fontSize: '0.6875rem', 
              color: '#6b7280', 
              marginBottom: '6px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Fecha Objetivo
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: '700', color: color }}>
              {fmtDate(metadata?.fecha_objetivo)}
            </div>
          </div>

          {/* Grid - 3 items */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#fef3c7',
              borderRadius: '10px',
              border: '1px solid #fde68a',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: '0.6875rem', 
                color: '#92400e', 
                marginBottom: '8px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.03em'
              }}>
                Objetivo
              </div>
              <div style={{ 
                fontSize: '1.125rem', 
                fontWeight: '700', 
                color: '#78350f',
                wordBreak: 'break-all'
              }}>
                {monedaSimbolo}{Number(montoObjetivo).toLocaleString('es-AR')}
              </div>
            </div>

            <div style={{ 
              padding: '16px', 
              backgroundColor: '#dcfce7',
              borderRadius: '10px',
              border: '1px solid #10b98180',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: '0.6875rem', 
                color: '#15803d', 
                marginBottom: '8px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.03em'
              }}>
                Patrimonio
              </div>
              <div style={{ 
                fontSize: '1.125rem', 
                fontWeight: '700',
                color: '#166534',
                wordBreak: 'break-all'
              }}>
                {monedaSimbolo}{formatNumber(patrimonio)}
              </div>
              <div style={{ 
                fontSize: '0.75rem', 
                fontWeight: '600',
                marginTop: '4px',
                color: totalReturn >= 0 ? '#15803d' : '#dc2626'
              }}>
                {totalReturn >= 0 ? '↑' : '↓'} {(totalReturn * 100).toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Comentario */}
          {metadata?.comentario && (
            <div style={{ 
              padding: '14px 16px',
              backgroundColor: '#fef3c7',
              borderRadius: '10px',
              fontSize: '0.8125rem',
              color: '#78350f',
              border: '1px solid #fde68a',
              lineHeight: '1.5'
            }}>
              <span style={{ ...comentarioStyle }} title={metadata.comentario}>
                {metadata.comentario}
              </span>
            </div>
          )}
        </div>
        
        <DetalleModal
          fondo={fondoData}
          isOpen={detalleOpen}
          onClose={() => setDetalleOpen(false)}
          onDelete={onDelete}
        />
      </>
    );
  }

  // FALLBACK - Sin estrategia definida
  return (
    <>
      <div 
        onClick={() => onOpenDetail && onOpenDetail(portfolio.id)}
        style={cardBaseStyle}
        onMouseEnter={(e) => handleCardHover(e, true)}
        onMouseLeave={(e) => handleCardHover(e, false)}
      >
        {/* Header mejorado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '12px',
            background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            color: '#ffffff',
            border: `2px solid ${color}`,
            boxShadow: `0 4px 12px ${color}40`
          }}>
            <i className={icono}></i>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#111827', letterSpacing: '-0.01em' }}>
              {nombre}
            </h3>
            <div style={{ 
              fontSize: '0.8125rem', 
              color: '#6b7280', 
              marginTop: '3px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <i className="fas fa-briefcase" style={{ fontSize: '0.75rem', color: color }} />
              Fondo de inversión
            </div>
          </div>
        </div>

        {/* HERO METRIC - Patrimonio */}
        <div style={{ 
          textAlign: 'center',
          marginBottom: '18px'
        }}>
          <div style={{ 
            fontSize: '0.75rem', 
            color: '#6b7280', 
            marginBottom: '10px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Patrimonio Total
          </div>
          <div style={{ 
            fontSize: '2.5rem', 
            fontWeight: '800',
            color: '#111827',
            lineHeight: '1'
          }}>
            ${formatNumber(patrimonio)}
          </div>
          <div style={{ 
            fontSize: '0.875rem',
            color: '#059669',
            fontWeight: '600',
            marginTop: '8px'
          }}>USD</div>
        </div>

        {/* Info message */}
        <div style={{ 
          padding: '14px 16px', 
          backgroundColor: '#dbeafe',
          borderRadius: '10px',
          border: '1px solid #3b82f680',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.8125rem', color: '#1e40af', fontWeight: '600', marginBottom: '4px' }}>
            Estrategia no configurada
          </div>
          <div style={{ fontSize: '0.75rem', color: '#1e3a8a' }}>
            Configura una estrategia para ver métricas específicas
          </div>
        </div>
      </div>
      
      <DetalleModal
        fondo={fondoData}
        isOpen={detalleOpen}
        onClose={() => setDetalleOpen(false)}
        onDelete={onDelete}
      />
    </>
  );
}

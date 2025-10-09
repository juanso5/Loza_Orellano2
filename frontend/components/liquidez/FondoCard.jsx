"use client";

import { useState } from 'react';

export default function FondoCard({ fondo, onAsignar }) {
  const [expanded, setExpanded] = useState(false);

  const {
    id_fondo,
    tipo_cartera_id,
    liquidezAsignada = 0,
    dineroEnAcciones = 0,
    saldoDisponible = 0,
    porcentajeInvertido = 0
  } = fondo;

  const getColors = (percentage) => {
    if (percentage >= 80) return { text: '#dc2626', bg: '#fee2e2' };
    if (percentage >= 50) return { text: '#d97706', bg: '#fef3c7' };
    return { text: '#059669', bg: '#d1fae5' };
  };

  const colors = getColors(porcentajeInvertido);

  return (
    <div 
      style={{ 
        backgroundColor: '#fff', 
        borderRadius: '12px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
        border: '1px solid #e5e7eb',
        transition: 'box-shadow 0.2s, transform 0.2s',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ padding: '1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ 
              padding: '0.5rem', 
              backgroundColor: '#dbeafe', 
              borderRadius: '8px',
              fontSize: '1.25rem',
              color: '#3b82f6'
            }}>
              <i className="fas fa-briefcase"></i>
            </div>
            <div>
              <h3 style={{ fontWeight: '600', color: '#111827', margin: 0, fontSize: '1rem' }}>
                Cartera {tipo_cartera_id || id_fondo}
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '2px 0 0 0' }}>
                ID: {id_fondo}
              </p>
            </div>
          </div>
          
          <div style={{ 
            padding: '0.25rem 0.75rem', 
            borderRadius: '9999px', 
            fontSize: '0.75rem', 
            fontWeight: '600',
            color: colors.text,
            backgroundColor: colors.bg
          }}>
            {porcentajeInvertido}% invertido
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '1rem', 
          marginBottom: '1rem' 
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', margin: 0 }}>
              Asignado
            </p>
            <p style={{ fontSize: '1.125rem', fontWeight: '700', color: '#3b82f6', margin: '0.25rem 0 0 0' }}>
              ${liquidezAsignada.toFixed(2)}
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', margin: 0 }}>
              En Acciones
            </p>
            <p style={{ fontSize: '1.125rem', fontWeight: '700', color: '#8b5cf6', margin: '0.25rem 0 0 0' }}>
              ${dineroEnAcciones.toFixed(2)}
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', margin: 0 }}>
              Disponible
            </p>
            <p style={{ fontSize: '1.125rem', fontWeight: '700', color: '#10b981', margin: '0.25rem 0 0 0' }}>
              ${saldoDisponible.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: '0.75rem', 
            color: '#4b5563', 
            marginBottom: '0.25rem' 
          }}>
            <span>Utilizaci├│n</span>
            <span style={{ fontWeight: '600' }}>{porcentajeInvertido}%</span>
          </div>
          <div style={{ 
            width: '100%', 
            backgroundColor: '#e5e7eb', 
            borderRadius: '9999px', 
            height: '8px',
            overflow: 'hidden'
          }}>
            <div
              style={{ 
                height: '8px', 
                borderRadius: '9999px', 
                transition: 'width 0.3s ease',
                width: `${Math.min(porcentajeInvertido, 100)}%`,
                backgroundColor: porcentajeInvertido >= 80 ? '#ef4444' :
                                 porcentajeInvertido >= 50 ? '#f59e0b' :
                                 '#10b981'
              }}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => onAsignar(fondo)}
            style={{ 
              flex: 1,
              padding: '0.625rem 1rem', 
              backgroundColor: '#3b82f6',
              color: '#fff', 
              borderRadius: '8px', 
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            Asignar Liquidez
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{ 
              padding: '0.625rem 1rem', 
              border: '1px solid #d1d5db',
              backgroundColor: '#fff',
              borderRadius: '8px',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
          >
            {expanded ? 'Menos' : 'M├ís'}
          </button>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div style={{ 
            marginTop: '1rem', 
            paddingTop: '1rem', 
            borderTop: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              <span style={{ color: '#6b7280' }}>Tipo Cartera:</span>
              <span style={{ fontWeight: '500' }}>{tipo_cartera_id || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              <span style={{ color: '#6b7280' }}>Plazo:</span>
              <span style={{ fontWeight: '500' }}>{fondo.plazo || 'N/A'} {fondo.tipo_plazo || ''}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: '#6b7280' }}>Rend. Esperado:</span>
              <span style={{ fontWeight: '500', color: '#10b981' }}>
                {fondo.rend_esperado ? `${fondo.rend_esperado}%` : 'N/A'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

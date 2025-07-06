import React, { useState, useCallback, useRef, useEffect } from 'react';

interface DualRangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  label: string;
  formatValue?: (value: number) => string;
}

const DualRangeSlider: React.FC<DualRangeSliderProps> = ({
  min,
  max,
  value,
  onChange,
  label,
  formatValue = (val) => val.toString()
}) => {
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const getPercentage = (val: number) => ((val - min) / (max - min)) * 100;

  const handleMouseDown = useCallback((type: 'min' | 'max') => {
    setIsDragging(type);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const newValue = min + (percentage / 100) * (max - min);

    if (isDragging === 'min') {
      onChange([Math.min(newValue, value[1]), value[1]]);
    } else {
      onChange([value[0], Math.max(newValue, value[0])]);
    }
  }, [isDragging, min, max, value, onChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div className="dual-range-slider" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label className="slider-label">{label}</label>
      <div className="slider-container" ref={sliderRef} style={{ position: 'relative', width: '100%' }}>
        <div className="slider-track" style={{ position: 'relative', height: 6, background: '#e5e7eb', borderRadius: 3 }}>
          <div 
            className="slider-range"
            style={{
              position: 'absolute',
              left: `${getPercentage(value[0])}%`,
              width: `${getPercentage(value[1]) - getPercentage(value[0])}%`,
              height: 6,
              background: '#2563eb',
              borderRadius: 3
            }}
          />
          <div 
            className="slider-thumb slider-thumb-min"
            style={{
              position: 'absolute',
              left: `${getPercentage(value[0])}%`,
              top: -6,
              width: 18,
              height: 18,
              background: '#fff',
              border: '2px solid #2563eb',
              borderRadius: '50%',
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
            }}
            onMouseDown={() => handleMouseDown('min')}
          />
          <div 
            className="slider-thumb slider-thumb-max"
            style={{
              position: 'absolute',
              left: `${getPercentage(value[1])}%`,
              top: -6,
              width: 18,
              height: 18,
              background: '#fff',
              border: '2px solid #2563eb',
              borderRadius: '50%',
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
            }}
            onMouseDown={() => handleMouseDown('max')}
          />
        </div>
      </div>
      <div className="slider-values" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151' }}>
        <span>{formatValue(value[0])}</span>
        <span>{formatValue(value[1])}</span>
      </div>
    </div>
  );
};

export default DualRangeSlider;

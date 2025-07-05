import React from "react";

const Tooltip: React.FC<{ 
  visible: boolean; 
  x: number; 
  y: number; 
  content: React.ReactNode;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}> = ({ 
  visible, 
  x, 
  y, 
  content,
  onMouseEnter,
  onMouseLeave
}) => {
  if (!visible) return null;
  
  return (
    <div
      className="tooltip"
      style={{ 
        left: x, 
        top: y, 
        position: "fixed",
        pointerEvents: "auto", // Ensure the tooltip can capture mouse events
        opacity: 0.95,
        zIndex: 1000,
        transform: "translate(-50%, -110%)" // Center horizontally, position above cursor
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {content}
    </div>
  );
};

export default Tooltip;

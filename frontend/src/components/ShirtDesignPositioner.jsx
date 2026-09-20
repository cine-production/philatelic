import { useRef, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';

// Aperçu interactif : l'utilisateur peut glisser son visuel pour le repositionner
// et utiliser la poignée en bas à droite pour le redimensionner, directement sur
// la photo du t-shirt. position = { x, y, scale } en pourcentages du cadre.
const DEFAULT_POSITION = { x: 50, y: 34, scale: 38 };

const ShirtDesignPositioner = ({ shirtImage, designImage, position, onChange }) => {
  const containerRef = useRef(null);
  const pos = position || DEFAULT_POSITION;

  const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

  const startDrag = useCallback(
    (e) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const startX = e.touches ? e.touches[0].clientX : e.clientX;
      const startY = e.touches ? e.touches[0].clientY : e.clientY;
      const startPos = { ...pos };

      const handleMove = (moveEvent) => {
        const clientX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
        const clientY = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY;
        const deltaXPercent = ((clientX - startX) / rect.width) * 100;
        const deltaYPercent = ((clientY - startY) / rect.height) * 100;
        onChange({
          ...startPos,
          x: clamp(startPos.x + deltaXPercent, 10, 90),
          y: clamp(startPos.y + deltaYPercent, 10, 90),
        });
      };
      const handleUp = () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
        window.removeEventListener('touchmove', handleMove);
        window.removeEventListener('touchend', handleUp);
      };
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleUp);
    },
    [pos, onChange]
  );

  const startResize = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const startX = e.touches ? e.touches[0].clientX : e.clientX;
      const startScale = pos.scale;

      const handleMove = (moveEvent) => {
        const clientX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
        const deltaXPercent = ((clientX - startX) / rect.width) * 100;
        onChange({ ...pos, scale: clamp(startScale + deltaXPercent, 12, 75) });
      };
      const handleUp = () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
        window.removeEventListener('touchmove', handleMove);
        window.removeEventListener('touchend', handleUp);
      };
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleUp);
    },
    [pos, onChange]
  );

  return (
    <div>
      <div
        ref={containerRef}
        className="relative aspect-square bg-card rounded-lg border border-border overflow-hidden select-none"
      >
        <img
          src={shirtImage}
          alt="T-shirt"
          className="w-full h-full object-contain pointer-events-none"
          draggable={false}
        />

        {designImage && (
          <div
            className="absolute cursor-move touch-none"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              width: `${pos.scale}%`,
              transform: 'translate(-50%, -50%)',
            }}
            onMouseDown={startDrag}
            onTouchStart={startDrag}
          >
            <img
              src={designImage}
              alt="Votre design"
              className="w-full h-auto pointer-events-none drop-shadow-md"
              draggable={false}
            />
            {/* Poignée de redimensionnement */}
            <div
              onMouseDown={startResize}
              onTouchStart={startResize}
              className="absolute -bottom-2 -right-2 w-5 h-5 bg-primary border-2 border-white rounded-full shadow cursor-nwse-resize touch-none"
              title="Glisser pour redimensionner"
            />
          </div>
        )}
      </div>

      {designImage && (
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">
            Glisse le visuel pour le déplacer, tire le point pour redimensionner.
          </p>
          <button
            type="button"
            onClick={() => onChange(DEFAULT_POSITION)}
            className="text-xs text-primary hover:underline inline-flex items-center gap-1 flex-shrink-0 ml-2"
          >
            <RotateCcw className="h-3 w-3" />
            Réinitialiser
          </button>
        </div>
      )}
    </div>
  );
};

export { DEFAULT_POSITION };
export default ShirtDesignPositioner;

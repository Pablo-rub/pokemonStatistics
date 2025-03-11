import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook to make elements draggable
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.resetOnClose - Reset position when dialog closes
 * @param {string} options.handleSelector - CSS selector for the drag handle
 * @returns {Object} Draggable properties and handlers
 */
const useDraggable = ({ resetOnClose = true, handleSelector = '.MuiDialogTitle-root' } = {}) => {
  const [position, setPosition] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const elementRef = useRef(null);

  // Reset position when dialog closes
  const resetPosition = useCallback(() => {
    if (resetOnClose) {
      setPosition(null);
      setIsDragging(false);
    }
  }, [resetOnClose]);

  // Mouse down handler to start dragging
  const handleMouseDown = useCallback((e) => {
    // Check if the click is on the handle element (usually the dialog title)
    if (e.target.closest(handleSelector)) {
      const element = elementRef.current;
      if (element) {
        const rect = element.getBoundingClientRect();
        
        // Set initial position if not already set
        const currentPosition = position || { x: rect.left, y: rect.top };
        
        // Calculate offset between cursor and dialog top-left corner
        setDragOffset({
          x: e.clientX - currentPosition.x,
          y: e.clientY - currentPosition.y
        });
        
        setIsDragging(true);
        
        // Prevent text selection during drag
        e.preventDefault();
        
        // Set initial position if not already set
        if (!position) {
          setPosition(currentPosition);
        }
      }
    }
  }, [position, handleSelector]);

  // Handle document-level mouse events
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
        e.preventDefault();
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  return {
    ref: elementRef,
    style: {
      position: position ? 'fixed' : 'static',
      top: position ? `${position.y}px` : 'auto',
      left: position ? `${position.x}px` : 'auto',
      margin: position ? 0 : 'auto',
    },
    handleMouseDown,
    resetPosition,
    isDragging,
  };
};

export default useDraggable;
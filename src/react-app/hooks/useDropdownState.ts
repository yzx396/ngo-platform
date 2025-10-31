import * as React from 'react';

/**
 * Hook to manage dropdown open state
 * Usage:
 * const [open, setOpen] = useDropdownState();
 */
export function useDropdownState(initialOpen = false) {
  const [open, setOpen] = React.useState(initialOpen);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        contentRef.current &&
        triggerRef.current &&
        !contentRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  return { open, setOpen, triggerRef, contentRef };
}

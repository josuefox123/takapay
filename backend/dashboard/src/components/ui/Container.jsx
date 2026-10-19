import { forwardRef } from 'react';
import { cn } from '../../lib/cn.js';

// Largeur standard des sections : presque toute la page, avec une petite marge de chaque côté.
const Container = forwardRef(function Container({ as: Tag = 'div', className = '', ...props }, ref) {
  return (
    <Tag
      ref={ref}
      className={cn('mx-auto w-[calc(100%_-_32px)] sm:w-[min(1640px,calc(100%_-_48px))]', className)}
      {...props}
    />
  );
});

export default Container;

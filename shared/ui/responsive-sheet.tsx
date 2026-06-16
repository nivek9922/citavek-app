'use client'
import * as React from 'react'
import {
  Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter,
  SheetHeader, SheetTitle, SheetTrigger,
} from '@/shared/ui/sheet'
import { useMediaQuery } from '@/shared/ui/use-media-query'
import { cn } from '@/shared/ui/utils'

/** Contenido de Sheet que abre desde abajo en móvil (≤640px) y desde el lateral en desktop. */
function ResponsiveSheetContent({
  className, children, ...props
}: Omit<React.ComponentProps<typeof SheetContent>, 'side'>) {
  const isMobile = useMediaQuery('(max-width: 640px)')
  return (
    <SheetContent
      side={isMobile ? 'bottom' : 'right'}
      className={cn(isMobile && 'max-h-[90vh] overflow-y-auto rounded-t-2xl', className)}
      {...props}
    >
      {children}
    </SheetContent>
  )
}

export {
  Sheet as ResponsiveSheet,
  SheetTrigger as ResponsiveSheetTrigger,
  SheetClose as ResponsiveSheetClose,
  ResponsiveSheetContent,
  SheetHeader as ResponsiveSheetHeader,
  SheetTitle as ResponsiveSheetTitle,
  SheetDescription as ResponsiveSheetDescription,
  SheetFooter as ResponsiveSheetFooter,
}

"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
        className
      )}
      {...props}
    />
  )
}

/**
 * === MOBILE-RESPONSIVE DIALOG ===
 *
 * PROBLEM THIS FIXES:
 * The previous Dialog used `top-[50%] left-[50%] translate-x-[-50%]
 * translate-y-[-50%]` to center vertically + horizontally. On mobile
 * screens, the dialog often exceeded the viewport height — the bottom
 * action buttons got cut off and the user couldn't reach them.
 *
 * FIX:
 * 1. Use `inset-0` + flexbox centering instead of translate-based
 *    centering → the dialog takes full screen and centers via flex,
 *    which respects max-height constraints.
 * 2. `max-h-[90dvh]` (dynamic viewport height — accounts for iOS
 *    Safari address bar that shrinks when scrolling) so the dialog
 *    NEVER exceeds the visible viewport.
 * 3. `flex flex-col` structure: Header (sticky top) + Body (scrollable
 *    middle) + Footer (sticky bottom). This is the iOS modal pattern —
 *    the body scrolls inside while the action buttons stay visible.
 * 4. On mobile, padding is reduced (p-3 vs p-6) to give more space
 *    to the content.
 * 5. The close button is positioned with safe-area-inset-top so it
 *    doesn't go under the notch on modern phones.
 * 6. `overflow-y-auto` on the content ensures scrolling works inside
 *    WebView (which has its own scrolling quirks).
 *
 * Usage: the DialogHeader goes at the top, content in the middle,
 * DialogFooter at the bottom — all three are now sticky/scrollable.
 */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          // Base styles: bg + border + shadow + animation
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          // Layout: fixed full-screen flexbox centering (responsive)
          "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6",
          // Inner dialog: full-width with max constraints + max-height
          "[&[data-slot=dialog-content]]:max-h-[90dvh] sm:max-h-[85dvh] md:max-h-[80dvh]",
          ...className ? [className] : []
        )}
        {...props}
      >
        {/* Inner wrapper — the actual dialog card */}
        <div
          className={cn(
            "relative flex flex-col w-full max-w-[calc(100vw-1.5rem)] sm:max-w-lg",
            "max-h-[90dvh] sm:max-h-[85dvh] md:max-h-[80dvh]",
            "rounded-lg border shadow-lg",
            "gap-0", // override default gap-4 — we manage spacing per-section
            className // user can still add custom className
          )}
        >
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close
              data-slot="dialog-close"
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 rounded-md opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none p-1.5 bg-background/80 backdrop-blur-sm border border-border/50"
              style={{ top: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
            >
              <XIcon className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
        </div>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

/**
 * DialogHeader — sticky at the top of the dialog.
 * Has bottom border + padding so it's visually separated from the
 * body content.
 */
function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "flex flex-col gap-1.5 text-center sm:text-right p-4 sm:p-5 md:p-6",
        "border-b border-border/50 bg-background/95 backdrop-blur-sm",
        "rounded-t-lg flex-shrink-0", // sticky top
        className
      )}
      {...props}
    />
  )
}

/**
 * DialogBody — the scrollable middle section of the dialog.
 * Wrapper to use between DialogHeader and DialogFooter for long
 * content. NOT in shadcn/ui by default — we add it for the mobile
 * sticky-header/footer pattern.
 */
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn(
        "flex-1 overflow-y-auto p-4 sm:p-5 md:p-6",
        "min-h-0", // critical for flex-1 + overflow-y-auto to work
        "fia-scroll", // styled scrollbar
        className
      )}
      {...props}
    />
  )
}

/**
 * DialogFooter — sticky at the bottom of the dialog.
 * Has top border + padding so action buttons are always visible.
 */
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        "p-4 sm:p-5 md:p-6",
        "border-t border-border/50 bg-background/95 backdrop-blur-sm",
        "rounded-b-lg flex-shrink-0", // sticky bottom
        // Add safe-area-inset-bottom for iPhone notch on bottom
        className
      )}
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-base sm:text-lg leading-tight font-semibold pr-8", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-xs sm:text-sm text-muted-foreground leading-relaxed", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogBody, // NEW: scrollable middle section
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}

"use client"

import { type ReactNode } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ShoppingCart, Minus, Plus, Trash, X } from "@phosphor-icons/react"
import { formatPrice } from "@/lib/utils"
import type { MenuItem } from "@/types"

interface CartItem extends MenuItem {
  cartQuantity: number
}

interface MobileCartSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cart: CartItem[]
  cartTotal: number
  cartItemCount: number
  onUpdateQty: (itemId: string, delta: number) => void
  onRemove: (itemId: string) => void
  onClear: () => void
  onPlaceOrder: () => void
  placing: boolean
  user?: { role: string; monthly_credit_limit?: number }
  paymentMethod: string
  onPaymentMethodChange: (method: string) => void
  cashGiven: string
  onCashGivenChange: (val: string) => void
  changeAmount: number
  canUseCredit: boolean
  /** Extra content before the place-order button (e.g. customer search for staff) */
  extra?: ReactNode
}

/**
 * Bottom sheet cart for mobile order page.
 * Replaces the desktop w-80 sidebar cart.
 */
export function MobileCartSheet({
  open,
  onOpenChange,
  cart,
  cartTotal,
  cartItemCount,
  onUpdateQty,
  onRemove,
  onClear,
  onPlaceOrder,
  placing,
  user,
  paymentMethod,
  onPaymentMethodChange,
  cashGiven,
  onCashGivenChange,
  changeAmount,
  canUseCredit,
  extra,
}: MobileCartSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex h-[75vh] flex-col rounded-t-xl p-0"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Header */}
        <SheetHeader className="p-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-sm font-medium flex items-center gap-1.5">
              <ShoppingCart className="size-4" />
              Your Order
            </SheetTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {cartItemCount} item{cartItemCount !== 1 ? "s" : ""}
              </Badge>
              <Button variant="ghost" size="icon-xs" onClick={() => onOpenChange(false)}>
                <X className="size-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Extra content (customer search for staff) */}
        {extra && <div className="px-4 pt-3 shrink-0">{extra}</div>}

        {/* Cart items */}
        <ScrollArea className="flex-1 px-4 py-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <ShoppingCart className="size-8 mb-2 opacity-40" />
              <p className="text-xs">Cart is empty</p>
              <p className="text-[10px]">Tap items from the menu</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {cart.map((ci) => (
                <div key={ci.id} className="flex items-center gap-2 text-xs">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{ci.name}</p>
                    <p className="text-muted-foreground">
                      {formatPrice(ci.price * ci.cartQuantity)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon-xs" onClick={() => onUpdateQty(ci.id, -1)}>
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-6 text-center text-xs font-medium">{ci.cartQuantity}</span>
                    <Button variant="ghost" size="icon-xs" onClick={() => onUpdateQty(ci.id, 1)}>
                      <Plus className="size-3" />
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon-xs" onClick={() => onRemove(ci.id)}>
                    <Trash className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Bottom section */}
        <div className="shrink-0 border-t border-border p-4 space-y-3">
          <Separator />

          {/* Total */}
          <div className="flex items-center justify-between text-xs font-medium">
            <span>Total</span>
            <span className="font-heading text-sm">{formatPrice(cartTotal)}</span>
          </div>

          {/* Payment method */}
          <Select value={paymentMethod} onValueChange={(v) => { onPaymentMethodChange(v); if (v !== 'cash') onCashGivenChange("") }}>
            <SelectTrigger className="w-full h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              {canUseCredit && (
                <SelectItem value="credit">Credit</SelectItem>
              )}
            </SelectContent>
          </Select>

          {canUseCredit && paymentMethod === "credit" && user && (
            <Alert className="py-2">
              <AlertDescription className="text-xs">
                Credit limit: {formatPrice((user as any).monthly_credit_limit)}
              </AlertDescription>
            </Alert>
          )}

          {/* Cash input */}
          {paymentMethod === 'cash' && cart.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Cash Given</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Enter cash amount"
                  value={cashGiven}
                  onChange={(e) => onCashGivenChange(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              {cashGiven && parseFloat(cashGiven) >= cartTotal && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Change</span>
                  <span className="font-heading font-medium text-emerald-600 dark:text-emerald-400">
                    {formatPrice(changeAmount)}
                  </span>
                </div>
              )}
              {cashGiven && parseFloat(cashGiven) < cartTotal && (
                <p className="text-[10px] text-destructive">
                  Insufficient cash. Need at least {formatPrice(cartTotal)}
                </p>
              )}
            </div>
          )}

          {/* Place order button */}
          <Button
            className="w-full"
            size="sm"
            onClick={() => {
              onPlaceOrder()
              onOpenChange(false)
            }}
            disabled={placing || cart.length === 0 || (paymentMethod === 'cash' && (!cashGiven || parseFloat(cashGiven) < cartTotal))}
          >
            {placing ? (
              <>
                <span className="inline-block size-3 animate-spin rounded-full border border-current border-t-transparent mr-1" />
                Placing Order...
              </>
            ) : (
              "Place Order"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

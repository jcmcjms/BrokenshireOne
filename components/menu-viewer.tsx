"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { ImageIcon, ShoppingCart } from "@phosphor-icons/react"
import { formatPrice, cn } from "@/lib/utils"
import Link from "next/link"
import type { MenuItem, MenuCategory } from "@/types"

export default function MenuViewer() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>("all")

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [itemsRes, catsRes] = await Promise.all([
        fetch("/api/menu/items"),
        fetch("/api/menu/categories"),
      ])
      if (!itemsRes.ok) throw new Error("Failed to fetch menu items")
      if (!catsRes.ok) throw new Error("Failed to fetch categories")
      const itemsData = await itemsRes.json()
      const catsData = await catsRes.json()
      setItems(itemsData.data ?? itemsData)
      setCategories(catsData.data ?? catsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredItems =
    activeCategory === "all"
      ? items
      : items.filter((i) => i.category_id === activeCategory)

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16">
        <p className="text-destructive text-xs">Failed to load menu</p>
        <p className="text-muted-foreground text-xs">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchData}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-sm font-medium">Menu</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Browse available menu items
        </p>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList variant="line">
          <TabsTrigger value="all">All</TabsTrigger>
          {categories.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id}>
              {cat.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-4">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-0">
                    <Skeleton className="h-32 w-full" />
                    <div className="p-3 flex flex-col gap-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <p className="text-muted-foreground text-xs">
                No items in this category
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map((item) => {
                const isOutOfStock = item.stock_quantity === 0
                return (
                  <Card
                    key={item.id}
                    className={cn(isOutOfStock && "opacity-50")}
                  >
                    <CardContent className="p-0">
                      {/* Image */}
                      <div className="flex items-center justify-center h-32 bg-muted">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="size-8 text-muted-foreground/40" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="p-3 flex flex-col gap-1.5">
                        <p className="text-xs font-medium leading-tight">
                          {item.name}
                        </p>

                        {item.description && (
                          <p className="text-[10px] text-muted-foreground line-clamp-2">
                            {item.description}
                          </p>
                        )}

                        <div className="flex items-center gap-1 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">
                            {item.category_name ??
                              categories.find((c) => c.id === item.category_id)
                                ?.name}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">
                            {formatPrice(item.price)} / {item.unit}
                          </span>
                        </div>

                        {/* Stock status */}
                        {isOutOfStock ? (
                          <Badge
                            variant="destructive"
                            className="w-fit text-[10px]"
                          >
                            Out of stock
                          </Badge>
                        ) : item.stock_quantity <= 5 ? (
                          <Badge
                            variant="outline"
                            className="w-fit text-[10px] text-amber-600 border-amber-300 bg-amber-50"
                          >
                            Only {item.stock_quantity} left
                          </Badge>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-center pb-4">
        <Link href="/dashboard/order">
          <Button className="gap-2">
            <ShoppingCart className="size-4" />
            Place Order
          </Button>
        </Link>
      </div>
    </div>
  )
}

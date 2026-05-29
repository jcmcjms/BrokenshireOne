"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Gear, CaretLeft } from "@phosphor-icons/react"

export default function AdminSettingsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" asChild>
          <a href="/dashboard/admin">
            <CaretLeft className="size-4" />
          </a>
        </Button>
        <div>
          <h1 className="font-heading text-sm font-medium">System Settings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Configure the canteen management system</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <Gear className="size-4 inline mr-1" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="school-name" className="text-xs font-medium text-muted-foreground">
              School Name
            </label>
            <Input id="school-name" placeholder="Enter school name" className="max-w-sm" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="canteen-name" className="text-xs font-medium text-muted-foreground">
              Canteen Name
            </label>
            <Input id="canteen-name" placeholder="Enter canteen name" className="max-w-sm" />
          </div>

          <Separator />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="credit-limit" className="text-xs font-medium text-muted-foreground">
              Default Monthly Credit Limit
            </label>
            <Input id="credit-limit" type="number" placeholder="100.00" className="max-w-sm" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="session-timeout" className="text-xs font-medium text-muted-foreground">
              Session Timeout (hours)
            </label>
            <Input id="session-timeout" type="number" placeholder="24" className="max-w-sm" />
          </div>

          <Separator />

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm">Reset</Button>
            <Button size="sm">Save Changes</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

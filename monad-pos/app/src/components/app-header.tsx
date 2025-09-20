import { Badge } from "@/components/ui/badge"

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">Monad POS</h1>
        </div>
        <Badge variant="secondary" className="rounded-2xl px-3 py-1 text-xs font-medium">
          Monad Testnet
        </Badge>
      </div>
    </header>
  )
}

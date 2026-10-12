import { ArrowLeft, SearchX } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"

type CatalogNotFoundProps = {
  title: string
  description: string
  backHref: string
  backLabel: string
}

export function CatalogNotFound({ title, description, backHref, backLabel }: CatalogNotFoundProps) {
  return (
    <Card>
      <EmptyState
        icon={SearchX}
        title={title}
        description={description}
        action={
          <Button asChild variant="secondary">
            <Link href={backHref}>
              <ArrowLeft />
              {backLabel}
            </Link>
          </Button>
        }
      />
    </Card>
  )
}

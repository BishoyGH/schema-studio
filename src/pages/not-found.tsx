import { Link } from '@tanstack/react-router'
import { PageContainer, PageHeader } from '@/components/app/page'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <PageContainer className="max-w-2xl">
      <PageHeader
        title="Page not found"
        description="The page you are looking for does not exist."
        actions={
          <Button asChild>
            <Link to="/">Go home</Link>
          </Button>
        }
      />
    </PageContainer>
  )
}

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/review/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/review/"!</div>
}

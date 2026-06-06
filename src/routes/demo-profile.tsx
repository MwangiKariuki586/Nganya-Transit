import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/demo-profile')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/demo-profile"!</div>
}

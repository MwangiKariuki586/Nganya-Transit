import { createFileRoute } from '@tanstack/react-router'
import NganyaDetailScreen from '@/modules/fan/screens/NganyaDetailScreen'

export const Route = createFileRoute('/(fan)/nganya/$slug')({
  component: NganyaDetailScreen,
})

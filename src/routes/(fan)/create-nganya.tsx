import { createFileRoute } from '@tanstack/react-router'
import CreateNganyaScreen from '@/modules/fan/screens/CreateNganyaScreen'

export const Route = createFileRoute('/(fan)/create-nganya')({
  component: CreateNganyaScreen,
})

// Force dynamic rendering to prevent useSearchParams prerendering issues
export const dynamic = 'force-dynamic'

import ProtectorApp from "@/components/protector-app"

export default function ClientPage() {
  return <ProtectorApp />
}

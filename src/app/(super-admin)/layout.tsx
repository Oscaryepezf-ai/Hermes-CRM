import { redirect } from "next/navigation"
import { auth } from "../../../auth"

export default async function SuperAdminRootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const user = session?.user as any

  if (!user?.isSuperAdmin) redirect("/dashboard")

  return <>{children}</>
}

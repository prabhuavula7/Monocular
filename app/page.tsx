import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'

export default async function Home() {
  const { orgId } = await auth()
  if (orgId) redirect('/dashboard')
  redirect('/sign-in')
}

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { CreateOrganization } from '@clerk/nextjs'

export default async function CreateOrgPage() {
  const { orgId } = await auth()
  if (orgId) redirect('/dashboard')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Create your workspace</h1>
          <p className="text-sm text-gray-500 mt-1">
            Set up your agency to start scoping projects
          </p>
        </div>
        <CreateOrganization afterCreateOrganizationUrl="/dashboard" />
      </div>
    </div>
  )
}

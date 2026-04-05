import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { CreateOrganization } from '@clerk/nextjs'
import Image from 'next/image'

export default async function CreateOrgPage() {
  const { orgId } = await auth()
  if (orgId) redirect('/dashboard')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="mb-8">
        <Image
          src="/monocular_logo_pack/monocular-icon-color.svg"
          alt="Monocular"
          width={48}
          height={48}
          className="h-12 w-auto"
          priority
        />
      </div>
      <CreateOrganization afterCreateOrganizationUrl="/dashboard" />
    </div>
  )
}

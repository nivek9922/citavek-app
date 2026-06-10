'use client'
import dynamic from 'next/dynamic'

const WizardDynamic = dynamic(
  () => import('./OnboardingWizard').then((m) => ({ default: m.OnboardingWizard })),
  { ssr: false },
)

interface Props {
  slug:            string
  initialColor:    string
  initialLogoUrl:  string | null
  initialCoverUrl: string | null
}

export function OnboardingWizard(props: Props) {
  return <WizardDynamic {...props} />
}

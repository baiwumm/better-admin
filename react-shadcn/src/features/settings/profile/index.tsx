import { ContentSection } from '../components/content-section'
import { ProfileForm } from './profile-form'

export function SettingsProfile() {
  return (
    <ContentSection title='个人资料' desc='这是其他人在系统中看到你的方式。'>
      <ProfileForm />
    </ContentSection>
  )
}

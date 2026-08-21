import { ContentSection } from '../components/content-section'
import { NotificationsForm } from './notifications-form'

export function SettingsNotifications() {
  return (
    <ContentSection title='通知' desc='配置你接收通知的方式。'>
      <NotificationsForm />
    </ContentSection>
  )
}

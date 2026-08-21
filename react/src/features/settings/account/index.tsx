import { ContentSection } from '../components/content-section'
import { AccountForm } from './account-form'

export function SettingsAccount() {
  return (
    <ContentSection title='账户' desc='更新账户设置，配置首选语言与时区。'>
      <AccountForm />
    </ContentSection>
  )
}

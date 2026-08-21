import { ContentSection } from '../components/content-section'
import { DisplayForm } from './display-form'

export function SettingsDisplay() {
  return (
    <ContentSection title='显示' desc='开启或关闭应用中的显示项。'>
      <DisplayForm />
    </ContentSection>
  )
}

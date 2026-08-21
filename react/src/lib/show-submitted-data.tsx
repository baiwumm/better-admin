import { toast } from 'sonner'

export function showSubmittedData(
  data: unknown,
  title: string = '你提交了以下数据：'
) {
  toast.message(title, {
    description: (
      <pre className='mt-2 w-full overflow-x-auto rounded-md bg-slate-950 p-4'>
        <code className='text-white'>{JSON.stringify(data, null, 2)}</code>
      </pre>
    ),
  })
}

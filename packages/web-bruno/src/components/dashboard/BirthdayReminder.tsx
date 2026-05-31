import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import type { Patient } from '@/schemas/patient.schema'

interface BirthdayReminderProps {
  patients: Patient[]
  onDismiss: () => void
}

export function BirthdayReminder({ patients, onDismiss }: BirthdayReminderProps) {
  if (patients.length === 0) {
    return null
  }

  return (
    <Panel className="mb-4 border-amber-200 bg-amber-50">
      <Panel.Body className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="text-sm font-semibold text-amber-900">
            {patients.length === 1 ? 'Aniversário de hoje' : 'Aniversariantes de hoje'}
          </div>
          <p className="text-sm text-amber-800">
            {patients.length === 1
              ? 'Bruno, há um paciente fazendo aniversário hoje.'
              : 'Bruno, estes pacientes estão fazendo aniversário hoje.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {patients.map((patient) => (
              <span
                key={patient.id}
                className="rounded-full border border-amber-200 bg-white px-3 py-1 text-sm text-amber-900"
              >
                {patient.name}
              </span>
            ))}
          </div>
        </div>
        <Button variant="ghost" size="sm" type="button" onClick={onDismiss} className="self-start">
          Dispensar
        </Button>
      </Panel.Body>
    </Panel>
  )
}

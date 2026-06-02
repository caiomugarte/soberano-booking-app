import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePatients } from '@/api/patients'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { CARE_SUMMARY_LABELS } from '@/config/constants'
import { formatPhone } from '@/lib/format'

function getCareSummaryBadgeVariant(careSummary: 'psychotherapy' | 'neuromodulation' | 'dual_track') {
  if (careSummary === 'neuromodulation') return 'amber'
  if (careSummary === 'dual_track') return 'emerald'
  return 'blue'
}

export function PatientList() {
  const [search, setSearch] = useState('')
  const { data: patients = [] } = usePatients(search || undefined)
  const navigate = useNavigate()

  return (
    <div>
      <div className="mb-4">
        <Input
          placeholder="Buscar por nome, telefone, CPF ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {patients.length === 0 ? (
        <EmptyState
          title={search ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
          description={search ? 'Tente uma busca diferente' : 'Adicione seu primeiro paciente'}
        />
      ) : (
        <div className="space-y-2">
          {patients.map((patient) => (
            <button
              key={patient.id}
              onClick={() => navigate(`/pacientes/${patient.id}`)}
              className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left transition-shadow hover:shadow-md"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-medium text-gray-800">{patient.name}</div>
                  <Badge variant={getCareSummaryBadgeVariant(patient.careSummary)}>
                    {CARE_SUMMARY_LABELS[patient.careSummary]}
                  </Badge>
                  {patient.isMinor && (
                    <Badge variant="amber">Menor de idade</Badge>
                  )}
                </div>
                {patient.phone && (
                  <div className="text-xs text-gray-400">{formatPhone(patient.phone)}</div>
                )}
              </div>
              <span className="text-xs text-gray-400">›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

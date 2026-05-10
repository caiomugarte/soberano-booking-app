import { useState } from 'react'
import { PatientList } from '@/components/patients/PatientList'
import { PatientForm } from '@/components/patients/PatientForm'
import { Button } from '@/components/ui/Button'

export default function PatientsPage() {
  const [formOpen, setFormOpen] = useState(false)

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-gray-800">Pacientes</h1>
        <Button className="w-full sm:w-auto" onClick={() => setFormOpen(true)}>+ Novo Paciente</Button>
      </div>

      <PatientList />

      <PatientForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  )
}

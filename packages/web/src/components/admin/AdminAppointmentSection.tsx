import { type AdminAppointment } from '../../api/use-admin.ts';
import { AdminAppointmentCard } from './AdminAppointmentCard.tsx';

interface AdminAppointmentSectionProps {
  title: string;
  titleClassName?: string;
  appointments: AdminAppointment[];
  timePassed: boolean;
  onCancelClick: (id: string) => void;
  onNoShowClick: (id: string) => void;
  onDeleteClick: (id: string) => void;
  onEditClick: (appointment: AdminAppointment) => void;
}

export function AdminAppointmentSection({
  title,
  titleClassName = 'text-muted',
  appointments,
  timePassed,
  onCancelClick,
  onNoShowClick,
  onDeleteClick,
  onEditClick,
}: AdminAppointmentSectionProps) {
  if (appointments.length === 0) return null;

  return (
    <section className="mb-6 last:mb-0">
      <h2 className={`text-xs tracking-widest uppercase mb-3 ${titleClassName}`}>{title}</h2>
      <div className="flex flex-col gap-3">
        {appointments.map((appointment) => (
          <AdminAppointmentCard
            key={appointment.id}
            appointment={appointment}
            timePassed={timePassed}
            onCancelClick={onCancelClick}
            onNoShowClick={onNoShowClick}
            onDeleteClick={onDeleteClick}
            onEditClick={onEditClick}
          />
        ))}
      </div>
    </section>
  );
}

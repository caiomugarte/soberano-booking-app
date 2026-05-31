import { useRef, useState, type ChangeEvent } from 'react';
import type { AdminAppointment } from '../../api/use-admin.ts';
import { Button } from '../ui/Button.tsx';
import { Input } from '../ui/Input.tsx';
import { AdminAppointmentCancelModal, AdminAppointmentDeleteModal, AdminAppointmentNoShowModal } from './AdminAppointmentManagementDialogs.tsx';
import { AdminAppointmentCard } from './AdminAppointmentCard.tsx';
import { AdminEditAppointmentModal } from './AdminEditAppointmentModal.tsx';
import {
  useAdminCancelAppointment,
  useAdminCreateBooking,
  useDeleteAppointment,
  useAdminPackageDetails,
  useUpdateAppointmentStatus,
  type CustomerPackage,
  type CustomerPackageLinkedAppointment,
  type CustomerPackageStatus,
} from '../../api/use-admin.ts';
import { useServices } from '../../api/use-services.ts';
import { useSlots } from '../../api/use-slots.ts';
import { formatCurrency, stripPhone } from '../../lib/format.ts';

interface PackageWorkspaceModalProps {
  packageId: string;
  initialPackage?: CustomerPackage;
  barberId: string | null;
  initialMode?: 'details' | 'schedule';
  onClose: () => void;
}

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const STATUS_LABEL: Record<CustomerPackageStatus, string> = {
  active: 'Ativo',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

const STATUS_COLOR: Record<CustomerPackageStatus, string> = {
  active: 'text-gold border-gold/30 bg-gold/10',
  completed: 'text-green-400 border-green-400/30 bg-green-400/10',
  cancelled: 'text-muted border-dark-border bg-dark-surface2',
};

function formatAppointmentDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR');
}

export function PackageWorkspaceModal({
  packageId,
  initialPackage,
  barberId,
  initialMode = 'details',
  onClose,
}: PackageWorkspaceModalProps) {
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [timeError, setTimeError] = useState('');
  const [mode, setMode] = useState<'details' | 'schedule'>(initialMode);
  const [editAppointment, setEditAppointment] = useState<AdminAppointment | null>(null);
  const [cancelAppointment, setCancelAppointment] = useState<AdminAppointment | null>(null);
  const [deleteAppointment, setDeleteAppointment] = useState<AdminAppointment | null>(null);
  const [noShowAppointment, setNoShowAppointment] = useState<AdminAppointment | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const { data: services } = useServices();
  const { data: slots } = useSlots(barberId, date || null);
  const createBooking = useAdminCreateBooking();
  const packageDetails = useAdminPackageDetails(packageId);
  const cancelMutation = useAdminCancelAppointment();
  const deleteMutation = useDeleteAppointment();
  const updateStatus = useUpdateAppointmentStatus();

  const pkg = packageDetails.data ?? initialPackage ?? null;
  const linkedAppointments = packageDetails.data?.linkedAppointments ?? [];
  const remainingUses = pkg ? Math.max(0, pkg.totalUses - pkg.usedCount) : 0;
  const nextUsageNumber = pkg ? Math.min(pkg.totalUses, pkg.usedCount + 1) : 1;
  const strippedPhone = pkg?.customerPhone ? stripPhone(pkg.customerPhone) : '';

  const isValid = serviceId.length > 0 && date.length > 0 && TIME_REGEX.test(time);

  function handleTimeChange(e: ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
    setTime(digits.length > 2 ? digits.slice(0, 2) + ':' + digits.slice(2) : digits);
    if (timeError) setTimeError('');
  }

  function handleBook() {
    if (!isValid || !pkg) return;
    createBooking.mutate({
      serviceId,
      date,
      startTime: time,
      customerName: pkg.customerName,
      ...(strippedPhone.length >= 10 ? { customerPhone: strippedPhone } : {}),
      packageId: pkg.id,
    }, {
      onSuccess: async () => {
        setServiceId('');
        setDate('');
        setTime('');
        setTimeError('');

        const nextDetails = await packageDetails.refetch();
        const nextPackage = nextDetails.data ?? pkg;
        if (nextPackage.totalUses - nextPackage.usedCount <= 0) {
          setMode('details');
        } else {
          setMode('schedule');
        }
      },
    });
  }

  function toAdminAppointment(appointment: CustomerPackageLinkedAppointment): AdminAppointment {
    return {
      id: appointment.id,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      priceCents: appointment.priceCents,
      packageId,
      service: appointment.service,
      customer: {
        name: appointment.customer.name,
        phone: appointment.customer.phone,
      },
      barber: {
        firstName: '',
        lastName: '',
        avatarUrl: null,
      },
      package: {
        appointmentNumber: appointment.packageProgress.appointmentNumber,
        totalUses: appointment.packageProgress.totalUses,
        totalPriceCents: appointment.packageProgress.totalPriceCents,
      },
    };
  }

  function hasTimePassed(appointment: AdminAppointment): boolean {
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    const appointmentDay = appointment.date.slice(0, 10);
    if (appointmentDay < todayKey) return true;
    if (appointmentDay > todayKey) return false;
    const currentTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
    return appointment.endTime <= currentTime;
  }

  async function refreshPackageDetails() {
    await packageDetails.refetch();
  }

  const mappedAppointments = linkedAppointments.map(toAdminAppointment);

  if (!pkg && packageDetails.isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-dark-surface border border-dark-border rounded-2xl w-full max-w-sm p-6">
          <p className="text-sm text-muted text-center">Carregando pacote...</p>
        </div>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-dark-surface border border-dark-border rounded-2xl w-full max-w-sm p-6">
          <p className="text-sm text-red-400 text-center mb-4">
            Não foi possível carregar os detalhes deste pacote.
          </p>
          <Button onClick={onClose} className="w-full">
            Fechar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      {editAppointment && (
        <AdminEditAppointmentModal
          appointment={editAppointment}
          barberId={barberId}
          onClose={() => {
            setEditAppointment(null);
            void refreshPackageDetails();
          }}
        />
      )}
      {cancelAppointment && (
        <AdminAppointmentCancelModal
          isPending={cancelMutation.isPending}
          onClose={() => setCancelAppointment(null)}
          onConfirm={(reason) => {
            cancelMutation.mutate(
              {
                id: cancelAppointment.id,
                reason,
                packageId: cancelAppointment.packageId,
              },
              {
                onSuccess: () => {
                  setCancelAppointment(null);
                  void refreshPackageDetails();
                },
              },
            );
          }}
        />
      )}
      {deleteAppointment && (
        <AdminAppointmentDeleteModal
          isPending={deleteMutation.isPending}
          onClose={() => setDeleteAppointment(null)}
          onConfirm={() => {
            deleteMutation.mutate(
              {
                id: deleteAppointment.id,
                packageId: deleteAppointment.packageId,
              },
              {
                onSuccess: () => {
                  setDeleteAppointment(null);
                  void refreshPackageDetails();
                },
              },
            );
          }}
        />
      )}
      {noShowAppointment && (
        <AdminAppointmentNoShowModal
          isPending={updateStatus.isPending}
          onClose={() => setNoShowAppointment(null)}
          onConfirm={() => {
            updateStatus.mutate(
              {
                id: noShowAppointment.id,
                status: 'no_show',
                packageId: noShowAppointment.packageId,
              },
              {
                onSuccess: () => {
                  setNoShowAppointment(null);
                  void refreshPackageDetails();
                },
              },
            );
          }}
        />
      )}
      <div className="bg-dark-surface border border-dark-border rounded-2xl w-full max-w-lg max-h-[90dvh] overflow-hidden flex flex-col">
        <div className="overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-serif text-base tracking-widest uppercase text-gold">Workspace do Pacote</h2>
              <p className="text-muted text-xs mt-1">
                {pkg.customerName}
                {pkg.customerPhone ? ` · +55 ${pkg.customerPhone}` : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-muted hover:text-[#F0EDE8] transition-colors bg-transparent border-none cursor-pointer text-lg leading-none"
            >
              ×
            </button>
          </div>

          <div className="bg-dark border border-dark-border rounded-2xl p-4 mb-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-sm font-medium">{pkg.customerName}</p>
                <p className="text-muted text-xs mt-1">
                  {pkg.usedCount}/{pkg.totalUses} usos alocados · {remainingUses} restantes
                </p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${STATUS_COLOR[pkg.status]}`}>
                {STATUS_LABEL[pkg.status]}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-muted text-[11px] uppercase tracking-[0.12em] mb-1">Valor total</p>
                <p className="font-medium text-gold">{formatCurrency(pkg.totalPriceCents)}</p>
              </div>
              <div>
                <p className="text-muted text-[11px] uppercase tracking-[0.12em] mb-1">Criado em</p>
                <p>{formatAppointmentDate(pkg.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted text-[11px] uppercase tracking-[0.12em] mb-1">Agendamentos</p>
                <p>{linkedAppointments.length}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mb-5">
            <button
              type="button"
              onClick={() => setMode('details')}
              className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors cursor-pointer
                ${mode === 'details'
                  ? 'border-gold bg-gold/20 text-gold'
                  : 'border-dark-border bg-dark text-muted hover:border-gold/40'
                }`}
            >
              Detalhes
            </button>
            {remainingUses > 0 && (
              <button
                type="button"
                onClick={() => setMode('schedule')}
                className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors cursor-pointer
                  ${mode === 'schedule'
                    ? 'border-gold bg-gold/20 text-gold'
                    : 'border-dark-border bg-dark text-muted hover:border-gold/40'
                  }`}
              >
                Agendar uso
              </button>
            )}
          </div>

          {mode === 'schedule' && remainingUses > 0 ? (
            <>
              <div className="mb-5">
                <label className="block text-[11px] tracking-[0.12em] uppercase text-muted mb-2">Serviço</label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3 text-sm text-[#F0EDE8] outline-none focus:border-gold appearance-none"
                >
                  <option value="">Selecione um serviço</option>
                  {services?.map((s) => (
                    <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                  ))}
                </select>
              </div>

              <div className="mb-5">
                <label className="block text-[11px] tracking-[0.12em] uppercase text-muted mb-2">Data</label>
                <div className="relative w-full bg-dark border border-dark-border rounded-xl min-h-[50px] focus-within:border-gold">
                  <div className="absolute inset-0 px-4 text-sm flex items-center pointer-events-none select-none">
                    <span className={date ? 'text-[#F0EDE8]' : 'text-muted'}>
                      {date ? date.split('-').reverse().join('/') : 'Selecione uma data'}
                    </span>
                  </div>
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={date}
                    max="2099-12-31"
                    onChange={(e) => setDate(e.target.value)}
                    onClick={() => dateInputRef.current?.showPicker?.()}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              <div className="mb-5">
                <Input
                  label="Horário"
                  placeholder="09:00"
                  value={time}
                  onChange={handleTimeChange}
                  onBlur={() => {
                    if (time && !TIME_REGEX.test(time)) setTimeError('Formato inválido. Use HH:MM (ex: 09:00)');
                    else setTimeError('');
                  }}
                />
                {timeError && <p className="text-red-400 text-xs mt-1">{timeError}</p>}
                {slots && slots.filter((s) => s.available).length > 0 && (
                  <div className="mt-2">
                    <p className="text-[11px] tracking-[0.12em] uppercase text-muted mb-1.5">Horários Disponíveis</p>
                    <div className="flex flex-wrap gap-1.5">
                      {slots.filter((s) => s.available).map((s) => (
                        <button
                          key={s.time}
                          type="button"
                          onClick={() => { setTime(s.time); setTimeError(''); }}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer
                            ${time === s.time
                              ? 'border-gold bg-gold/20 text-gold'
                              : 'border-dark-border bg-dark text-muted hover:border-gold/40 hover:text-[#F0EDE8]'
                            }`}
                        >
                          {s.time}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={handleBook}
                disabled={!isValid || createBooking.isPending}
                loading={createBooking.isPending}
                className="w-full"
              >
                Agendar uso ({nextUsageNumber}/{pkg.totalUses})
              </Button>

              {createBooking.isError && (
                <p className="text-red-400 text-xs text-center mt-2">{(createBooking.error as Error)?.message}</p>
              )}
            </>
          ) : (
            <div>
              {remainingUses > 0 && (
                <div className="mb-5 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 text-sm text-gold/90">
                  Ainda restam {remainingUses} uso{remainingUses === 1 ? '' : 's'} para agendar.
                </div>
              )}

              {linkedAppointments.length === 0 ? (
                <div className="rounded-2xl border border-dark-border bg-dark px-4 py-8 text-center">
                  <p className="text-sm text-muted">Nenhum uso agendado ainda.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {mappedAppointments.map((appointment) => (
                    <AdminAppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      timePassed={hasTimePassed(appointment)}
                      onEditClick={setEditAppointment}
                      onCancelClick={() => setCancelAppointment(appointment)}
                      onDeleteClick={() => setDeleteAppointment(appointment)}
                      onNoShowClick={() => setNoShowAppointment(appointment)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

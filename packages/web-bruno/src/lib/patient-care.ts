import type { SessionType } from '@/schemas/appointment.schema'
import type { Patient } from '@/schemas/patient.schema'

type CareProfileLike = Pick<
  Patient,
  'psychotherapyPriceCents' | 'psychotherapyFrequency' | 'neuromodulationEligible'
>

export function hasPsychotherapyTrack(patient: Pick<
  Patient,
  'psychotherapyPriceCents' | 'psychotherapyFrequency'
> | null | undefined): boolean {
  return Boolean(patient?.psychotherapyPriceCents && patient?.psychotherapyFrequency)
}

export function supportsSessionType(
  patient: CareProfileLike | null | undefined,
  type: SessionType,
): boolean {
  if (!patient) {
    return true
  }

  if (type === 'psychotherapy') {
    return hasPsychotherapyTrack(patient)
  }

  return patient.neuromodulationEligible
}

export function getAllowedSessionTypes(
  patient: CareProfileLike | null | undefined,
): SessionType[] {
  if (!patient) {
    return ['psychotherapy', 'neuromodulation']
  }

  const allowed: SessionType[] = []

  if (hasPsychotherapyTrack(patient)) {
    allowed.push('psychotherapy')
  }

  if (patient.neuromodulationEligible) {
    allowed.push('neuromodulation')
  }

  return allowed.length > 0 ? allowed : ['psychotherapy']
}

export function getSaoPauloTodayDate(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = parts.find((part) => part.type === 'year')?.value ?? '0000'
  const month = parts.find((part) => part.type === 'month')?.value ?? '00'
  const day = parts.find((part) => part.type === 'day')?.value ?? '00'

  return `${year}-${month}-${day}`
}

export function isMinorFromBirthDate(birthDate: string | null | undefined): boolean {
  if (!birthDate) {
    return false
  }

  const [birthYear, birthMonth, birthDay] = birthDate.split('-').map(Number)
  const [referenceYear, referenceMonth, referenceDay] = getSaoPauloTodayDate()
    .split('-')
    .map(Number)

  let age = referenceYear - birthYear
  const hadBirthdayThisYear =
    referenceMonth > birthMonth ||
    (referenceMonth === birthMonth && referenceDay >= birthDay)

  if (!hadBirthdayThisYear) {
    age -= 1
  }

  return age < 18
}

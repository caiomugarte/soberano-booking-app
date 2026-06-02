export interface PatientDeleteRecurringSeriesDependency {
  id: string;
  appointmentCount: number;
}

export interface ResolvedPatientDeleteRecurringSeriesDependencies {
  blockingCount: number;
  orphanIds: string[];
}

export function resolvePatientDeleteRecurringSeriesDependencies(
  rows: PatientDeleteRecurringSeriesDependency[],
): ResolvedPatientDeleteRecurringSeriesDependencies {
  return rows.reduce<ResolvedPatientDeleteRecurringSeriesDependencies>(
    (result, row) => {
      if (row.appointmentCount > 0) {
        result.blockingCount += 1;
        return result;
      }

      result.orphanIds.push(row.id);
      return result;
    },
    {
      blockingCount: 0,
      orphanIds: [],
    },
  );
}

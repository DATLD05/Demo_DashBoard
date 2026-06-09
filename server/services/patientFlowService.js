import { getServerConfig } from '../config/env.js';
import { getBigQueryClient } from '../lib/bigQueryClient.js';

function toIsoDate(dateValue) {
  if (!dateValue) {
    return null;
  }

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return dateValue;
}

function validateDateRange(startDate, endDate, allTime = false) {
  if (allTime) {
    return {
      startDate: null,
      endDate: null,
      allTime: true,
    };
  }

  const normalizedStart = toIsoDate(startDate);
  const normalizedEnd = toIsoDate(endDate);

  if (!normalizedStart || !normalizedEnd) {
    throw new Error('Invalid date range. Please provide startDate and endDate in YYYY-MM-DD format.');
  }

  if (normalizedStart > normalizedEnd) {
    throw new Error('startDate cannot be greater than endDate.');
  }

  return {
    startDate: normalizedStart,
    endDate: normalizedEnd,
    allTime: false,
  };
}

function roundToOneDecimal(value) {
  return Number((Number(value) || 0).toFixed(1));
}

function weightedAverage(rows, valueKey, weightKey) {
  let numerator = 0;
  let denominator = 0;

  rows.forEach((row) => {
    const value = Number(row[valueKey]);
    const weight = Number(row[weightKey] || 0);

    if (!Number.isFinite(value) || weight <= 0) {
      return;
    }

    numerator += value * weight;
    denominator += weight;
  });

  return denominator > 0 ? numerator / denominator : 0;
}

function mapTrendRows(rows) {
  return rows.map((row) => ({
    date: row.report_date?.value || row.report_date,
    department: row.department_name,
    totalEncounters: Number(row.total_encounters || 0),
    averageWaitMinutes: roundToOneDecimal(row.avg_wait_minutes),
    sameDayCompletionRate: roundToOneDecimal(Number(row.same_day_completion_rate || 0) * 100),
    admissionRate: roundToOneDecimal(Number(row.admission_rate || 0) * 100),
  }));
}

function mapRowsToSummary(rows) {
  const totalEncounters = rows.reduce(
    (sum, row) => sum + Number(row.total_encounters || 0),
    0,
  );

  const trend = mapTrendRows(rows);

  return {
    totalEncounters,
    averageWaitMinutes: roundToOneDecimal(weightedAverage(rows, 'avg_wait_minutes', 'total_encounters')),
    completedSameDayRate: roundToOneDecimal(
      weightedAverage(rows, 'same_day_completion_rate', 'total_encounters') * 100,
    ),
    admittedRate: roundToOneDecimal(weightedAverage(rows, 'admission_rate', 'total_encounters') * 100),
    trend,
  };
}

export async function queryPatientFlowReport({
  startDate,
  endDate,
  department = 'all',
  allTime = false,
}) {
  const validRange = validateDateRange(startDate, endDate, allTime);
  const { bigQuery } = getServerConfig();
  const bigQueryClient = getBigQueryClient();
  const encounterMetricsTable =
    `\`${bigQuery.projectId}.${bigQuery.dataset}.${bigQuery.factEncounterMetrics}\``;
  const dateTable = `\`${bigQuery.projectId}.${bigQuery.dataset}.${bigQuery.dimDate}\``;
  const providerTable = `\`${bigQuery.projectId}.${bigQuery.dataset}.${bigQuery.dimProvider}\``;

  const dateCondition = validRange.allTime ? 'TRUE' : 'd.Date BETWEEN @startDate AND @endDate';
  const departmentKeyExpression = "COALESCE(NULLIF(TRIM(p.Speciality), ''), 'UNKNOWN')";
  const departmentNameExpression = "COALESCE(NULLIF(TRIM(p.Speciality), ''), 'Unknown speciality')";

  const query = `
    WITH encounter_base AS (
      SELECT
        f.Encounter_Id AS encounter_id,
        d.Date AS report_date,
        ${departmentKeyExpression} AS department_key,
        ${departmentNameExpression} AS department_name,
        AVG(SAFE_CAST(f.Duration_Minutes AS FLOAT64)) AS duration_minutes,
        MAX(
          CASE
            WHEN f.Length_Of_Stay_Days IS NULL THEN NULL
            WHEN SAFE_CAST(f.Length_Of_Stay_Days AS FLOAT64) = 0 THEN 1
            ELSE 0
          END
        ) AS same_day_completion_flag,
        MAX(SAFE_CAST(f.Is_Admitted AS FLOAT64)) AS is_admitted
      FROM ${encounterMetricsTable} f
      INNER JOIN ${dateTable} d
        ON f.Start_Date_Key = d.Date_Key
      LEFT JOIN ${providerTable} p
        ON f.Provider_Id = p.Id
      WHERE ${dateCondition}
        AND (@department = 'all' OR ${departmentKeyExpression} = @department)
      GROUP BY
        encounter_id,
        report_date,
        department_key,
        department_name
    )
    SELECT
      report_date,
      department_key,
      department_name,
      COUNT(*) AS total_encounters,
      AVG(duration_minutes) AS avg_wait_minutes,
      AVG(same_day_completion_flag) AS same_day_completion_rate,
      AVG(is_admitted) AS admission_rate
    FROM encounter_base
    GROUP BY
      report_date,
      department_key,
      department_name
    ORDER BY report_date ASC, department_name ASC
  `;

  const params = {
    department,
  };

  if (!validRange.allTime) {
    params.startDate = validRange.startDate;
    params.endDate = validRange.endDate;
  }

  const [rows] = await bigQueryClient.query({ query, params });

  return {
    filters: {
      ...validRange,
      department,
    },
    source: {
      dataset: bigQuery.dataset,
      factTable: bigQuery.factEncounterMetrics,
      dateDimension: bigQuery.dimDate,
      providerDimension: bigQuery.dimProvider,
    },
    summary: mapRowsToSummary(rows),
    rows,
  };
}

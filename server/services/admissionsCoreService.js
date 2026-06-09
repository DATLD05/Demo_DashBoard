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

function validateFilters({ startDate, endDate, allTime = false }) {
  if (allTime) {
    return {
      startDate: null,
      endDate: null,
      allTime: true,
    };
  }

  const normalizedStartDate = toIsoDate(startDate);
  const normalizedEndDate = toIsoDate(endDate);

  if (!normalizedStartDate || !normalizedEndDate) {
    throw new Error('Invalid date range. Please provide startDate and endDate in YYYY-MM-DD format.');
  }

  if (normalizedStartDate > normalizedEndDate) {
    throw new Error('startDate cannot be greater than endDate.');
  }

  return {
    startDate: normalizedStartDate,
    endDate: normalizedEndDate,
    allTime: false,
  };
}

function roundToOneDecimal(value) {
  return Number((Number(value) || 0).toFixed(1));
}

function roundToTwoDecimals(value) {
  return Number((Number(value) || 0).toFixed(2));
}

function buildMetricsFromRow(row = {}) {
  const totalPatients = Number(row.total_patients || 0);
  const totalAdmissions = Number(row.total_admissions || 0);
  const totalReadmissions30d = Number(row.total_readmissions_30d || 0);
  const totalDeaths30d = Number(row.total_deaths_30d || 0);
  const totalInitialAdmissions = Number(row.total_initial_admissions || 0);
  const totalOneDayAdmissions = Number(row.total_one_day_admissions || 0);
  const totalLengthOfStayDays = Number(row.total_length_of_stay_days || 0);
  const totalClaimCost = Number(row.total_claim_cost || 0);
  const payerCoverage = Number(row.total_payer_coverage || 0);
  const outOfPocketCost = Number(row.total_out_of_pocket_cost || 0);

  return {
    totalPatients,
    totalAdmissions,
    totalReadmissions30d,
    admissionRate:
      totalPatients > 0 ? roundToOneDecimal((totalAdmissions / totalPatients) * 100) : 0,
    readmission30dRate:
      totalAdmissions > 0 ? roundToOneDecimal((totalReadmissions30d / totalAdmissions) * 100) : 0,
    death30dRate: totalPatients > 0 ? roundToOneDecimal((totalDeaths30d / totalPatients) * 100) : 0,
    initialAdmissionRate:
      totalAdmissions > 0 ? roundToOneDecimal((totalInitialAdmissions / totalAdmissions) * 100) : 0,
    oneDayAdmissionRate:
      totalAdmissions > 0 ? roundToOneDecimal((totalOneDayAdmissions / totalAdmissions) * 100) : 0,
    averageLengthOfStayDays:
      totalAdmissions > 0 ? roundToOneDecimal(totalLengthOfStayDays / totalAdmissions) : 0,
    totalClaimCost: roundToTwoDecimals(totalClaimCost),
    payerCoverage: roundToTwoDecimals(payerCoverage),
    outOfPocketCost: roundToTwoDecimals(outOfPocketCost),
  };
}

function mapRows(rows, keyField) {
  return rows.map((row) => ({
    key: row[keyField] ?? 'UNKNOWN',
    ...buildMetricsFromRow(row),
  }));
}

function buildWhereClause(filters) {
  if (filters.allTime) {
    return 'TRUE';
  }

  return 'd.Date BETWEEN @startDate AND @endDate';
}

function buildQueryParams(filters) {
  if (filters.allTime) {
    return {};
  }

  return {
    startDate: filters.startDate,
    endDate: filters.endDate,
  };
}

function buildSummary(row) {
  return buildMetricsFromRow(row);
}

const AGGREGATE_METRICS_SQL = `
  COUNT(DISTINCT f.Patient_Id) AS total_patients,
  SUM(COALESCE(CAST(f.Is_Admitted AS INT64), 0)) AS total_admissions,
  SUM(
    CASE
      WHEN COALESCE(CAST(f.Is_Admitted AS INT64), 0) = 1
       AND COALESCE(CAST(f.Is_Readmission_30D AS INT64), 0) = 1
        THEN 1
      ELSE 0
    END
  ) AS total_readmissions_30d,
  SUM(COALESCE(CAST(f.Is_Death_30D AS INT64), 0)) AS total_deaths_30d,
  SUM(
    CASE
      WHEN COALESCE(CAST(f.Is_Admitted AS INT64), 0) = 1
       AND COALESCE(CAST(f.Is_Readmission_30D AS INT64), 0) = 0
        THEN 1
      ELSE 0
    END
  ) AS total_initial_admissions,
  SUM(
    CASE
      WHEN COALESCE(CAST(f.Is_Admitted AS INT64), 0) = 1
       AND COALESCE(SAFE_CAST(f.Length_Of_Stay_Days AS FLOAT64), 0) <= 1
        THEN 1
      ELSE 0
    END
  ) AS total_one_day_admissions,
  SUM(
    CASE
      WHEN COALESCE(CAST(f.Is_Admitted AS INT64), 0) = 1
        THEN COALESCE(SAFE_CAST(f.Length_Of_Stay_Days AS FLOAT64), 0)
      ELSE 0
    END
  ) AS total_length_of_stay_days,
  SUM(COALESCE(SAFE_CAST(f.Total_Claim_Cost AS FLOAT64), 0)) AS total_claim_cost,
  SUM(COALESCE(SAFE_CAST(f.Payer_Coverage AS FLOAT64), 0)) AS total_payer_coverage,
  SUM(COALESCE(SAFE_CAST(f.Out_Of_Pocket_Cost AS FLOAT64), 0)) AS total_out_of_pocket_cost
`;

function buildFromClause(bigQuery) {
  const factTable =
    `\`${bigQuery.projectId}.${bigQuery.dataset}.${bigQuery.factEncounterMetrics}\``;
  const dateTable = `\`${bigQuery.projectId}.${bigQuery.dataset}.${bigQuery.dimDate}\``;
  const encounterTable = `\`${bigQuery.projectId}.${bigQuery.dataset}.${bigQuery.dimEncounter}\``;

  return `
    FROM ${factTable} f
    INNER JOIN ${dateTable} d
      ON f.Start_Date_Key = d.Date_Key
    LEFT JOIN ${encounterTable} e
      ON f.Encounter_Id = e.Id
  `;
}

async function queryBreakdown(bigQueryClient, fromClause, whereClause, params, dimensionField, alias) {
  const dimensionExpression = `COALESCE(NULLIF(TRIM(CAST(${dimensionField} AS STRING)), ''), 'UNKNOWN')`;
  const query = `
    SELECT
      ${dimensionExpression} AS ${alias},
      ${AGGREGATE_METRICS_SQL}
    ${fromClause}
    WHERE ${whereClause}
    GROUP BY ${alias}
    ORDER BY total_admissions DESC, total_patients DESC, ${alias} ASC
  `;

  const [rows] = await bigQueryClient.query({ query, params });
  return mapRows(rows, alias);
}

export async function queryAdmissionsCoreReport(filtersInput) {
  const filters = validateFilters(filtersInput);
  const { bigQuery } = getServerConfig();
  const bigQueryClient = getBigQueryClient();
  const fromClause = buildFromClause(bigQuery);
  const whereClause = buildWhereClause(filters);
  const params = buildQueryParams(filters);

  const summaryQuery = `
    SELECT
      ${AGGREGATE_METRICS_SQL}
    ${fromClause}
    WHERE ${whereClause}
  `;

  const monthlyQuery = `
    SELECT
      CONCAT(CAST(d.Year AS STRING), '-', LPAD(CAST(d.Month AS STRING), 2, '0')) AS month,
      ${AGGREGATE_METRICS_SQL}
    ${fromClause}
    WHERE ${whereClause}
    GROUP BY month
    ORDER BY month ASC
  `;

  const [summaryRows, monthlyRows, ageGroupRows] = await Promise.all([
    bigQueryClient.query({ query: summaryQuery, params }),
    bigQueryClient.query({ query: monthlyQuery, params }),
    queryBreakdown(bigQueryClient, fromClause, whereClause, params, 'e.Age_Group', 'age_group'),
  ]);

  return {
    filters,
    source: {
      dataset: bigQuery.dataset,
      factTable: bigQuery.factEncounterMetrics,
      dateDimension: bigQuery.dimDate,
      encounterDimension: bigQuery.dimEncounter,
    },
    summary: buildSummary(summaryRows[0]?.[0]),
    breakdowns: {
      byMonth: mapRows(monthlyRows[0], 'month'),
      byAgeGroup: ageGroupRows,
      byGender: [],
      byRace: [],
    },
  };
}

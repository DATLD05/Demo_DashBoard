import 'dotenv/config';

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getServerConfig() {
  return {
    port: process.env.PORT || 3000,
    bigQuery: {
      projectId: requireEnv('GOOGLE_CLOUD_PROJECT_ID'),
      location: process.env.GOOGLE_CLOUD_LOCATION || 'asia-southeast1',
      dataset: requireEnv('BIGQUERY_DATASET'),
      factEncounterMetrics: requireEnv('BIGQUERY_FACT_ENCOUNTER_METRICS'),
      dimDate: requireEnv('BIGQUERY_DIM_DATE'),
      dimProvider: requireEnv('BIGQUERY_DIM_PROVIDER'),
      dimEncounter: requireEnv('BIGQUERY_DIM_ENCOUNTER'),
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    },
  };
}

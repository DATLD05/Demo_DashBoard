import { BigQuery } from '@google-cloud/bigquery';
import { getServerConfig } from '../config/env.js';

let bigQueryClient;

export function getBigQueryClient() {
  if (!bigQueryClient) {
    const { bigQuery } = getServerConfig();

    bigQueryClient = new BigQuery({
      projectId: bigQuery.projectId,
      location: bigQuery.location,
    });
  }

  return bigQueryClient;
}

import { apiClient } from "./client";

export interface RunTestsResult {
  returncode: number;
  output: string;
}

export const runTests = async (): Promise<RunTestsResult> => {
  const response = await apiClient.post("/admin/run-tests");
  return response.data;
};

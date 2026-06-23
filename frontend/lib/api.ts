import { Job, ApiResponse, PaginatedResponse, Stats } from "@/types";

const API_URL =
  typeof window === 'undefined'
    ? process.env.INTERNAL_API_URL ?? 'http://backend:3001/api/v1'
    : process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const url = `${API_URL}/${cleanEndpoint}`;

  console.log('🌐 Fetching:', url);
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ API Error:', data);
      throw new Error(data.error || 'Something went wrong');
    }

    console.log('✅ API Success:', endpoint);
    return data;
  } catch (error) {
    console.error(`❌ API Error (${endpoint}):`, error);
    throw error;
  }
}

export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<ApiResponse<{ id: string; email: string; name: string }>> {
  return fetchAPI('auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
}

export async function loginUser(
  email: string,
  password: string
): Promise<ApiResponse<{ id: string; email: string; name: string }>> {
  return fetchAPI('auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getJobs(params?: {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  location?: string;
  sortBy?: string;
}): Promise<ApiResponse<PaginatedResponse<Job>>> {
  const searchParams = new URLSearchParams();

  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());
  if (params?.search && params.search.trim()) searchParams.append('search', params.search.trim());
  if (params?.type && params.type !== 'ALL') searchParams.append('type', params.type);
  if (params?.location && params.location.trim()) searchParams.append('location', params.location.trim());
  if (params?.sortBy) searchParams.append('sortBy', params.sortBy);

  const queryString = searchParams.toString();
  const endpoint = `jobs${queryString ? `?${queryString}` : ''}`;

  return fetchAPI(endpoint);
}

export async function getJobById(id: string): Promise<ApiResponse<Job>> {
  return fetchAPI(`jobs/${id}`);
}

export async function getStats(): Promise<ApiResponse<Stats>> {
  return fetchAPI('stats');
}

export async function triggerScrape(): Promise<ApiResponse<{ message: string }>> {
  return fetchAPI('admin/scrape', {
    method: 'POST',
  });
}

export async function saveJob(
  jobId: string,
  userId: string
): Promise<ApiResponse<{ message: string }>> {
  return fetchAPI('saved-jobs', {
    method: 'POST',
    body: JSON.stringify({ jobId, userId }),
  });
}

export async function getSavedJobs(
  userId: string
): Promise<ApiResponse<Job[]>> {
  return fetchAPI(`saved-jobs/${userId}`);
}

export async function unsaveJob(
  jobId: string,
  userId: string
): Promise<ApiResponse<{ message: string }>> {
  return fetchAPI(`saved-jobs/${jobId}`, {
    method: 'DELETE',
    body: JSON.stringify({ userId }),
  });
}

export async function isJobSaved(
  jobId: string,
  userId: string
): Promise<boolean> {
  try {
    const response = await fetchAPI<ApiResponse<{ saved: boolean }>>(
      `saved-jobs/check/${jobId}/${userId}`
    );
    return response.data.saved;
  } catch (error) {
    return false;
  }
}

export async function checkHealth(): Promise<{ status: string; timestamp: string }> {
  return fetchAPI('../../health');
}
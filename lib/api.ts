import { ApiResponse, ApiError } from "./types";

// API client
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = "") {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);
      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || { code: "UNKNOWN_ERROR", message: "Request failed" },
        };
      }

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "Network error",
        },
      };
    }
  }

  get<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>("GET", endpoint, undefined, options);
  }

  post<T>(
    endpoint: string,
    data: unknown,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    return this.request<T>("POST", endpoint, data, options);
  }

  put<T>(
    endpoint: string,
    data: unknown,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    return this.request<T>("PUT", endpoint, data, options);
  }

  patch<T>(
    endpoint: string,
    data: unknown,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    return this.request<T>("PATCH", endpoint, data, options);
  }

  delete<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>("DELETE", endpoint, undefined, options);
  }
}

export const api = new ApiClient();

// Response helpers
export function success<T>(data: T, message?: string): ApiResponse<T> {
  return { success: true, data, message };
}

export function error(error: ApiError): ApiResponse {
  return { success: false, error };
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const getUrl = (path: string): string => {
  const cleanBase = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
};

export function getAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("super_admin_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  return headers;
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(getUrl(path), {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `GET Request to ${path} failed`);
    }

    return res.json();
  },

  async post<T>(path: string, body?: any): Promise<T> {
    const res = await fetch(getUrl(path), {
      method: "POST",
      headers: getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `POST Request to ${path} failed`);
    }

    return res.json();
  },
};

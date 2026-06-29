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
    const token = localStorage.getItem("auth_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  return headers;
}

function clearAuthAndRedirect() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_role");
    localStorage.removeItem("tenant_name");
    window.location.href = "/login";
  }
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(getUrl(path), {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const msg = errorData.message || "";
      if (res.status === 401 || (res.status === 400 && msg.toLowerCase().includes("tenant"))) {
        clearAuthAndRedirect();
      }
      throw new Error(msg || `GET Request to ${path} failed`);
    }

    return res.json();
  },

  async post<T>(path: string, body: any): Promise<T> {
    const res = await fetch(getUrl(path), {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const msg = errorData.message || "";
      if (res.status === 401 || (res.status === 400 && msg.toLowerCase().includes("tenant"))) {
        clearAuthAndRedirect();
      }
      throw new Error(msg || `POST Request to ${path} failed`);
    }

    return res.json();
  },

  async patch<T>(path: string, body: any): Promise<T> {
    const res = await fetch(getUrl(path), {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const msg = errorData.message || "";
      if (res.status === 401 || (res.status === 400 && msg.toLowerCase().includes("tenant"))) {
        clearAuthAndRedirect();
      }
      throw new Error(msg || `PATCH Request to ${path} failed`);
    }

    return res.json();
  },

  async delete<T>(path: string): Promise<T> {
    const res = await fetch(getUrl(path), {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const msg = errorData.message || "";
      if (res.status === 401 || (res.status === 400 && msg.toLowerCase().includes("tenant"))) {
        clearAuthAndRedirect();
      }
      throw new Error(msg || `DELETE Request to ${path} failed`);
    }

    return res.json();
  },
};

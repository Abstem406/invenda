// Auth types
export interface User {
    id: string;
    email: string;
    name: string | null;
    role: "ADMIN" | "CAJERO";
    createdAt: string;
    updatedAt: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface Category {
    id: string;
    name: string;
}

export interface ExchangeRates {
    cop: number; // Factor COP to VES (deprecated conceptually but kept for fallback)
    bcv: number; // Bs per 1 USD
    copUsd: number; // COP per 1 USD Fisico (e.g. 3754)
}

export interface Prices {
    usdTarjeta: number;
    usdFisico: number;
    cop: number;
    ves: number;
    exchangeType: "usd" | "cop"; // Which one determines the base rule
    isCustomVes?: boolean;
}

export interface Product {
    id: string;
    name: string;
    status: 1 | 2; // 1 = Active, 2 = Inactive
    categoryId: string;
    stock: number;
    prices: Prices;
}

export interface SaleItem {
    productId: string;
    quantity: number;
    unitPrice: Prices;
    totalPrice: Prices;
    // Exactly what the customer paid for THIS specific item
    payments: {
        usdFisico: number;
        usdTarjeta: number;
        cop: number;
        ves: number;
    };
}

export interface Sale {
    id: string;
    date: string;
    items: SaleItem[];
    // Real totals physically received across the whole sale
    receivedTotals: {
        usdFisico: number;
        usdTarjeta: number;
        cop: number;
        ves: number;
    };
    status: "pagado" | "fiado" | "debiendo";
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

// Flag to prevent concurrent refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

// Try to refresh the access token using the refresh token cookie
async function tryRefresh(): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: "POST",
            credentials: "include",
        });
        return res.ok;
    } catch {
        return false;
    }
}

// Generic fetch handler with error throwing and auto-refresh on 401
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...options?.headers,
        },
    });

    // Auto-refresh on 401 Unauthorized (except for auth endpoints themselves)
    if (res.status === 401 && !endpoint.startsWith("/auth/")) {
        if (!isRefreshing) {
            isRefreshing = true;
            refreshPromise = tryRefresh().finally(() => {
                isRefreshing = false;
                refreshPromise = null;
            });
        }

        const refreshed = await (refreshPromise ?? tryRefresh());

        if (refreshed) {
            // Retry the original request with new token
            const retryRes = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    ...options?.headers,
                },
            });

            if (!retryRes.ok) {
                throw new Error(`API Error: ${retryRes.status} ${retryRes.statusText}`);
            }

            if (retryRes.status === 204) {
                return undefined as T;
            }

            return retryRes.json();
        }

        // Refresh failed — redirect to login
        if (typeof window !== "undefined") {
            window.location.href = "/login";
        }
        throw new Error("Session expired");
    }

    if (!res.ok) {
        throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }

    // Handle 204 No Content for DELETE
    if (res.status === 204) {
        return undefined as T;
    }

    return res.json();
}

// Pagination types
export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: PaginationMeta;
}

export interface QueryParams {
    page?: number;
    limit?: number;
    search?: string;
}

const buildQueryString = (params?: QueryParams) => {
    if (!params) return "";
    const query = new URLSearchParams();
    if (params.page !== undefined) query.append("page", params.page.toString());
    if (params.limit !== undefined) query.append("limit", params.limit.toString());
    if (params.search !== undefined) query.append("search", params.search);
    const queryString = query.toString();
    return queryString ? `?${queryString}` : "";
};

export const api = {
    // Auth
    auth: {
        login: async (credentials: LoginCredentials): Promise<User> => {
            const data = await fetchApi<{ message: string; user: User }>("/auth/login", {
                method: "POST",
                body: JSON.stringify(credentials),
            });
            return data.user;
        },
        logout: async (): Promise<void> => {
            return fetchApi<void>("/auth/logout", {
                method: "POST",
            });
        },
        refresh: async (): Promise<void> => {
            return fetchApi<void>("/auth/refresh", {
                method: "POST",
            });
        },
        me: async (): Promise<User> => {
            // El endpoint me podría devolver { user: ... } o solo el User.
            // Asumiendo que es consistente con login y por la prueba del usuario, devolvemos el objeto User.
            // Ajustar si el endpoint también envuelve la respuesta.
            return fetchApi<User>("/auth/me");
        },
    },

    // Users
    getUsers: async (params?: QueryParams): Promise<PaginatedResponse<User>> => {
        return fetchApi<PaginatedResponse<User>>(`/users${buildQueryString(params)}`);
    },
    createUser: async (user: Omit<User, "id" | "createdAt" | "updatedAt"> & { password?: string }): Promise<User> => {
        return fetchApi<User>("/users", {
            method: "POST",
            body: JSON.stringify(user),
        });
    },

    // Categories
    getCategories: async (params?: QueryParams): Promise<PaginatedResponse<Category>> => {
        return fetchApi<PaginatedResponse<Category>>(`/categories${buildQueryString(params)}`);
    },
    createCategory: async (category: Omit<Category, "id">): Promise<Category> => {
        return fetchApi<Category>("/categories", {
            method: "POST",
            body: JSON.stringify(category),
        });
    },
    updateCategory: async (id: string, name: string): Promise<Category> => {
        return fetchApi<Category>(`/categories/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ name }),
        });
    },
    deleteCategory: async (id: string): Promise<void> => {
        return fetchApi<void>(`/categories/${id}`, {
            method: "DELETE",
        });
    },

    // Products
    getProducts: async (params?: QueryParams): Promise<PaginatedResponse<Product>> => {
        return fetchApi<PaginatedResponse<Product>>(`/products${buildQueryString(params)}`);
    },
    createProduct: async (product: Omit<Product, "id">): Promise<Product> => {
        return fetchApi<Product>("/products", {
            method: "POST",
            body: JSON.stringify(product),
        });
    },
    updateProduct: async (id: string, updates: Partial<Product>): Promise<Product> => {
        return fetchApi<Product>(`/products/${id}`, {
            method: "PATCH",
            body: JSON.stringify(updates),
        });
    },
    deleteProduct: async (id: string): Promise<void> => {
        return fetchApi<void>(`/products/${id}`, {
            method: "DELETE",
        });
    },

    // Update prices only
    updatePrices: async (id: string, prices: Prices): Promise<Product> => {
        return fetchApi<Product>(`/products/${id}/prices`, {
            method: "PATCH",
            body: JSON.stringify(prices),
        });
    },

    // Exchange Rates
    getExchangeRates: async (): Promise<ExchangeRates> => {
        return fetchApi<ExchangeRates>("/exchange-rates");
    },
    updateExchangeRates: async (rates: ExchangeRates): Promise<ExchangeRates> => {
        return fetchApi<ExchangeRates>("/exchange-rates", {
            method: "PUT",
            body: JSON.stringify(rates),
        });
    },

    // Sales
    getSales: async (params?: QueryParams): Promise<PaginatedResponse<Sale>> => {
        return fetchApi<PaginatedResponse<Sale>>(`/sales${buildQueryString(params)}`);
    },
    createSale: async (sale: Omit<Sale, "id" | "date">): Promise<Sale> => {
        return fetchApi<Sale>("/sales", {
            method: "POST",
            body: JSON.stringify(sale),
        });
    },
};

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
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

export interface ExchangeRates {
    cop: number; // Factor COP to VES (deprecated conceptually but kept for fallback)
    bcv: number; // Bs per 1 USD
    copUsd: number; // COP per 1 USD Fisico (e.g. 3754)
}

export interface Prices {
    id: string;
    usdTarjeta: number;
    usdFisico: number;
    cop: number;
    ves: number;
    exchangeType: "usd" | "cop"; // Which one determines the base rule
    isCustomUsdTarjeta?: boolean;
    isCustomUsdFisico?: boolean;
    isCustomCop?: boolean;
    isCustomVes?: boolean;
    productId: string;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

export interface Product {
    id: string;
    name: string;
    status: 1 | 2; // 1 = Active, 2 = Inactive
    categoryId: string;
    category?: { id: string; name: string };
    stock: number;
    price: Prices;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

// Snapshot of price data embedded in sale records (no id/productId)
export type PriceSnapshot = Omit<Prices, "id" | "productId">;

export interface SaleItem {
    productId: string;
    quantity: number;
    unitPrice: PriceSnapshot;
    totalPrice: PriceSnapshot;
    // Exactly what the customer paid for THIS specific item
    payments: {
        usdFisico: number;
        usdTarjeta: number;
        cop: number;
        ves: number;
    };
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

export interface Sale {
    id: string;
    customerName?: string | null;
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
    userId: string;
    user?: { id: string; name: string | null; email: string };
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://Abstem-PC.local:3000/api";

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

        // Refresh failed — clear cookies via logout endpoint and redirect
        if (typeof window !== "undefined") {
            try {
                // Esto fallará en el navegador por SameSite si son dominios distintos, 
                // pero enviamos la señal al backend igualmente.
                await fetch(`${API_BASE_URL}/auth/logout`, { method: "POST", credentials: "include" });
            } catch (e) {
                // Ignore logout errors during expiration
            }
            if (window.location.pathname !== "/login") {
                // Agregamos un parametro para que el middleware de NextJS borre las cookies localmente
                window.location.href = "/login?session_expired=true";
            }
        }
        throw new Error("Session expired");
    }

    if (!res.ok) {
        let errorMessage = `Error de API: ${res.status} ${res.statusText}`;
        try {
            const errorData = await res.json();
            if (errorData.message) {
                // NestJS might return an array of error messages for validation
                const messages = Array.isArray(errorData.message)
                    ? errorData.message
                    : [errorData.message];

                // Map common English class-validator messages to Spanish
                const translatedMessages = messages.map((msg: string) => {
                    if (msg.includes("password must be longer than or equal to 6 characters")) return "La contraseña debe tener al menos 6 caracteres";
                    if (msg.includes("email must be an email")) return "El correo electrónico no es válido";
                    if (msg.includes("should not be empty")) return "Este campo no puede estar vacío";
                    if (msg.includes("must be a string")) return "Debe ser un texto válido";
                    if (msg.includes("must be a number")) return "Debe ser un número válido";
                    if (msg.includes("must be a positive number")) return "Debe ser un número positivo";
                    return msg; // Fallback to original if unknown
                });

                errorMessage = translatedMessages.join(', ');
            }
        } catch {
            // If body is not JSON or empty, keep the default error message
        }
        throw new Error(errorMessage);
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
    hasPrice?: boolean | string;
    dateFrom?: string;
    dateTo?: string;
    userId?: string;
    status?: string;
}

const buildQueryString = (params?: QueryParams) => {
    if (!params) return "";
    const query = new URLSearchParams();
    if (params.page !== undefined) query.append("page", params.page.toString());
    if (params.limit !== undefined) query.append("limit", params.limit.toString());
    if (params.search !== undefined) query.append("search", params.search);
    if (params.hasPrice !== undefined) query.append("hasPrice", params.hasPrice.toString());
    if (params.dateFrom !== undefined) query.append("dateFrom", params.dateFrom);
    if (params.dateTo !== undefined) query.append("dateTo", params.dateTo);
    if (params.userId !== undefined) query.append("userId", params.userId);
    if (params.status !== undefined) query.append("status", params.status);
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
            const data = await fetchApi<any>("/auth/me");
            return data.user ? data.user : data;
        },
    },

    // Users
    getUsers: async (): Promise<User[]> => {
        return fetchApi<User[]>("/users");
    },
    createUser: async (user: Omit<User, "id" | "createdAt" | "updatedAt"> & { password?: string }): Promise<User> => {
        return fetchApi<User>("/users", {
            method: "POST",
            body: JSON.stringify(user),
        });
    },
    updateUser: async (id: string, updates: Partial<Omit<User, "id" | "createdAt" | "updatedAt">> & { password?: string }): Promise<User> => {
        return fetchApi<User>(`/users/${id}`, {
            method: "PATCH",
            body: JSON.stringify(updates),
        });
    },
    deleteUser: async (id: string): Promise<void> => {
        return fetchApi<void>(`/users/${id}`, {
            method: "DELETE",
        });
    },
    changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
        return fetchApi<void>("/users/change-password", {
            method: "POST",
            body: JSON.stringify({ currentPassword, newPassword }),
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
    createProduct: async (product: Omit<Product, "id" | "price">): Promise<Product> => {
        return fetchApi<Product>("/products", {
            method: "POST",
            body: JSON.stringify(product),
        });
    },
    updateProduct: async (id: string, updates: Partial<Omit<Product, "price">>): Promise<Product> => {
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

    // Product Prices
    getProductPrices: async (params?: QueryParams): Promise<PaginatedResponse<any>> => {
        return fetchApi<PaginatedResponse<any>>(`/product-prices${buildQueryString(params)}`);
    },
    createProductPrice: async (price: Omit<Prices, "id">): Promise<Prices> => {
        return fetchApi<Prices>("/product-prices", {
            method: "POST",
            body: JSON.stringify(price),
        });
    },
    updateProductPrice: async (productId: string, prices: Partial<Omit<Prices, "id" | "productId">>): Promise<Prices> => {
        return fetchApi<Prices>(`/product-prices/${productId}`, {
            method: "PATCH",
            body: JSON.stringify(prices),
        });
    },
    deleteProductPrice: async (productId: string): Promise<void> => {
        return fetchApi<void>(`/product-prices/${productId}`, {
            method: "DELETE",
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
    getProductsSummary: async (params?: QueryParams): Promise<PaginatedResponse<{ productId: string, name: string, totalSold: number, totalUsdFisico: number, totalUsdTarjeta: number, totalCop: number, totalVes: number }>> => {
        return fetchApi<PaginatedResponse<{ productId: string, name: string, totalSold: number, totalUsdFisico: number, totalUsdTarjeta: number, totalCop: number, totalVes: number }>>(`/sales/products-summary${buildQueryString(params)}`);
    },
    createSale: async (sale: Omit<Sale, "id" | "date" | "userId" | "user">): Promise<Sale> => {
        return fetchApi<Sale>("/sales", {
            method: "POST",
            body: JSON.stringify(sale),
        });
    },
    paySale: async (id: string, data: { payment: { usdFisico: number, usdTarjeta: number, cop: number, ves: number }, isFullyPaid?: boolean }): Promise<Sale> => {
        return fetchApi<Sale>(`/sales/${id}/pay`, {
            method: "PATCH",
            body: JSON.stringify(data),
        });
    },
};

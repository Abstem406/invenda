import categoriesData from "../data/categories.json";
import productsData from "../data/products.json";

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

// In-memory data store for the lifetime of the session.
// In Next.js dev server, this state drops on reload if not persistent,
// which is fine for UI mock purposes.
let _categories = [...categoriesData] as Category[];
let _products = [...productsData] as Product[];
let _sales: Sale[] = []; // Empty initially

// Default global exchange rates for the simulation
// Persist to localStorage so values survive page reloads
const RATES_STORAGE_KEY = "invenda_exchange_rates";

const loadRatesFromStorage = (): ExchangeRates => {
    if (typeof window !== "undefined") {
        try {
            const stored = localStorage.getItem(RATES_STORAGE_KEY);
            if (stored) return JSON.parse(stored) as ExchangeRates;
        } catch { /* ignore parse errors, fall back to defaults */ }
    }
    return { cop: 5, bcv: 435, copUsd: 3754 };
};

const saveRatesToStorage = (rates: ExchangeRates) => {
    if (typeof window !== "undefined") {
        localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(rates));
    }
};

let _exchangeRates: ExchangeRates = loadRatesFromStorage();

// Helper for simulated delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
    // Categories
    getCategories: async (): Promise<Category[]> => {
        await delay(300);
        return [..._categories];
    },
    createCategory: async (category: Omit<Category, "id">): Promise<Category> => {
        await delay(500);
        const newCategory = { ...category, id: `cat-${Date.now()}` };
        _categories.push(newCategory);
        return newCategory;
    },
    updateCategory: async (id: string, name: string): Promise<Category> => {
        await delay(500);
        const index = _categories.findIndex(c => c.id === id);
        if (index === -1) throw new Error("Category not found");
        _categories[index] = { ..._categories[index], name };
        return _categories[index];
    },
    deleteCategory: async (id: string): Promise<void> => {
        await delay(500);
        _categories = _categories.filter(c => c.id !== id);
        // Also remove or update products with this category if needed
        // Assuming for now it just cascades to empty
    },

    // Products
    getProducts: async (): Promise<Product[]> => {
        await delay(300);
        return [..._products];
    },
    createProduct: async (product: Omit<Product, "id">): Promise<Product> => {
        await delay(500);
        const newProduct = { ...product, id: `prod-${Date.now()}` };
        _products.push(newProduct);
        return newProduct;
    },
    updateProduct: async (id: string, updates: Partial<Product>): Promise<Product> => {
        await delay(500);
        const index = _products.findIndex(p => p.id === id);
        if (index === -1) throw new Error("Product not found");
        _products[index] = { ..._products[index], ...updates };
        return _products[index];
    },
    deleteProduct: async (id: string): Promise<void> => {
        await delay(500);
        _products = _products.filter(p => p.id !== id);
    },

    // Update prices only
    updatePrices: async (id: string, prices: Prices): Promise<Product> => {
        await delay(300);
        const index = _products.findIndex(p => p.id === id);
        if (index === -1) throw new Error("Product not found");
        _products[index] = { ..._products[index], prices: { ...prices } };
        return _products[index];
    },

    // Exchange Rates
    getExchangeRates: async (): Promise<ExchangeRates> => {
        await delay(200);
        return { ..._exchangeRates };
    },
    updateExchangeRates: async (rates: ExchangeRates): Promise<ExchangeRates> => {
        await delay(300);
        _exchangeRates = { ...rates };
        saveRatesToStorage(_exchangeRates);
        return { ..._exchangeRates };
    },

    // Sales
    getSales: async (): Promise<Sale[]> => {
        await delay(300);
        return [..._sales];
    },
    createSale: async (sale: Omit<Sale, "id" | "date">): Promise<Sale> => {
        await delay(500);
        const newSale: Sale = {
            ...sale,
            id: `sale-${Date.now()}`,
            date: new Date().toISOString()
        };
        _sales.push(newSale);

        // Deduct stock from products
        for (const item of newSale.items) {
            const pIdx = _products.findIndex(p => p.id === item.productId);
            if (pIdx > -1) {
                _products[pIdx].stock = Math.max(0, _products[pIdx].stock - item.quantity);
            }
        }

        return newSale;
    }
};

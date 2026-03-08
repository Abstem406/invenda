import categoriesData from "../data/categories.json";
import productsData from "../data/products.json";

export interface Category {
    id: string;
    name: string;
}

export interface ExchangeRates {
    cop: number; // e.g. 1 COP = X USD or how many COP in 1 USD depending on standard. As per user: "6500 / 5 = 1300 Bs" -> rate = 5
    bcv: number; // e.g. 435
}

export interface Prices {
    usd: number;
    cop: number;
    ves: number;
    exchangeType: "usd" | "cop"; // 1 for USD, 2 for COP
}

export interface Product {
    id: string;
    name: string;
    status: 1 | 2; // 1 = Active, 2 = Inactive
    categoryId: string;
    stock: number;
    prices: Prices;
}

// In-memory data store for the lifetime of the session.
// In Next.js dev server, this state drops on reload if not persistent,
// which is fine for UI mock purposes.
let _categories = [...categoriesData] as Category[];
let _products = [...productsData] as Product[];

// Default global exchange rates for the simulation
let _exchangeRates: ExchangeRates = {
    cop: 5,   // 6500 / 5 = 1300
    bcv: 435, // 3.4 * 435 = 14790
};

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
        return { ..._exchangeRates };
    }
};

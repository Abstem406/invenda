"use client"

import { CategoriesTable } from "@/components/inventory/categories-table";
import { ProductsTable } from "@/components/inventory/products-table";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Layers } from "lucide-react";

export default function InventoryPage() {
    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inventario de Productos</h1>
                    <p className="text-muted-foreground">
                        Gestiona tus productos de confitería y bebidas.
                    </p>
                </div>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline">
                            <Layers className="w-4 h-4 mr-2" />
                            Categorías de productos
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                        <DialogHeader className="mb-4">
                            <DialogTitle>Gestión de Categorías</DialogTitle>
                            <DialogDescription>
                                Administra las categorías de tus productos para mantener todo organizado.
                            </DialogDescription>
                        </DialogHeader>
                        <CategoriesTable />
                    </DialogContent>
                </Dialog>
            </div>

            <div className="w-full">
                <ProductsTable />
            </div>      </div>
    );
}

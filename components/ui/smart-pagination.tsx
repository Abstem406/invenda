"use client"

import * as React from "react"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface SmartPaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    maxVisiblePages?: number;
}

export function SmartPagination({
    currentPage,
    totalPages,
    onPageChange,
    maxVisiblePages = 10,
}: SmartPaginationProps) {
    const [jumpPage, setJumpPage] = React.useState("")

    const getVisiblePages = () => {
        if (totalPages <= maxVisiblePages) {
            return Array.from({ length: totalPages }, (_, i) => i + 1)
        }

        const half = Math.floor(maxVisiblePages / 2)
        let start = currentPage - half
        let end = currentPage + (maxVisiblePages - half - 1)

        if (start < 1) {
            start = 1
            end = maxVisiblePages
        }

        if (end > totalPages) {
            end = totalPages
            start = totalPages - maxVisiblePages + 1
        }

        return Array.from({ length: end - start + 1 }, (_, i) => start + i)
    }

    const pages = getVisiblePages()

    const handleJump = (e: React.FormEvent) => {
        e.preventDefault()
        const pageNum = parseInt(jumpPage, 10)
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
            onPageChange(pageNum)
            setJumpPage("")
        }
    }

    if (totalPages <= 0) return null;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4">
            <Pagination className="w-auto mx-auto sm:mx-0">
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious
                            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                    </PaginationItem>

                    {pages.map((p) => (
                        <PaginationItem key={p} className="hidden sm:inline-block">
                            <Button
                                variant={currentPage === p ? "outline" : "ghost"}
                                size="icon"
                                onClick={() => onPageChange(p)}
                                className="w-9 h-9"
                            >
                                {p}
                            </Button>
                        </PaginationItem>
                    ))}

                    <PaginationItem className="sm:hidden">
                        <span className="text-sm text-muted-foreground px-4">
                            Página {currentPage} de {totalPages}
                        </span>
                    </PaginationItem>

                    <PaginationItem>
                        <PaginationNext
                            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>

            {totalPages > 1 && (
                <form onSubmit={handleJump} className="flex items-center gap-2 self-center sm:self-auto ml-auto mr-auto sm:mr-0">
                    <span className="text-sm text-muted-foreground whitespace-nowrap hidden sm:inline">Ir a la pág:</span>
                    <Input
                        value={jumpPage}
                        onChange={(e) => setJumpPage(e.target.value)}
                        className="w-[100px] h-9 text-center"
                        placeholder="Ej: 5"
                        type="number"
                        min={1}
                        max={totalPages}
                    />
                    <Button type="submit" variant="secondary" size="sm" className="h-9">
                        Ir
                    </Button>
                </form>
            )}
        </div>
    )
}

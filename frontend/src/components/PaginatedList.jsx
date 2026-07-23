import { useState, useMemo } from "react";

export default function PaginatedList({ 
  items, 
  searchFields = [], 
  renderItem, 
  renderWrapper, 
  emptyState, 
  itemsPerPage = 4 
}) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    if (!search.trim()) return items;
    
    const q = search.toLowerCase();
    return items.filter(item => {
      return searchFields.some(field => {
        const val = typeof field === "function" ? field(item) : item[field];
        return val != null && val.toString().toLowerCase().includes(q);
      });
    });
  }, [items, search, searchFields]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  
  const validPage = Math.max(1, Math.min(currentPage, totalPages));
  if (validPage !== currentPage && totalPages > 0) {
      setCurrentPage(validPage);
  }

  const paginatedItems = filteredItems.slice((validPage - 1) * itemsPerPage, validPage * itemsPerPage);

  if (!items) return null;

  if (items.length === 0) {
    return emptyState || <div className="text-sm text-inkfaint">No items found.</div>;
  }

  const listContent = renderWrapper 
    ? renderWrapper(paginatedItems.map((item, i) => renderItem(item, i)))
    : <div className="space-y-4">{paginatedItems.map((item, i) => renderItem(item, i))}</div>;

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between">
        <input 
          type="text" 
          placeholder="Search..." 
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full max-w-sm rounded border border-ink/20 bg-white px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
        />
        <div className="text-sm text-inkfaint ml-4 shrink-0">
          {filteredItems.length} result{filteredItems.length !== 1 && "s"}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-sm text-inkfaint py-8 text-center bg-white rounded border border-ink/10">No results match your search.</div>
      ) : (
        listContent
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <button 
            disabled={validPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="rounded px-3 py-1.5 text-sm font-medium text-ink hover:bg-paperdim disabled:opacity-50"
          >
            Previous
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }).map((_, idx) => {
              const page = idx + 1;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`h-8 w-8 rounded text-sm font-medium ${
                    validPage === page ? "bg-ink text-white" : "text-ink hover:bg-paperdim"
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>
          <button 
            disabled={validPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
            className="rounded px-3 py-1.5 text-sm font-medium text-ink hover:bg-paperdim disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

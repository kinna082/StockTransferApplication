import { useEffect, useState } from "react";
import { createProduct, deleteProduct, getProductsPaged, updateProduct } from "../../services/api";

const PRODUCT_PAGE_SIZE_KEY = "adminProductsPageSize";
const ALLOWED_PAGE_SIZES = [10, 25, 50];

function getInitialPageSize() {
  const storedValue = Number(localStorage.getItem(PRODUCT_PAGE_SIZE_KEY));
  if (ALLOWED_PAGE_SIZES.includes(storedValue)) {
    return storedValue;
  }
  return 10;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(getInitialPageSize);
  const [totalCount, setTotalCount] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("productName");
  const [sortDirection, setSortDirection] = useState("asc");
  const [newProduct, setNewProduct] = useState({ productCode: "", productName: "" });
  const [editingProductId, setEditingProductId] = useState(null);
  const [editingProduct, setEditingProduct] = useState({ productCode: "", productName: "" });

  const load = async () => {
    try {
      const productData = await getProductsPaged({
        page,
        pageSize,
        search: searchTerm,
        sortBy,
        sortDirection
      });
      setProducts(productData.items || []);
      setTotalCount(productData.totalCount || 0);
    } catch {
      setMessage("Failed to load products.");
    }
  };

  useEffect(() => {
    load();
  }, [page, pageSize, searchTerm, sortBy, sortDirection]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearchTerm(searchInput.trim());
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    localStorage.setItem(PRODUCT_PAGE_SIZE_KEY, String(pageSize));
  }, [pageSize]);

  const handleCreateProduct = async () => {
    setMessage("");
    if (!newProduct.productCode || !newProduct.productName) {
      setMessage("Please fill product code and product name.");
      return;
    }
    try {
      await createProduct(newProduct);
      setMessage("Product created successfully.");
      setNewProduct({ productCode: "", productName: "" });
      setPage(1);
      await load();
    } catch (error) {
      setMessage(error.message || "Failed to create product.");
    }
  };

  const startEditProduct = (product) => {
    setEditingProductId(product.id);
    setEditingProduct({ productCode: product.productCode, productName: product.productName });
  };

  const cancelEditProduct = () => {
    setEditingProductId(null);
    setEditingProduct({ productCode: "", productName: "" });
  };

  const handleSaveProduct = async (productId) => {
    setMessage("");
    if (!editingProduct.productCode || !editingProduct.productName) {
      setMessage("Please fill product code and product name.");
      return;
    }
    try {
      await updateProduct(productId, editingProduct);
      setMessage("Product updated successfully.");
      cancelEditProduct();
      await load();
    } catch (error) {
      setMessage(error.message || "Failed to update product.");
    }
  };

  const handleDeleteProduct = async (productId) => {
    setMessage("");
    try {
      await deleteProduct(productId);
      setMessage("Product deleted successfully.");
      await load();
    } catch (error) {
      setMessage(error.message || "Failed to delete product.");
    }
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(column);
    setSortDirection("asc");
    setPage(1);
  };

  const sortIndicator = (column) => {
    if (sortBy !== column) return "";
    return sortDirection === "asc" ? " ↑" : " ↓";
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <section>
      <h2>Product Management</h2>
      <p>Create, update, and remove products from the master list.</p>

      <h3>Create Product</h3>
      <div className="grid-form">
        <label>
          Product Code
          <input value={newProduct.productCode} onChange={(e) => setNewProduct((p) => ({ ...p, productCode: e.target.value }))} />
        </label>
        <label>
          Product Name
          <input value={newProduct.productName} onChange={(e) => setNewProduct((p) => ({ ...p, productName: e.target.value }))} />
        </label>
        <button type="button" onClick={handleCreateProduct}>
          Create Product
        </button>
      </div>

      <h3>Products</h3>
      <div className="actions">
        <label>
          Search
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by code or name"
          />
        </label>
        <label>
          Page Size
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </label>
      </div>
      <div className="table-responsive">
      <table>
        <thead>
          <tr>
            <th>
              <button type="button" onClick={() => handleSort("productCode")}>
                Product Code{sortIndicator("productCode")}
              </button>
            </th>
            <th>
              <button type="button" onClick={() => handleSort("productName")}>
                Product Name{sortIndicator("productName")}
              </button>
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>
                {editingProductId === p.id ? (
                  <input
                    value={editingProduct.productCode}
                    onChange={(e) => setEditingProduct((prev) => ({ ...prev, productCode: e.target.value }))}
                  />
                ) : (
                  p.productCode
                )}
              </td>
              <td>
                {editingProductId === p.id ? (
                  <input
                    value={editingProduct.productName}
                    onChange={(e) => setEditingProduct((prev) => ({ ...prev, productName: e.target.value }))}
                  />
                ) : (
                  p.productName
                )}
              </td>
              <td>
                <div className="actions">
                  {editingProductId === p.id ? (
                    <>
                      <button type="button" onClick={() => handleSaveProduct(p.id)}>
                        Save
                      </button>
                      <button type="button" onClick={cancelEditProduct}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => startEditProduct(p)}>
                      Edit
                    </button>
                  )}
                  <button type="button" onClick={() => handleDeleteProduct(p.id)}>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {products.length === 0 && (
            <tr>
              <td colSpan="3">No products found.</td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
      <div className="pagination-bar">
        <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
          Next
        </button>
      </div>
      {message && <p className="message">{message}</p>}
    </section>
  );
}

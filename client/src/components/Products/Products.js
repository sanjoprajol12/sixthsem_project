import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import BarcodeScanner from './BarcodeScanner';
import BarcodeGenerator from './BarcodeGenerator';
import './Products.css';

const Products = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showFormScanner, setShowFormScanner] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [deleteForm, setDeleteForm] = useState({ quantity: 1, remark: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ category: '', supplier: '', minStock: '', maxStock: '' });
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: '',
    quantity: 0,
    reorder_level: 10,
    price: 0,
    cost: 0,
    supplier_id: '',
    barcode: ''
  });

  useEffect(() => {
    fetchProducts();
    fetchSuppliers();
    fetchCategories();
  }, [filters, searchTerm]);

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filters.category) params.append('category', filters.category);
      if (filters.supplier) params.append('supplier', filters.supplier);
      if (filters.minStock) params.append('minStock', filters.minStock);
      if (filters.maxStock) params.append('maxStock', filters.maxStock);

      const res = await axios.get(`/api/products?${params}`);
      setProducts(res.data);
      setLoading(false);
    } catch (error) {
      toast.error('Error loading products');
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await axios.get('/api/suppliers');
      setSuppliers(res.data);
    } catch (error) {
      // Handle error
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/categories');
      setCategoriesList(res.data);
    } catch (error) {
      // ignore
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await axios.put(`/api/products/${editingProduct.id}`, formData);
        toast.success('Product updated successfully');
      } else {
        await axios.post('/api/products', formData);
        toast.success('Product created successfully');
      }
      setShowModal(false);
      setEditingProduct(null);
      resetForm();
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error saving product');
    }
  };

  const openDeleteModal = (product) => {
    setDeletingProduct(product);
    setDeleteForm({ quantity: 1, remark: '' });
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletingProduct(null);
    setDeleteForm({ quantity: 1, remark: '' });
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    const qty = parseInt(deleteForm.quantity);
    if (!Number.isFinite(qty) || qty < 1) {
      toast.error('Please enter a valid quantity (>= 1)');
      return;
    }
    if (qty > deletingProduct.quantity) {
      toast.error(`Quantity cannot exceed available stock (${deletingProduct.quantity})`);
      return;
    }
    if (!deleteForm.remark || !deleteForm.remark.trim()) {
      toast.error('Remark is required');
      return;
    }
    try {
      await axios.post(`/api/products/${deletingProduct.id}/damage`, {
        quantity: qty,
        remark: deleteForm.remark
      });
      toast.success('Product moved to damage successfully');
      closeDeleteModal();
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error moving product to damage');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      category: product.category || '',
      quantity: product.quantity,
      reorder_level: product.reorder_level,
      price: product.price,
      cost: product.cost,
      supplier_id: product.supplier_id || '',
      barcode: product.barcode || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      sku: '',
      name: '',
      description: '',
      category: '',
      quantity: 0,
      reorder_level: 10,
      price: 0,
      cost: 0,
      supplier_id: '',
      barcode: ''
    });
    setEditingProduct(null);
  };

  const handleBarcodeScanned = async (barcode) => {
    try {
      const res = await axios.get(`/api/products/barcode/${barcode}`);
      toast.success(`Product found: ${res.data.name}`);
      handleEdit(res.data);
    } catch (error) {
      toast.error('Product not found with this barcode');
    }
    setShowScanner(false);
  };

  const handleFormBarcodeScanned = (barcode) => {
    setFormData((prev) => ({
      ...prev,
      barcode
    }));
    setShowFormScanner(false);
    toast.success('Barcode captured for product');
  };

  const categories = categoriesList.length
    ? categoriesList.map((c) => c.name)
    : [...new Set(products.map((p) => p.category).filter(Boolean))];

  return (
    <div className="products">
      <div className="page-header">
        <h1>Products</h1>
        {user?.role === 'admin' && (
          <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            Add Product
          </button>
        )}
      </div>

      <div className="filters-section">
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          value={filters.supplier}
          onChange={(e) => setFilters({ ...filters, supplier: e.target.value })}
        >
          <option value="">All Suppliers</option>
          {suppliers.map(sup => (
            <option key={sup.id} value={sup.id}>{sup.name}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Min Stock"
          value={filters.minStock}
          onChange={(e) => setFilters({ ...filters, minStock: e.target.value })}
        />
        <input
          type="number"
          placeholder="Max Stock"
          value={filters.maxStock}
          onChange={(e) => setFilters({ ...filters, maxStock: e.target.value })}
        />
        <button className="btn-secondary" onClick={() => setShowScanner(true)}>
          Scan Barcode
        </button>
      </div>

      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScanned}
          onClose={() => setShowScanner(false)}
        />
      )}
      {showFormScanner && (
        <BarcodeScanner
          onScan={handleFormBarcodeScanned}
          onClose={() => setShowFormScanner(false)}
        />
      )}

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Category</th>
              <th>Quantity</th>
              <th>Reorder Level</th>
              <th>Price</th>
              <th>Supplier</th>
              {user?.role === 'admin' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.id} className={product.quantity <= product.reorder_level ? 'low-stock' : ''}>
                <td>{product.sku}</td>
                <td>{product.name}</td>
                <td>{product.category || 'N/A'}</td>
                <td>{product.quantity}</td>
                <td>{product.reorder_level}</td>
                <td>Rs. {product.price.toFixed(2)}</td>
                <td>{product.supplier_name || 'N/A'}</td>
                {user?.role === 'admin' && (
                  <td>
                    <button className="btn-edit" onClick={() => handleEdit(product)}>Edit</button>
                    <button className="btn-delete" onClick={() => openDeleteModal(product)}>Delete</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showDeleteModal && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Delete to Damage</h2>
            <div style={{ marginBottom: '12px', color: '#555' }}>
              {deletingProduct?.name} (Available: {deletingProduct?.quantity ?? 0})
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              <div className="form-group">
                <label>Quantity to delete *</label>
                <input
                  type="number"
                  min="1"
                  max={deletingProduct?.quantity ?? 1}
                  value={deleteForm.quantity}
                  onChange={(e) => setDeleteForm((p) => ({ ...p, quantity: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Remark</label>
                <textarea
                  value={deleteForm.remark}
                  onChange={(e) => setDeleteForm((p) => ({ ...p, remark: e.target.value }))}
                  placeholder="Reason for damage / deletion"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-delete">Confirm</button>
                <button type="button" className="btn-secondary" onClick={closeDeleteModal}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>SKU *</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    required
                    disabled={!!editingProduct}
                  />
                </div>
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Barcode</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ marginTop: '8px' }}
                    onClick={() => setShowFormScanner(true)}
                  >
                    Scan from device
                  </button>
                  <BarcodeGenerator
                    value={formData.barcode}
                    onChange={(code) => setFormData({ ...formData, barcode: code })}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Quantity *</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                    required
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Reorder Level *</label>
                  <input
                    type="number"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData({ ...formData, reorder_level: parseInt(e.target.value) })}
                    required
                    min="0"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    required
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Cost *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
                    required
                    min="0"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Supplier</label>
                <select
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(sup => (
                    <option key={sup.id} value={sup.id}>{sup.name}</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">Save</button>
                <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;


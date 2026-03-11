import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './Categories.css';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ id: null, name: '', description: '' });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/categories');
      setCategories(res.data);
      setLoading(false);
    } catch (error) {
      toast.error('Error loading categories');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await axios.put(`/api/categories/${formData.id}`, {
          name: formData.name,
          description: formData.description
        });
        toast.success('Category updated');
      } else {
        await axios.post('/api/categories', {
          name: formData.name,
          description: formData.description
        });
        toast.success('Category created');
      }
      setFormData({ id: null, name: '', description: '' });
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error saving category');
    }
  };

  const handleEdit = (cat) => {
    setFormData({ id: cat.id, name: cat.name, description: cat.description || '' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await axios.delete(`/api/categories/${id}`);
      toast.success('Category deleted');
      fetchCategories();
    } catch (error) {
      toast.error('Error deleting category');
    }
  };

  return (
    <div className="categories">
      <div className="page-header">
        <h1>Categories</h1>
      </div>

      <div className="categories-layout">
        <form className="category-form" onSubmit={handleSubmit}>
          <h3>{formData.id ? 'Edit Category' : 'Add Category'}</h3>
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="modal-actions">
            <button type="submit" className="btn-primary">
              {formData.id ? 'Update' : 'Save'}
            </button>
            {formData.id && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setFormData({ id: null, name: '', description: '' })}
              >
                Clear
              </button>
            )}
          </div>
        </form>

        <div className="category-list">
          <h3>Existing Categories</h3>
          {loading ? (
            <div className="loading">Loading...</div>
          ) : categories.length === 0 ? (
            <p>No categories yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id}>
                    <td>{cat.name}</td>
                    <td>{cat.description || '-'}</td>
                    <td>
                      <button className="btn-edit" onClick={() => handleEdit(cat)}>
                        Edit
                      </button>
                      <button className="btn-delete" onClick={() => handleDelete(cat.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Categories;


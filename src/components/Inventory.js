import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { FaPills, FaTools, FaBox } from 'react-icons/fa';
import { db } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

const socket = io('http://localhost:5000');

function Inventory() {
  const [hospitalId] = useState('H001'); // Hardcoded for now; can be dynamic
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [newQuantity, setNewQuantity] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    quantity: '',
    unit: '',
    category: '',
    image: '',
  });

  // Fetch initial inventory and listen for real-time updates
  useEffect(() => {
    const q = query(collection(db, 'inventory'), where('hospitalId', '==', hospitalId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const inventoryData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setInventory(inventoryData);
      setFilteredInventory(inventoryData);
    }, (err) => {
      setError('Error fetching inventory');
      console.error('Fetch error:', err);
    });

    // Listen for Socket.IO updates (optional, since Firestore handles real-time updates)
    socket.on('inventoryUpdate', (updatedItem) => {
      setInventory((prevInventory) =>
        prevInventory.map((item) =>
          item.id === updatedItem.id ? updatedItem : item
        )
      );
      setFilteredInventory((prevInventory) =>
        prevInventory.map((item) =>
          item.id === updatedItem.id ? updatedItem : item
        )
      );
    });

    socket.on('inventoryAdded', (newItem) => {
      setInventory((prevInventory) => [...prevInventory, newItem]);
      setFilteredInventory((prevInventory) => [...prevInventory, newItem]);
    });

    return () => {
      unsubscribe();
      socket.off('inventoryUpdate');
      socket.off('inventoryAdded');
    };
  }, [hospitalId]);

  // Filter and search logic
  useEffect(() => {
    let filtered = inventory;
    if (searchTerm) {
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (categoryFilter) {
      filtered = filtered.filter((item) => item.category === categoryFilter);
    }
    setFilteredInventory(filtered);
  }, [searchTerm, categoryFilter, inventory]);

  const handleUpdateQuantity = async (e) => {
    e.preventDefault();
    if (!selectedItem || !newQuantity) {
      setError('Please select an item and enter a quantity');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/inventory/${selectedItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: parseInt(newQuantity) }),
      });
      if (response.ok) {
        setSelectedItem(null);
        setNewQuantity('');
        setError('');
      } else {
        setError('Failed to update inventory');
      }
    } catch (err) {
      setError('Error updating inventory');
      console.error('Update error:', err);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.quantity || !newItem.unit || !newItem.category) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      if (response.ok) {
        setNewItem({ name: '', quantity: '', unit: '', category: '', image: '' });
        setShowAddForm(false);
        setError('');
      } else {
        setError('Failed to add new item');
      }
    } catch (err) {
      setError('Error adding new item');
      console.error('Add error:', err);
    }
  };

  return (
    <div className="ml-64 p-6 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-bold text-gray-800 mb-6">Inventory Management</h1>
      {error && <p className="text-red-500 bg-red-100 p-3 rounded-lg mb-4">{error}</p>}
      <div className="mb-6 flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name..."
          className="border p-3 rounded-lg w-full sm:w-1/3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border p-3 rounded-lg w-full sm:w-1/3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          <option value="Medicine">Medicine</option>
          <option value="Equipment">Equipment</option>
          <option value="Supplies">Supplies</option>
        </select>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          Add New Item
        </button>
      </div>
      {filteredInventory.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInventory.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-lg p-5 hover:shadow-xl transition-shadow duration-300 animate-fadeIn"
            >
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-lg"
                    onError={(e) => (e.target.src = 'https://via.placeholder.com/100')}
                  />
                  <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {item.category === 'Medicine' && <FaPills />}
                    {item.category === 'Equipment' && <FaTools />}
                    {item.category === 'Supplies' && <FaBox />}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800">{item.name}</h3>
                  <p className="text-sm text-gray-500">Category: {item.category}</p>
                  <p className="text-sm text-gray-500">Unit: {item.unit}</p>
                </div>
              </div>
              <div className="mt-3">
                <p className={`text-lg font-medium ${item.quantity < 50 ? 'text-red-600' : 'text-green-600'}`}>
                  Quantity: {item.quantity}
                </p>
                <p className="text-xs text-gray-400">
                  Last Updated: {new Date(item.lastUpdated).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedItem(item)}
                className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Update Quantity
              </button>
            </div>
          ))}
        </div>
      ) : (
        !error && <p className="text-gray-500">No inventory items found.</p>
      )}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md animate-fadeIn">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Update {selectedItem.name}</h2>
            <form onSubmit={handleUpdateQuantity}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">New Quantity</label>
                <input
                  type="number"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                  placeholder="Enter new quantity"
                  className="w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors duration-200"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedItem(null); setNewQuantity(''); }}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md animate-fadeIn">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Add New Item</h2>
            <form onSubmit={handleAddItem}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="Enter item name"
                  className="w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Quantity</label>
                <input
                  type="number"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                  placeholder="Enter quantity"
                  className="w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Unit</label>
                <input
                  type="text"
                  value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                  placeholder="Enter unit (e.g., tablets, pieces)"
                  className="w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Category</label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Category</option>
                  <option value="Medicine">Medicine</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Supplies">Supplies</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Image URL (optional)</label>
                <input
                  type="text"
                  value={newItem.image}
                  onChange={(e) => setNewItem({ ...newItem, image: e.target.value })}
                  placeholder="Enter image URL"
                  className="w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors duration-200"
                >
                  Add Item
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventory;
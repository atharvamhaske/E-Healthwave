import React, { useState, useEffect } from 'react';

function InventoryManagement() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'medicines',
    quantity: 0,
    unit: 'units',
    minQuantity: 0,
    price: 0,
    expiryDate: '',
    manufacturer: '',
    description: '',
    location: '',
    imageUrl: '',
    quality: 'good', // ['good', 'fair', 'poor']
    condition: 100, // Percentage of condition (0-100)
    lastInspection: '',
    damageAssessment: '',
    qualityNotes: '',
    maintenanceHistory: [],
    temperatureRequirement: '',
    humidityRequirement: '',
    storageConditions: ''
  });

  // Load initial inventory data
  useEffect(() => {
    const savedInventory = JSON.parse(localStorage.getItem('inventory') || '[]');
    if (savedInventory.length === 0) {
      // Add some sample inventory items if none exist
      const sampleInventory = [
        {
          id: 1,
          name: 'Paracetamol 500mg',
          category: 'medicines',
          quantity: 1000,
          unit: 'tablets',
          minQuantity: 100,
          price: 2.5,
          expiryDate: '2025-12-31',
          manufacturer: 'PharmaCo',
          description: 'Pain relief and fever reduction medication',
          location: 'Pharmacy Store Room A',
          imageUrl: 'https://example.com/paracetamol.jpg',
          lastUpdated: new Date().toISOString(),
          quality: 'good',
          condition: 95,
          lastInspection: '2024-03-15',
          damageAssessment: 'No damage reported',
          qualityNotes: 'Stored in optimal conditions',
          temperatureRequirement: '15-25°C',
          humidityRequirement: '40-60%',
          storageConditions: 'Keep in cool, dry place',
          maintenanceHistory: []
        },
        {
          id: 2,
          name: 'Surgical Masks',
          category: 'supplies',
          quantity: 5000,
          unit: 'pieces',
          minQuantity: 500,
          price: 1,
          expiryDate: '2026-06-30',
          manufacturer: 'MedSupply Inc',
          description: '3-ply disposable surgical masks',
          location: 'Medical Supply Store B',
          imageUrl: 'https://example.com/surgical-mask.jpg',
          lastUpdated: new Date().toISOString(),
          quality: 'good',
          condition: 100,
          lastInspection: '2024-03-15',
          damageAssessment: 'No damage reported',
          qualityNotes: 'Sealed packages, optimal storage',
          temperatureRequirement: 'Room temperature',
          humidityRequirement: '30-50%',
          storageConditions: 'Keep away from direct sunlight',
          maintenanceHistory: []
        },
        {
          id: 3,
          name: 'ECG Machine',
          category: 'equipment',
          quantity: 5,
          unit: 'units',
          minQuantity: 2,
          price: 15000,
          manufacturer: 'MedTech Solutions',
          description: '12-lead ECG machine with printer',
          location: 'Cardiology Department',
          imageUrl: 'https://example.com/ecg-machine.jpg',
          lastUpdated: new Date().toISOString(),
          maintenanceDate: '2024-06-30',
          quality: 'fair',
          condition: 85,
          lastInspection: '2024-03-10',
          damageAssessment: 'Minor calibration needed',
          qualityNotes: 'Regular maintenance required',
          temperatureRequirement: '10-35°C',
          humidityRequirement: '30-70%',
          storageConditions: 'Clean, dust-free environment',
          maintenanceHistory: [
            {
              date: '2024-02-15',
              type: 'Calibration',
              notes: 'Regular calibration performed'
            }
          ]
        }
      ];
      localStorage.setItem('inventory', JSON.stringify(sampleInventory));
      setInventory(sampleInventory);
    } else {
      setInventory(savedInventory);
    }
  }, []);

  const handleAddItem = (e) => {
    e.preventDefault();
    const newItemWithId = {
      ...newItem,
      id: Date.now(),
      lastUpdated: new Date().toISOString()
    };
    const updatedInventory = [...inventory, newItemWithId];
    setInventory(updatedInventory);
    localStorage.setItem('inventory', JSON.stringify(updatedInventory));
    setShowAddModal(false);
    setNewItem({
      name: '',
      category: 'medicines',
      quantity: 0,
      unit: 'units',
      minQuantity: 0,
      price: 0,
      expiryDate: '',
      manufacturer: '',
      description: '',
      location: '',
      imageUrl: '',
      quality: 'good',
      condition: 100,
      lastInspection: '',
      damageAssessment: '',
      qualityNotes: '',
      maintenanceHistory: [],
      temperatureRequirement: '',
      humidityRequirement: '',
      storageConditions: ''
    });
  };

  const handleUpdateQuantity = (id, change) => {
    const updatedInventory = inventory.map(item => {
      if (item.id === id) {
        const newQuantity = item.quantity + change;
        if (newQuantity < 0) return item;
        return {
          ...item,
          quantity: newQuantity,
          lastUpdated: new Date().toISOString()
        };
      }
      return item;
    });
    setInventory(updatedInventory);
    localStorage.setItem('inventory', JSON.stringify(updatedInventory));
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.manufacturer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeTab === 'all' || item.category === activeTab;
    return matchesSearch && matchesCategory;
  });

  const getLowStockItems = () => {
    return inventory.filter(item => item.quantity <= item.minQuantity);
  };

  const getExpiringItems = () => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return inventory.filter(item => 
      item.expiryDate && new Date(item.expiryDate) <= thirtyDaysFromNow
    );
  };

  const getQualityStatusColor = (quality = 'unknown', condition = 0) => {
    if (!quality || quality === 'unknown') return 'bg-gray-100 text-gray-800';
    if (quality === 'good' && condition >= 90) return 'bg-green-100 text-green-800';
    if (quality === 'fair' || (condition >= 70 && condition < 90)) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getDamagedItems = () => {
    return inventory.filter(item => 
      (item.condition !== undefined && item.condition < 70) || 
      (item.quality && item.quality === 'poor')
    );
  };

  const handleQualityUpdate = (itemId, updates) => {
    const updatedInventory = inventory.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          ...updates,
          quality: updates.quality || 'unknown',
          condition: updates.condition || 0,
          lastUpdated: new Date().toISOString(),
          maintenanceHistory: [
            ...(item.maintenanceHistory || []),
            {
              date: new Date().toISOString(),
              type: 'Quality Check',
              notes: updates.qualityNotes || 'Quality check performed'
            }
          ]
        };
      }
      return item;
    });
    setInventory(updatedInventory);
    localStorage.setItem('inventory', JSON.stringify(updatedInventory));
    setShowQualityModal(false);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Inventory Management</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
        >
          Add New Item
        </button>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Total Items</h3>
          <p className="text-3xl font-bold text-blue-600">{inventory.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Low Stock Items</h3>
          <p className="text-3xl font-bold text-yellow-600">{getLowStockItems().length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Expiring Soon</h3>
          <p className="text-3xl font-bold text-red-600">{getExpiringItems().length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Damaged Items</h3>
          <p className="text-3xl font-bold text-orange-600">{getDamagedItems().length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Total Value</h3>
          <p className="text-3xl font-bold text-green-600">
            ₹{inventory.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex space-x-4">
        <input
          type="text"
          placeholder="Search inventory..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 p-2 border rounded-md"
        />
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('medicines')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'medicines' ? 'bg-blue-500 text-white' : 'bg-gray-100'
            }`}
          >
            Medicines
          </button>
          <button
            onClick={() => setActiveTab('supplies')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'supplies' ? 'bg-blue-500 text-white' : 'bg-gray-100'
            }`}
          >
            Supplies
          </button>
          <button
            onClick={() => setActiveTab('equipment')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'equipment' ? 'bg-blue-500 text-white' : 'bg-gray-100'
            }`}
          >
            Equipment
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quality</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condition</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Storage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredInventory.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <img
                    src={item.imageUrl || 'https://via.placeholder.com/50'}
                    alt={item.name}
                    className="w-12 h-12 rounded-md object-cover"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{item.name}</div>
                  <div className="text-sm text-gray-500">{item.manufacturer}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {item.category}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{item.quantity} {item.unit}</div>
                  <div className="text-sm text-gray-500">Min: {item.minQuantity}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getQualityStatusColor(item.quality || 'unknown', item.condition || 0)}`}>
                    {item.quality ? item.quality.charAt(0).toUpperCase() + item.quality.slice(1) : 'Unknown'}
                  </span>
                  <div className="text-sm text-gray-500">
                    Last Check: {item.lastInspection ? new Date(item.lastInspection).toLocaleDateString() : 'Not checked'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${
                        (item.condition || 0) >= 90 ? 'bg-green-600' :
                        (item.condition || 0) >= 70 ? 'bg-yellow-400' : 'bg-red-600'
                      }`}
                      style={{ width: `${item.condition || 0}%` }}
                    ></div>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">{item.condition || 0}% Condition</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{item.temperatureRequirement || 'Not specified'}</div>
                  <div className="text-sm text-gray-500">{item.humidityRequirement || 'Not specified'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => {
                      setSelectedItem(item);
                      setShowQualityModal(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-900 mr-2"
                  >
                    Update Quality
                  </button>
                  <button
                    onClick={() => handleUpdateQuantity(item.id, -1)}
                    className="text-red-600 hover:text-red-900 mr-2"
                  >
                    -
                  </button>
                  <button
                    onClick={() => handleUpdateQuantity(item.id, 1)}
                    className="text-green-600 hover:text-green-900"
                  >
                    +
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quality Update Modal */}
      {showQualityModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Update Quality Status</h2>
              <button
                onClick={() => setShowQualityModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleQualityUpdate(selectedItem.id, {
                quality: e.target.quality.value,
                condition: parseInt(e.target.condition.value),
                damageAssessment: e.target.damageAssessment.value,
                qualityNotes: e.target.qualityNotes.value,
                lastInspection: new Date().toISOString()
              });
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Quality Status</label>
                <select
                  name="quality"
                  defaultValue={selectedItem.quality}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Condition (%)</label>
                <input
                  type="number"
                  name="condition"
                  defaultValue={selectedItem.condition}
                  min="0"
                  max="100"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Damage Assessment</label>
                <input
                  type="text"
                  name="damageAssessment"
                  defaultValue={selectedItem.damageAssessment}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Quality Notes</label>
                <textarea
                  name="qualityNotes"
                  defaultValue={selectedItem.qualityNotes}
                  rows="3"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowQualityModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Update Quality
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Add New Item</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="medicines">Medicines</option>
                    <option value="supplies">Supplies</option>
                    <option value="equipment">Equipment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <input
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({...newItem, quantity: Number(e.target.value)})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Unit</label>
                  <input
                    type="text"
                    value={newItem.unit}
                    onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Minimum Quantity</label>
                  <input
                    type="number"
                    value={newItem.minQuantity}
                    onChange={(e) => setNewItem({...newItem, minQuantity: Number(e.target.value)})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Price per Unit</label>
                  <input
                    type="number"
                    value={newItem.price}
                    onChange={(e) => setNewItem({...newItem, price: Number(e.target.value)})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                  <input
                    type="date"
                    value={newItem.expiryDate}
                    onChange={(e) => setNewItem({...newItem, expiryDate: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Manufacturer</label>
                  <input
                    type="text"
                    value={newItem.manufacturer}
                    onChange={(e) => setNewItem({...newItem, manufacturer: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <input
                    type="text"
                    value={newItem.location}
                    onChange={(e) => setNewItem({...newItem, location: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Image URL</label>
                  <input
                    type="url"
                    value={newItem.imageUrl}
                    onChange={(e) => setNewItem({...newItem, imageUrl: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                  rows="3"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryManagement;
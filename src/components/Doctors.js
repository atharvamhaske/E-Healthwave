import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function Doctors() {
  const [doctors, setDoctors] = useState([]);
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    department: '',
    specialization: '',
    qualification: '',
    experience: '',
    contact: '',
    email: '',
    availability: 'Available'
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'doctors'), (snapshot) => {
      const doctorsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDoctors(doctorsData);
    });

    return () => unsubscribe();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewDoctor(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'doctors'), {
        ...newDoctor,
        createdAt: new Date().toISOString()
      });
      setNewDoctor({
        name: '',
        department: '',
        specialization: '',
        qualification: '',
        experience: '',
        contact: '',
        email: '',
        availability: 'Available'
      });
      toast.success('Doctor added successfully!');
    } catch (err) {
      console.error('Error adding doctor:', err);
      toast.error('Failed to add doctor');
    }
  };

  const handleUpdateAvailability = async (doctorId, newAvailability) => {
    try {
      await updateDoc(doc(db, 'doctors', doctorId), {
        availability: newAvailability
      });
      toast.success('Availability updated successfully!');
    } catch (err) {
      console.error('Error updating availability:', err);
      toast.error('Failed to update availability');
    }
  };

  const handleDeleteDoctor = async (doctorId) => {
    if (window.confirm('Are you sure you want to delete this doctor?')) {
      try {
        await deleteDoc(doc(db, 'doctors', doctorId));
        toast.success('Doctor deleted successfully!');
      } catch (err) {
        console.error('Error deleting doctor:', err);
        toast.error('Failed to delete doctor');
      }
    }
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <ToastContainer position="top-right" autoClose={5000} />
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Doctor Management</h1>

      {/* Add Doctor Form */}
      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Add New Doctor</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Name</label>
            <input
              type="text"
              name="name"
              value={newDoctor.name}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Department</label>
            <select
              name="department"
              value={newDoctor.department}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select Department</option>
              <option value="Cardiology">Cardiology</option>
              <option value="Neurology">Neurology</option>
              <option value="Orthopedics">Orthopedics</option>
              <option value="Pediatrics">Pediatrics</option>
              <option value="General Medicine">General Medicine</option>
              <option value="Surgery">Surgery</option>
              <option value="Gynecology">Gynecology</option>
              <option value="Dermatology">Dermatology</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Specialization</label>
            <input
              type="text"
              name="specialization"
              value={newDoctor.specialization}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Qualification</label>
            <input
              type="text"
              name="qualification"
              value={newDoctor.qualification}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Experience (years)</label>
            <input
              type="number"
              name="experience"
              value={newDoctor.experience}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Contact</label>
            <input
              type="tel"
              name="contact"
              value={newDoctor.contact}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={newDoctor.email}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Availability</label>
            <select
              name="availability"
              value={newDoctor.availability}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            >
              <option value="Available">Available</option>
              <option value="On Leave">On Leave</option>
              <option value="Not Available">Not Available</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add Doctor
            </button>
          </div>
        </form>
      </div>

      {/* Doctors List */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Doctors List</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map(doctor => (
            <div key={doctor.id} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold">Dr. {doctor.name}</h3>
                <div className="flex space-x-2">
                  <select
                    value={doctor.availability}
                    onChange={(e) => handleUpdateAvailability(doctor.id, e.target.value)}
                    className="text-sm border rounded p-1"
                  >
                    <option value="Available">Available</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Not Available">Not Available</option>
                  </select>
                  <button
                    onClick={() => handleDeleteDoctor(doctor.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    ×
                  </button>
                </div>
              </div>
              <p className="text-gray-600">{doctor.department}</p>
              <p className="text-sm text-gray-500">Specialization: {doctor.specialization}</p>
              <p className="text-sm text-gray-500">Experience: {doctor.experience} years</p>
              <p className="text-sm text-gray-500">Qualification: {doctor.qualification}</p>
              <div className="mt-2 text-sm">
                <p className="text-gray-500">Contact: {doctor.contact}</p>
                <p className="text-gray-500">Email: {doctor.email}</p>
              </div>
              <div className={`mt-2 inline-block px-2 py-1 rounded text-sm ${
                doctor.availability === 'Available' ? 'bg-green-100 text-green-800' :
                doctor.availability === 'On Leave' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {doctor.availability}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Doctors; 
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getApplicationForUser, upsertApplication } from '../services/api';
import { useToast } from '../context/ToastContext';

type Props = {
  existing?: any | null;
  onSubmitted?: () => void;
};

const FarmerSubmission: React.FC<Props> = ({ existing = null, onSubmitted }) => {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [fullName, setFullName] = useState('');
  const [farmName, setFarmName] = useState('');
  const [farmType, setFarmType] = useState('Vegetables');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [postal, setPostal] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setFullName(existing.full_name || '');
    setFarmName(existing.farm_name || '');
    setFarmType(existing.farm_type || 'Vegetables');
    setPhone(existing.phone || '');
    setLocation(existing.farm_address?.city || '');
    if (existing.farm_address) {
      setAddressLine1(existing.farm_address.line1 || '');
      setCity(existing.farm_address.city || '');
      setStateVal(existing.farm_address.state || '');
      setPostal(existing.farm_address.postal_code || '');
    }
  }, [existing]);

  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.showToast('Not signed in', 'error');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        user_id: userId,
        full_name: fullName,
        farm_name: farmName,
        farm_type: farmType,
        farm_address: {
          line1: addressLine1,
          city: location || city,
          state: stateVal,
          postal_code: postal,
        },
        phone,
      };

      await upsertApplication(payload);
      // success toast
      toast.showToast('Application submitted. Await admin review.', 'success');
      onSubmitted && onSubmitted();
    } catch (err: any) {
      console.error(err);
      toast.showToast(err?.message || 'Failed to submit application', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Complete your farmer submission</h2>
      {existing?.status === 'pending' && (
        <p className="mb-3 text-yellow-700">Your application is pending review.</p>
      )}
      {existing?.status === 'rejected' && (
        <div className="mb-3 text-red-700">Rejected: {existing.review_notes}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Full name</label>
          <input required className="w-full border rounded px-3 py-2" value={fullName} onChange={e => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone number *</label>
          <input required type="tel" className="w-full border rounded px-3 py-2" placeholder="e.g., +977-1234567890" value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Location/City *</label>
          <input required type="text" className="w-full border rounded px-3 py-2" placeholder="e.g., Kathmandu" value={location} onChange={e => setLocation(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Farm name</label>
          <input required className="w-full border rounded px-3 py-2" value={farmName} onChange={e => setFarmName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Farm type</label>
          <select className="w-full border rounded px-3 py-2" value={farmType} onChange={e => setFarmType(e.target.value)}>
            <option>Vegetables</option>
            <option>Fruits</option>
          </select>
        </div>
        <div>
          <button disabled={loading} type="submit" className="w-full bg-primary text-white py-2 rounded font-bold disabled:opacity-50">
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FarmerSubmission;

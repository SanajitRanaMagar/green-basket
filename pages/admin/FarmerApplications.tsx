import React, { useEffect, useState } from 'react';
import { getAllApplications, approveFarmerApplication, deleteApplication } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { Check, X, Eye, Trash2 } from 'lucide-react';
import { FarmerApplication } from '../../types';

const FarmerApplications: React.FC = () => {
  const [applications, setApplications] = useState<FarmerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<FarmerApplication | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const data = await getAllApplications();
      setApplications(data || []);
    } catch (err) {
      console.error('Failed to load applications', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (app: FarmerApplication) => {
    const confirmed = await confirm({
      title: 'Approve Farmer Application',
      message: `Are you sure you want to approve the application from "${app.full_name}"?`,
      type: 'success',
      okText: 'Approve',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;
    
    setProcessingId(app.id);
    try {
      await approveFarmerApplication(app.user_id, app.id);
      showToast('Farmer approved successfully.', 'success');
      setSelectedApp(null);
      loadApplications();
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'Failed to approve application', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (app: FarmerApplication) => {
    const confirmed = await confirm({
      title: 'Delete Application',
      message: `Are you sure you want to delete the application from "${app.full_name}"? This action cannot be undone.`,
      type: 'danger',
      okText: 'Delete',
      cancelText: 'Cancel',
    });

    if (!confirmed) return;
    
    setProcessingId(app.id);
    try {
      await deleteApplication(app.id);
      showToast('Application deleted successfully.', 'success');
      setSelectedApp(null);
      loadApplications();
    } catch (err: any) {
      console.error(err);
      showToast(err?.message || 'Failed to delete application', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading applications...</div>;

  if (applications.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No farmer applications.</p>
      </div>
    );
  }

  const statusBadge = (status: string) => {
    const badges: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
      'active': 'bg-green-100 text-green-800'
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${badges[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Applications List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-semibold">Farmer Name</th>
              <th className="p-4 font-semibold">Farm Name</th>
              <th className="p-4 font-semibold">Type</th>
              <th className="p-4 font-semibold">Phone</th>
              <th className="p-4 font-semibold">Email</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold">Submitted</th>
              <th className="p-4 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {applications.map(app => (
              <tr key={app.id} className="border-b hover:bg-gray-50">
                <td className="p-4">{app.full_name}</td>
                <td className="p-4">{app.farm_name}</td>
                <td className="p-4">{app.farm_type}</td>
                <td className="p-4 text-sm text-gray-600">{app.phone || 'N/A'}</td>
                <td className="p-4 text-sm text-gray-600">{app.profiles?.email || 'N/A'}</td>
                <td className="p-4">{statusBadge(app.status)}</td>
                <td className="p-4 text-sm">{new Date(app.created_at).toLocaleDateString()}</td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => setSelectedApp(app)}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 justify-end mr-3"
                  >
                    <Eye className="w-4 h-4" /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-4">Application Details</h2>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Farmer Name</label>
                  <p className="text-gray-900">{selectedApp.full_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900">{selectedApp.profiles?.email || 'N/A'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Farm Name</label>
                  <p className="text-gray-900">{selectedApp.farm_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Farm Type</label>
                  <p className="text-gray-900">{selectedApp.farm_type}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <p className="text-gray-900">{selectedApp.farm_address?.city || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="text-gray-900">{selectedApp.phone || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <p className="text-gray-900">{statusBadge(selectedApp.status)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Submitted</label>
                <p className="text-gray-900">{new Date(selectedApp.created_at).toLocaleString()}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setSelectedApp(null)}
                className="px-4 py-2 border rounded font-medium hover:bg-gray-50"
              >
                Close
              </button>
              {selectedApp.status === 'pending' && (
                <button
                  disabled={processingId === selectedApp.id}
                  onClick={() => handleApprove(selectedApp)}
                  className="px-4 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" /> Approve
                </button>
              )}
              <button
                disabled={processingId === selectedApp.id}
                onClick={() => handleDelete(selectedApp)}
                className="px-4 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerApplications;

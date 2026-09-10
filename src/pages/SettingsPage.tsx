import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Bell, Shield, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { toast } from 'react-hot-toast';
import { profileService } from '../services/profileService';
import api from '../services/api';

export function SettingsPage() {
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<any>({});
  
  // Notification States
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [priceDropThreshold, setPriceDropThreshold] = useState(0);

  // Security States
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await profileService.getProfile();
      setProfile(data);
      if (data.notificationPreferences) {
        setEmailAlerts(data.notificationPreferences.emailAlerts ?? true);
        setPriceDropThreshold(data.notificationPreferences.priceDropThreshold || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await profileService.updateProfile({
        ...profile,
        notificationPreferences: { emailAlerts, priceDropThreshold }
      });
      toast.success('Notification settings updated');
    } catch (e) {
      toast.error('Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    toast.error('Password update must be handled via your auth provider');
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you absolutely sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.')) {
      return;
    }
    
    setIsDeleting(true);
    try {
      await api.delete('/auth/account');
      toast.success('Account deleted successfully');
      logout();
    } catch (error) {
      toast.error('Failed to delete account');
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-primary" />
            Settings
          </h1>
          <p className="text-textSecondary text-sm mt-1">Manage your application preferences and security.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-borderLight shadow-sm overflow-hidden mb-6">
        <div className="p-6 md:p-8">
          <form onSubmit={handleSaveNotifications} className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-textPrimary text-lg">Notification Preferences</h3>
            </div>
            
            <div className="flex items-center justify-between border-b border-borderLight pb-6">
              <div>
                <p className="font-medium text-textPrimary">Email Alerts</p>
                <p className="text-sm text-textSecondary">Receive emails when tracked products drop in price.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="pt-2">
              <p className="font-medium text-textPrimary mb-2">Price Drop Alert Threshold (₹)</p>
              <p className="text-sm text-textSecondary mb-4">Only alert me when the price drops by at least this amount (0 to alert on any drop below target).</p>
              <Input 
                type="number" 
                value={priceDropThreshold} 
                onChange={(e) => setPriceDropThreshold(Number(e.target.value))} 
                min={0}
                placeholder="e.g. 500"
              />
            </div>

            <div className="flex justify-end mt-4">
              <Button type="submit" isLoading={isLoading}>Save Preferences</Button>
            </div>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-borderLight shadow-sm overflow-hidden mb-6">
        <div className="p-6 md:p-8">
          <form onSubmit={handleUpdatePassword} className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-textPrimary text-lg">Security Settings</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Current Password" 
                type="password" 
                value={oldPassword} 
                onChange={(e) => setOldPassword(e.target.value)} 
              />
              <div className="hidden md:block"></div> {/* Spacer */}
              
              <Input 
                label="New Password" 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
              />
              
              <Input 
                label="Confirm New Password" 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
              />
            </div>

            <div className="flex justify-end mt-4">
              <Button type="submit" variant="outline">Update Password</Button>
            </div>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-danger/30 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4 text-danger">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-bold text-lg">Danger Zone</h3>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="font-medium text-textPrimary">Delete Account</p>
              <p className="text-sm text-textSecondary">Permanently delete your account and all associated data.</p>
            </div>
            <Button 
              type="button" 
              variant="secondary" 
              className="bg-danger/10 text-danger hover:bg-danger hover:text-white"
              onClick={handleDeleteAccount}
              isLoading={isDeleting}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

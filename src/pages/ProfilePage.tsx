import React, { useState, useEffect } from 'react';
import { User as UserIcon, Mail, Camera, IndianRupee, PieChart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { toast } from 'react-hot-toast';
import { profileService } from '../services/profileService';

export function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>({});
  const [name, setName] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [preferredCurrency, setPreferredCurrency] = useState('INR');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await profileService.getProfile();
      setProfile(data);
      setName(data.name || user?.name || '');
      setMonthlyBudget(data.monthlyBudget || 0);
      setPreferredCurrency(data.preferredCurrency || 'INR');
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await profileService.updateProfile({ name, monthlyBudget, preferredCurrency, preferences: profile.preferences, profilePicture: profile.profilePicture });
      toast.success('Profile updated successfully');
    } catch (e) {
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePictureUpload = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploading(true);
    try {
      const data = await profileService.uploadProfilePicture(file);
      setProfile({ ...profile, profilePicture: data.profilePictureUrl });
      toast.success('Profile picture updated!');
    } catch (e) {
      toast.error('Failed to upload picture');
      setIsUploading(false);
    }
  };

  const handlePictureRemove = async () => {
    try {
      await profileService.updateProfile({ ...profile, profilePicture: '' });
      setProfile({ ...profile, profilePicture: '' });
      toast.success('Profile picture removed!');
    } catch (e) {
      toast.error('Failed to remove picture');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-textPrimary flex items-center gap-2">
            <UserIcon className="w-6 h-6 text-primary" />
            User Profile
          </h1>
          <p className="text-textSecondary text-sm mt-1">Manage your account settings and preferences.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-borderLight shadow-sm overflow-hidden">
        <div className="p-6 md:p-8">
          <form onSubmit={handleSave} className="space-y-8">
            
            {/* Profile Picture */}
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-borderLight">
              <div className="relative group cursor-pointer">
                <div className="w-24 h-24 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-3xl overflow-hidden border-4 border-white shadow-md">
                  {profile.profilePicture || user?.profilePicture ? (
                    <img src={profile.profilePicture || user?.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    (name || user?.name || 'U').charAt(0)
                  )}
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="text-center sm:text-left">
                <h3 className="font-bold text-textPrimary text-lg">{name || user?.name || 'User'}</h3>
                <p className="text-sm text-textSecondary">{user?.email || 'user@example.com'}</p>
                <div className="mt-3 flex gap-2 justify-center sm:justify-start">
                  <div className="relative">
                    <Button type="button" variant="outline" size="sm" disabled={isUploading}>
                      {isUploading ? 'Uploading...' : 'Change Picture'}
                    </Button>
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handlePictureUpload} />
                  </div>
                  <Button type="button" variant="secondary" size="sm" className="text-danger hover:bg-danger/10" onClick={handlePictureRemove}>Remove</Button>
                </div>
              </div>
            </div>

            {/* Personal Info */}
            <div className="space-y-4">
              <h3 className="font-bold text-textPrimary text-lg">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
                <Input label="Email Address" type="email" defaultValue={user?.email || ''} disabled />
              </div>
            </div>

            {/* Preferences */}
            <div className="space-y-4 pb-8 border-b border-borderLight">
              <h3 className="font-bold text-textPrimary text-lg">Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-textPrimary mb-1">
                    Preferred Currency
                  </label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary" />
                    <select value={preferredCurrency} onChange={(e) => setPreferredCurrency(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-background border border-borderLight rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-textPrimary">
                      <option value="INR">Indian Rupee (₹)</option>
                      <option value="USD">US Dollar ($)</option>
                      <option value="EUR">Euro (€)</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-textPrimary mb-1">
                    Monthly Budget Target
                  </label>
                  <div className="relative">
                    <PieChart className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary" />
                    <input type="number" value={monthlyBudget} onChange={(e) => setMonthlyBudget(Number(e.target.value))} className="w-full pl-10 pr-4 py-2 bg-background border border-borderLight rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-textPrimary" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary">Cancel</Button>
              <Button type="submit" isLoading={isLoading}>Save Changes</Button>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  );
}

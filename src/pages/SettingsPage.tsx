import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Bell, Shield, Trash2, AlertTriangle, CreditCard, Plus, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { toast } from 'react-hot-toast';
import { profileService } from '../services/profileService';
import { walletService, WalletCard } from '../services/walletService';
import api from '../services/api';

export function SettingsPage() {
  const { logout } = useAuth();
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

  // Wallet & Card States
  const [walletCards, setWalletCards] = useState<WalletCard[]>([]);
  const [isAmazonPrime, setIsAmazonPrime] = useState(false);
  const [isFlipkartPlus, setIsFlipkartPlus] = useState(false);
  const [preferredTenure, setPreferredTenure] = useState(0);
  const [preferNoCostOnly, setPreferNoCostOnly] = useState(true);
  const [isWalletLoading, setIsWalletLoading] = useState(false);

  // New Card Form
  const [newBank, setNewBank] = useState('HDFC');
  const [newCardName, setNewCardName] = useState('Millennia Credit Card');
  const [newCardType, setNewCardType] = useState<'Credit' | 'Debit'>('Credit');
  const [newCardLast4, setNewCardLast4] = useState('');
  const [showAddCard, setShowAddCard] = useState(false);

  useEffect(() => {
    loadProfile();
    loadWallet();
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

  const loadWallet = async () => {
    try {
      const data = await walletService.getWallet();
      if (data) {
        setWalletCards(data.cards || []);
        setIsAmazonPrime(data.memberships?.some(m => m.program.includes('Prime') && m.active) ?? false);
        setIsFlipkartPlus(data.memberships?.some(m => m.program.includes('Plus') && m.active) ?? false);
        setPreferredTenure(data.emiPreference?.preferredTenureMonths || 0);
        setPreferNoCostOnly(data.emiPreference?.preferNoCostOnly ?? true);
      }
    } catch (e) {
      console.error('Failed to load wallet', e);
    }
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardName || !newBank) return;

    const card: WalletCard = {
      id: `card_${Date.now()}`,
      bank: newBank,
      name: newCardName,
      type: newCardType,
      network: 'Visa',
      last4: newCardLast4 || undefined
    };

    setWalletCards([...walletCards, card]);
    setNewCardLast4('');
    setShowAddCard(false);
    toast.success('Card added to wallet');
  };

  const handleRemoveCard = (id: string) => {
    setWalletCards(walletCards.filter(c => c.id !== id));
  };

  const handleSaveWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsWalletLoading(true);
    try {
      const memberships = [
        { id: 'mem_prime', program: 'Amazon Prime', active: isAmazonPrime },
        { id: 'mem_fk', program: 'Flipkart Plus / VIP', active: isFlipkartPlus }
      ];

      await walletService.updateWallet({
        cards: walletCards,
        memberships,
        emiPreference: {
          preferredTenureMonths: preferredTenure,
          preferNoCostOnly
        }
      });
      toast.success('Payment wallet & card preferences saved!');
    } catch (_e) {
      toast.error('Failed to save wallet configuration');
    } finally {
      setIsWalletLoading(false);
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

      {/* Payment Wallet & Cards Section */}
      <div className="bg-white rounded-xl border border-borderLight shadow-sm overflow-hidden mb-6">
        <div className="p-6 md:p-8">
          <form onSubmit={handleSaveWallet} className="space-y-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-textPrimary text-lg">Payment Wallet & Card Offers</h3>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowAddCard(!showAddCard)} className="gap-1.5">
                <Plus className="w-4 h-4" /> Add Card
              </Button>
            </div>
            
            <p className="text-xs text-textSecondary">
              Your cards unlock instant bank discounts and cashback on Amazon, Flipkart, Croma, and Reliance Digital.
            </p>

            {/* Add Card Form Modal / Expandable */}
            {showAddCard && (
              <div className="p-4 bg-secondaryBg rounded-xl border border-primary/20 space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-textPrimary">Add Payment Card</h4>
                  <button type="button" onClick={() => setShowAddCard(false)} className="text-textSecondary hover:text-textPrimary">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-medium text-textSecondary block mb-1">Bank</label>
                    <select 
                      value={newBank} 
                      onChange={(e) => setNewBank(e.target.value)}
                      className="w-full bg-white border border-borderLight rounded-lg px-3 py-2 text-xs"
                    >
                      <option value="HDFC">HDFC Bank</option>
                      <option value="ICICI">ICICI Bank</option>
                      <option value="SBI">SBI Card</option>
                      <option value="Axis">Axis Bank</option>
                      <option value="Kotak">Kotak Mahindra</option>
                      <option value="OneCard">OneCard</option>
                      <option value="Amex">American Express</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-textSecondary block mb-1">Card Name</label>
                    <input 
                      type="text" 
                      value={newCardName} 
                      onChange={(e) => setNewCardName(e.target.value)}
                      placeholder="e.g. Amazon Pay ICICI"
                      className="w-full bg-white border border-borderLight rounded-lg px-3 py-2 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-textSecondary block mb-1">Type</label>
                    <select 
                      value={newCardType} 
                      onChange={(e) => setNewCardType(e.target.value as any)}
                      className="w-full bg-white border border-borderLight rounded-lg px-3 py-2 text-xs"
                    >
                      <option value="Credit">Credit Card</option>
                      <option value="Debit">Debit Card</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-textSecondary block mb-1">Last 4 Digits (Optional)</label>
                    <input 
                      type="text" 
                      maxLength={4}
                      value={newCardLast4} 
                      onChange={(e) => setNewCardLast4(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="e.g. 4321"
                      className="w-full bg-white border border-borderLight rounded-lg px-3 py-2 text-xs"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => setShowAddCard(false)}>Cancel</Button>
                  <Button type="button" size="sm" onClick={handleAddCard}>Confirm Card</Button>
                </div>
              </div>
            )}

            {/* Saved Cards List */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-textSecondary uppercase tracking-wider">Active Cards in Wallet</p>
              {walletCards.length === 0 ? (
                <div className="text-center py-6 bg-secondaryBg rounded-lg border border-borderLight text-textSecondary text-xs">
                  No cards added yet. Click &quot;Add Card&quot; above to add cards like Amazon Pay ICICI, Flipkart Axis, or HDFC cards.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {walletCards.map((card) => (
                    <div key={card.id} className="p-3 bg-secondaryBg rounded-lg border border-borderLight flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-primary/10 rounded text-primary">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-textPrimary">{card.name}</p>
                          <p className="text-[10px] text-textSecondary">{card.bank} • {card.type} Card {card.last4 ? `(••${card.last4})` : ''}</p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveCard(card.id)} 
                        className="text-textSecondary hover:text-danger p-1 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Memberships & EMI Preferences */}
            <div className="pt-4 border-t border-borderLight grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-textSecondary uppercase tracking-wider">Store Memberships</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 text-xs text-textPrimary cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isAmazonPrime} 
                      onChange={(e) => setIsAmazonPrime(e.target.checked)}
                      className="rounded border-borderLight text-primary focus:ring-primary w-4 h-4"
                    />
                    <span>Amazon Prime Member (Unlocks 5% Unlimited Cashback on ICICI Card)</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs text-textPrimary cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isFlipkartPlus} 
                      onChange={(e) => setIsFlipkartPlus(e.target.checked)}
                      className="rounded border-borderLight text-primary focus:ring-primary w-4 h-4"
                    />
                    <span>Flipkart Plus / VIP Member</span>
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-textSecondary uppercase tracking-wider">EMI Preferences</p>
                <div>
                  <label className="text-xs text-textSecondary block mb-1">Preferred Repayment Tenure</label>
                  <select 
                    value={preferredTenure} 
                    onChange={(e) => setPreferredTenure(Number(e.target.value))}
                    className="w-full bg-secondaryBg border border-borderLight rounded-lg px-3 py-1.5 text-xs"
                  >
                    <option value={0}>Pay in Full (No EMI)</option>
                    <option value={3}>3 Months EMI</option>
                    <option value={6}>6 Months EMI</option>
                    <option value={9}>9 Months EMI</option>
                    <option value={12}>12 Months EMI</option>
                  </select>
                </div>
                <label className="flex items-center gap-2.5 text-xs text-textPrimary cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={preferNoCostOnly} 
                    onChange={(e) => setPreferNoCostOnly(e.target.checked)}
                    className="rounded border-borderLight text-primary focus:ring-primary w-4 h-4"
                  />
                  <span>Prefer No-Cost EMI Only</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" isLoading={isWalletLoading}>Save Wallet Settings</Button>
            </div>
          </form>
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

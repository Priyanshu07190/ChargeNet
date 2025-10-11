import { useState, useEffect } from 'react';
import { 
  User, 
  Edit, 
  Camera, 
  Award, 
  MapPin,
  Phone,
  Mail,
  Car,
  Leaf,
  Trophy,
  Settings,
  Bell,
  Shield,
  CreditCard,
  Users,
  Gift,
  Save,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../lib/apiService';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'achievements' | 'legacy'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state for editable fields
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    vehicle_model: user?.vehicle_model || '',
    vehicle_number: user?.vehicle_number || '',
    charger_type: user?.charger_type || ''
  });

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        vehicle_model: user.vehicle_model || '',
        vehicle_number: user.vehicle_number || '',
        charger_type: user.charger_type || 'Fast Charging (50kW+)'
      });
    }
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      // Build payload without email if it's disabled from editing
  const { email, ...payload } = formData; // email is disabled in UI; don’t send

      const response = await apiService.updateProfile(payload, user?._id);
      
      // Update the user in context with the returned data
      const updatedUser = response?.user || response?.data || response; // tolerate different backend shapes
      if (updatedUser && typeof updatedUser === 'object') updateUser(updatedUser);
      
      setIsEditing(false);
      console.log('Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original user values
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        vehicle_model: user.vehicle_model || '',
        vehicle_number: user.vehicle_number || '',
        charger_type: user.charger_type || 'Fast Charging (50kW+)'
      });
    }
    setIsEditing(false);
  };

  const legacyData = {
    totalSessions: 0,
    co2Saved: 0,
    moneySaved: 0,
    treesEquivalent: 0,
    generationsImpacted: 0,
    familyMembers: 0
  };

  return (
    <div className="min-h-screen pt-16 bg-gradient-to-br from-blue-50 to-green-50">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-32 h-32 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center text-4xl font-bold">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
                ) : (
                  user?.name?.charAt(0) || 'U'
                )}
              </div>
              <button className="absolute bottom-2 right-2 bg-blue-500 p-2 rounded-full hover:bg-blue-600 transition-colors">
                <Camera className="h-4 w-4" />
              </button>
              
              {/* Mood Ring Effect */}
              <div className="absolute -inset-1 mood-ring rounded-full opacity-50"></div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center md:space-x-4 mb-4">
                <h1 className="text-3xl font-bold">{user?.name}</h1>
                {user?.verified && (
                  <div className="flex items-center space-x-1 bg-green-500/20 px-3 py-1 rounded-full">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm">KYC Verified</span>
                  </div>
                )}
              </div>
              
              <p className="text-white/80 mb-4">{user?.email}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3">
                  <div className="text-2xl font-bold">0</div>
                  <div className="text-xs opacity-80">ChargeTokens</div>
                </div>
                <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3">
                  <div className="text-2xl font-bold">0</div>
                  <div className="text-xs opacity-80">Carbon Credits</div>
                </div>
                <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3">
                  <div className="text-2xl font-bold">0.0</div>
                  <div className="text-xs opacity-80">Rating</div>
                </div>
                <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3">
                  <div className="text-2xl font-bold">0</div>
                  <div className="text-xs opacity-80">Sessions</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl shadow-lg mb-8 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex">
              {[
                { id: 'overview', name: 'Overview', icon: User },
                { id: 'achievements', name: 'Achievements', icon: Trophy },
                { id: 'legacy', name: 'Legacy', icon: Award },
                { id: 'settings', name: 'Settings', icon: Settings }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center space-x-2 py-4 px-6 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Personal Info */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
                <div className="flex items-center space-x-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="flex items-center space-x-2 text-gray-600 hover:text-gray-700 transition-colors px-3 py-1 border border-gray-300 rounded-lg"
                      >
                        <X className="h-4 w-4" />
                        <span>Cancel</span>
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center space-x-2 text-white bg-blue-600 hover:bg-blue-700 transition-colors px-3 py-1 rounded-lg disabled:opacity-50"
                      >
                        <Save className="h-4 w-4" />
                        <span>{isSaving ? 'Saving...' : 'Save'}</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        disabled={!isEditing}
                        className={`flex-1 px-3 py-2 border rounded-lg ${
                          isEditing ? 'border-blue-300 focus:ring-2 focus:ring-blue-500 focus:outline-none' : 'border-gray-200 bg-gray-50'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        disabled={true} // Email updates typically need verification
                        className="flex-1 px-3 py-2 border rounded-lg border-gray-200 bg-gray-50"
                        title="Email changes require verification - contact support"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        disabled={!isEditing}
                        className={`flex-1 px-3 py-2 border rounded-lg ${
                          isEditing ? 'border-blue-300 focus:ring-2 focus:ring-blue-500 focus:outline-none' : 'border-gray-200 bg-gray-50'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Model</label>
                    <div className="flex items-center space-x-3">
                      <Car className="h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.vehicle_model}
                        onChange={(e) => handleInputChange('vehicle_model', e.target.value)}
                        disabled={!isEditing}
                        placeholder="e.g., Tesla Model 3, Tata Nexon EV"
                        className={`flex-1 px-3 py-2 border rounded-lg ${
                          isEditing ? 'border-blue-300 focus:ring-2 focus:ring-blue-500 focus:outline-none' : 'border-gray-200 bg-gray-50'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Number</label>
                    <div className="flex items-center space-x-3">
                      <Car className="h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.vehicle_number}
                        onChange={(e) => handleInputChange('vehicle_number', e.target.value)}
                        disabled={!isEditing}
                        placeholder="e.g., MH01AB1234"
                        className={`flex-1 px-3 py-2 border rounded-lg ${
                          isEditing ? 'border-blue-300 focus:ring-2 focus:ring-blue-500 focus:outline-none' : 'border-gray-200 bg-gray-50'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Charging Preference</label>
                    <select
                      value={formData.charger_type}
                      onChange={(e) => handleInputChange('charger_type', e.target.value)}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isEditing ? 'border-blue-300 focus:ring-2 focus:ring-blue-500 focus:outline-none' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <option value="Fast Charging (50kW+)">Fast Charging (50kW+)</option>
                      <option value="Standard Charging (22kW)">Standard Charging (22kW)</option>
                      <option value="Solar Powered Only">Solar Powered Only</option>
                      <option value="Any Available">Any Available</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Carbon Credits Progress - Gamified */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Carbon Credits Journey</h2>
                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                  <Leaf className="h-4 w-4" />
                  <span className="text-sm font-semibold">Go Green</span>
                </div>
              </div>

              {(() => {
                const current = Math.max(0, Math.floor((user?.eco_miles as number) || 0));
                const goal = 5000;
                const milestones = [1000, 2000, 3000, 4000, 5000];
                const percent = Math.min(100, Math.round((current / goal) * 100));
                // currentTier not used directly in UI; compute on demand if needed
                const nextMilestone = milestones.find(m => m > current) || goal;
                const toNext = Math.max(0, nextMilestone - current);

                return (
                  <div>
                    {/* Summary */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm text-gray-700">
                        <span className="font-semibold text-gray-900">{current.toLocaleString()} / {goal.toLocaleString()}</span> Credits
                      </div>
                      <div className="text-sm text-gray-700">
                        Next gift at <span className="font-semibold">{nextMilestone.toLocaleString()}</span> • <span className="font-semibold">{toNext.toLocaleString()}</span> to go
                      </div>
                    </div>

                    {/* Gamified segmented progress bar (5 segments of 1000 each) */}
                    <div className="relative bg-gray-100 border border-gray-200 rounded-xl p-4">
                      <div className="grid grid-cols-5 gap-2">
                        {[0,1,2,3,4].map(i => {
                          const segmentBase = i * 1000;
                          const fill = Math.max(0, Math.min(1, (current - segmentBase) / 1000));
                          const achieved = fill >= 1;
                          return (
                            <div key={i} className="h-6 bg-gray-200 rounded-lg overflow-hidden border border-gray-300">
                              <div
                                className={`h-full transition-all duration-700 ${achieved ? 'bg-green-500' : 'bg-green-400'}`}
                                style={{ width: `${fill * 100}%` }}
                              />
                            </div>
                          );
                        })}
                      </div>

                      {/* Milestone gift markers */}
                      <div className="mt-4 flex justify-between text-xs">
                        {milestones.map((m) => {
                          const unlocked = current >= m;
                          return (
                            <div key={m} className="flex flex-col items-center w-1/5">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center border ${unlocked ? 'bg-amber-100 border-amber-300' : 'bg-gray-100 border-gray-300'}`}>
                                <Gift className={`h-5 w-5 ${unlocked ? 'text-amber-600' : 'text-gray-400'}`} />
                              </div>
                              <div className={`mt-1 font-medium ${unlocked ? 'text-amber-700' : 'text-gray-500'}`}>{m/1000}k</div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Percent badge */}
                      <div className="absolute -top-3 right-4 px-2 py-0.5 text-xs rounded-full bg-blue-600 text-white shadow">
                        {percent}%
                      </div>
                    </div>

                    {/* Reward hint */}
                    <div className="mt-3 text-sm text-gray-700 flex items-center justify-between">
                      <div>
                        {current >= goal ? (
                          <span className="font-semibold text-green-700">Amazing! You’ve completed this journey. More rewards coming soon.</span>
                        ) : (
                          <>
                            Keep charging to unlock your <span className="font-semibold">{nextMilestone/1000}k</span> gift!
                          </>
                        )}
                      </div>
                      <button
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          current >= nextMilestone 
                            ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600' 
                            : 'bg-gray-100 text-gray-600 border-gray-300 cursor-not-allowed'
                        }`}
                        disabled={current < nextMilestone}
                        title={current < nextMilestone ? `Earn ${toNext} more credits to claim` : 'Claim your gift'}
                      >
                        {current >= nextMilestone ? 'Claim Gift' : 'Gift Locked'}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Recent Activity section removed per request */}
          </div>
        )}

        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
            <div className="text-gray-400 mb-4">
              <Trophy className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Achievements Yet</h3>
            <p className="text-gray-600 mb-4">Start charging to unlock eco-friendly achievements and milestones</p>
            <button className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors">
              Discover Achievements
            </button>
          </div>
        )}

        {/* Legacy Tab */}
        {activeTab === 'legacy' && (
          <div className="space-y-6">
            {/* Legacy Overview */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg p-6 border-2 border-green-200">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Leaf className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Environmental Legacy</h2>
                <p className="text-gray-600">The positive impact you're creating for future generations</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-white/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{legacyData.co2Saved} kg</div>
                  <div className="text-sm text-gray-600">CO₂ Saved</div>
                </div>
                <div className="text-center p-4 bg-white/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">₹{legacyData.moneySaved}</div>
                  <div className="text-sm text-gray-600">Money Saved</div>
                </div>
                <div className="text-center p-4 bg-white/50 rounded-lg">
                  <div className="text-2xl font-bold text-emerald-600">{legacyData.treesEquivalent}</div>
                  <div className="text-sm text-gray-600">Trees Equivalent</div>
                </div>
              </div>
            </div>

            {/* Legacy Handover */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Legacy Handover Settings</h3>
              
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <Users className="h-16 w-16 mx-auto" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">No Family Members Added</h4>
                <p className="text-gray-600 mb-4">Add family members to inherit your tokens and carbon credits</p>
                <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  + Add Family Member
                </button>
              </div>
            </div>

            {/* Generational Impact */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Generational Impact</h3>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
                  <Users className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900">Multi-Generational Adoption</p>
                    <p className="text-sm text-gray-600">Your family has embraced sustainable transportation across {legacyData.generationsImpacted} generations</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                  <Award className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="font-medium text-gray-900">Environmental Pioneer Badge</p>
                    <p className="text-sm text-gray-600">Awarded for leading your family toward a sustainable future</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Account Settings */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Account Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Bell className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">Push Notifications</p>
                      <p className="text-sm text-gray-600">Get notified about bookings and offers</p>
                    </div>
                  </div>
                  <button className="w-12 h-6 bg-blue-500 rounded-full relative">
                    <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">Location Services</p>
                      <p className="text-sm text-gray-600">Find nearby chargers automatically</p>
                    </div>
                  </div>
                  <button className="w-12 h-6 bg-blue-500 rounded-full relative">
                    <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">Privacy Mode</p>
                      <p className="text-sm text-gray-600">Hide your activity from other users</p>
                    </div>
                  </div>
                  <button className="w-12 h-6 bg-gray-300 rounded-full relative">
                    <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5"></div>
                  </button>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Payment Methods</h3>
              
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <CreditCard className="h-16 w-16 mx-auto" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">No Payment Methods Added</h4>
                <p className="text-gray-600 mb-4">Add a payment method to start charging and making bookings</p>
                <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  + Add Payment Method
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-red-200">
              <h3 className="text-xl font-bold text-red-600 mb-6">Danger Zone</h3>
              
              <div className="space-y-4">
                <button className="w-full p-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors border border-red-200">
                  Export Account Data
                </button>
                <button className="w-full p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
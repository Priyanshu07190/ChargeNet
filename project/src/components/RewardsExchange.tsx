import React, { useState } from 'react';
import { Gift, Zap, Clock, Star, ShoppingBag, Coffee, Fuel } from 'lucide-react';

interface Reward {
  id: string;
  title: string;
  description: string;
  tokensRequired: number;
  category: 'voucher' | 'charging' | 'premium';
  icon: React.ReactNode;
  value: string;
  validUntil: string;
  popular?: boolean;
}

const RewardsExchange = () => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'voucher' | 'charging' | 'premium'>('all');

  const rewards: Reward[] = [
    {
      id: '1',
      title: '1 Hour Free Charging',
      description: 'Get 1 hour of free charging at any ChargeNet station',
      tokensRequired: 200,
      category: 'charging',
      icon: <Zap className="h-6 w-6" />,
      value: '₹150 Value',
      validUntil: '30 days',
      popular: true
    },
    {
      id: '2',
      title: 'Amazon Gift Voucher',
      description: '₹500 Amazon gift voucher for online shopping',
      tokensRequired: 400,
      category: 'voucher',
      icon: <ShoppingBag className="h-6 w-6" />,
      value: '₹500 Value',
      validUntil: '90 days'
    },
    {
      id: '3',
      title: 'Starbucks Coffee Voucher',
      description: 'Free coffee and snack at any Starbucks outlet',
      tokensRequired: 150,
      category: 'voucher',
      icon: <Coffee className="h-6 w-6" />,
      value: '₹300 Value',
      validUntil: '60 days'
    },
    {
      id: '4',
      title: '2 Hours Premium Charging',
      description: 'Priority access to fast chargers with premium support',
      tokensRequired: 350,
      category: 'premium',
      icon: <Star className="h-6 w-6" />,
      value: '₹400 Value',
      validUntil: '45 days',
      popular: true
    },
    {
      id: '5',
      title: 'Fuel Voucher (Emergency)',
      description: 'Emergency fuel voucher for conventional vehicles',
      tokensRequired: 300,
      category: 'voucher',
      icon: <Fuel className="h-6 w-6" />,
      value: '₹500 Value',
      validUntil: '30 days'
    },
    {
      id: '6',
      title: '3 Hours Free Charging',
      description: 'Extended free charging session at premium locations',
      tokensRequired: 500,
      category: 'charging',
      icon: <Zap className="h-6 w-6" />,
      value: '₹450 Value',
      validUntil: '30 days'
    }
  ];

  const filteredRewards = selectedCategory === 'all' 
    ? rewards 
    : rewards.filter(reward => reward.category === selectedCategory);

    const handleExchange = (reward: Reward) => {
    if (0 >= reward.tokensRequired) {
      alert(`Reward "${reward.title}" redeemed successfully!`);
    } else {
      alert(`You need ${reward.tokensRequired} tokens to redeem this reward. Complete charging sessions to earn tokens.`);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'charging': return 'bg-green-100 text-green-800';
      case 'voucher': return 'bg-blue-100 text-blue-800';
      case 'premium': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
            <Gift className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Rewards Exchange</h2>
            <p className="text-purple-600">Exchange your earned tokens for amazing rewards</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Available Tokens:</span>
              <div className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                <span className="text-2xl font-bold text-gray-900">0</span>
              </div>
            </div>
          </div>
          <div className="bg-white/50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Rewards Claimed:</span>
              <span className="text-2xl font-bold text-purple-600">0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-3">
        {[
          { id: 'all', name: 'All Rewards', icon: '🎁' },
          { id: 'charging', name: 'Free Charging', icon: '⚡' },
          { id: 'voucher', name: 'Gift Vouchers', icon: '🎫' },
          { id: 'premium', name: 'Premium', icon: '⭐' }
        ].map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
              selectedCategory === category.id
                ? 'bg-purple-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>{category.icon}</span>
            <span className="text-sm font-medium">{category.name}</span>
          </button>
        ))}
      </div>

      {/* Rewards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRewards.map((reward) => (
          <div
            key={reward.id}
            className={`bg-white rounded-2xl shadow-lg border overflow-hidden transition-all transform hover:-translate-y-1 ${
              reward.popular ? 'border-purple-300 ring-2 ring-purple-100' : 'border-gray-100'
            }`}
          >
            {reward.popular && (
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-center py-2">
                <span className="text-sm font-bold">🔥 POPULAR</span>
              </div>
            )}

            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  reward.category === 'charging' ? 'bg-green-100 text-green-600' :
                  reward.category === 'voucher' ? 'bg-blue-100 text-blue-600' :
                  'bg-purple-100 text-purple-600'
                }`}>
                  {reward.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">{reward.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(reward.category)}`}>
                    {reward.category}
                  </span>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-4">{reward.description}</p>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Value:</span>
                  <span className="font-semibold text-green-600">{reward.value}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Valid for:</span>
                  <span className="text-gray-900">{reward.validUntil}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Cost:</span>
                  <div className="flex items-center space-x-1">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <span className="font-bold text-purple-600">{reward.tokensRequired} Tokens</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleExchange(reward)}
                disabled={0 < reward.tokensRequired}
                className={`w-full px-4 py-3 rounded-xl font-semibold transition-all ${
                  0 >= reward.tokensRequired
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transform hover:scale-105'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {0 >= reward.tokensRequired 
                  ? 'Exchange Now' 
                  : 'Insufficient Tokens'
                }
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* How to Earn Tokens */}
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-green-900 mb-4">How to Earn More Tokens</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <p className="text-sm text-green-800 font-medium">Complete Charging Sessions</p>
            <p className="text-xs text-green-600">+10 tokens per session</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Star className="h-6 w-6 text-white" />
            </div>
            <p className="text-sm text-green-800 font-medium">Rate & Review</p>
            <p className="text-xs text-green-600">+5 tokens per review</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Gift className="h-6 w-6 text-white" />
            </div>
            <p className="text-sm text-green-800 font-medium">Refer Friends</p>
            <p className="text-xs text-green-600">+50 tokens per referral</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <p className="text-sm text-green-800 font-medium">Off-Peak Charging</p>
            <p className="text-xs text-green-600">+15 tokens bonus</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RewardsExchange;
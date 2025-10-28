import axios from 'axios';
import { apiService } from './apiService';

// Use environment variable for API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_RRoCzP8PpVdxfg';

console.log('💳 Payment Service initialized with API URL:', API_URL);

// Load Razorpay script dynamically
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

interface CreateOrderParams {
  amount: number;
  booking_id?: string;
  charger_id?: string;
}

interface PaymentResponse {
  success: boolean;
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
}

interface VerifyPaymentParams {
  order_id: string;
  payment_id: string;
  signature: string;
  booking_id?: string;
}

// Create payment order
export const createPaymentOrder = async (params: CreateOrderParams): Promise<PaymentResponse> => {
  try {
    // Prefer in-memory token from apiService; backend also accepts cookie session
    const token = apiService.getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await axios.post(`${API_URL}/payments/create-order`, params, {
      headers,
      withCredentials: true, // send cookies for session auth
    });
    return response.data;
  } catch (error: any) {
    console.error('Error creating payment order:', error);
    
    // Better error handling for authentication issues
    if (error.response?.status === 401 || error.response?.status === 403) {
      const authError = new Error('Authentication failed. Please login again.');
      authError.name = 'AuthError';
      throw authError;
    }
    
    throw error;
  }
};

// Verify payment
export const verifyPayment = async (params: VerifyPaymentParams): Promise<any> => {
  try {
    const token = apiService.getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await axios.post(`${API_URL}/payments/verify`, params, {
      headers,
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
};

// Get payment details
export const getPaymentDetails = async (paymentId: string): Promise<any> => {
  try {
    const token = apiService.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await axios.get(`${API_URL}/payments/${paymentId}`, {
      headers,
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching payment details:', error);
    throw error;
  }
};

// Initiate refund
export const initiateRefund = async (paymentId: string, amount?: number, bookingId?: string): Promise<any> => {
  try {
    const token = apiService.getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await axios.post(
      `${API_URL}/payments/refund`,
      {
        payment_id: paymentId,
        amount: amount,
        booking_id: bookingId,
      },
      {
        headers,
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error initiating refund:', error);
    throw error;
  }
};

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: any) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

// Open Razorpay checkout
export const openRazorpayCheckout = async (
  orderData: PaymentResponse,
  userInfo: { name: string; email: string; phone: string },
  onSuccess: (response: any) => void,
  onFailure: () => void
): Promise<void> => {
  const isLoaded = await loadRazorpayScript();

  if (!isLoaded) {
    alert('Failed to load Razorpay SDK. Please check your internet connection.');
    return;
  }

  const options: RazorpayOptions = {
    key: orderData.key_id,
    amount: orderData.amount,
    currency: orderData.currency,
    name: 'ChargeNet',
    description: 'EV Charging Payment',
    order_id: orderData.order_id,
    handler: (response: any) => {
      console.log('Payment successful:', response);
      onSuccess(response);
    },
    prefill: {
      name: userInfo.name,
      email: userInfo.email,
      contact: userInfo.phone,
    },
    theme: {
      color: '#3B82F6', // Blue color matching your app theme
    },
    modal: {
      ondismiss: () => {
        console.log('Payment cancelled by user');
        onFailure();
      },
    },
  };

  // @ts-ignore - Razorpay is loaded dynamically
  const razorpay = new window.Razorpay(options);
  razorpay.open();
};

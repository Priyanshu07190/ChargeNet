import React, { useState } from 'react';
import { CreditCard, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { createPaymentOrder, openRazorpayCheckout, verifyPayment } from '../lib/paymentService';

interface PaymentComponentProps {
  amount: number;
  bookingId?: string;
  chargerId?: string;
  onPaymentSuccess: (paymentData: any) => void;
  onPaymentFailure: () => void;
  userInfo: {
    name: string;
    email: string;
    phone: string;
  };
}

const PaymentComponent: React.FC<PaymentComponentProps> = ({
  amount,
  bookingId,
  chargerId,
  onPaymentSuccess,
  onPaymentFailure,
  userInfo,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate amount client-side to avoid unnecessary API calls
      if (!Number.isFinite(amount) || amount <= 0) {
        setError('Invalid amount. Amount must be at least ₹1.');
        setLoading(false);
        return;
      }

      // Step 1: Create payment order
      console.log('Creating payment order for amount:', amount);
      const orderData = await createPaymentOrder({
        amount,
        booking_id: bookingId,
        charger_id: chargerId,
      });

      console.log('Order created:', orderData);

      // Step 2: Open Razorpay checkout
      await openRazorpayCheckout(
        orderData,
        userInfo,
        async (response) => {
          // Payment success callback
          console.log('Razorpay response:', response);
          
          try {
            // Step 3: Verify payment on backend
            const verificationResult = await verifyPayment({
              order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              booking_id: bookingId,
            });

            console.log('Payment verified:', verificationResult);
            setSuccess(true);
            setLoading(false);
            onPaymentSuccess(verificationResult);
          } catch (verifyError) {
            console.error('Payment verification failed:', verifyError);
            setError('Payment verification failed. Please contact support.');
            setLoading(false);
            onPaymentFailure();
          }
        },
        () => {
          // Payment cancelled/failed callback
          setLoading(false);
          setError('Payment was cancelled');
          onPaymentFailure();
        }
      );
    } catch (err: any) {
      console.error('Payment error:', err);
      
      // Handle authentication errors specifically
      if (err.name === 'AuthError' || err.response?.status === 401 || err.response?.status === 403) {
        setError('Authentication failed. Please login again to continue.');
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setError(err.response?.data?.error || 'Failed to process payment. Please try again.');
      }
      
      setLoading(false);
      onPaymentFailure();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
          <CreditCard className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment</h2>
        <p className="text-gray-600">Complete your booking payment</p>
      </div>

      {/* Amount Display */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 mb-6 border border-blue-200">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-1">Total Amount</p>
          <p className="text-4xl font-bold text-gray-800">
            ₹{amount.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Payment Error</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex items-start space-x-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-800">Payment Successful!</p>
            <p className="text-xs text-green-600 mt-1">Your booking has been confirmed.</p>
          </div>
        </div>
      )}

      {/* Payment Methods Info */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-3">We accept:</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-50 border border-gray-200 rounded p-2 text-center">
            <p className="text-xs font-medium text-gray-700">UPI</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded p-2 text-center">
            <p className="text-xs font-medium text-gray-700">Cards</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded p-2 text-center">
            <p className="text-xs font-medium text-gray-700">Wallets</p>
          </div>
        </div>
      </div>

      {/* Pay Button */}
      <button
        onClick={handlePayment}
        disabled={loading || success}
        className={`w-full py-4 rounded-xl font-semibold text-white transition-all transform ${
          loading || success
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 hover:shadow-lg active:scale-95'
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center space-x-2">
            <Loader className="w-5 h-5 animate-spin" />
            <span>Processing...</span>
          </span>
        ) : success ? (
          <span className="flex items-center justify-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <span>Payment Completed</span>
          </span>
        ) : (
          `Pay ₹${amount.toFixed(2)}`
        )}
      </button>

      {/* Secure Payment Badge */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500 flex items-center justify-center space-x-1">
          <span>🔒</span>
          <span>Secured by Razorpay</span>
        </p>
      </div>

      {/* Test Mode Notice */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-xs text-yellow-800 text-center font-medium">
            🧪 TEST MODE - Use test card: 4111 1111 1111 1111
          </p>
        </div>
      )}
    </div>
  );
};

export default PaymentComponent;

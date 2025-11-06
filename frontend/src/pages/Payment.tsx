import React, { useState } from 'react';

const Payment: React.FC = () => {
  const [paymentMethod, setPaymentMethod] = useState<'fnb' | 'payfast'>('fnb');
  const [isProcessing, setIsProcessing] = useState(false);

  const cartItems = [
    { id: '1', name: 'CV Rewrite + Job Matching', price: 499, quantity: 1 },
    { id: '2', name: 'Professional Cover Letter', price: 199, quantity: 1 }
  ];

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const vat = subtotal * 0.15;
  const total = subtotal + vat;

  const handlePayment = async () => {
    setIsProcessing(true);
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsProcessing(false);
    alert('Payment processed successfully!');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Checkout</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="bg-white rounded-xl shadow border p-6">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            <div className="space-y-4 mb-6">
              {cartItems.map(item => (
                <div key={item.id} className="flex justify-between items-center border-b pb-4">
                  <div>
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="text-gray-600 text-sm">Quantity: {item.quantity}</p>
                  </div>
                  <div className="text-lg font-semibold">R {item.price}</div>
                </div>
              ))}
            </div>
            
            <div className="space-y-2 border-t pt-4">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>R {subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT (15%):</span>
                <span>R {vat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t pt-2">
                <span>Total:</span>
                <span>R {total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-xl shadow border p-6">
            <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
            
            <div className="space-y-4 mb-6">
              <div className="border rounded-lg p-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="payment"
                    value="fnb"
                    checked={paymentMethod === 'fnb'}
                    onChange={(e) => setPaymentMethod(e.target.value as 'fnb')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium">FNB Direct EFT</div>
                    <div className="text-sm text-gray-600">Secure direct bank transfer</div>
                  </div>
                  <div className="w-12 h-8 bg-blue-100 rounded flex items-center justify-center">
                    <span className="text-xs font-bold text-blue-800">FNB</span>
                  </div>
                </label>
              </div>

              <div className="border rounded-lg p-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="payment"
                    value="payfast"
                    checked={paymentMethod === 'payfast'}
                    onChange={(e) => setPaymentMethod(e.target.value as 'payfast')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium">PayFast</div>
                    <div className="text-sm text-gray-600">Credit Card, EFT, Instant EFT</div>
                  </div>
                  <div className="w-12 h-8 bg-green-100 rounded flex items-center justify-center">
                    <span className="text-xs font-bold text-green-800">PF</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Payment Details */}
            {paymentMethod === 'fnb' && (
              <div className="border rounded-lg p-4 bg-gray-50 mb-6">
                <h3 className="font-semibold mb-3">FNB EFT Instructions</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Bank:</span>
                    <span className="font-mono">First National Bank</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Account Type:</span>
                    <span className="font-mono">Business Cheque</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reference:</span>
                    <span className="font-mono">CB{Date.now().toString().slice(-6)}</span>
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'payfast' && (
              <div className="border rounded-lg p-4 bg-gray-50 mb-6">
                <h3 className="font-semibold mb-3">PayFast Payment</h3>
                <p className="text-sm text-gray-600 mb-3">
                  You will be redirected to PayFast's secure payment page to complete your transaction.
                </p>
                <div className="flex space-x-2">
                  {['visa', 'mastercard', 'amex'].map(card => (
                    <div key={card} className="w-10 h-6 bg-white border rounded flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-600">{card.slice(0,2).toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {isProcessing ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing Payment...</span>
                </div>
              ) : (
                `Pay R ${total.toFixed(2)}`
              )}
            </button>

            <div className="mt-4 text-center text-sm text-gray-600">
              <p>🔒 All transactions are secure and encrypted</p>
              <p>POPIA Compliant • 256-bit SSL Encryption</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;

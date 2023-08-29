// eslint-disable-next-line no-unused-vars
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function PaymentComp() {
  const { orderAmount } = useParams();
  const [orderId, setOrderId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchOrderId() {
      try {
        const response = await fetch(`http://localhost:5000/create-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderAmount: parseFloat(orderAmount),
          }),
        });
        const data = await response.json();
        setOrderId(data.order_id);
      } catch (error) {
        console.error('Error fetching order ID:', error);
      }
    }
    fetchOrderId();
  }, [orderAmount]);

  useEffect(() => {
    let script;
    if (orderId) {
      script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.setAttribute('data-key', `${process.env.REACT_KEY_ID}`);
      script.setAttribute('data-amount', String(orderAmount * 100));
      script.setAttribute('data-currency', 'INR');
      script.setAttribute('data-order_id', orderId);
    
      script.async = true;

      script.onload = () => {
        const options = {
          key: process.env.REACT_KEY_ID,
          amount: orderAmount * 100,
          currency: 'INR',
          order_id: orderId,
          name: 'SweetStreaks',
          handler: (response) => {
            if (response.razorpay_payment_id) {
              // Redirect to the success component
              navigate('/success');
            }
          }
        };
        const form = new window.Razorpay(options);
        form.open();
        form.on('payment.failed', (response) => {
          // Handle the failed payment here if needed
          console.log('Payment failed:', response.error);
        });

        // Add custom CSS to hide buttons
        const style = document.createElement('style');
        style.innerHTML = '.razorpay-payment-button { display: none !important; }';
        document.head.appendChild(style);
      };

      document.body.appendChild(script);
    }

    return () => {
      if (script) {
        document.body.removeChild(script);
      }
    };
  }, [orderId, orderAmount, navigate]);

  return null;
}
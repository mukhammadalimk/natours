/* eslint-disable */

import axios from 'axios';
import { showAlert } from './alerts';

const stripe = Stripe(
  'pk_test_51KsgP8KXUKep8lgPxpPzw1mSWghY2bLlpBU1O5yZfYSWvmPaU8a9cVFFUkxXEU2rwz1St1WlPxzldOBzm9pg46vZ0015Gk2gVH'
);

export const bookTour = async (tourId) => {
  try {
    // 1) Get checkout session from API
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);

    // 2) Create checkout form + chanre credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};

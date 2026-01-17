// import stripe from "stripe";
// import Booking from "../models/Booking.js";
// import { inngest } from "../inngest/index.js";

// export const stripeWebhooks = async (request, response) => {
//   const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
//   const sig = request.headers["stripe-signature"];

//   let event;

//   try {
//     event = stripeInstance.webhooks.constructEvent(
//       request.body,
//       sig,
//       process.env.STRIPE_WEBHOOK_SECRET
//     );
//   } catch (error) {
//     return response.status(400).send(`Webhook Error: ${error.message}`);
//   }

//   try {
//     switch (event.type) {
//       case "payment_intent.succeeded": {
//         const paymentIntent = event.data.object;
//         const sessionList = await stripeInstance.checkout.sessions.list({
//           payment_intent: paymentIntent.id,
//         });

//         const session = sessionList.data[0];
//         const { bookingId } = session.metadata;

//         await Booking.findByIdAndUpdate(bookingId, {
//           isPaid: true,
//           paymentLink: "",
//         });

//         // Send Confirmation Email
//         await inngest.send({
//           name: "app/show.booked",
//           data: { bookingId },
//         });

//         break;
//       }

//       default:
//         console.log("Unhandled event type:", event.type);
//     }

//     response.json({ received: true });
//   } catch (error) {
//     console.error("Webhook processing error:", error);
//     response.status(500).send("Internal Server Error");
//   }
// };
import Stripe from "stripe";
import Booking from "../models/Booking.js";
import { inngest } from "../inngest/index.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (request, response) => {
  console.log("🔥 STRIPE WEBHOOK HIT");

  const sig = request.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      request.body, // RAW body required
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("❌ Signature verification failed:", error.message);
    return response.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    console.log("🔔 Stripe Event:", event.type);

    switch (event.type) {
      case "payment_intent.succeeded": {
        console.log("✅ Payment success event received");

        const paymentIntent = event.data.object;

        const sessionList = await stripe.checkout.sessions.list({
          payment_intent: paymentIntent.id,
        });

        if (!sessionList.data.length) {
          console.error("❌ No session found for paymentIntent");
          break;
        }

        const session = sessionList.data[0];

        if (!session.metadata?.bookingId) {
          console.error("❌ bookingId missing in metadata");
          break;
        }

        const { bookingId } = session.metadata;

        console.log("📦 Booking ID:", bookingId);

        await Booking.findByIdAndUpdate(bookingId, {
          isPaid: true,
          paymentLink: "",
        });

        console.log("🚀 Sending Inngest Event: app/show.booked");

        await inngest.send({
          name: "app/show.booked",
          data: { bookingId },
        });

        console.log("📨 Inngest event sent successfully");
        break;
      }

      default:
        console.log("ℹ️ Unhandled event:", event.type);
    }

    response.json({ received: true });
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    response.status(500).send("Internal Server Error");
  }
};

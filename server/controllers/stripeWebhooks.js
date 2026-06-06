import Stripe from "stripe";
import Booking from "../models/Booking.js";
import { inngest } from "../inngest/index.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (request, response) => {
  const sig = request.headers["stripe-signature"];

  // ── Signature verification ─────────────────────────────────────────────────
  // request.body must be the raw Buffer (express.raw middleware must precede this).
  // If it has been parsed by express.json() the signature will never match.
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      request.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("❌ Stripe signature verification failed:", error.message);
    // Return 400 — Stripe will retry the webhook on 4xx/5xx responses.
    return response.status(400).send(`Webhook Error: ${error.message}`);
  }

  // ── Event handling ─────────────────────────────────────────────────────────
  try {
    switch (event.type) {

      case "checkout.session.completed": {
        const session = event.data.object;

        // Guard: bookingId must exist in metadata (set when creating the session).
        if (!session.metadata?.bookingId) {
          console.error("❌ bookingId missing in Stripe session metadata", session.id);
          // Return 200 so Stripe doesn't keep retrying a permanently broken event.
          return response.json({ received: true, warning: "bookingId missing" });
        }

        const { bookingId } = session.metadata;

        // Medium fix: verify booking exists and isn't already paid before updating.
        // Stripe can occasionally deliver the same webhook event more than once
        // (at-least-once delivery guarantee) — idempotency check prevents double-processing.
        const booking = await Booking.findById(bookingId);

        if (!booking) {
          console.error("❌ Booking not found for bookingId:", bookingId);
          // 200 so Stripe stops retrying — the booking is genuinely gone.
          return response.json({ received: true, warning: "Booking not found" });
        }

        if (booking.isPaid) {
          console.log("ℹ️ Booking already marked paid (duplicate webhook):", bookingId);
          return response.json({ received: true, note: "already paid" });
        }

        // Verify the amount paid matches what we expected (fraud check).
        // session.amount_total is in cents.
        const expectedCents = Math.round(booking.amount * 100);
        if (session.amount_total !== expectedCents) {
          console.error(
            `❌ Amount mismatch for booking ${bookingId}: ` +
            `expected ${expectedCents}¢ but Stripe paid ${session.amount_total}¢`
          );
          // Do NOT mark as paid — flag for manual review.
          return response.status(400).send("Amount mismatch — booking not confirmed.");
        }

        // All checks passed — mark booking paid and trigger confirmation email.
        await Booking.findByIdAndUpdate(bookingId, {
          isPaid:      true,
          paymentLink: "",   // clear the link so MyBookings doesn't show stale URL
        });

        // Fire the Inngest event that sends the confirmation email.
        await inngest.send({
          name: "app/show.booked",
          data: { bookingId },
        });

        console.log("✅ Booking confirmed:", bookingId);
        break;
      }

      // checkout.session.expired fires when a session is not completed in time.
      // We don't need to do anything here — Inngest's releaseSeatsAndDeleteBooking
      // handles cleanup after 31 minutes independently.
      case "checkout.session.expired": {
        const session = event.data.object;
        console.log("ℹ️ Checkout session expired:", session.id,
          "| bookingId:", session.metadata?.bookingId ?? "unknown");
        break;
      }

      default:
        // Unknown events are silently accepted so Stripe marks them delivered.
        break;
    }

    response.json({ received: true });

  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    // 500 → Stripe will retry. Safe because all handlers above are idempotent.
    response.status(500).send("Internal Server Error");
  }
};

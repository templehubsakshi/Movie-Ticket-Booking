import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import { sendEmail } from "../configs/nodeMailer.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "movie-ticket-booking" });

// Inngest Function to save user data to a database
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    try {
      const { id, first_name, last_name, email_addresses, image_url } =
        event.data;
      const userData = {
        _id: id,
        email: email_addresses?.[0]?.email_address || "",
        name: `${first_name || ""} ${last_name || ""}`.trim(),
        image: image_url || "",
      };
      await User.create(userData);
      console.log("✅ User synced:", id);
    } catch (error) {
      console.error("❌ User sync failed:", error);
    }
  }
);

// Inngest Function to delete user from database
const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-with-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    try {
      const { id } = event.data;
      await User.findByIdAndDelete(id);
      console.log("🗑️ User deleted:", id);
    } catch (error) {
      console.error("❌ User delete failed:", error);
    }
  }
);

// Inngest Function to update user data in database
const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    try {
      const { id, first_name, last_name, email_addresses, image_url } =
        event.data;
      const userData = {
        email: email_addresses?.[0]?.email_address || "",
        name: `${first_name || ""} ${last_name || ""}`.trim(),
        image: image_url || "",
      };
      await User.findByIdAndUpdate(id, userData);
      console.log("🔁 User updated:", id);
    } catch (error) {
      console.error("❌ User update failed:", error);
    }
  }
);

// Inngest Function to cancel booking and release seats of show after 10 minutes of booking created if payment is not made
const releaseSeatsAndDeleteBooking = inngest.createFunction(
  { id: "release-seats-delete-booking" },
  { event: "app/checkpayment" },
  async ({ event, step }) => {
    try {
      console.log("🔥 Payment check started:", event.data);
      
      const tenMinutesLater = new Date(Date.now() + 10 * 60 * 1000);
      await step.sleepUntil("wait-for-10-minutes", tenMinutesLater);

      await step.run("check-payment-status", async () => {
        const bookingId = event.data.bookingId;
        const booking = await Booking.findById(bookingId);

        if (!booking) {
          console.log("⚠️ Booking already deleted:", bookingId);
          return { success: false, reason: "Booking not found" };
        }

        // If payment is made, do nothing
        if (booking.isPaid) {
          console.log("💰 Payment completed, no action needed");
          return { success: true, paid: true };
        }

        // If payment is not made, release seats and delete booking
        const show = await Show.findById(booking.show);
        
        if (!show) {
          console.log("⚠️ Show not found");
          return { success: false, reason: "Show not found" };
        }

        booking.bookedSeats.forEach((seat) => {
          delete show.occupiedSeats[seat];
        });
        
        show.markModified("occupiedSeats");
        await show.save();
        await Booking.findByIdAndDelete(booking._id);
        
        console.log("🗑️ Booking deleted & seats released:", bookingId);
        return { success: true, deleted: true };
      });
    } catch (error) {
      console.error("❌ Seat release failed:", error);
      return { success: false, error: error.message };
    }
  }
);

// Inngest Function to send email when user books a show
const sendBookingConfirmationEmail = inngest.createFunction(
  { id: "send-booking-confirmation-email" },
  { event: "app/show.booked" },
  async ({ event, step }) => {
    try {
      const { bookingId } = event.data;
      console.log("📧 Sending confirmation email for booking:", bookingId);

      const booking = await Booking.findById(bookingId)
        .populate({
          path: "show",
          populate: { path: "movie", model: "Movie" },
        })
        .populate("user");

      if (!booking) {
        console.log("⚠️ Booking not found:", bookingId);
        return { success: false };
      }

      if (!booking.user?.email) {
        console.log("⚠️ User email not found for booking:", bookingId);
        return { success: false };
      }

      await sendEmail({
        to: booking.user.email,
        subject: `Payment Confirmation: "${booking.show.movie.title}" booked!`,
        body: `<div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>Hi ${booking.user.name},</h2>
          <p>Your booking for <strong style="color: #F84565;">"${
            booking.show.movie.title
          }"</strong> is confirmed.</p>
          <p>
            <strong>Date:</strong> ${new Date(
              booking.show.showDateTime
            ).toLocaleDateString("en-US", { timeZone: "Africa/Kigali" })}<br />
            <strong>Time:</strong> ${new Date(
              booking.show.showDateTime
            ).toLocaleTimeString("en-US", { timeZone: "Africa/Kigali" })}<br />
            <strong>Seats:</strong> ${booking.bookedSeats.join(", ")}<br />
            <strong>Amount:</strong> $${booking.amount}
          </p>
          <p>Enjoy the show! 🍿</p>
          <p>Thanks for booking with us!<br />- QuickShow Team</p>
        </div>`,
      });

      console.log("📩 Email sent successfully to:", booking.user.email);
      return { success: true };
    } catch (error) {
      console.error("❌ Email failed:", error);
      return { success: false, error: error.message };
    }
  }
);

// Inngest Function to send reminders
const sendShowReminders = inngest.createFunction(
  { id: "send-show-reminders" },
  { cron: "0 */8 * * *" }, // Every 8 hours
  async ({ step }) => {
    try {
      const now = new Date();
      const in8Hours = new Date(now.getTime() + 8 * 60 * 60 * 1000);
      const windowStart = new Date(in8Hours.getTime() - 10 * 60 * 1000);

      // Prepare reminder tasks
      const reminderTasks = await step.run("prepare-reminder-tasks", async () => {
        const shows = await Show.find({
          showTime: { $gte: windowStart, $lte: in8Hours },
        }).populate("movie");

        const tasks = [];

        for (const show of shows) {
          if (!show.movie || !show.occupiedSeats) continue;

          const userIds = [...new Set(Object.values(show.occupiedSeats))];
          if (userIds.length === 0) continue;

          const users = await User.find({ _id: { $in: userIds } }).select(
            "name email"
          );

          for (const user of users) {
            if (user.email) {
              tasks.push({
                userEmail: user.email,
                userName: user.name,
                movieTitle: show.movie.title,
                showTime: show.showTime,
              });
            }
          }
        }

        return tasks;
      });

      if (reminderTasks.length === 0) {
        return { sent: 0, message: "No reminders to send." };
      }

      // Send reminder emails
      const results = await step.run("send-all-reminders", async () => {
        return await Promise.allSettled(
          reminderTasks.map((task) =>
            sendEmail({
              to: task.userEmail,
              subject: `Reminder: Your movie "${task.movieTitle}" starts soon!`,
              body: `<div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Hello ${task.userName},</h2>
                <p>This is a quick reminder that your movie:</p>
                <h3 style="color: #F84565;">"${task.movieTitle}"</h3>
                <p>
                  is scheduled for <strong>${new Date(task.showTime).toLocaleDateString(
                    "en-US",
                    { timeZone: "Africa/Kigali" }
                  )}</strong> at
                  <strong>${new Date(task.showTime).toLocaleTimeString("en-US", {
                    timeZone: "Africa/Kigali",
                  })}</strong>.
                </p>
                <p>It starts in approximately <strong>8 hours</strong> - make sure you're ready!</p>
                <br />
                <p>Enjoy the show! 🍿 - QuickShow Team</p>
              </div>`,
            })
          )
        );
      });

      const sent = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - sent;

      console.log(`📬 Sent ${sent} reminder emails, ${failed} failed`);
      
      return {
        sent,
        failed,
        message: `Sent ${sent} reminder(s), ${failed} failed.`,
      };
    } catch (error) {
      console.error("❌ Reminder job failed:", error);
      return { success: false, error: error.message };
    }
  }
);

// Inngest Function to send notifications when a new show is added
const sendNewShowNotifications = inngest.createFunction(
  { id: "send-new-show-notifications" },
  { event: "app/show.added" },
  async ({ event }) => {
    try {
      const { movieTitle } = event.data;
      const users = await User.find({});

      const emailPromises = users
        .filter(user => user.email)
        .map(user =>
          sendEmail({
            to: user.email,
            subject: `🎬 New Show Added: ${movieTitle}`,
            body: `<div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>Hi ${user.name},</h2>
              <p>We've just added a new show to our library:</p>
              <h3 style="color: #F84565;">"${movieTitle}"</h3>
              <p>Visit our website - <a href="https://quickshow-sigma-roan.vercel.app/">QuickShow</a> 🔗</p>
              <br />
              <p>Thanks, <br />QuickShow Team</p>
            </div>`,
          })
        );

      await Promise.allSettled(emailPromises);

      console.log("📢 New show notifications sent");
      return { message: "Notifications sent." };
    } catch (error) {
      console.error("❌ New show notification failed:", error);
      return { success: false, error: error.message };
    }
  }
);

export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  releaseSeatsAndDeleteBooking,
  sendBookingConfirmationEmail,
  sendShowReminders,
  sendNewShowNotifications,
];
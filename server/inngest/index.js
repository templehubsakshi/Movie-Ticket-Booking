import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import { sendEmail } from "../configs/nodeMailer.js";

/*
  -----------------------------
  INNGEST CLIENT
  -----------------------------
  Ye ek central event system hai
  socho jaise:
  "agar X hua → toh automatically Y karo"

  id: project ka unique naam
*/
export const inngest = new Inngest({
  id: "movie-ticket-booking",
});

/*
  =====================================================
  USER CREATE SYNC (CLERK → DATABASE)
  =====================================================
  Jab bhi Clerk me new user banta hai
  Clerk khud event bhejta hai:
  "clerk/user.created"
*/
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" }, // function ka unique naam
  { event: "clerk/user.created" }, // Clerk ka event
  async ({ event }) => {
    // ye data CLERK se aata hai (auto)
    const {
      id,
      first_name,
      last_name,
      email_addresses,
      image_url,
    } = event.data;

    // Clerk user → apne DB ke format me
    const userData = {
      _id: id, // Clerk ka userId hi hum Mongo me use kar rahe
      email: email_addresses[0].email_address,
      name: first_name + " " + last_name,
      image: image_url,
    };

    // MongoDB me save
    await User.create(userData);

    // POSSIBLE ISSUE:
    // Agar Clerk webhook setup nahi hua
    // toh ye function kabhi trigger hi nahi hoga
  }
);

/*
  =====================================================
  USER DELETE SYNC
  =====================================================
  Agar user Clerk se delete hota hai
  toh apni DB se bhi hata do
*/
const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-with-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const { id } = event.data;

    // Mongo se user delete
    await User.findByIdAndDelete(id);

    // POSSIBLE ISSUE:
    // Agar user ke bookings exist karti hain
    // toh orphan data reh sakta hai
  }
);

/*
  =====================================================
  USER UPDATE SYNC
  =====================================================
  Agar user Clerk profile update kare
  toh DB me bhi update
*/
const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const {
      id,
      first_name,
      last_name,
      email_addresses,
      image_url,
    } = event.data;

    const userData = {
      _id: id,
      email: email_addresses[0].email_address,
      name: first_name + " " + last_name,
      image: image_url,
    };

    await User.findByIdAndUpdate(id, userData);

    // POSSIBLE ISSUE:
    // Agar email_addresses empty ho
    // toh error aa sakta hai
  }
);


  // =====================================================
  // RELEASE SEATS IF PAYMENT NOT DONE
  // =====================================================
  // Ye function booking ke baad run hota hai
  // Agar 10 minutes me payment nahi hua
  // toh:
  // - seats free
  // - booking delete

 const releaseSeatsAndDeleteBooking = inngest.createFunction(
   { id: "release-seats-delete-booking" },
  { event: "app/checkpayment" }, // ye event booking controller bhejta hai
  async ({ event, step }) => {

    // current time + 10 minutes
    const tenMinutesLater = new Date(
      Date.now() + 10 * 60 * 1000
    );

    // Inngest ko bol rahe:
    // "10 minute ruk ja"
    await step.sleepUntil(
      "wait-for-10-minutes",
      tenMinutesLater
    );

    await step.run("check-payment-status", async () => {
      const bookingId = event.data.bookingId;

      // DB se booking lao
      const booking = await Booking.findById(bookingId);

      // agar payment nahi hua
      if (!booking.isPaid) {
        const show = await Show.findById(booking.show);

        // jitni seats book hui thi
        // unko free kar do
        booking.bookedSeats.forEach((seat) => {
          delete show.occupiedSeats[seat];
        });

        // important kyunki occupiedSeats object hai
        show.markModified("occupiedSeats");
        await show.save();

        // booking delete
        await Booking.findByIdAndDelete(booking._id);
      }

      // POSSIBLE ISSUE:
      // Agar booking pehle hi delete ho chuki ho
      // toh booking null ho sakti hai
    });
  }
);

/*
  =====================================================
  SEND BOOKING CONFIRMATION EMAIL
  =====================================================
  Payment successful hone ke baad
  ye event trigger hota hai
*/
const sendBookingConfirmationEmail = inngest.createFunction(
  { id: "send-booking-confirmation-email" },
  { event: "app/show.booked" },
  async ({ event }) => {
    const { bookingId } = event.data;

    // booking + show + movie + user sab lao
    const booking = await Booking.findById(bookingId)
      .populate({
        path: "show",
        populate: { path: "movie", model: "Movie" },
      })
      .populate("user");

    // mail bhejna
    await sendEmail({
      to: booking.user.email,
      subject: `Payment Confirmation: "${booking.show.movie.title}" booked!`,
      body: `...html body...`,
    });

    // POSSIBLE ISSUE:
    // Agar email config galat hui
    // toh booking ho jayegi but mail nahi jayega
  }
);

/*
  =====================================================
  SEND SHOW REMINDERS (CRON JOB)
  =====================================================
  Har 8 ghante me run hota hai
  upcoming shows ke liye
*/
const sendShowReminders = inngest.createFunction(
  { id: "send-show-reminders" },
  { cron: "0 */8 * * *" }, // every 8 hours
  async ({ step }) => {

    const now = new Date();
    const in8Hours = new Date(
      now.getTime() + 8 * 60 * 60 * 1000
    );

    // show start hone se 10 min pehle
    const windowStart = new Date(
      in8Hours.getTime() - 10 * 60 * 1000
    );

    // reminder ke liye tasks ready karo
    const reminderTasks = await step.run(
      "prepare-reminder-tasks",
      async () => {

        const shows = await Show.find({
          showTime: { $gte: windowStart, $lte: in8Hours },
        }).populate("movie");

        const tasks = [];

        for (const show of shows) {
          if (!show.movie || !show.occupiedSeats) continue;

          // unique users nikaalo
          const userIds = [
            ...new Set(Object.values(show.occupiedSeats)),
          ];

          if (userIds.length === 0) continue;

          const users = await User.find({
            _id: { $in: userIds },
          }).select("name email");

          for (const user of users) {
            tasks.push({
              userEmail: user.email,
              userName: user.name,
              movieTitle: show.movie.title,
              showTime: show.showTime,
            });
          }
        }

        return tasks;
      }
    );

    if (reminderTasks.length === 0) {
      return { sent: 0 };
    }

    // saare emails bhejo
    await step.run("send-all-reminders", async () => {
      return Promise.allSettled(
        reminderTasks.map((task) =>
          sendEmail({
            to: task.userEmail,
            subject: `Reminder: "${task.movieTitle}"`,
            body: `...html body...`,
          })
        )
      );
    });
  }
);

/*
  =====================================================
  NEW SHOW NOTIFICATION
  =====================================================
  Jab admin naya show add kare
  tab sab users ko email
*/
const sendNewShowNotifications = inngest.createFunction(
  { id: "send-new-show-notifications" },
  { event: "app/show.added" },
  async ({ event }) => {
    const { movieTitle } = event.data;

    const users = await User.find({});

    for (const user of users) {
      await sendEmail({
        to: user.email,
        subject: `New Show Added: ${movieTitle}`,
        body: `...html body...`,
      });
    }
  }
);


/*
  =====================================================
  EXPORT ALL FUNCTIONS
  =====================================================
  Ye array server.js me use hota hai
*/
export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
 releaseSeatsAndDeleteBooking,
  sendBookingConfirmationEmail,
  sendShowReminders,
  sendNewShowNotifications,
];

// Clerk Event → Inngest → MongoDB
// Booking Event → Inngest → Seats / Emails
// Cron Job → Inngest → Reminder Emails


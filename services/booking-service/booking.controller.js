import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Booking, SubscriptionBooking } from "../../models/booking.model.js";
import { TimeSlot } from "../../models/timeslot.model.js";
import { Holiday } from "../../models/holiday.model.js";
import { OrderDetails } from "../../models/order.model.js";
import {
  sendEmail,
  sendBookingConfirmationEmail,
} from "../../utils/email.helper.js";
import NotificationService from "../../messaging_feature/services/NotificationService.js";
import { Subscription } from "../../models/subscription.model.js";

//create manual booking
const createManualBooking = asyncHandler(async (req, res) => {
  try {
    const {
      customerId,
      petId,
      serviceTypeId,
      subServiceId,
      groomerId,
      timeSlotId,
      date,
      status,
      price,
      notes,
      petWeight,
    } = req.body;

    if (!groomerId || !timeSlotId || !date) {
      return res
        .status(400)
        .json(new ApiResponse(400, "Groomer, TimeSlot, and Date are required"));
    }

    // Fetch the timeslot details
    const timeslot = await TimeSlot.findById(timeSlotId);
    if (!timeslot) {
      return res.status(404).json(new ApiResponse(404, "TimeSlot not found"));
    }

    const newBookingKey = `${new Date(
      timeslot.startTime
    ).toISOString()}_${groomerId.toString()}`;

    const usedKeys = new Set();

    // 1️⃣ Fetch existing OrderDetails for the date
    const orderDetails = await OrderDetails.find()
      .populate("order")
      .populate("groomer")
      .select("first_name last_name phone_number email")
      .populate("orderDetails.timeslot")
      .lean();

    //   console.log("OrderDetails------------------>",orderDetails);

    for (const detail of orderDetails) {
      if (!detail.timeslot) continue;
      const orderDate = new Date(detail.timeslot.bookingDate)
        .toISOString()
        .split("T")[0];
      const reqDate = new Date(date).toISOString().split("T")[0];
      if (orderDate !== reqDate) continue;

      const key = `${new Date(detail.timeslot.startTime).toISOString()}_${
        detail.groomer?._id?.toString() || ""
      }`;
      usedKeys.add(key);
    }

    // 2️⃣ Fetch existing Bookings for the date
    const existingBookings = await Booking.find({
      date: new Date(date),
    })
      .populate("timeSlot")
      .populate("groomer")
      .lean();

    for (const booking of existingBookings) {
      if (!booking.timeSlot) continue;
      const key = `${new Date(booking.timeSlot.startTime).toISOString()}_${
        booking.groomer?._id?.toString() || ""
      }`;
      usedKeys.add(key);
    }

    // 3️⃣ Check for conflict
    if (usedKeys.has(newBookingKey)) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "This groomer is already assigned to the selected timeslot on this date."
          )
        );
    }

    // 4️⃣ If no conflict, create the booking
    const newBooking = await Booking.create({
      customer: customerId,
      pet: petId,
      serviceType: serviceTypeId,
      subService: subServiceId,
      groomer: groomerId,
      timeSlot: timeSlotId,
      date: new Date(date),
      status: status || "Pending",
      price,
      notes,
      petWeight,
    });

    const populatedBooking = await Booking.findById(newBooking._id)
      .populate("customer", "_id first_name email")
      .populate("pet", "petName")
      .populate("serviceType", "name")
      .populate("subService", "name")
      .populate("groomer", "_id first_name email")
      .populate("timeSlot");

    if (!populatedBooking) {
      return res
        .status(404)
        .json(new ApiResponse(404, "Booking not found after creation."));
    }

    await sendBookingConfirmationEmail({
      to: populatedBooking.customer.email,
      subject: "Booking Confirmed!",
      bookingData: {
        customerName: populatedBooking.customer.first_name,
        petName: populatedBooking.pet.petName,
        serviceType: populatedBooking.serviceType.name,
        subService: populatedBooking.subService.name,
        date: new Date(populatedBooking.date).toDateString(),
        time: new Date(
          populatedBooking.timeSlot.startTime
        ).toLocaleTimeString(),
        groomerName: populatedBooking.groomer.first_name,
      },
    });

    // Notify customer
    await NotificationService.sendToCustomer({
      userId: populatedBooking.customer._id,
      title: "Booking Confirmed 🎉",
      message: `Your booking for ${
        populatedBooking.subService.name
      } on ${new Date(populatedBooking.date).toDateString()} at ${new Date(
        populatedBooking.timeSlot.startTime
      ).toLocaleTimeString()} has been confirmed.`,
      type: "Booking",
    });

    // Notify groomer
    await NotificationService.sendToGroomer({
      userId: populatedBooking.groomer._id,
      title: "New Booking Assigned 📅",
      message: `You have a new booking for ${
        populatedBooking.subService.name
      } on ${new Date(populatedBooking.date).toDateString()} at ${new Date(
        populatedBooking.timeSlot.startTime
      ).toLocaleTimeString()}.`,
      type: "Booking",
    });
    // console.log("newBooking--------------------------------->",populatedBooking);
    // console.log("email payload---------------------------->",emailPayload);

    return res
      .status(201)
      .json(new ApiResponse(201, newBooking, "Booking created successfully"));
  } catch (error) {
    console.error("Create Booking Error:", error);
    res.status(500).json(new ApiError(500, "Failed to create booking"));
  }
});

//update booking status

const updateManualBooking = asyncHandler(async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { groomerId, date, timeSlotId, subServiceId } = req.body;

    // console.log("req.body---------------------------------------->",req.body);
    // console.log("req.params-------------------------------------->",req.params.bookingId);

    if (!groomerId || !timeSlotId || !date || !subServiceId) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            "Groomer, TimeSlot, Date and SubService are required"
          )
        );
    }

    // Fetch the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json(new ApiResponse(404, "Booking not found"));
    }

    // Fetch timeslot details
    const timeslot = await TimeSlot.findById(timeSlotId);
    if (!timeslot) {
      return res.status(404).json(new ApiResponse(404, "TimeSlot not found"));
    }

    const newBookingKey = `${new Date(
      timeslot.startTime
    ).toISOString()}_${groomerId.toString()}`;

    const usedKeys = new Set();

    // Fetch existing OrderDetails for the date
    const orderDetails = await OrderDetails.find()
      .populate("order")
      .populate("groomer")
      .select("first_name last_name phone_number email")
      .populate("orderDetails.timeslot")
      .lean();

    for (const detail of orderDetails) {
      if (!detail.timeslot) continue;
      const orderDate = new Date(detail.timeslot.bookingDate)
        .toISOString()
        .split("T")[0];
      const reqDate = new Date(date).toISOString().split("T")[0];
      if (orderDate !== reqDate) continue;

      const key = `${new Date(detail.timeslot.startTime).toISOString()}_${
        detail.groomer?._id?.toString() || ""
      }`;
      usedKeys.add(key);
    }

    // Fetch existing Bookings for the date (excluding this one)
    const existingBookings = await Booking.find({
      date: new Date(date),
      _id: { $ne: bookingId },
    })
      .populate("timeSlot")
      .populate("groomer")
      .lean();

    for (const b of existingBookings) {
      if (!b.timeSlot) continue;
      const key = `${new Date(b.timeSlot.startTime).toISOString()}_${
        b.groomer?._id?.toString() || ""
      }`;
      usedKeys.add(key);
    }

    // Check conflict
    if (usedKeys.has(newBookingKey)) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "This groomer is already assigned to the selected timeslot on this date."
          )
        );
    }

    // If no conflict, update booking
    booking.groomer = groomerId;
    booking.date = new Date(date);
    booking.timeSlot = timeSlotId;
    booking.subService = subServiceId;

    await booking.save();

    // Populate updated booking for email
    const populatedBooking = await Booking.findById(bookingId)
      .populate("customer", "_id first_name email")
      .populate("pet", "petName")
      .populate("serviceType", "name")
      .populate("subService", "name")
      .populate("groomer", "_id first_name email")
      .populate("timeSlot");

    if (!populatedBooking) {
      return res
        .status(404)
        .json(new ApiResponse(404, "Booking not found after update."));
    }

    // Send update confirmation email
    await sendBookingConfirmationEmail({
      to: populatedBooking.customer.email,
      subject: "Booking Updated!",
      bookingData: {
        customerName: populatedBooking.customer.first_name,
        petName: populatedBooking.pet.petName,
        serviceType: populatedBooking.serviceType.name,
        subService: populatedBooking.subService.name,
        date: new Date(populatedBooking.date).toDateString(),
        time: new Date(
          populatedBooking.timeSlot.startTime
        ).toLocaleTimeString(),
        groomerName: populatedBooking.groomer.first_name,
      },
    });

    // Notify customer
    await NotificationService.sendToCustomer({
      userId: populatedBooking.customer._id,
      title: "Booking Confirmed 🎉",
      message: `Your booking for ${
        populatedBooking.subService.name
      } on ${new Date(populatedBooking.date).toDateString()} at ${new Date(
        populatedBooking.timeSlot.startTime
      ).toLocaleTimeString()} has been confirmed.`,
      type: "Booking",
    });

    // Notify groomer
    await NotificationService.sendToGroomer({
      userId: populatedBooking.groomer._id,
      title: "New Booking Assigned 📅",
      message: `You have a new booking for ${
        populatedBooking.subService.name
      } on ${new Date(populatedBooking.date).toDateString()} at ${new Date(
        populatedBooking.timeSlot.startTime
      ).toLocaleTimeString()}.`,
      type: "Booking",
    });
    return res
      .status(200)
      .json(new ApiResponse(200, booking, "Booking updated successfully"));
  } catch (error) {
    console.error("Update Booking Error:", error);
    res.status(500).json(new ApiError(500, "Failed to update booking"));
  }
});

const getAllBookings = asyncHandler(async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate({
        path: "customer",
        select: "-otp -otp_time -password -refreshToken",
      })
      .populate({
        path: "pet",
        populate: [
          {
            path: "breed",
          },
          {
            path: "petType",
          },
        ],
      })
      .populate("serviceType")
      .populate("subService")
      .populate("timeSlot")
      .populate("groomer");

    const response = new ApiResponse(
      200,
      bookings,
      "Bookings fetched successfully"
    );
    res.status(200).json(response);
  } catch (error) {
    const response = new ApiError(500, "Internal Server Error", error.message);
    res.status(500).json(response);
  }
});

//get booking by id
// const getBookingById = asyncHandler(async (req, res) => {
//     try {
//         const { bookingId } = req.params;

//         const booking = await Booking.findById(bookingId)
//             .populate('customer')
//             .populate('pet')
//             .populate('serviceType')
//             .populate('subService')
//             .populate('timeSlotId')
//             .populate('groomer');

//         if (!booking) {
//             throw new ApiError(404, 'Booking not found');
//         }

//         const response = new ApiResponse(200, booking, 'Booking fetched successfully' );
//         res.status(200).json(response);
//     } catch (error) {
//         const response = new ApiError(500, 'Internal Server Error', error.message);
//         res.status(500).json(response);
//     }
// });

//delete booking
const deleteBooking = asyncHandler(async (req, res) => {
  try {
    const { bookingId } = req.params;

    const deletedBooking = await Booking.findByIdAndDelete(bookingId);

    if (!deletedBooking) {
      throw new ApiError(404, "Booking not found");
    }

    const response = new ApiResponse(
      200,
      deletedBooking,
      "Booking deleted successfully"
    );
    res.status(200).json(response);
  } catch (error) {
    const response = new ApiError(500, "Internal Server Error", error.message);
    res.status(500).json(response);
  }
});

//confirm timeslot booking
const confirmTimeslotBooking = asyncHandler(async (req, res) => {
  try {
    const { timeslotId } = req.params;
    const { customerId, groomerId } = req.body;

    const timeslot = await TimeSlot.findById(timeslotId);
    if (!timeslot) {
      return res.status(404).json(new ApiError(404, "Timeslot not found"));
    }

    if (timeslot.isBooked) {
      return res
        .status(400)
        .json(new ApiError(400, "Timeslot is already booked"));
    }

    const groomerToCheck = groomerId || timeslot.groomer;
    const bookingStart = new Date(timeslot.startTime);
    const bookingEnd = new Date(timeslot.endTime);

    // 1. Check for conflicting booked timeslots
    const conflictingBooking = await TimeSlot.findOne({
      _id: { $ne: timeslot._id },
      groomer: groomerToCheck,
      isBooked: true,
      bookingDate: timeslot.bookingDate,
      startTime: { $lt: bookingEnd },
      endTime: { $gt: bookingStart },
    });

    if (conflictingBooking) {
      return res
        .status(400)
        .json(
          new ApiError(400, "Groomer has a conflicting booking at this time")
        );
    }

    // 2. Check for groomer or office-wide holiday
    const holiday = await Holiday.findOne({
      startDate: { $lte: bookingStart },
      endDate: { $gte: bookingStart },
      $or: [
        { groomer: groomerToCheck },
        { groomer: null }, // office-wide holiday
      ],
    });

    if (holiday) {
      return res
        .status(400)
        .json(new ApiError(400, "Cannot book — it's a holiday"));
    }

    // 3. Confirm booking
    timeslot.customer = customerId;
    timeslot.groomer = groomerToCheck;
    timeslot.isBooked = true;

    await timeslot.save();

    return res
      .status(200)
      .json(new ApiResponse(200, timeslot, "Timeslot booking confirmed"));
  } catch (error) {
    console.error("Error------", error);
    return res
      .status(500)
      .json(
        new ApiError(500, error.message || "Failed to confirm timeslot booking")
      );
  }
});

//subscription booking
// Create a new booking
const createSubscriptionBooking = asyncHandler(async (req, res) => {
  const { subscription } = req.body;
  const customer = req.user._id;

  if (!subscription) {
    throw new ApiError(400, "Subscription ID is required");
  }

  // Fetch the subscription details
  const foundSubscription = await Subscription.findById(subscription);
  if (!foundSubscription) {
    throw new ApiError(404, "Subscription not found");
  }

  // Validate the subscription has a valid date range
  if (
    !Array.isArray(foundSubscription.date) ||
    foundSubscription.date.length < 2
  ) {
    throw new ApiError(400, "Subscription date range is invalid");
  }

  const expiryDate = new Date(foundSubscription.date[1]);
  const today = new Date();

  // Check if the subscription has expired
  if (expiryDate < today) {
    throw new ApiError(400, "This subscription has already expired");
  }

  // Check if the user has already booked this specific subscription
  const existingBooking = await SubscriptionBooking.findOne({
    customer,
    subscription,
  });

  if (existingBooking) {
    throw new ApiError(400, "You have already booked this subscription");
  }

  // Create the booking
  const newBooking = await SubscriptionBooking.create({
    subscription,
    customer,
  });

  // Populate the subscription details in the response
  const populatedBooking = await SubscriptionBooking.findById(newBooking._id)
    .populate("subscription");

  return res
    .status(201)
    .json(new ApiResponse(201, populatedBooking, "Subscription booked successfully"));
});

// const updateSubscriptionBooking = asyncHandler(async (req, res) => {
//   try {
//     const { bookingId } = req.params;
//     const { subscription } = req.body;

//     if (!subscription) {
//       return res
//         .status(400)
//         .json(new ApiError(400, "Subscription is required"));
//     }

//     const booking = await SubscriptionBooking.findById(bookingId);
//     if (!booking) {
//       return res.status(404).json(new ApiError(404, "Booking not found"));
//     }

//     booking.subscription = subscription;
//     await booking.save();

//     const updatedBooking = await SubscriptionBooking.findById(bookingId)
//       .populate("subscription")
//       .populate("trainer", "first_name email");

//     return res.status(200).json(
//       new ApiResponse(200, updatedBooking, "Subscription updated successfully")
//     );
//   } catch (error) {
//     console.error("Update Subscription Error:", error);
//     res
//       .status(500)
//       .json(new ApiError(500, "Failed to update subscription", error.message));
//   }
// });

const cancelSubscriptionBooking = asyncHandler(async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await SubscriptionBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json(new ApiError(404, "Booking not found"));
    }

    // Optionally: prevent cancelling if already cancelled
    if (booking.status === "cancelled") {
      return res
        .status(400)
        .json(new ApiError(400, "Booking is already cancelled"));
    }

    booking.status = "cancelled";
    await booking.save();

    return res.status(200).json(
      new ApiResponse(200, booking, "Booking cancelled successfully")
    );
  } catch (error) {
    console.error("Cancel Booking Error:", error);
    res.status(500).json(
      new ApiError(500, "Failed to cancel booking", error.message)
    );
  }
});

// Get all bookings (populate trainer, subscription, timeSlot)
const getAllSubscriptionBookings = asyncHandler(async (req, res) => {
  const bookings = await SubscriptionBooking.find()
     .populate({
      path: "subscription",
      populate: [
        { path: "categoryId", select: "cName" },
        { path: "sessionType", select: "sessionName" },
        { path: "trainer", select: "first_name last_name email" },
        {
          path: "Address",
          select: "streetName landmark country city",
          populate: [
            { path: "country", select: "name" },
            { path: "city", select: "name" }
          ]
        }
      ]
    })
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, bookings, "All bookings fetched"));
});

// Get All Bookings of Logged In Customer
const getCustomerBookings = asyncHandler(async (req, res) => {
  const bookings = await SubscriptionBooking.find({ customer: req.user._id })
    .populate({
      path: "subscription",
      populate: [
        { path: "categoryId", select: "cName" },
        { path: "sessionType", select: "sessionName" },
        { path: "trainer", select: "first_name last_name email" },
        {
          path: "Address",
          select: "streetName landmark country city",
          populate: [
            { path: "country", select: "name" },
            { path: "city", select: "name" }
          ]
        }
      ]
    })
    .sort({ createdAt: -1 });

  res
    .status(200)
    .json(new ApiResponse(200, bookings, "Customer bookings fetched"));
});


// Get Booking by ID
const getBookingById = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  const booking = await SubscriptionBooking.findById(bookingId)
    .populate("subscription")
    .populate("first_name email");

  if (!booking) {
    return res.status(404).json(new ApiResponse(404, {}, "Booking not found"));
  }

  res.status(200).json(new ApiResponse(200, booking, "Booking details"));
});

const getSingleSubscriptionByBookingId = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;

  if (!bookingId) {
    return res.status(400).json(new ApiError(400, "Booking ID is required"));
  }

const booking = await SubscriptionBooking.findById(bookingId)
  .populate({
    path: "subscription",
    select: "_id media price", 
    populate: [
      { path: "categoryId", select: "cName" },
      { path: "sessionType", select: "sessionName" },
      // { path: "media", select: "media" },
      { path: "trainer", select: "first_name last_name email" },
      {
        path: "Address", // ⛔️ likely should be lowercase "address"
        select: "streetName landmark country city",
        populate: [
          { path: "country", select: "name" },
          { path: "city", select: "name" }
        ]
      }
    ]
  });


  if (!booking || !booking.subscription) {
    return res.status(404).json(new ApiResponse(404, {}, "Subscription not found for this booking"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, booking, "Subscription fetched successfully from booking ID"));
});

// Get All Subscriptions by Customer/User ID
const getSubscriptionsByUserId = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const bookings = await SubscriptionBooking.find({ customer: userId })
    .populate({
      path: "subscription",
      populate: [
        { path: "categoryId", select: "cName" },
        { path: "sessionType", select: "sessionName" },
        { path: "trainer", select: "first_name last_name email" },
        {
          path: "Address",
          select: "streetName landmark country city",
          populate: [
            { path: "country", select: "name" },
            { path: "city", select: "name" }
          ]
        }
      ]
    })
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, bookings, "Subscriptions by user fetched")
  );
});

const getExpiredBookingsByCustomer = asyncHandler(async (req, res) => {
  const customerId = req.user._id;
  const today = new Date();

  // Step 1: Get all bookings with full subscription data
  const bookings = await SubscriptionBooking.find({ customer: customerId })
    .populate({
      path: "subscription",
      populate: [
        { path: "categoryId", select: "cName" },
        { path: "sessionType", select: "sessionName" },
        { path: "trainer", select: "first_name last_name email" },
        {
          path: "Address",
          select: "streetName landmark country city",
          populate: [
            { path: "country", select: "name" },
            { path: "city", select: "name" }
          ]
        }
      ]
    })
    .sort({ createdAt: -1 });

  // Step 2: Filter out expired ones (where subscription.date[1] is before today)
  const expiredBookings = bookings.filter(booking => {
    const dateArray = booking.subscription?.date;
    if (Array.isArray(dateArray) && dateArray.length >= 2) {
      const endDate = new Date(dateArray[1]);
      return endDate < today;
    }
    return false;
  });

  return res.status(200).json(
    new ApiResponse(200, expiredBookings, "Expired subscriptions fetched successfully")
  );
});


// LIST CUSTOMERS FOR A GIVEN SUBSCRIPTION

const getCustomersBySubscriptionId = asyncHandler(async (req, res) => {
  const { subscriptionId } = req.params;

  if (!subscriptionId) {
    throw new ApiError(400, "Subscription ID is required");
  }

  // Find all bookings for this subscription and pull the customer IDs
  const bookings = await SubscriptionBooking.find(
    { subscription: subscriptionId },
    { customer: 1 }                    // projection: only _id and customer
  ).populate({
    path: "customer",
    select: "first_name last_name email phone" // whatever you need
  });

  if (!bookings.length) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "No customers booked this subscription"));
  }

  // Extract the populated customer docs
  const customers = bookings.map(b => b.customer);

  return res
    .status(200)
    .json(new ApiResponse(200, customers, "Customers fetched successfully"));
});



//LIST CUSTOMERS GROUPED BY SUBSCRIPTION

const getAllSubscriptionCustomers = asyncHandler(async (req, res) => {
  // aggregate to avoid N+1 populates when the dataset grows
  const result = await SubscriptionBooking.aggregate([
    {
      $group: {
        _id: "$subscription",
        customers: { $addToSet: "$customer" } // unique customers per sub
      }
    },
    // lookup customer details
    {
      $lookup: {
        from: "users",
        localField: "customers",
        foreignField: "_id",
        as: "customers"
      }
    },
    // lookup subscription details (category, trainer, etc.)
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "_id",
        as: "subscription"
      }
    },
    { $unwind: "$subscription" } // flatten for a nicer shape
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Customers per subscription"));
});




export {
  getExpiredBookingsByCustomer,
  getCustomersBySubscriptionId,
  getAllSubscriptionCustomers,
  getSubscriptionsByUserId,
  getAllSubscriptionBookings,
  createSubscriptionBooking,
  // updateSubscriptionBooking,
  cancelSubscriptionBooking,
  getCustomerBookings,
  getBookingById,
getSingleSubscriptionByBookingId,
  createManualBooking,
  updateManualBooking,
  getAllBookings,
  deleteBooking,
  confirmTimeslotBooking,
};

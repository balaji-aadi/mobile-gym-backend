import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, lowercase: true },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    sessionType: {
      type: Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    trainer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    Address: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LocationMaster",
      required: true,
    },

    // country: {
    //   type: Schema.Types.ObjectId,
    //   ref: "Country",
    //   default: null,
    // },
    // city: {
    //   type: Schema.Types.ObjectId,
    //   ref: "City",
    //   default: null,
    // },
    // streetName: {
    //   type: String,
    //   required: true,
    // },

    //  coordinates: {
    //   type: {
    //     type: String,
    //     enum: ["Point"],
    //     default: "Point",
    //     required: true
    //   },
    //   coordinates: {
    //     type: [Number], // [longitude, latitude]
    //     required: true
    //   }
    // },

    price: { type: Number, required: true },
    media: { type: String, default: null },
    description: { type: String, default: null },
    isActive: { type: Boolean, default: true },

    date: {
      type: [Date],
      validate: {
        validator: (v) => v.length === 1 || v.length === 2,
        message: "Date must be a single date or a range of two dates",
      },
      required: true,
    },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },

    created_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    updated_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

subscriptionSchema.index({ coordinates: "2dsphere" });
subscriptionSchema.index({ "Address.location": "2dsphere" });

export const Subscription = mongoose.model("Subscription", subscriptionSchema);

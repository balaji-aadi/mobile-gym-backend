import { Router } from "express";
import multer from "../../middlewares/multer.middleware.js";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import { adminOnly,trainerOnly } from "../../middlewares/role.middleware.js";

import {
  createTrainer,
  getAllTrainer,
  getTrainerrById,
  updateTrainer,
  deleteTrainer,
  updateTrainerStatus,

  getAllOrders,
  getAllAssignedJobs,
  getOrderDetailsById,
  // updateBookingStatus,
  updateTrainerProfileByTrainer,
  trainerCheckin,
  initiateCheckout,
  completeCheckout
} from "./trainer.controller.js";

const router = Router();

router.route("/update-trainer-status/:trainerId").patch(verifyJWT, trainerOnly, updateTrainerStatus);
router.route("/create-trainer").post(verifyJWT, adminOnly, multer.uploadSingle("profile_image"), createTrainer);
router.route("/get-all-trainers").get(verifyJWT, getAllTrainer);
router.route("/get-trainerBy-id/:id").get(verifyJWT, getTrainerrById);
router.route("/update-trainer/:id").put(verifyJWT, adminOnly, multer.uploadSingle("profile_image"), updateTrainer);
router.route("/delete-trainer/:id").delete(verifyJWT, adminOnly, deleteTrainer);


//get all orders
router.route("/get-all-orders").get(verifyJWT, trainerOnly, getAllOrders);

//get all assigned job
router.route("/get-all-assigned-jobs").post(verifyJWT, getAllAssignedJobs);
router.route("/get-all-order-by-id/:id").get(verifyJWT, getOrderDetailsById);
// router.route("/groomer-checkin-checkout/:orderDetailsId").post(verifyJWT, updateBookingStatus);
router.route("/update-trainer-profiles/:trainerId").put(verifyJWT, multer.uploadSingle("profile_image"), updateTrainerProfileByTrainer);

router.route("/checkin/:orderDetailsId").post(verifyJWT, trainerCheckin);
router.route("/initiate-checkout/:orderDetailsId").post(verifyJWT, initiateCheckout);
router.route("/complete-checkout/:orderDetailsId").post(verifyJWT, completeCheckout);

export default router;

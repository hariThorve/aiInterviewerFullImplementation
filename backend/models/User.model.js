// use to store name , email , phonenumber and performance details of the user

import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    phoneNumber: {
        type: String,
        required: true,
    },
    performanceDetails: {
        type: String,
        required: true,
    },
});

export default mongoose.model("User", userSchema);

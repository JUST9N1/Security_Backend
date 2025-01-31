const axios = require("axios");

const sendOtp = async (phone, otp) => {
  // setting state
  let isSent = false;

  // url to send otp
  const url = "https://api.managepoint.co/api/sms/send";

  // payload to send
  const payload = {
    apiKey: "59fd1df5-9c81-415d-98dc-a40a39aeae19",
    to: phone,
    message: `Your OTP is ${otp} for resetting password`,
  };

  try {
    const response = await axios.post(url, payload);
    if (response.status === 200) {
      isSent = true;
    }
  } catch (error) {
    console.log("Error in sending OTP", error.message);
  }
  return isSent;
};
module.exports = sendOtp;
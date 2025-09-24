import { useState } from "react";
// import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Form({ onSubmit }) {
  // const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    performanceDetails: "pending",
  });

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [profilePhotoPath, setProfilePhotoPath] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear error when user starts typing
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        setErrors({ ...errors, profilePhoto: "Please select a valid image file (JPEG, PNG, or GIF)" });
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        setErrors({ ...errors, profilePhoto: "File size must be less than 5MB" });
        return;
      }

      // Clear any previous errors
      if (errors.profilePhoto) {
        setErrors({ ...errors, profilePhoto: "" });
      }

      setProfilePhoto(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setProfilePhoto(null);
    setPhotoPreview(null);
    // Clear file input
    const fileInput = document.getElementById('profilePhoto');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (!/^\d{10}$/.test(formData.phoneNumber.replace(/\D/g, ""))) {
      newErrors.phoneNumber = "Phone number must be 10 digits";
    }

    return newErrors;
  };

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   const validationErrors = validateForm();

  //   if (Object.keys(validationErrors).length > 0) {
  //     setErrors(validationErrors);
  //     return;
  //   }

  //   setIsLoading(true);
  //   try {
  //     // Only send the original form data to the API (excluding profile photo)
  //     const res = await axios.post("http://localhost:3000/users", formData, {
  //       headers: { "Content-Type": "application/json" },
  //     });
  //     console.log("Response:", res.data);
      
  //     // Log profile photo info (but don't send to API)
  //     if (profilePhoto) {
  //       console.log("Profile photo selected:", {
  //         name: profilePhoto.name,
  //         size: profilePhoto.size,
  //         type: profilePhoto.type
  //       });
  //     }
      
  //     onSubmit(formData.name, res.data.id);

  //     // Navigate to interview page after successful submission
  //     // navigate("/interview");
  //   } catch (err) {
  //     if (err.response) {
  //       console.error("Server responded with error:", err.response.data);
  //       setErrors({ submit: "Server error: " + err.response.data.message });
  //     } else if (err.request) {
  //       console.error("No response from server:", err.request);
  //       setErrors({ submit: "Unable to connect to server. Please try again." });
  //     } else {
  //       console.error("Axios error:", err.message);
  //       setErrors({ submit: "An error occurred. Please try again." });
  //     }
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    try {
      // First, submit the form data to the original API
      const res = await axios.post("http://localhost:3000/users", formData, {
        headers: { "Content-Type": "application/json" },
      });
      console.log("Response:", res.data);
      
      // If profile photo is selected, upload it to the FastAPI endpoint
      let uploadedPhotoPath = null;
      if (profilePhoto) {
        try {
          const formDataPhoto = new FormData();
          formDataPhoto.append('profilePhoto', profilePhoto);
          formDataPhoto.append('userId', res.data.id); // Include user ID from the response
          
          const photoRes = await axios.post("http://localhost:8000/upload-profile-picture", formDataPhoto, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          const result = photoRes.data.file_path;
          console.log("result", result);
          uploadedPhotoPath = photoRes.data.data.file_path;
          setProfilePhotoPath(uploadedPhotoPath);
          console.log("profilePhotoPath", uploadedPhotoPath);
          console.log("Profile photo uploaded:", photoRes.data.data.file_path);
        } catch (photoError) {
          console.error("Error uploading profile photo:", photoError);
          // Don't fail the entire form submission if photo upload fails
          setErrors({ submit: "Form submitted but profile photo upload failed. Please try uploading again later." });
        }
      }
      
      onSubmit(formData.name, res.data.id, uploadedPhotoPath);

      // Navigate to interview page after successful submission
      // navigate("/interview");
    } catch (err) {
      if (err.response) {
        console.error("Server responded with error:", err.response.data);
        setErrors({ submit: "Server error: " + err.response.data.message });
      } else if (err.request) {
        console.error("No response from server:", err.request);
        setErrors({ submit: "Unable to connect to server. Please try again." });
      } else {
        console.error("Axios error:", err.message);
        setErrors({ submit: "An error occurred. Please try again." });
      }
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            User Information
          </h1>
          <p className="text-gray-600">Please fill in your details below</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100"
        >
          <div className="space-y-6">
            {/* Profile Photo Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Profile Photo (Optional)
              </label>
              <div className="flex flex-col items-center">
                {photoPreview ? (
                  <div className="relative mb-4">
                    <img
                      src={photoPreview}
                      alt="Profile preview"
                      className="w-24 h-24 rounded-full object-cover border-4 border-indigo-200"
                    />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center mb-4">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                )}
                <input
                  type="file"
                  id="profilePhoto"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="profilePhoto"
                  className="cursor-pointer bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg border border-gray-300 transition-colors text-sm font-medium"
                >
                  {photoPreview ? "Change Photo" : "Upload Photo"}
                </label>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  JPG, PNG, or GIF (max 5MB)
                </p>
              </div>
              {errors.profilePhoto && (
                <p className="mt-2 text-sm text-red-600 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {errors.profilePhoto}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-opacity-20 ${
                  errors.name
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50"
                    : "border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 hover:border-gray-300"
                }`}
                placeholder="Enter your full name"
              />
              {errors.name && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-opacity-20 ${
                  errors.email
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50"
                    : "border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 hover:border-gray-300"
                }`}
                placeholder="Enter your email address"
              />
              {errors.email && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-opacity-20 ${
                  errors.phoneNumber
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50"
                    : "border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 hover:border-gray-300"
                }`}
                placeholder="Enter your 10-digit phone number"
              />
              {errors.phoneNumber && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {errors.phoneNumber}
                </p>
              )}
            </div>
          </div>

          {errors.submit && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600 flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {errors.submit}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full mt-8 font-semibold py-3 px-6 rounded-xl transform transition-all duration-200 shadow-lg focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-opacity-50 ${
              isLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 hover:scale-[1.02] hover:shadow-xl"
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Submitting...
              </div>
            ) : (
              "Submit Information"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
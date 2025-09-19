import React, { useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const AddEvent = () => {
  const [title, setTitle] = React.useState("");
  const [shortDescription, setShortDescription] = React.useState("");
  const [longDescription, setLongDescription] = React.useState("");
  const [registerationDeadline, setRegisterationDeadline] = React.useState("");
  const [maxParticipants, setMaxParticipants] = React.useState(0);
  const [ContactInfo, setContactInfo] = React.useState([]);
  const [eligibility, setEligibility] = React.useState("");
  const [numberOfRounds, setNumberOfRounds] = React.useState(0);
  const [roundDetails, setRoundDetails] = React.useState([]);
  const [eventBanner, setEventBanner] = React.useState(null);
  const [eventBannerPreview, setEventBannerPreview] = React.useState(null);

  async function handleImageInput(e) {
    const file = e.target.files[0];
    setEventBanner(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataURL = e.target.result;
      setEventBannerPreview(dataURL);
    };

    reader.readAsDataURL(file);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Log form data for debugging
      console.log("Form data being submitted:");
      console.log("Title:", title);
      console.log("Short Description:", shortDescription);
      console.log("ContactInfo:", ContactInfo);
      console.log("Number of Rounds:", numberOfRounds);
      console.log("Round Details:", roundDetails);
      
      // Validate required fields
      if(!eventBanner){
        toast.error("Please upload an event banner");
        return;
      }

      // Validate image file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(eventBanner.type)) {
        toast.error("Please upload a valid image file (JPG, JPEG, or PNG)");
        return;
      }

      // Validate image file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (eventBanner.size > maxSize) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      if (numberOfRounds > 0 && numberOfRounds !== roundDetails.length) {
        toast.error("Please fill details for all rounds");
        return;
      }

      // Create form data for submission
      const formData = new FormData();
      formData.append('eventBanner', eventBanner);
      formData.append('title', title);
      formData.append('shortDescription', shortDescription);
      formData.append('longDescription', longDescription);
      formData.append('registerationDeadline', registerationDeadline);
      formData.append('maxParticipants', maxParticipants);
      // Handle the ContactInfo array
      if (ContactInfo && ContactInfo.length > 0) {
        // Add each contact info as a separate item in the array
        ContactInfo.forEach((contact, index) => {
          formData.append(`ContactInfo[${index}]`, contact);
        });
      }
      
      formData.append('eligibility', eligibility || '');
      formData.append('numberOfRounds', numberOfRounds);
      
      // Handle the roundDetails array
      if (roundDetails && roundDetails.length > 0) {
        // Convert roundDetails to a string but mark it for parsing on server
        formData.append('roundDetailsJSON', JSON.stringify(roundDetails));
      }

      toast.info("Uploading event data... Please wait");

      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URI}/club/addEvent`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${localStorage.getItem("clubToken")}`,
          },
        }
      );
      
      console.log(response.data);

      if (response.data.success) {
        toast.success("Event added successfully");
        // Reset form after successful submission
        setTitle("");
        setShortDescription("");
        setLongDescription("");
        setRegisterationDeadline("");
        setMaxParticipants(0);
        setContactInfo([]);
        setEligibility("");
        setNumberOfRounds(0);
        setRoundDetails([]);
        setEventBanner(null);
        setEventBannerPreview(null);
      } else {
        toast.error(response.data.msg || "Failed to add event");
      }
    } catch (error) {
      console.error("Error adding event:", error);
      toast.error(error.response?.data?.msg || "An error occurred while adding the event");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-[#1a4b8e] mb-6 text-center">
          Add New Event
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Event Title
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a4b8e]"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Enter event title"
            />
          </div>

          {/* Short Description */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Short Description
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a4b8e]"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              required
              placeholder="A brief summary of the event"
            />
          </div>

          {/* Long Description */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Long Description
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a4b8e]"
              value={longDescription}
              onChange={(e) => setLongDescription(e.target.value)}
              rows={4}
              required
              placeholder="Detailed event description, rules, etc."
            />
          </div>
          
          {/* Event Banner */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Event Banner <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageInput}
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a4b8e]"
              required
            />
            {eventBannerPreview && (
              <div className="mt-3">
                <label className="block text-gray-700 font-medium mb-1">
                  Preview
                </label>
                <div className="mt-1 border rounded-md overflow-hidden">
                  <img 
                    src={eventBannerPreview} 
                    alt="Event Banner Preview" 
                    className="w-full h-48 object-cover"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Registration Deadline & Max Participants */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Registration Deadline
              </label>
              <input
                type="String"
                placeholder="YYYY-MM-DD"
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a4b8e]"
                value={registerationDeadline}
                onChange={(e) => setRegisterationDeadline(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Max Participants
              </label>
              <input
                type="number"
                min={1}
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a4b8e]"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(Number(e.target.value))}
                required
                placeholder="e.g. 100"
              />
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Contact Info (comma separated)
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a4b8e]"
              value={ContactInfo.join(", ")}
              onChange={(e) =>
                setContactInfo(e.target.value.split(",").map((s) => s.trim()))
              }
              placeholder="Phone1, Phone2, ..."
            />
          </div>

          <div>
            <label>Eligibility</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a4b8e]"
              value={eligibility}
              onChange={(e) => setEligibility(e.target.value)}
              placeholder="Eligibility criteria"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Number of Rounds
            </label>
            <input
              type="number"
              min={0}
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a4b8e]"
              value={numberOfRounds}
              onChange={(e) => setNumberOfRounds(Number(e.target.value))}
              placeholder="e.g. 3"
            />
          </div>

          <div>
            {numberOfRounds > 0 ? (
              <div>
                {Array.from({ length: numberOfRounds }, (_, i) => (
                  <div key={i} className="mb-4">
                    <label className="block text-gray-700 font-medium mb-1">
                      Round {i + 1} Details
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a4b8e]"
                      value={roundDetails[i]?.Type || ""}
                      onChange={(e) => {
                        const newDetails = [...roundDetails];
                        newDetails[i] = { Round: i + 1, Type: e.target.value };
                        setRoundDetails(newDetails);
                      }}
                      placeholder={`Type of Round ${i + 1}`}
                    />

                    {roundDetails[i]?.Type === "Test" && (
                      <div className="mt-2">
                        <label className="block text-gray-700 font-medium mb-1">
                          Test Date
                        </label>
                        <input
                          type="text"
                          placeholder="YYYY-MM-DD"
                          className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a4b8e]"
                          value={roundDetails[i]?.TestDate || ""}
                          onChange={(e) => {
                            const newDetails = [...roundDetails];
                            newDetails[i] = {
                              ...newDetails[i],
                              TestDate: e.target.value,
                            };
                            setRoundDetails(newDetails);
                            // if (
                            //   new Date(e.target.value) <
                            //   new Date(registerationDeadline)
                            // ) {
                            //   toast.error(
                            //     "Test Date must be after Registration Deadline"
                            //   );
                            // }
                          }}
                        />
                        <p></p>
                      </div>
                    )}
                    {roundDetails[i]?.Type === "Submission" && (
                      <div>
                        <label className="mt-3 text-gray-700 font-medium mb-1 block">
                          Submission Deadline
                        </label>
                        <input
                          className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a4b8e]"
                          type="text"
                          placeholder="YYYY-MM-DD"
                          value={roundDetails[i]?.SubmissionDeadline || ""}
                          onChange={(e) => {
                            const newDetails = [...roundDetails];
                            newDetails[i] = {
                              ...newDetails[i],
                              SubmissionDeadline: e.target.value,
                            };
                            setRoundDetails(newDetails);
                          }}
                        />
                        <label className="mt-3 text-gray-700 font-medium mb-1 block">
                          Submission Google Form Link
                        </label>
                        <input
                          className=" mt-1 w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a4b8e]"
                          type="text"
                          placeholder="Google Form Link"
                          value={roundDetails[i]?.GoogleFormLink || ""}
                          onChange={(e) => {
                            const newDetails = [...roundDetails];
                            newDetails[i] = {
                              ...newDetails[i],
                              GoogleFormLink: e.target.value,
                            };
                            setRoundDetails(newDetails);
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div></div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              className="w-full bg-[#1a4b8e] hover:bg-[#153c70] text-white font-semibold py-3 px-6 rounded-md shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a4b8e]"
            >
              Add Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEvent;

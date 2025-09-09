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



  
  const handleSubmit = async (e) => {
    e.preventDefault();

    const response = await axios.post(
      `${import.meta.env.VITE_BASE_URI}/club/addEvent`,
      {
        title,
        shortDescription,
        longDescription,
        registerationDeadline,
        maxParticipants,
        ContactInfo,
        roundDetails,
        eligibility,
        numberOfRounds,
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("clubToken")}`,
        },
      }
    );
    console.log(response.data);

    if (response.data.success) {
      toast.success("Event added successfully");
      setTitle("");
      setShortDescription("");
      setLongDescription("");
      setRegisterationDeadline("");
      setMaxParticipants(0);
      setContactInfo([]);
      setEligibility("");
      setNumberOfRounds(0);
      setRoundDetails([]);
    } else {
      toast.error("Failed to add event");
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
                          on
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

import React, { useState, useEffect } from 'react';

// --- API HELPER ---
// Replicating the logic from 'src/api.js' to make this file self-contained
// This line is fixed to avoid the 'import.meta' build error
const VITE_API_BASE_URL = 'http://localhost:5000/api';

const api = {
  post: async (url, data) => {
    const response = await fetch(`${VITE_API_BASE_URL}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    const responseData = await response.json();

    if (!response.ok) {
      const error = new Error(responseData.message || 'API request failed');
      error.response = { data: responseData }; // Mimic axios error structure
      throw error;
    }
    
    return { data: responseData }; // Mimic axios success structure
  },
};

// --- INLINE SVG ICON ---
// Replaces 'react-icons/fa' to remove external dependency
const FaStar = ({ style, ...props }) => (
  <svg 
    style={style} 
    {...props} 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    width="1em" 
    height="1em"
  >
    <path d="M12 17.27l-5.18 2.72 1-5.77-4.18-4.08 5.79-.84L12 3.9l2.57 5.4 5.79.84-4.18 4.08 1 5.77z" />
  </svg>
);

// --- UI COMPONENTS ---
// Adding components from 'src/ui/...' to make file self-contained

export const Button = ({ children, className, ...props }) => (
  <button
    className={`px-6 py-3 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition duration-300 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    {...props}
  >
    {children}
  </button>
);

export const Card = ({ children, className }) => (
  <div className={`bg-white p-8 rounded-2xl shadow-xl ${className}`}>
    {children}
  </div>
);

export const Loader = () => (
  <div className="w-6 h-6 border-4 border-t-transparent border-white rounded-full animate-spin mx-auto" />
);

export const Toast = ({ message, type = 'success', onClose }) => {
  if (!message) return null;

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Auto-close after 5 seconds
    return () => clearTimeout(timer);
  }, [message, onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';

  return (
    <div
      className={`fixed bottom-5 right-5 ${bgColor} text-white px-6 py-4 rounded-lg shadow-lg transition-all duration-300 transform animate-slide-in`}
    >
      <div className="flex items-center justify-between">
        <span className="mr-4">{message}</span>
        <button onClick={onClose} className="font-bold text-lg">&times;</button>
      </div>
    </div>
  );
};

export const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()} // Prevent modal from closing on content click
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// --- STYLING FOR STARS ---
const starStyles = {
  cursor: 'pointer',
  transition: 'color 200ms',
  margin: '0 4px',
};

// --- MAIN PAGE COMPONENT ---
export const ExitOutPage = () => {
  const [rfidTag, setRfidTag] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // --- STATE FOR FEEDBACK MODAL ---
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [currentRegistrationId, setCurrentRegistrationId] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
  // --- END OF NEW STATE ---

  const clearMessages = () => {
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    try {
      const response = await api.post('/desk/exit', {
        rfid_tag: rfidTag,
        reader_id: 'EXITOUT',
      });
      setSuccessMessage(response.data.message);
      setRfidTag('');

      // On success, save the registration_id and open the feedback modal
      setCurrentRegistrationId(response.data.registration_id);
      setIsFeedbackModalOpen(true);
      
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Error processing exit');
    } finally {
      setIsLoading(false);
    }
  };

  // --- FUNCTION TO HANDLE FEEDBACK SUBMISSION ---
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    console.log({
        registration_id: currentRegistrationId,
        rating: rating,
        comment: comment,
      });
    setIsFeedbackLoading(true);
    clearMessages();
    try {
      await api.post('/desk/feedback', {
        registration_id: currentRegistrationId,
        rating: rating,
        comment: comment,
      });
      setSuccessMessage('Feedback saved. Thank you!');
      closeFeedbackModal();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Error saving feedback');
    } finally {
      setIsFeedbackLoading(false);
    }
  };

  const closeFeedbackModal = () => {
    setIsFeedbackModalOpen(false);
    setRating(0);
    setHoverRating(0);
    setComment('');
    setCurrentRegistrationId(null);
  };
  // --- END OF NEW FUNCTION ---

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-80px)] bg-gray-100">
      <Card className="w-full max-w-lg">
        <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">
          Exit Desk
        </h2>
        <p className="text-center text-gray-600 mb-8">
          Process a user's exit by tapping their RFID card.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label
              htmlFor="rfidTag"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              RFID Tag
            </label>
            <input
              type="text"
              id="rfidTag"
              value={rfidTag}
              onChange={(e) => setRfidTag(e.target.value)}
              placeholder="Tap card or enter tag ID..."
              autoFocus
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <Button
            type="submit"
            className="w-full text-lg"
            disabled={isLoading}
          >
            {isLoading ? <Loader /> : 'Process Exit'}
          </Button>V
        </form>
      </Card>

      {/* --- MODAL COMPONENT --- */}
      <Modal
        isOpen={isFeedbackModalOpen}
        onClose={closeFeedbackModal}
        title="Visitor Feedback"
      >
        <form onSubmit={handleFeedbackSubmit}>
          <p className="text-gray-600 mb-4">
            How was this visitor's experience?
          </p>
          
          <div className="flex justify-center mb-6 text-4xl">
            {[...Array(5)].map((_, index) => {
              const starValue = index + 1;
              return (
                <FaStar
                  key={starValue}
                  style={starStyles}
                  color={(hoverRating || rating) >= starValue ? '#ffc107' : '#e4e5e9'}
                  onMouseEnter={() => setHoverRating(starValue)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(starValue)}
                />
              );
            })}
          </div>

          <div className="mb-6">
            <label
              htmlFor="comment"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Additional Comments (Optional)
            </label>
            <textarea
              id="comment"
              rows="4"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any specific feedback..."
            ></textarea>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isFeedbackLoading || rating === 0}
          >
            {isFeedbackLoading ? <Loader /> : 'Submit Feedback'}
          </Button>
        </form>
      </Modal>
      {/* --- END OF MODAL --- */}

      <Toast
        message={successMessage}
        type="success"
        onClose={clearMessages}
      />
      <Toast message={errorMessage} type="error" onClose={clearMessages} />
    </div>
  );
};


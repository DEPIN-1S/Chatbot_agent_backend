// responseHandler.js
export const success = (res, data, statusCode = 200) => {
  try {
    return res.status(statusCode).json({
      success: true,
      ...data
    });
  } catch (error) {
    console.error('Error in success handler:', error);
    return res.status(500).json({
      success: false,
      message: 'Unexpected error occurred while sending response.'
    });
  }
};

export const error = (res, error, statusCode = 500) => {
  try {
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Internal Server Error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } catch (err) {
    console.error('Error in error handler:', err);
    return res.status(500).json({
      success: false,
      message: 'Unexpected error occurred while sending error response.'
    });
  }
};

// Optionally, you can also create a default export that includes both functions
export default { success, error };
export const notFoundHandler = (req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

export const globalErrorHandler = (error, req, res, next) => {
  console.error("Unhandled backend error:", error);

  return res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal server error.",
  });
};

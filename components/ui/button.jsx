// src/components/ui/button.jsx
import React from "react";

export function Button({ children, className = "", ...props }) {
  return (
    <button
      className={`bg-gray-200 text-black font-bold py-2 px-4 rounded transition duration-150 ease-in-out hover:bg-gray-300 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

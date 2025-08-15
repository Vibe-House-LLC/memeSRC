'use client';

import React, { InputHTMLAttributes } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  name: string;
}

const TextField: React.FC<TextFieldProps> = ({ label, id, name, className, ...props }) => {
  return (
    <div className="w-full">
      <label htmlFor={id} className="block text-sm font-medium text-gray-400 mb-1">
        {label}
      </label>
      <input
        id={id}
        name={name}
        className={`
          appearance-none rounded-lg relative block w-full px-4 py-3 border 
          border-gray-700 placeholder-gray-500 text-white bg-gray-800 
          focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 
          focus:z-10 text-base transition-all duration-200 ease-in-out
          ${className || ''}
        `}
        {...props}
      />
    </div>
  );
};

export default TextField;
import React from 'react';

function PrivacyComponent() {
  return (
    <div className="flex-1 flex flex-col p-4 bg-gray-900">
      <div className="flex-1 bg-gray-800 rounded-lg overflow-y-auto p-4 bg-opacity-50 backdrop-blur-lg shadow-2xl border border-gray-700 border-opacity-50">
        <h2 className="text-2xl font-semibold text-white">Privacy</h2>
        <p className="text-gray-400 mt-4">Content for the Privacy tab goes here.</p>
      </div>
    </div>
  );
}

export default PrivacyComponent;

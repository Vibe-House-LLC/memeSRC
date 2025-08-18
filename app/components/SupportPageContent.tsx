import React from 'react';

interface SupportPageContentProps {
  isPro: boolean;
}

const SupportPageContent: React.FC<SupportPageContentProps> = ({ isPro }) => {
  return (
    <div className="bg-black text-white min-h-screen p-6 pt-16 mt-12">
      <main className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Need some help?</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <p className="mb-4">
            {isPro 
              ? "As a Pro subscriber, you get access to Pro Support. Send us a message and we'll get back to you asap:"
              : "Send us a message and we'll get back to you as soon as possible:"}
          </p>
          
          <form>
            <div className="mb-4">
              <label htmlFor="message" className="sr-only">Message</label>
              <textarea
                id="message"
                className="w-full bg-gray-700 rounded p-3 text-white"
                rows={6}
                placeholder="Message"
              />
            </div>
            
            <div className="mb-4">
              <label className="flex items-center">
                <input type="checkbox" className="form-checkbox h-5 w-5 text-green-500" />
                <span className="ml-2 text-sm">It&apos;s okay to email me about this message and my account</span>
              </label>
            </div>
            
            <button
              type="submit"
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded"
            >
              Submit
            </button>
          </form>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          {isPro ? (
            <>
              <h2 className="text-xl font-bold mb-2">Thanks for being a Pro!</h2>
              <p>We can&apos;t thank you enough for your support!</p>
            </>
          ) : (
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">Upgrade to Pro</h2>
              <p className="mb-4">Get faster support and unlock premium features!</p>
              <button className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded">
                Upgrade Now
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SupportPageContent;
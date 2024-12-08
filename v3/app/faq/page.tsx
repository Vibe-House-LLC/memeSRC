'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const FAQPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqs = [
    {
      question: 'How can I find a specific scene or quote?',
      answer: (
        <>
          <p>Type a quote into <Link href="/" className="text-white font-bold underline hover:no-underline">the search bar</Link> to find moments:</p>
          <ol className="list-decimal list-inside mb-2">
            <li>Search by quote across &quot;🌈 All Shows & Movies&quot;, or</li>
            <li>Use the dropdown to select a specific index.</li>
          </ol>
          <p>Remember, content is indexed from user uploads, so if it&apos;s not there it might not have been indexed yet.</p>
        </>
      ),
    },
    {
      question: 'Is it possible to edit images or add captions?',
      answer: (
        <>
          <p>Yes, it&apos;s possible to edit images and add captions! Here&apos;s how:</p>
          <ol className="list-decimal list-inside mb-2">
            <li>Open a search result.</li>
            <li>Enable captions.</li>
            <li>Add or change captions directly under the image using our Caption Editor.</li>
            <li>For more complex edits, like adding multiple text layers or using Magic Tools, switch to the Advanced Editor by clicking the button under the caption.</li>
          </ol>
        </>
      ),
    },
    {
      question: 'Can I edit my own pictures with memeSRC?',
      answer: (
        <>
          <p>Yes, you can absolutely edit your own pictures using all of memeSRC&apos;s features, including the powerful Magic Tools! Here&apos;s how to get started:</p>
          <ol className="list-decimal list-inside mb-2">
            <li>Go to <Link href="/edit" className="text-white font-bold underline hover:no-underline">the upload page</Link> and select the image you want to edit from your device.</li>
            <li>Once uploaded, you&apos;ll be taken directly to the Advanced Editor.</li>
            <li>Use the Magic Tools like the Magic Eraser and Magic Fill to customize your image in creative ways.</li>
            <li>Add one or more captions, click (or tap) and drag to move them, change their color, adjust formatting, etc.</li>
            <li>Click &quot;Save, Copy, Share&quot; to download your masterpiece and share it with the world!</li>
          </ol>
        </>
      ),
    },
    {
      question: 'What are Magic Tools, and how do they work?',
      answer: (
        <p>Magic Tools in the Advanced Editor allow for sophisticated edits, such as erasing parts of an image with the Magic Eraser or creatively adding to it with Magic Fill. These tools are a great way to quickly make the assets you need.</p>
      ),
    },
    {
      question: 'How can I save the memes I create?',
      answer: (
        <>
          <p>Saving your memes is easy! Here&apos;s how:</p>
          <p>For memes created with the Basic Editor:</p>
          <ol className="list-decimal list-inside mb-2">
            <li>Tap and hold or right-click on the image to save it.</li>
          </ol>
          <p>For memes created with the Advanced Editor:</p>
          <ol className="list-decimal list-inside mb-2">
            <li>Use the Magic Tools or add text layers to customize your meme.</li>
            <li>Click the &quot;Save, Copy, Share&quot; option to download your creation.</li>
          </ol>
        </>
      ),
    },
    {
      question: 'What is the Random Button and how does it function?',
      answer: (
        <p>The Random Button, located at the bottom right of every page, fetches a random frame from our database. If you&apos;re browsing a specific show or movie, it&apos;ll pull a frame from that selection. It&apos;s a great way to find inspiration or start a new meme!</p>
      ),
    },
    {
      question: 'Can I request for a show or movie to be added?',
      answer: (
        <p>Yes, we welcome your requests! If your favorite show or movie isn&apos;t on memeSRC, use the Request and Voting feature found in the menu. We regularly review these requests to add new content based on popularity and demand.</p>
      ),
    },
    {
      question: 'How can I provide feedback or support?',
      answer: (
        <p>We value your feedback and support! Click the feedback icon, located near the donation icon at the bottom of the page, to share your thoughts or to donate. Your contributions help us improve and expand the platform.</p>
      ),
    },
  ];

  const filteredFAQs = faqs.filter((faq) =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white p-4 mt-24">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h1>
        
        <div className="bg-blue-800 p-6 rounded-lg mb-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Need personalized help?</h2>
          <p className="mb-4">Get Pro Support with memeSRC Pro!</p>
          <Link href="/pro" className="bg-yellow-500 text-gray-900 px-4 py-2 rounded-full font-semibold hover:bg-yellow-400 transition-colors">
            Learn More
          </Link>
        </div>

        <input
          type="text"
          placeholder="Search FAQs"
          className="w-full p-3 mb-6 bg-gray-800 border border-gray-700 rounded-lg text-white"
          value={searchQuery}
          onChange={handleSearch}
        />

        {filteredFAQs.map((faq, index) => (
          <div key={index} className="mb-4 bg-gray-800 rounded-lg overflow-hidden">
            <button
              className="w-full p-4 text-left flex justify-between items-center"
              onClick={() => toggleFAQ(index)}
            >
              <span className="text-white font-bold">Q: {faq.question}</span>
              <svg
                className={`w-6 h-6 transform transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div 
              className={`transition-all duration-300 ease-in-out ${
                openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              } overflow-hidden`}
            >
              <div className="p-4 bg-gray-700">
                {faq.answer}
              </div>
            </div>
          </div>
        ))}

        <p className="text-sm text-gray-400 text-center mt-8">
          Just remember, all the content on memeSRC comes from users like you, so lets
          keep things creative and respectful. Have fun memeing!
        </p>
      </div>
    </div>
  );
};

export default FAQPage;